import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getMonthlyDeclarationData } from './declarationService'
import { MAJORATION_RATES } from '@/lib/compliance/calculatePay'
import type { ExportOptions } from './types'

// ─── Mocks ──────────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// ─── Helpers ────────────────────────────────────────────────────────

/** Configure mockFrom pour retourner des résultats séquentiels par appel */
function mockSupabaseSequence(calls: Array<{ data: unknown; error: unknown }>) {
  const chains: Array<Record<string, ReturnType<typeof vi.fn>>> = []

  for (const resolved of calls) {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.gte = vi.fn().mockReturnValue(chain)
    chain.lte = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue(resolved)
    chain.single = vi.fn().mockResolvedValue(resolved)
    chain.maybeSingle = vi.fn().mockResolvedValue(resolved)
    // Rendre la chaîne elle-même thenable pour les cas sans terminateur explicite
    const promise = Promise.resolve(resolved)
    Object.assign(chain, { then: promise.then.bind(promise), catch: promise.catch.bind(promise) })
    chains.push(chain)
  }

  let callIndex = 0
  mockFrom.mockImplementation(() => {
    const chain = chains[Math.min(callIndex, chains.length - 1)]
    callIndex++
    return chain
  })

  return chains
}

function createMockShiftRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shift-1',
    contract_id: 'contract-1',
    date: '2024-03-15', // Vendredi
    start_time: '09:00',
    end_time: '17:00',
    break_duration: 60,
    tasks: ['Aide'],
    notes: null,
    has_night_action: false,
    status: 'completed',
    computed_pay: null,
    validated_by_employer: false,
    validated_by_employee: false,
    created_at: '2024-03-15T08:00:00Z',
    updated_at: '2024-03-15T17:00:00Z',
    ...overrides,
  }
}

function createMockContract(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-1',
    employee_id: 'emp-456',
    contract_type: 'CDI',
    hourly_rate: 12.5,
    weekly_hours: 35,
    employee_profile: {
      profile: {
        id: 'emp-456',
        first_name: 'Marie',
        last_name: 'Martin',
      },
    },
    ...overrides,
  }
}

const defaultOptions: ExportOptions = {
  format: 'summary',
  year: 2024,
  month: 3, // Mars
}

/**
 * Setup standard : employeur trouvé, 1 contrat, N shifts.
 * Séquence d'appels from() dans getMonthlyDeclarationData :
 *   1. profiles (employeur)
 *   2. employers
 *   3. contracts
 *   4. shifts (par contrat)
 */
