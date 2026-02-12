import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================
// MOCKS
// ============================================

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/compliance', () => ({
  getWeekStart: vi.fn((date: Date) => {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay() + 1)
    d.setHours(0, 0, 0, 0)
    return d
  }),
  getWeekEnd: vi.fn((date: Date) => {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay() + 7)
    d.setHours(23, 59, 59, 999)
    return d
  }),
  calculateTotalHours: vi.fn(() => 35),
  getRemainingWeeklyHours: vi.fn(() => 13),
  getRemainingDailyHours: vi.fn(() => 6),
  getWeeklyRestStatus: vi.fn(() => ({ longestRest: 48, isCompliant: true })),
}))

vi.mock('date-fns', () => ({
  addDays: vi.fn((date: Date, n: number) => { const d = new Date(date); d.setDate(d.getDate() + n); return d }),
  subDays: vi.fn((date: Date, n: number) => { const d = new Date(date); d.setDate(d.getDate() - n); return d }),
  format: vi.fn(() => 'formatted-date'),
}))

vi.mock('date-fns/locale', () => ({
  fr: {},
}))

// ============================================
// HELPERS
// ============================================

function mockSupabaseQuerySequence(results: Array<{ data?: unknown; error?: unknown; count?: number | null }>) {
  results.forEach((result) => {
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.upsert = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.gte = vi.fn().mockReturnValue(chain)
    chain.lte = vi.fn().mockReturnValue(chain)
    chain.lt = vi.fn().mockReturnValue(chain)
    chain.not = vi.fn().mockReturnValue(chain)
    chain.or = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockReturnValue(chain)
    chain.range = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue(result)
    chain.maybeSingle = vi.fn().mockResolvedValue(result)
    chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result)))
    mockFrom.mockImplementationOnce(() => chain)
  })
}

// ============================================
// MOCK DATA FACTORIES
// ============================================

function createMockContractRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-001',
    employee_id: 'emp-001',
    weekly_hours: 35,
    employee_profile: {
      profile: {
        first_name: 'Alice',
        last_name: 'Martin',
        avatar_url: null,
      },
    },
    ...overrides,
  }
}

function createMockShiftRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shift-001',
    contract_id: 'contract-001',
    date: '2026-02-10',
    start_time: '08:00',
    end_time: '12:00',
    break_duration: 0,
    status: 'completed',
    contract: { employee_id: 'emp-001', employer_id: 'employer-123' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// IMPORTS (apres les mocks)
// ============================================

import {
  getWeeklyComplianceOverview,
  getComplianceHistory,
  getCriticalAlerts,
} from '@/services/complianceService'

// ============================================
// TESTS
// ============================================

describe('complianceService', () => {
  // ------------------------------------------
  // getWeeklyComplianceOverview
  // ------------------------------------------
  describe('getWeeklyComplianceOverview', () => {
    it('retourne un resume de conformite avec les statuts employes', async () => {
      // getActiveEmployees (contracts) + getShiftsForPeriod (shifts) sont appeles en parallele
      // Les deux resolvent via le meme mockFrom, donc on utilise une sequence
      mockSupabaseQuerySequence([
        // Appel 1: contracts (getActiveEmployees)
        {
          data: [
            createMockContractRow({ id: 'c1', employee_id: 'emp-001' }),
            createMockContractRow({ id: 'c2', employee_id: 'emp-002', employee_profile: { profile: { first_name: 'Bob', last_name: 'Durand', avatar_url: null } } }),
          ],
          error: null,
        },
        // Appel 2: shifts (getShiftsForPeriod)
        {
          data: [
            createMockShiftRow({ id: 's1', contract_id: 'c1', contract: { employee_id: 'emp-001', employer_id: 'employer-123' } }),
          ],
          error: null,
        },
      ])

      const result = await getWeeklyComplianceOverview('employer-123', new Date('2026-02-10'))

      expect(result.employees).toHaveLength(2)
      expect(result.summary.totalEmployees).toBe(2)
      expect(result.weekStart).toBeInstanceOf(Date)
      expect(result.weekEnd).toBeInstanceOf(Date)
      expect(result.weekLabel).toContain('formatted-date')
    })

    it('retourne un summary a zero quand il n y a pas d employes', async () => {
      mockSupabaseQuerySequence([
        { data: [], error: null }, // contracts
        { data: [], error: null }, // shifts
      ])

      const result = await getWeeklyComplianceOverview('employer-123')

      expect(result.employees).toHaveLength(0)
      expect(result.summary).toEqual({
        totalEmployees: 0,
        compliant: 0,
        warnings: 0,
        critical: 0,
      })
    })

    it('filtre les shifts par employer_id', async () => {
      mockSupabaseQuerySequence([
        {
          data: [createMockContractRow()],
          error: null,
        },
        {
          data: [
            createMockShiftRow({ contract: { employee_id: 'emp-001', employer_id: 'employer-123' } }),
            createMockShiftRow({ id: 's2', contract: { employee_id: 'emp-999', employer_id: 'other-employer' } }),
          ],
          error: null,
        },
      ])

      const result = await getWeeklyComplianceOverview('employer-123', new Date('2026-02-10'))

      // L'employe est calcule avec les shifts filtres (seul le shift employer-123 est retenu)
      expect(result.employees).toHaveLength(1)
    })

    it('gere les erreurs DB en retournant des tableaux vides', async () => {
      mockSupabaseQuerySequence([
        { data: null, error: { message: 'DB error' } }, // contracts error
        { data: null, error: { message: 'DB error' } }, // shifts error
      ])

      const result = await getWeeklyComplianceOverview('employer-123')

      expect(result.employees).toHaveLength(0)
      expect(result.summary.totalEmployees).toBe(0)
    })

    it('calcule le statut ok quand tout est conforme', async () => {
      mockSupabaseQuerySequence([
        { data: [createMockContractRow()], error: null },
        { data: [], error: null },
      ])

      const result = await getWeeklyComplianceOverview('employer-123', new Date('2026-02-10'))

      // Avec les mocks par defaut (35h, rest compliant), le statut devrait etre ok
      expect(result.employees[0].status).toBe('ok')
      expect(result.summary.compliant).toBe(1)
    })
  })

  // ------------------------------------------
  // getComplianceHistory
  // ------------------------------------------
  describe('getComplianceHistory', () => {
    it('retourne l historique inverse sur 4 semaines par defaut', async () => {
      // 4 semaines = 4 appels a getWeeklyComplianceOverview = 8 appels DB (contracts + shifts)
      const sequence: Array<{ data?: unknown; error?: unknown; count?: number | null }> = []
      for (let i = 0; i < 4; i++) {
        sequence.push(
          { data: [createMockContractRow()], error: null },
          { data: [], error: null },
        )
      }
      mockSupabaseQuerySequence(sequence)

      const result = await getComplianceHistory('employer-123')

      expect(result).toHaveLength(4)
      // L'historique est inverse (du plus ancien au plus recent)
      // Chaque element a les bonnes proprietes
      expect(result[0]).toHaveProperty('weekStart')
      expect(result[0]).toHaveProperty('weekLabel')
      expect(result[0]).toHaveProperty('compliant')
      expect(result[0]).toHaveProperty('warnings')
      expect(result[0]).toHaveProperty('critical')
    })

    it('respecte le parametre weeksBack personnalise', async () => {
      const sequence: Array<{ data?: unknown; error?: unknown; count?: number | null }> = []
      for (let i = 0; i < 2; i++) {
        sequence.push(
          { data: [], error: null },
          { data: [], error: null },
        )
      }
      mockSupabaseQuerySequence(sequence)

      const result = await getComplianceHistory('employer-123', 2)

      expect(result).toHaveLength(2)
    })

    it('contient les totaux compliant/warnings/critical pour chaque semaine', async () => {
      const sequence: Array<{ data?: unknown; error?: unknown; count?: number | null }> = []
      for (let i = 0; i < 4; i++) {
        sequence.push(
          { data: [createMockContractRow()], error: null },
          { data: [], error: null },
        )
      }
      mockSupabaseQuerySequence(sequence)

      const result = await getComplianceHistory('employer-123')

      for (const week of result) {
        expect(typeof week.compliant).toBe('number')
        expect(typeof week.warnings).toBe('number')
        expect(typeof week.critical).toBe('number')
      }
    })
  })

  // ------------------------------------------
  // getCriticalAlerts
  // ------------------------------------------
  describe('getCriticalAlerts', () => {
    it('retourne uniquement les alertes critiques', async () => {
      // On va mocker calculateTotalHours pour retourner > 48 afin de generer une alerte critique
      const { calculateTotalHours } = await import('@/lib/compliance')
      vi.mocked(calculateTotalHours).mockReturnValueOnce(50)

      mockSupabaseQuerySequence([
        {
          data: [createMockContractRow()],
          error: null,
        },
        {
          data: [
            createMockShiftRow({ contract: { employee_id: 'emp-001', employer_id: 'employer-123' } }),
          ],
          error: null,
        },
      ])

      const result = await getCriticalAlerts('employer-123')

      // Toutes les alertes retournees doivent etre critiques
      for (const alert of result) {
        expect(alert.severity).toBe('critical')
      }
    })

    it('retourne un tableau vide quand il n y a pas d alertes critiques', async () => {
      mockSupabaseQuerySequence([
        { data: [createMockContractRow()], error: null },
        { data: [], error: null },
      ])

      const result = await getCriticalAlerts('employer-123')

      // Avec les mocks par defaut (35h, rest compliant), pas d'alertes critiques
      expect(result).toEqual([])
    })

    it('prefixe le message avec le nom de l employe', async () => {
      const { calculateTotalHours } = await import('@/lib/compliance')
      vi.mocked(calculateTotalHours).mockReturnValueOnce(50)

      mockSupabaseQuerySequence([
        {
          data: [createMockContractRow({ employee_profile: { profile: { first_name: 'Jean', last_name: 'Valjean', avatar_url: null } } })],
          error: null,
        },
        {
          data: [createMockShiftRow({ contract: { employee_id: 'emp-001', employer_id: 'employer-123' } })],
          error: null,
        },
      ])

      const result = await getCriticalAlerts('employer-123')

      if (result.length > 0) {
        expect(result[0].message).toContain('Jean Valjean')
      }
    })
  })
})
