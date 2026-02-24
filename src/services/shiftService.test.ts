import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  validateShift,
  getUpcomingShiftsForEmployee,
} from './shiftService'

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

vi.mock('@/lib/sanitize', () => ({
  sanitizeText: vi.fn((text: string) => text.trim()),
}))

// Mock du service de notification
const mockGetProfileName = vi.fn().mockResolvedValue('Jean Dupont')
const mockCreateShiftCreatedNotification = vi.fn().mockResolvedValue(undefined)
const mockCreateShiftCancelledNotification = vi.fn().mockResolvedValue(undefined)
const mockCreateShiftModifiedNotification = vi.fn().mockResolvedValue(undefined)

vi.mock('@/services/notificationService', () => ({
  getProfileName: (...args: unknown[]) => mockGetProfileName(...args),
  createShiftCreatedNotification: (...args: unknown[]) => mockCreateShiftCreatedNotification(...args),
  createShiftCancelledNotification: (...args: unknown[]) => mockCreateShiftCancelledNotification(...args),
  createShiftModifiedNotification: (...args: unknown[]) => mockCreateShiftModifiedNotification(...args),
}))

// ─── Helpers ────────────────────────────────────────────────────────

/** Configure mockFrom pour retourner une chaîne fluide Supabase */
function mockSupabaseQuery(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.lte = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  chain.limit = vi.fn().mockReturnValue(chain)

  // Résoudre aussi comme promesse (quand la chaîne se termine sans .single)
  const promise = Promise.resolve(resolvedValue)
  Object.assign(chain, { then: promise.then.bind(promise), catch: promise.catch.bind(promise) })

  mockFrom.mockReturnValue(chain)
  return chain
}

/**
 * Configure mockFrom pour retourner des résultats différents à chaque appel.
 * Utile quand une fonction appelle supabase.from() plusieurs fois.
 */
