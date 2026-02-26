import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getPayslipData } from './payslipService'
import type { MonthlyDeclarationData, CotisationsResult } from './types'

// ─── Mocks ──────────────────────────────────────────────────────────────────

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

vi.mock('./declarationService', () => ({
  getMonthlyDeclarationData: vi.fn(),
}))

vi.mock('./cotisationsCalculator', () => ({
  calculateCotisations: vi.fn(),
}))

vi.mock('./types', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./types')>()
  return {
    ...actual,
    getMonthLabel: vi.fn(() => 'Janvier 2025'),
  }
})

// ─── Imports après les mocks ─────────────────────────────────────────────────

import { getMonthlyDeclarationData } from './declarationService'
import { calculateCotisations } from './cotisationsCalculator'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockCotisations: CotisationsResult = {
  passMonthly: 3925,
  smicMonthly: 1801.8,
  grossPay: 1500,
  employeeCotisations: [],
  totalEmployeeDeductions: 200,
  employerCotisations: [],
  totalEmployerContributions: 300,
  netImposable: 1300,
  pasAmount: 0,
  netAPayer: 1300,
  pasRate: 0,
  isExemptPatronalSS: false,
}

const mockEmpData = {
  contractId: 'contract-abc',
  firstName: 'Marie',
  lastName: 'Martin',
  contractType: 'CDI' as const,
  hourlyRate: 12.5,
  totalHours: 80,
  normalHours: 80,
  sundayHours: 0,
  holidayHours: 0,
  nightHours: 0,
  overtimeHours: 0,
  basePay: 1000,
  sundayMajoration: 0,
  holidayMajoration: 0,
  nightMajoration: 0,
  overtimeMajoration: 0,
  totalGrossPay: 1000,
  shiftsCount: 10,
  employeeId: 'emp-456',
  shiftsDetails: [],
}

const mockMonthlyData: MonthlyDeclarationData = {
  year: 2025,
  month: 1,
  periodLabel: 'Janvier 2025',
  employerId: 'employer-1',
  employerFirstName: 'Jean',
  employerLastName: 'Dupont',
  employerAddress: '1 rue Test, 75001 Paris',
  cesuNumber: 'CESU-123',
  employees: [mockEmpData],
  totalHours: 80,
  totalGrossPay: 1000,
  totalEmployees: 1,
  generatedAt: new Date('2025-01-31'),
}

// ─── Helper Supabase ─────────────────────────────────────────────────────────