function setupStandardMocks(
  shifts: Record<string, unknown>[] = [createMockShiftRow()],
  contractOverrides: Record<string, unknown> = {},
) {
  return mockSupabaseSequence([
    // 1. profiles → employeur
    { data: { first_name: 'Jean', last_name: 'Dupont' }, error: null },
    // 2. employers
    { data: { address: { street: '1 rue Test', city: 'Paris', postalCode: '75001' }, cesu_number: 'CESU-123' }, error: null },
    // 3. contracts
    { data: [createMockContract(contractOverrides)], error: null },
    // 4. shifts
    { data: shifts, error: null },
  ])
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('declarationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ================================================================
  // Cas de base — retour null
  // ================================================================

  describe('Cas d\'erreur et retour null', () => {
    it('devrait retourner null si le profil employeur n\'existe pas', async () => {
      mockSupabaseSequence([
        { data: null, error: { message: 'Not found' } },
      ])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)

      expect(result).toBeNull()
    })

    it('devrait retourner null si les données employeur sont absentes', async () => {
      mockSupabaseSequence([
        { data: { first_name: 'Jean', last_name: 'Dupont' }, error: null },
        { data: null, error: { message: 'Not found' } },
      ])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)

      expect(result).toBeNull()
    })

    it('devrait retourner null si aucun contrat actif', async () => {
      mockSupabaseSequence([
        { data: { first_name: 'Jean', last_name: 'Dupont' }, error: null },
        { data: { address: {}, cesu_number: null }, error: null },
        { data: [], error: null },
      ])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)

      expect(result).toBeNull()
    })

    it('devrait retourner un résultat avec 0 employés si aucun shift', async () => {
      setupStandardMocks([]) // aucun shift

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)

      expect(result).not.toBeNull()
      expect(result!.employees).toHaveLength(0)
      expect(result!.totalHours).toBe(0)
      expect(result!.totalGrossPay).toBe(0)
    })
  })

  // ================================================================
  // Structure de la réponse
  // ================================================================

  describe('Structure de la réponse', () => {
    it('devrait retourner les informations employeur correctes', async () => {
      setupStandardMocks()

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)

      expect(result).not.toBeNull()
      expect(result!.employerId).toBe('employer-1')
      expect(result!.employerFirstName).toBe('Jean')
      expect(result!.employerLastName).toBe('Dupont')
      expect(result!.employerAddress).toBe('1 rue Test, 75001 Paris')
      expect(result!.cesuNumber).toBe('CESU-123')
    })

    it('devrait retourner la période correcte', async () => {
      setupStandardMocks()

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)

      expect(result!.year).toBe(2024)
      expect(result!.month).toBe(3)
      expect(result!.periodLabel).toBe('Mars 2024')
    })

    it('devrait inclure les infos employé depuis le contrat', async () => {
      setupStandardMocks()

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)

      expect(result!.employees).toHaveLength(1)
      const emp = result!.employees[0]
      expect(emp.employeeId).toBe('emp-456')
      expect(emp.firstName).toBe('Marie')
      expect(emp.lastName).toBe('Martin')
      expect(emp.contractId).toBe('contract-1')
      expect(emp.contractType).toBe('CDI')
      expect(emp.hourlyRate).toBe(12.5)
    })

    it('devrait inclure generatedAt comme Date', async () => {
      setupStandardMocks()

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)

      expect(result!.generatedAt).toBeInstanceOf(Date)
    })

    it('devrait gérer un employeur sans CESU number', async () => {
      mockSupabaseSequence([
        { data: { first_name: 'Jean', last_name: 'Dupont' }, error: null },
        { data: { address: { street: '1 rue', city: 'Lyon', postalCode: '69001' }, cesu_number: null }, error: null },
        { data: [createMockContract()], error: null },
        { data: [createMockShiftRow()], error: null },
      ])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)

      expect(result!.cesuNumber).toBeUndefined()
    })

    it('devrait gérer une adresse avec champs manquants', async () => {
      mockSupabaseSequence([
        { data: { first_name: 'Jean', last_name: 'Dupont' }, error: null },
        { data: { address: null, cesu_number: null }, error: null },
        { data: [createMockContract()], error: null },
        { data: [createMockShiftRow()], error: null },
      ])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)

      // Adresse formatée avec des chaînes vides
      expect(result!.employerAddress).toBeDefined()
    })
  })

  // ================================================================
  // Calcul de base — heures normales
  // ================================================================

  describe('Calcul heures normales', () => {
    it('devrait calculer les heures effectives (durée - pause)', async () => {
      // Shift 09:00-17:00 avec 60 min pause = 7h effectives
      setupStandardMocks([createMockShiftRow({
        start_time: '09:00',
        end_time: '17:00',
        break_duration: 60,
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      // 8h - 1h pause = 7h
      expect(emp.totalHours).toBe(7)
      expect(emp.normalHours).toBe(7)
    })

    it('devrait calculer le salaire de base (heures * taux)', async () => {
      setupStandardMocks([createMockShiftRow({
        start_time: '09:00',
        end_time: '17:00',
        break_duration: 0, // pas de pause = 8h
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      // 8h * 12.5€ = 100€
      expect(emp.totalHours).toBe(8)
      expect(emp.basePay).toBe(100)
      expect(emp.totalGrossPay).toBe(100)
    })

    it('devrait calculer sur plusieurs shifts', async () => {
      setupStandardMocks([
        createMockShiftRow({ id: 's1', date: '2024-03-11', start_time: '09:00', end_time: '17:00', break_duration: 0 }),
        createMockShiftRow({ id: 's2', date: '2024-03-12', start_time: '09:00', end_time: '13:00', break_duration: 0 }),
      ])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      // 8h + 4h = 12h
      expect(emp.totalHours).toBe(12)
      expect(emp.basePay).toBe(150) // 12 * 12.5
      expect(emp.shiftsCount).toBe(2)
      expect(emp.shiftsDetails).toHaveLength(2)
    })
  })

  // ================================================================
  // Majoration dimanche (+30%)
  // ================================================================

  describe('Majoration dimanche', () => {
    it('devrait appliquer +30% pour un shift le dimanche', async () => {
      // 2024-03-17 est un dimanche
      setupStandardMocks([createMockShiftRow({
        date: '2024-03-17',
        start_time: '09:00',
        end_time: '17:00',
        break_duration: 0,
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      expect(emp.sundayHours).toBe(8)
      // basePay = 8 * 12.5 = 100
      // sundayMajoration = 100 * 0.30 = 30
      expect(emp.sundayMajoration).toBe(30)
      expect(emp.totalGrossPay).toBe(130)
    })

    it('devrait ne pas appliquer de majoration dimanche en semaine', async () => {
      // 2024-03-15 est un vendredi
      setupStandardMocks([createMockShiftRow({
        date: '2024-03-15',
        start_time: '09:00',
        end_time: '17:00',
        break_duration: 0,
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      expect(emp.sundayHours).toBe(0)
      expect(emp.sundayMajoration).toBe(0)
    })

    it('devrait marquer isSunday dans le détail du shift', async () => {
      setupStandardMocks([createMockShiftRow({
        date: '2024-03-17', // dimanche
        start_time: '10:00',
        end_time: '14:00',
        break_duration: 0,
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const detail = result!.employees[0].shiftsDetails[0]

      expect(detail.isSunday).toBe(true)
    })
  })

  // ================================================================
  // Majoration jour férié (+60%)
  // ================================================================

  describe('Majoration jour férié', () => {
    it('devrait appliquer +60% pour un shift un jour férié', async () => {
      // 2024-05-01 = Fête du travail (mercredi)
      setupStandardMocks([createMockShiftRow({
        date: '2024-05-01',
        start_time: '09:00',
        end_time: '17:00',
        break_duration: 0,
      })])

      const result = await getMonthlyDeclarationData('employer-1', {
        ...defaultOptions,
        month: 5,
      })
      const emp = result!.employees[0]

      expect(emp.holidayHours).toBe(8)
      // basePay = 100, holidayMajoration = 100 * 0.60 = 60
      expect(emp.holidayMajoration).toBe(60)
      expect(emp.totalGrossPay).toBe(160)
    })

    it('devrait cumuler dimanche + férié', async () => {
      // Trouvons un férié tombant un dimanche — Noël 2022 (25/12 dimanche)
      // Mais utilisons plutôt un test simple : 1er janvier 2023 est un dimanche
      setupStandardMocks([createMockShiftRow({
        date: '2023-01-01', // dimanche + jour férié
        start_time: '09:00',
        end_time: '17:00',
        break_duration: 0,
      })])

      const result = await getMonthlyDeclarationData('employer-1', {
        format: 'summary',
        year: 2023,
        month: 1,
      })
      const emp = result!.employees[0]

      // basePay = 100
      // sundayMajoration = 30
      // holidayMajoration = 60
      // total = 190
      expect(emp.sundayMajoration).toBe(30)
      expect(emp.holidayMajoration).toBe(60)
      expect(emp.totalGrossPay).toBe(190)
    })
  })

  // ================================================================
  // Majoration nuit (+20%)
  // ================================================================

  describe('Majoration nuit', () => {
    it('devrait appliquer +20% pour les heures de nuit avec acte (has_night_action=true)', async () => {
      // Shift 20:00-08:00 => night hours = heures entre 21h-6h = 9h
      setupStandardMocks([createMockShiftRow({
        date: '2024-03-15',
        start_time: '20:00',
        end_time: '06:00',
        break_duration: 0,
        has_night_action: true,
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      expect(emp.nightHours).toBeGreaterThan(0)
      // nightMajoration = nightHours * 12.5 * 0.20
      expect(emp.nightMajoration).toBeGreaterThan(0)
    })

    it('devrait ne PAS appliquer majoration nuit si has_night_action=false (présence seule)', async () => {
      setupStandardMocks([createMockShiftRow({
        date: '2024-03-15',
        start_time: '20:00',
        end_time: '06:00',
        break_duration: 0,
        has_night_action: false,
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      expect(emp.nightHours).toBe(0)
      expect(emp.nightMajoration).toBe(0)
    })

    it('devrait appliquer majoration nuit si has_night_action=null (rétrocompatibilité)', async () => {
      setupStandardMocks([createMockShiftRow({
        date: '2024-03-15',
        start_time: '20:00',
        end_time: '06:00',
        break_duration: 0,
        has_night_action: null, // anciens shifts sans le champ
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      // Rétrocompatibilité : null traité comme true
      expect(emp.nightHours).toBeGreaterThan(0)
      expect(emp.nightMajoration).toBeGreaterThan(0)
    })

    it('devrait retourner 0 heures de nuit pour un shift de jour', async () => {
      setupStandardMocks([createMockShiftRow({
        date: '2024-03-15',
        start_time: '09:00',
        end_time: '17:00',
        break_duration: 0,
        has_night_action: true,
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      expect(emp.nightHours).toBe(0)
      expect(emp.nightMajoration).toBe(0)
    })
  })

  // ================================================================
  // Heures supplémentaires
  // ================================================================

  describe('Heures supplémentaires', () => {
    it('devrait calculer les heures sup au-delà des heures contractuelles', async () => {
      // Contrat 35h/semaine. 5 shifts de 8h = 40h => 5h sup
      // Tous dans la même semaine (lundi 11 au vendredi 15 mars 2024)
      const shifts = [
        createMockShiftRow({ id: 's1', date: '2024-03-11', start_time: '08:00', end_time: '16:00', break_duration: 0 }),
        createMockShiftRow({ id: 's2', date: '2024-03-12', start_time: '08:00', end_time: '16:00', break_duration: 0 }),
        createMockShiftRow({ id: 's3', date: '2024-03-13', start_time: '08:00', end_time: '16:00', break_duration: 0 }),
        createMockShiftRow({ id: 's4', date: '2024-03-14', start_time: '08:00', end_time: '16:00', break_duration: 0 }),
        createMockShiftRow({ id: 's5', date: '2024-03-15', start_time: '08:00', end_time: '16:00', break_duration: 0 }),
      ]
      setupStandardMocks(shifts, { weekly_hours: 35 })

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      // 40h total, 35h contractuelles → 5h sup
      expect(emp.totalHours).toBe(40)
      expect(emp.overtimeHours).toBe(5)
      // 5h * 12.5€ * 25% = 15.63€
      expect(emp.overtimeMajoration).toBeCloseTo(15.63, 1)
    })

    it('devrait ne pas compter d\'heures sup si en dessous du contractuel', async () => {
      // 4 shifts de 8h = 32h sur contrat 35h → 0 heures sup
      const shifts = [
        createMockShiftRow({ id: 's1', date: '2024-03-11', start_time: '09:00', end_time: '17:00', break_duration: 0 }),
        createMockShiftRow({ id: 's2', date: '2024-03-12', start_time: '09:00', end_time: '17:00', break_duration: 0 }),
        createMockShiftRow({ id: 's3', date: '2024-03-13', start_time: '09:00', end_time: '17:00', break_duration: 0 }),
        createMockShiftRow({ id: 's4', date: '2024-03-14', start_time: '09:00', end_time: '17:00', break_duration: 0 }),
      ]
      setupStandardMocks(shifts, { weekly_hours: 35 })

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      expect(emp.totalHours).toBe(32)
      expect(emp.overtimeHours).toBe(0)
      expect(emp.overtimeMajoration).toBe(0)
    })

    it('devrait appliquer +50% au-delà de 8h supplémentaires', async () => {
      // 6 shifts de 8h = 48h sur contrat 35h → 13h sup (8 à +25%, 5 à +50%)
      const shifts = [
        createMockShiftRow({ id: 's1', date: '2024-03-11', start_time: '07:00', end_time: '15:00', break_duration: 0 }),
        createMockShiftRow({ id: 's2', date: '2024-03-12', start_time: '07:00', end_time: '15:00', break_duration: 0 }),
        createMockShiftRow({ id: 's3', date: '2024-03-13', start_time: '07:00', end_time: '15:00', break_duration: 0 }),
        createMockShiftRow({ id: 's4', date: '2024-03-14', start_time: '07:00', end_time: '15:00', break_duration: 0 }),
        createMockShiftRow({ id: 's5', date: '2024-03-15', start_time: '07:00', end_time: '15:00', break_duration: 0 }),
        createMockShiftRow({ id: 's6', date: '2024-03-16', start_time: '07:00', end_time: '15:00', break_duration: 0 }),
      ]
      setupStandardMocks(shifts, { weekly_hours: 35 })

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      expect(emp.overtimeHours).toBe(13)
      // 8h * 12.5 * 0.25 = 25€ + 5h * 12.5 * 0.50 = 31.25€ = 56.25€
      expect(emp.overtimeMajoration).toBeCloseTo(56.25, 1)
    })
  })

  // ================================================================
  // Combinaisons de majorations
  // ================================================================

  describe('Combinaisons de majorations', () => {
    it('devrait cumuler dimanche + nuit', async () => {
      // Shift dimanche de nuit 20:00-06:00
      setupStandardMocks([createMockShiftRow({
        date: '2024-03-17', // dimanche
        start_time: '20:00',
        end_time: '06:00',
        break_duration: 0,
        has_night_action: true,
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      expect(emp.sundayMajoration).toBeGreaterThan(0)
      expect(emp.nightMajoration).toBeGreaterThan(0)
      // Total = base + sunday + night
      expect(emp.totalGrossPay).toBeGreaterThan(emp.basePay + emp.sundayMajoration)
    })
  })

  // ================================================================
  // Détails des shifts
  // ================================================================

  describe('Détails des shifts', () => {
    it('devrait retourner le détail de chaque shift', async () => {
      setupStandardMocks([createMockShiftRow({
        date: '2024-03-15',
        start_time: '09:00',
        end_time: '17:00',
        break_duration: 30,
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const detail = result!.employees[0].shiftsDetails[0]

      expect(detail.date).toBeInstanceOf(Date)
      expect(detail.startTime).toBe('09:00')
      expect(detail.endTime).toBe('17:00')
      expect(detail.breakDuration).toBe(30)
      expect(detail.effectiveHours).toBe(7.5) // 8h - 30min
      expect(detail.isSunday).toBe(false)
      expect(detail.isHoliday).toBe(false)
      expect(detail.pay).toBeGreaterThan(0)
    })

    it('devrait marquer les shifts de nuit dans les détails', async () => {
      setupStandardMocks([createMockShiftRow({
        date: '2024-03-15',
        start_time: '22:00',
        end_time: '06:00',
        break_duration: 0,
        has_night_action: true,
      })])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const detail = result!.employees[0].shiftsDetails[0]

      expect(detail.nightHours).toBeGreaterThan(0)
    })
  })

  // ================================================================
  // Totaux globaux
  // ================================================================

  describe('Totaux globaux', () => {
    it('devrait calculer les totaux sur tous les employés', async () => {
      // 2 contrats, chacun avec 1 shift
      const contract1 = createMockContract({ id: 'c1', employee_id: 'emp-1' })
      const contract2 = createMockContract({ id: 'c2', employee_id: 'emp-2',
        employee_profile: { profile: { id: 'emp-2', first_name: 'Pierre', last_name: 'Durand' } },
      })

      mockSupabaseSequence([
        // profiles
        { data: { first_name: 'Jean', last_name: 'Dupont' }, error: null },
        // employers
        { data: { address: { street: '1 rue', city: 'Paris', postalCode: '75001' }, cesu_number: null }, error: null },
        // contracts (2 contrats)
        { data: [contract1, contract2], error: null },
        // shifts contrat 1 (8h)
        { data: [createMockShiftRow({ id: 's1', contract_id: 'c1', start_time: '09:00', end_time: '17:00', break_duration: 0 })], error: null },
        // shifts contrat 2 (4h)
        { data: [createMockShiftRow({ id: 's2', contract_id: 'c2', start_time: '09:00', end_time: '13:00', break_duration: 0 })], error: null },
      ])

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)

      expect(result!.totalEmployees).toBe(2)
      expect(result!.totalHours).toBe(12) // 8 + 4
      expect(result!.totalGrossPay).toBe(150) // (8 * 12.5) + (4 * 12.5)
    })

    it('devrait arrondir les totaux à 2 décimales', async () => {
      // Taux qui provoque des décimales longues
      setupStandardMocks(
        [createMockShiftRow({
          start_time: '09:00',
          end_time: '12:20', // 3h20 = 3.333...h
          break_duration: 0,
        })],
        { hourly_rate: 13.33 },
      )

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      // Vérifier arrondi 2 décimales
      expect(emp.totalHours).toBe(Math.round(emp.totalHours * 100) / 100)
      expect(emp.basePay).toBe(Math.round(emp.basePay * 100) / 100)
      expect(emp.totalGrossPay).toBe(Math.round(emp.totalGrossPay * 100) / 100)
    })
  })

  // ================================================================
  // Heures normales (déduction)
  // ================================================================

  describe('Calcul heures normales vs spéciales', () => {
    it('devrait déduire dimanche + férié + overtime des heures normales', async () => {
      // Dimanche 17 mars : 8h = sundayHours
      // Lundi-vendredi (11-15) : 5 * 8h = 40h, dont 5h sup
      const shifts = [
        createMockShiftRow({ id: 's1', date: '2024-03-11', start_time: '08:00', end_time: '16:00', break_duration: 0 }),
        createMockShiftRow({ id: 's2', date: '2024-03-12', start_time: '08:00', end_time: '16:00', break_duration: 0 }),
        createMockShiftRow({ id: 's3', date: '2024-03-13', start_time: '08:00', end_time: '16:00', break_duration: 0 }),
        createMockShiftRow({ id: 's4', date: '2024-03-14', start_time: '08:00', end_time: '16:00', break_duration: 0 }),
        createMockShiftRow({ id: 's5', date: '2024-03-15', start_time: '08:00', end_time: '16:00', break_duration: 0 }),
        createMockShiftRow({ id: 's6', date: '2024-03-17', start_time: '08:00', end_time: '16:00', break_duration: 0 }), // dimanche
      ]
      setupStandardMocks(shifts, { weekly_hours: 35 })

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      // total = 48h, sunday = 8h, overtime = 13h
      // normal = 48 - 8 - 0 (holiday) - 13 = 27
      expect(emp.totalHours).toBe(48)
      expect(emp.sundayHours).toBe(8)
      expect(emp.normalHours).toBe(emp.totalHours - emp.sundayHours - emp.holidayHours - emp.overtimeHours)
    })
  })

  // ================================================================
  // Vérification des taux MAJORATION_RATES
  // ================================================================

  describe('Taux de majoration IDCC 3239', () => {
    it('devrait utiliser les taux officiels de la convention collective', () => {
      expect(MAJORATION_RATES.SUNDAY).toBe(0.30)
      expect(MAJORATION_RATES.PUBLIC_HOLIDAY_WORKED).toBe(0.60)
      expect(MAJORATION_RATES.NIGHT).toBe(0.20)
      expect(MAJORATION_RATES.OVERTIME_FIRST_8H).toBe(0.25)
      expect(MAJORATION_RATES.OVERTIME_BEYOND_8H).toBe(0.50)
    })
  })

  // ================================================================
  // Filtre par employeeIds
  // ================================================================

  describe('Filtre par employeeIds', () => {
    it('devrait passer les employeeIds au filtre contrats', async () => {
      const chains = setupStandardMocks()

      await getMonthlyDeclarationData('employer-1', {
        ...defaultOptions,
        employeeIds: ['emp-456'],
      })

      // Le 3e appel (contracts) devrait avoir reçu .in()
      expect(chains[2].in).toHaveBeenCalled()
    })
  })

  // ================================================================
  // Profil employé manquant
  // ================================================================

  describe('Profil employé manquant', () => {
    it('devrait utiliser des chaînes vides si le profil est absent', async () => {
      setupStandardMocks(
        [createMockShiftRow()],
        { employee_profile: null },
      )

      const result = await getMonthlyDeclarationData('employer-1', defaultOptions)
      const emp = result!.employees[0]

      expect(emp.firstName).toBe('')
      expect(emp.lastName).toBe('')
    })
  })
})