function mockSupabaseQuerySequence(calls: Array<{ data: unknown; error: unknown }>) {
  const chains: Array<Record<string, ReturnType<typeof vi.fn>>> = []

  for (const resolvedValue of calls) {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.gte = vi.fn().mockReturnValue(chain)
    chain.lte = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue(resolvedValue)
    chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
    chain.limit = vi.fn().mockReturnValue(chain)
    const promise = Promise.resolve(resolvedValue)
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

// Helper pour créer des données de shift mock
function createMockShiftDbData(overrides = {}) {
  return {
    id: 'shift-123',
    contract_id: 'contract-456',
    date: '2024-03-15',
    start_time: '09:00',
    end_time: '17:00',
    break_duration: 60,
    tasks: ['Aide au lever', 'Préparation repas'],
    notes: 'RAS',
    status: 'planned',
    computed_pay: {
      basePay: 80,
      sundayMajoration: 0,
      holidayMajoration: 0,
      nightMajoration: 0,
      overtimeMajoration: 0,
      totalPay: 80,
    },
    validated_by_employer: false,
    validated_by_employee: false,
    created_at: '2024-03-01T10:00:00.000Z',
    updated_at: '2024-03-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('shiftService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getShiftById', () => {
    it('devrait récupérer un shift par son ID', async () => {
      const mockShift = createMockShiftDbData()
      mockSupabaseQuery({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('shift-123')
      expect(result?.startTime).toBe('09:00')
      expect(result?.endTime).toBe('17:00')
    })

    it('devrait retourner null si le shift n\'existe pas', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'Not found' } })

      const result = await getShiftById('invalid-id')

      expect(result).toBeNull()
    })

    it('devrait mapper correctement le computed pay', async () => {
      const mockShift = createMockShiftDbData({
        computed_pay: {
          basePay: 100,
          sundayMajoration: 30,
          holidayMajoration: 0,
          nightMajoration: 20,
          overtimeMajoration: 25,
          totalPay: 175,
        },
      })
      mockSupabaseQuery({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result?.computedPay.basePay).toBe(100)
      expect(result?.computedPay.sundayMajoration).toBe(30)
      expect(result?.computedPay.totalPay).toBe(175)
    })

    it('devrait convertir snake_case en camelCase', async () => {
      const mockShift = createMockShiftDbData({
        contract_id: 'test-contract',
        break_duration: 45,
        start_time: '08:30',
        end_time: '16:30',
        validated_by_employer: true,
        validated_by_employee: false,
      })
      mockSupabaseQuery({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result?.contractId).toBe('test-contract')
      expect(result?.breakDuration).toBe(45)
      expect(result?.startTime).toBe('08:30')
      expect(result?.endTime).toBe('16:30')
      expect(result?.validatedByEmployer).toBe(true)
      expect(result?.validatedByEmployee).toBe(false)
    })

    it('devrait gérer les valeurs nulles/undefined', async () => {
      const mockShift = createMockShiftDbData({
        notes: null,
        tasks: null,
        break_duration: null,
        computed_pay: null,
      })
      mockSupabaseQuery({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result?.notes).toBeUndefined()
      expect(result?.tasks).toEqual([])
      expect(result?.breakDuration).toBe(0)
      expect(result?.computedPay.basePay).toBe(0)
    })

    it('devrait mapper correctement les dates', async () => {
      const mockShift = createMockShiftDbData({ date: '2024-03-15' })
      mockSupabaseQuery({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result?.date).toBeInstanceOf(Date)
      expect(result?.date.toISOString()).toContain('2024-03-15')
    })
  })

  describe('createShift', () => {
    it('devrait créer un shift avec succès', async () => {
      const mockCreatedShift = createMockShiftDbData()
      // 1er appel: insert shift, 2e appel: select contract pour notification
      mockSupabaseQuerySequence([
        { data: mockCreatedShift, error: null },
        { data: { employee_id: 'emp-123', employer_id: 'employer-123' }, error: null },
      ])

      const result = await createShift('contract-456', {
        date: new Date('2024-03-15'),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 60,
        tasks: ['Aide au lever'],
        notes: 'Test',
      })

      expect(result).not.toBeNull()
      expect(result?.id).toBe('shift-123')
    })

    it('devrait lancer une erreur si la création échoue', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'Constraint violation' } })

      await expect(
        createShift('contract-456', {
          date: new Date('2024-03-15'),
          startTime: '09:00',
          endTime: '17:00',
        })
      ).rejects.toThrow('Constraint violation')
    })

    it('devrait utiliser les valeurs par défaut pour les champs optionnels', async () => {
      const mockCreatedShift = createMockShiftDbData({
        break_duration: 0,
        tasks: [],
        notes: null,
      })
      // 1er appel: insert, 2e appel: contract lookup (retourne null)
      mockSupabaseQuerySequence([
        { data: mockCreatedShift, error: null },
        { data: null, error: null },
      ])

      const result = await createShift('contract-456', {
        date: new Date('2024-03-15'),
        startTime: '09:00',
        endTime: '17:00',
      })

      expect(result?.breakDuration).toBe(0)
      expect(result?.tasks).toEqual([])
    })
  })

  describe('updateShift', () => {
    it('devrait lancer une erreur si la mise à jour échoue', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'Update failed' } })

      await expect(
        updateShift('shift-123', { status: 'completed' })
      ).rejects.toThrow('Update failed')
    })
  })

  describe('deleteShift', () => {
    it('devrait supprimer un shift avec succès', async () => {
      mockSupabaseQuery({ data: null, error: null })

      await expect(deleteShift('shift-123')).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si la suppression échoue', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'Delete failed' } })

      await expect(deleteShift('shift-123')).rejects.toThrow('Delete failed')
    })
  })

  describe('validateShift', () => {
    it('devrait valider un shift côté employeur', async () => {
      mockSupabaseQuery({ data: null, error: null })

      await expect(validateShift('shift-123', 'employer')).resolves.not.toThrow()
    })

    it('devrait valider un shift côté employé', async () => {
      mockSupabaseQuery({ data: null, error: null })

      await expect(validateShift('shift-123', 'employee')).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si la validation échoue', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'Validation failed' } })

      await expect(validateShift('shift-123', 'employer')).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  // ─── Nouveaux tests : getShifts ──────────────────────────────────

  describe('getShifts', () => {
    const startDate = new Date('2024-03-01')
    const endDate = new Date('2024-03-31')

    it('devrait récupérer les shifts pour un employeur', async () => {
      const mockShifts = [
        createMockShiftDbData({ id: 'shift-1' }),
        createMockShiftDbData({ id: 'shift-2', start_time: '14:00', end_time: '18:00' }),
      ]
      // getShifts se termine par .order() qui résout la promesse
      mockSupabaseQuery({ data: mockShifts, error: null })

      const result = await getShifts('profile-employer', 'employer', startDate, endDate)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('shift-1')
      expect(result[1].id).toBe('shift-2')
      expect(mockFrom).toHaveBeenCalledWith('shifts')
    })

    it('devrait récupérer les shifts pour un employé', async () => {
      const mockShifts = [createMockShiftDbData()]
      mockSupabaseQuery({ data: mockShifts, error: null })

      const result = await getShifts('profile-employee', 'employee', startDate, endDate)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('shift-123')
    })

    it('devrait retourner un tableau vide en cas d\'erreur', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

      const result = await getShifts('profile-1', 'employer', startDate, endDate)

      expect(result).toEqual([])
    })

    it('devrait retourner un tableau vide si data est null', async () => {
      mockSupabaseQuery({ data: null, error: null })

      const result = await getShifts('profile-1', 'employer', startDate, endDate)

      expect(result).toEqual([])
    })

    it('devrait mapper correctement chaque shift retourné', async () => {
      const mockShifts = [
        createMockShiftDbData({
          id: 'shift-a',
          has_night_action: true,
          notes: 'Note test',
        }),
      ]
      mockSupabaseQuery({ data: mockShifts, error: null })

      const result = await getShifts('profile-1', 'employer', startDate, endDate)

      expect(result[0].hasNightAction).toBe(true)
      expect(result[0].notes).toBe('Note test')
      expect(result[0].date).toBeInstanceOf(Date)
      expect(result[0].createdAt).toBeInstanceOf(Date)
      expect(result[0].updatedAt).toBeInstanceOf(Date)
    })
  })

  // ─── Nouveaux tests : getShiftById (branches supplémentaires) ────

  describe('getShiftById (branches supplémentaires)', () => {
    it('devrait mapper has_night_action à true', async () => {
      const mockShift = createMockShiftDbData({ has_night_action: true })
      mockSupabaseQuery({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result?.hasNightAction).toBe(true)
    })

    it('devrait mapper has_night_action à false', async () => {
      const mockShift = createMockShiftDbData({ has_night_action: false })
      mockSupabaseQuery({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result?.hasNightAction).toBe(false)
    })

    it('devrait mapper has_night_action null en undefined', async () => {
      const mockShift = createMockShiftDbData({ has_night_action: null })
      mockSupabaseQuery({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result?.hasNightAction).toBeUndefined()
    })
  })

  // ─── Nouveaux tests : createShift (branches supplémentaires) ─────

  describe('createShift (branches supplémentaires)', () => {
    it('devrait envoyer une notification à l\'auxiliaire après création', async () => {
      const mockCreatedShift = createMockShiftDbData()
      mockSupabaseQuerySequence([
        { data: mockCreatedShift, error: null },
        { data: { employee_id: 'emp-99', employer_id: 'employer-99' }, error: null },
      ])

      await createShift('contract-456', {
        date: new Date('2024-03-15'),
        startTime: '09:00',
        endTime: '17:00',
      })

      expect(mockGetProfileName).toHaveBeenCalledWith('employer-99')
      expect(mockCreateShiftCreatedNotification).toHaveBeenCalledWith(
        'emp-99',
        new Date('2024-03-15'),
        '09:00',
        'Jean Dupont'
      )
    })

    it('devrait ne pas planter si la notification échoue', async () => {
      const mockCreatedShift = createMockShiftDbData()
      mockSupabaseQuerySequence([
        { data: mockCreatedShift, error: null },
        { data: { employee_id: 'emp-99', employer_id: 'employer-99' }, error: null },
      ])
      mockGetProfileName.mockRejectedValueOnce(new Error('Notification fail'))

      const result = await createShift('contract-456', {
        date: new Date('2024-03-15'),
        startTime: '09:00',
        endTime: '17:00',
      })

      // La fonction ne doit pas planter malgré l'erreur de notification
      expect(result).not.toBeNull()
      expect(result?.id).toBe('shift-123')
    })

    it('devrait ne pas notifier si le contrat est introuvable', async () => {
      const mockCreatedShift = createMockShiftDbData()
      mockSupabaseQuerySequence([
        { data: mockCreatedShift, error: null },
        { data: null, error: null },
      ])

      await createShift('contract-456', {
        date: new Date('2024-03-15'),
        startTime: '09:00',
        endTime: '17:00',
      })

      expect(mockCreateShiftCreatedNotification).not.toHaveBeenCalled()
    })

    it('devrait passer hasNightAction dans l\'insertion', async () => {
      const mockCreatedShift = createMockShiftDbData({ has_night_action: true })
      const chains = mockSupabaseQuerySequence([
        { data: mockCreatedShift, error: null },
        { data: null, error: null },
      ])

      await createShift('contract-456', {
        date: new Date('2024-03-15'),
        startTime: '09:00',
        endTime: '17:00',
        hasNightAction: true,
      })

      // Vérifie que insert a été appelé avec has_night_action
      expect(chains[0].insert).toHaveBeenCalledWith(
        expect.objectContaining({ has_night_action: true })
      )
    })

    it('devrait passer has_night_action à null quand non fourni', async () => {
      const mockCreatedShift = createMockShiftDbData()
      const chains = mockSupabaseQuerySequence([
        { data: mockCreatedShift, error: null },
        { data: null, error: null },
      ])

      await createShift('contract-456', {
        date: new Date('2024-03-15'),
        startTime: '09:00',
        endTime: '17:00',
      })

      expect(chains[0].insert).toHaveBeenCalledWith(
        expect.objectContaining({ has_night_action: null })
      )
    })
  })

  // ─── Nouveaux tests : updateShift (branches supplémentaires) ─────

  describe('updateShift (branches supplémentaires)', () => {
    it('devrait mettre à jour un shift avec succès (status seul)', async () => {
      // update().eq() résout sans erreur, pas de notification car status simple
      mockSupabaseQuery({ data: null, error: null })

      await expect(
        updateShift('shift-123', { status: 'completed' })
      ).resolves.not.toThrow()
    })

    it('devrait construire le payload avec toutes les propriétés', async () => {
      const chain = mockSupabaseQuery({ data: null, error: null })

      await updateShift('shift-123', {
        date: new Date('2024-04-01'),
        startTime: '10:00',
        endTime: '18:00',
        breakDuration: 30,
        tasks: ['Toilette', 'Repas'],
        notes: 'Changement horaire',
        hasNightAction: false,
        status: 'completed',
      })

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2024-04-01',
          start_time: '10:00',
          end_time: '18:00',
          break_duration: 30,
          tasks: ['Toilette', 'Repas'],
          notes: 'Changement horaire',
          has_night_action: false,
          status: 'completed',
        })
      )
    })

    it('devrait mettre notes à null quand notes est une chaîne vide', async () => {
      const chain = mockSupabaseQuery({ data: null, error: null })

      await updateShift('shift-123', { notes: '' })

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null })
      )
    })

    it('devrait mettre breakDuration à 0 quand explicitement fourni', async () => {
      const chain = mockSupabaseQuery({ data: null, error: null })

      await updateShift('shift-123', { breakDuration: 0 })

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ break_duration: 0 })
      )
    })

    it('devrait envoyer une notification de modification quand l\'horaire change', async () => {
      // 1er appel: update, 2e appel: select shift, 3e appel: select contract
      mockSupabaseQuerySequence([
        { data: null, error: null },
        { data: { date: '2024-03-15', start_time: '10:00', contract_id: 'contract-456' }, error: null },
        { data: { employee_id: 'emp-123' }, error: null },
      ])

      await updateShift('shift-123', { startTime: '10:00' })

      expect(mockCreateShiftModifiedNotification).toHaveBeenCalledWith(
        'emp-123',
        expect.any(Date),
        '10:00'
      )
    })

    it('devrait envoyer une notification de modification quand la date change', async () => {
      mockSupabaseQuerySequence([
        { data: null, error: null },
        { data: { date: '2024-04-01', start_time: '09:00', contract_id: 'contract-456' }, error: null },
        { data: { employee_id: 'emp-123' }, error: null },
      ])

      await updateShift('shift-123', { date: new Date('2024-04-01') })

      expect(mockCreateShiftModifiedNotification).toHaveBeenCalledWith(
        'emp-123',
        expect.any(Date),
        '09:00'
      )
    })

    it('devrait envoyer une notification d\'annulation quand status = cancelled', async () => {
      // 1er appel: update, 2e appel: select shift, 3e appel: select contract
      mockSupabaseQuerySequence([
        { data: null, error: null },
        { data: { date: '2024-03-15', start_time: '09:00', contract_id: 'contract-456' }, error: null },
        { data: { employee_id: 'emp-123' }, error: null },
      ])

      await updateShift('shift-123', { status: 'cancelled' })

      expect(mockCreateShiftCancelledNotification).toHaveBeenCalledWith(
        'emp-123',
        expect.any(Date),
        '09:00'
      )
    })

    it('devrait ne pas envoyer de notification de modification quand status = cancelled avec changement horaire', async () => {
      // Quand status=cancelled ET scheduleChanged, seule la notification d'annulation est envoyée
      // car la condition exclut: scheduleChanged && updates.status !== 'cancelled'
      mockSupabaseQuerySequence([
        { data: null, error: null },
        // Pour la notification cancelled: shift lookup
        { data: { date: '2024-03-15', start_time: '10:00', contract_id: 'contract-456' }, error: null },
        // Pour la notification cancelled: contract lookup
        { data: { employee_id: 'emp-123' }, error: null },
      ])

      await updateShift('shift-123', { startTime: '10:00', status: 'cancelled' })

      expect(mockCreateShiftModifiedNotification).not.toHaveBeenCalled()
      expect(mockCreateShiftCancelledNotification).toHaveBeenCalled()
    })

    it('devrait ne pas planter si la notification de modification échoue', async () => {
      mockSupabaseQuerySequence([
        { data: null, error: null },
        { data: { date: '2024-03-15', start_time: '10:00', contract_id: 'contract-456' }, error: null },
        { data: { employee_id: 'emp-123' }, error: null },
      ])
      mockCreateShiftModifiedNotification.mockRejectedValueOnce(new Error('Notif fail'))

      await expect(
        updateShift('shift-123', { startTime: '10:00' })
      ).resolves.not.toThrow()
    })

    it('devrait ne pas planter si la notification d\'annulation échoue', async () => {
      mockSupabaseQuerySequence([
        { data: null, error: null },
        { data: { date: '2024-03-15', start_time: '09:00', contract_id: 'contract-456' }, error: null },
        { data: { employee_id: 'emp-123' }, error: null },
      ])
      mockCreateShiftCancelledNotification.mockRejectedValueOnce(new Error('Notif fail'))

      await expect(
        updateShift('shift-123', { status: 'cancelled' })
      ).resolves.not.toThrow()
    })

    it('devrait ne pas notifier si le shift est introuvable pour modification', async () => {
      mockSupabaseQuerySequence([
        { data: null, error: null },
        { data: null, error: { message: 'Not found' } },
      ])

      await updateShift('shift-123', { startTime: '10:00' })

      expect(mockCreateShiftModifiedNotification).not.toHaveBeenCalled()
    })

    it('devrait ne pas notifier si le contrat est introuvable pour modification', async () => {
      mockSupabaseQuerySequence([
        { data: null, error: null },
        { data: { date: '2024-03-15', start_time: '10:00', contract_id: 'contract-456' }, error: null },
        { data: null, error: null },
      ])

      await updateShift('shift-123', { startTime: '10:00' })

      expect(mockCreateShiftModifiedNotification).not.toHaveBeenCalled()
    })

    it('devrait ne pas notifier si le shift est introuvable pour annulation', async () => {
      mockSupabaseQuerySequence([
        { data: null, error: null },
        { data: null, error: { message: 'Not found' } },
      ])

      await updateShift('shift-123', { status: 'cancelled' })

      expect(mockCreateShiftCancelledNotification).not.toHaveBeenCalled()
    })

    it('devrait ne pas notifier si le contrat est introuvable pour annulation', async () => {
      mockSupabaseQuerySequence([
        { data: null, error: null },
        { data: { date: '2024-03-15', start_time: '09:00', contract_id: 'contract-456' }, error: null },
        { data: null, error: null },
      ])

      await updateShift('shift-123', { status: 'cancelled' })

      expect(mockCreateShiftCancelledNotification).not.toHaveBeenCalled()
    })

    it('devrait ne pas envoyer de notification quand seuls tasks/notes changent', async () => {
      mockSupabaseQuery({ data: null, error: null })

      await updateShift('shift-123', { tasks: ['Nouvelle tâche'], notes: 'Mise à jour' })

      expect(mockCreateShiftModifiedNotification).not.toHaveBeenCalled()
      expect(mockCreateShiftCancelledNotification).not.toHaveBeenCalled()
    })
  })

  // ─── getUpcomingShiftsForEmployee ────────────────────────────────────
  describe('getUpcomingShiftsForEmployee', () => {
    it('retourne les shifts planifiés dans la plage de dates', async () => {
      const mockShifts = [
        {
          id: 'shift-1',
          date: '2026-02-25',
          start_time: '08:00',
          contract_id: 'contract-1',
          contract: { employer_id: 'employer-1', employee_id: 'employee-1' },
        },
      ]
      mockSupabaseQuery({ data: mockShifts, error: null })

      const result = await getUpcomingShiftsForEmployee('employee-1', '2026-02-25', '2026-02-26')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('shift-1')
      expect(result[0].contract?.employer_id).toBe('employer-1')
    })

    it('retourne un tableau vide en cas d\'erreur', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

      const result = await getUpcomingShiftsForEmployee('employee-1', '2026-02-25', '2026-02-26')

      expect(result).toEqual([])
    })

    it('retourne un tableau vide si aucun shift trouvé', async () => {
      mockSupabaseQuery({ data: [], error: null })

      const result = await getUpcomingShiftsForEmployee('employee-1', '2026-02-25', '2026-02-26')

      expect(result).toEqual([])
    })
  })
})