function mockSupabaseQuery(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single.mockResolvedValue({ data, error })
  chain.maybeSingle.mockResolvedValue({ data, error })
  mockFrom.mockReturnValue(chain)
  return chain
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getPayslipData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(calculateCotisations).mockReturnValue(mockCotisations)
  })

  // ============================================================
  // Cas null — getMonthlyDeclarationData retourne null
  // ============================================================

  describe('Retourne null si données absentes', () => {
    it('devrait retourner null si getMonthlyDeclarationData retourne null', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(null)

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result).toBeNull()
    })

    it('devrait retourner null si la liste employees est vide', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue({
        ...mockMonthlyData,
        employees: [],
        totalEmployees: 0,
      })

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result).toBeNull()
    })

    it('devrait appeler logger.error quand getMonthlyDeclarationData retourne null', async () => {
      const { logger } = await import('@/lib/logger')
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(null)

      await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(logger.error).toHaveBeenCalledWith(
        'Aucune donnée de paie trouvée',
        expect.objectContaining({ employeeId: 'emp-456', year: 2025, month: 1 })
      )
    })

    it('devrait appeler logger.error quand employees est vide', async () => {
      const { logger } = await import('@/lib/logger')
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue({
        ...mockMonthlyData,
        employees: [],
        totalEmployees: 0,
      })

      await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(logger.error).toHaveBeenCalledOnce()
    })
  })

  // ============================================================
  // Cas nominal — weeklyHours depuis le contrat
  // ============================================================

  describe('Retourne les données calculées si tout va bien', () => {
    it('devrait retourner un PayslipData complet avec weeklyHours depuis la BDD', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result).not.toBeNull()
      expect(result!.weeklyHours).toBe(35)
    })

    it('devrait mapper correctement les champs employeur', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result!.employerId).toBe('employer-1')
      expect(result!.employerFirstName).toBe('Jean')
      expect(result!.employerLastName).toBe('Dupont')
      expect(result!.employerAddress).toBe('1 rue Test, 75001 Paris')
    })

    it('devrait mapper correctement les champs employé', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result!.employeeId).toBe('emp-456')
      expect(result!.employeeFirstName).toBe('Marie')
      expect(result!.employeeLastName).toBe('Martin')
      expect(result!.contractType).toBe('CDI')
      expect(result!.hourlyRate).toBe(12.5)
    })

    it('devrait mapper correctement les heures et rémunérations', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result!.totalHours).toBe(80)
      expect(result!.normalHours).toBe(80)
      expect(result!.sundayHours).toBe(0)
      expect(result!.holidayHours).toBe(0)
      expect(result!.nightHours).toBe(0)
      expect(result!.overtimeHours).toBe(0)
      expect(result!.basePay).toBe(1000)
      expect(result!.sundayMajoration).toBe(0)
      expect(result!.holidayMajoration).toBe(0)
      expect(result!.nightMajoration).toBe(0)
      expect(result!.overtimeMajoration).toBe(0)
      expect(result!.totalGrossPay).toBe(1000)
      expect(result!.shiftsCount).toBe(10)
    })

    it('devrait fixer presenceResponsiblePay et nightPresenceAllowance à 0', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result!.presenceResponsiblePay).toBe(0)
      expect(result!.nightPresenceAllowance).toBe(0)
    })

    it('devrait attacher les cotisations calculées', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result!.cotisations).toBe(mockCotisations)
      expect(calculateCotisations).toHaveBeenCalledWith(
        mockEmpData.totalGrossPay,
        { pasRate: 0, isExemptPatronalSS: false }
      )
    })

    it('devrait inclure generatedAt comme instance de Date', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result!.generatedAt).toBeInstanceOf(Date)
    })

    it('devrait passer year et month dans les options de declarationService', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      await getPayslipData('employer-1', 'emp-456', 2025, 3)

      expect(getMonthlyDeclarationData).toHaveBeenCalledWith(
        'employer-1',
        expect.objectContaining({ year: 2025, month: 3, employeeIds: ['emp-456'] })
      )
    })
  })

  // ============================================================
  // Fallback 35h si getContractWeeklyHours retourne null
  // ============================================================

  describe('Fallback weeklyHours = 35 si erreur Supabase', () => {
    it('devrait utiliser 35h par défaut si Supabase retourne une erreur', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery(null, { message: 'Not found' })

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result).not.toBeNull()
      expect(result!.weeklyHours).toBe(35)
    })

    it('devrait utiliser 35h par défaut si Supabase retourne data null sans erreur', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery(null, null)

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result).not.toBeNull()
      expect(result!.weeklyHours).toBe(35)
    })

    it('devrait interroger la table contracts avec le contractId de l\'employé', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      const chain = mockSupabaseQuery({ weekly_hours: 28 })

      await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(mockFrom).toHaveBeenCalledWith('contracts')
      expect(chain.select).toHaveBeenCalledWith('weekly_hours')
      expect(chain.eq).toHaveBeenCalledWith('id', 'contract-abc')
    })
  })

  // ============================================================
  // Valeurs par défaut pasRate=0 et isExemptPatronalSS=false
  // ============================================================

  describe('Valeurs par défaut des paramètres optionnels', () => {
    it('devrait utiliser pasRate=0 par défaut', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(calculateCotisations).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ pasRate: 0 })
      )
    })

    it('devrait utiliser isExemptPatronalSS=false par défaut', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result!.isExemptPatronalSS).toBe(false)
      expect(calculateCotisations).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ isExemptPatronalSS: false })
      )
    })

    it('devrait transmettre pasRate personnalisé à calculateCotisations', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      await getPayslipData('employer-1', 'emp-456', 2025, 1, 0.1)

      expect(calculateCotisations).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ pasRate: 0.1 })
      )
    })

    it('devrait transmettre isExemptPatronalSS=true à calculateCotisations et au résultat', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })
      const exemptCotisations = { ...mockCotisations, isExemptPatronalSS: true }
      vi.mocked(calculateCotisations).mockReturnValue(exemptCotisations)

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1, 0, true)

      expect(result!.isExemptPatronalSS).toBe(true)
      expect(calculateCotisations).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ isExemptPatronalSS: true })
      )
    })

    it('devrait transmettre year et month au résultat', async () => {
      vi.mocked(getMonthlyDeclarationData).mockResolvedValue(mockMonthlyData)
      mockSupabaseQuery({ weekly_hours: 35 })

      const result = await getPayslipData('employer-1', 'emp-456', 2025, 1)

      expect(result!.year).toBe(2025)
      expect(result!.month).toBe(1)
    })
  })
})
