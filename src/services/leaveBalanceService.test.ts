import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/absence', () => ({
  calculateAcquiredDays: vi.fn(() => 25),
  calculateRemainingDays: vi.fn((balance) => balance.acquiredDays - balance.takenDays + balance.adjustmentDays),
  getLeaveYearStartDate: vi.fn(() => new Date('2025-06-01')),
}))

// Helper pour mock chain
function mockSupabaseQuery(result: { data?: unknown; error?: unknown; count?: number | null }) {
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
  mockFrom.mockImplementation(() => chain)
  return chain
}

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

beforeEach(() => { vi.clearAllMocks() })

// ============================================
// FIXTURES
// ============================================

function makeLeaveBalanceDbRow(overrides: Partial<{
  id: string
  employee_id: string
  employer_id: string
  contract_id: string
  leave_year: string
  acquired_days: number
  taken_days: number
  adjustment_days: number
  is_manual_init: boolean
  created_at: string
  updated_at: string
}> = {}) {
  return {
    id: overrides.id ?? 'lb-001',
    employee_id: overrides.employee_id ?? 'emp-001',
    employer_id: overrides.employer_id ?? 'employer-001',
    contract_id: overrides.contract_id ?? 'contract-001',
    leave_year: overrides.leave_year ?? '2025',
    acquired_days: overrides.acquired_days ?? 25,
    taken_days: overrides.taken_days ?? 5,
    adjustment_days: overrides.adjustment_days ?? 2,
    is_manual_init: overrides.is_manual_init ?? false,
    created_at: overrides.created_at ?? '2025-06-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2025-06-01T00:00:00Z',
  }
}

// ============================================
// TESTS: getLeaveBalance
// ============================================

describe('leaveBalanceService', () => {
  describe('getLeaveBalance', () => {
    it('retourne le solde mappe correctement (snake_case -> camelCase)', async () => {
      const dbRow = makeLeaveBalanceDbRow({
        acquired_days: 25,
        taken_days: 5,
        adjustment_days: 2,
      })
      mockSupabaseQuery({ data: dbRow, error: null })

      const { getLeaveBalance } = await import('@/services/leaveBalanceService')
      const result = await getLeaveBalance('contract-001', '2025')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('lb-001')
      expect(result!.employeeId).toBe('emp-001')
      expect(result!.employerId).toBe('employer-001')
      expect(result!.contractId).toBe('contract-001')
      expect(result!.leaveYear).toBe('2025')
      expect(result!.acquiredDays).toBe(25)
      expect(result!.takenDays).toBe(5)
      expect(result!.adjustmentDays).toBe(2)
      // remainingDays = acquiredDays - takenDays + adjustmentDays = 25 - 5 + 2 = 22
      expect(result!.remainingDays).toBe(22)
    })

    it('retourne null si data est null (solde inexistant)', async () => {
      mockSupabaseQuery({ data: null, error: null })

      const { getLeaveBalance } = await import('@/services/leaveBalanceService')
      const result = await getLeaveBalance('contract-xxx', '2025')

      expect(result).toBeNull()
    })

    it('retourne null et log erreur si erreur DB', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

      const { getLeaveBalance } = await import('@/services/leaveBalanceService')
      const { logger } = await import('@/lib/logger')
      const result = await getLeaveBalance('contract-001', '2025')

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalledWith(
        'Erreur récupération solde congés:',
        expect.objectContaining({ message: 'DB error' })
      )
    })

    it('appelle maybeSingle et passe les bons parametres eq', async () => {
      const chain = mockSupabaseQuery({ data: null, error: null })

      const { getLeaveBalance } = await import('@/services/leaveBalanceService')
      await getLeaveBalance('c-123', '2024')

      expect(mockFrom).toHaveBeenCalledWith('leave_balances')
      expect(chain.eq).toHaveBeenCalledWith('contract_id', 'c-123')
      expect(chain.eq).toHaveBeenCalledWith('leave_year', '2024')
      expect(chain.maybeSingle).toHaveBeenCalled()
    })
  })

  // ============================================
  // TESTS: getLeaveBalancesForEmployee
  // ============================================

  describe('getLeaveBalancesForEmployee', () => {
    it('retourne la liste des soldes mappes pour un employe', async () => {
      const rows = [
        makeLeaveBalanceDbRow({ id: 'lb-1', leave_year: '2025', acquired_days: 25, taken_days: 3, adjustment_days: 0 }),
        makeLeaveBalanceDbRow({ id: 'lb-2', leave_year: '2024', acquired_days: 20, taken_days: 15, adjustment_days: 1 }),
      ]
      mockSupabaseQuery({ data: rows, error: null })

      const { getLeaveBalancesForEmployee } = await import('@/services/leaveBalanceService')
      const result = await getLeaveBalancesForEmployee('emp-001')

      expect(result).toHaveLength(2)
      expect(result[0].leaveYear).toBe('2025')
      expect(result[0].remainingDays).toBe(22) // 25 - 3 + 0
      expect(result[1].leaveYear).toBe('2024')
      expect(result[1].remainingDays).toBe(6) // 20 - 15 + 1
    })

    it('retourne un tableau vide si erreur DB', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'Erreur employee' } })

      const { getLeaveBalancesForEmployee } = await import('@/services/leaveBalanceService')
      const { logger } = await import('@/lib/logger')
      const result = await getLeaveBalancesForEmployee('emp-001')

      expect(result).toEqual([])
      expect(logger.error).toHaveBeenCalled()
    })

    it('retourne un tableau vide si data est null', async () => {
      mockSupabaseQuery({ data: null, error: null })

      const { getLeaveBalancesForEmployee } = await import('@/services/leaveBalanceService')
      const result = await getLeaveBalancesForEmployee('emp-001')

      expect(result).toEqual([])
    })

    it('appelle order avec leave_year descending', async () => {
      const chain = mockSupabaseQuery({ data: [], error: null })

      const { getLeaveBalancesForEmployee } = await import('@/services/leaveBalanceService')
      await getLeaveBalancesForEmployee('emp-001')

      expect(chain.order).toHaveBeenCalledWith('leave_year', { ascending: false })
    })
  })

  // ============================================
  // TESTS: getLeaveBalancesForEmployer
  // ============================================

  describe('getLeaveBalancesForEmployer', () => {
    it('retourne la liste des soldes pour un employeur', async () => {
      const rows = [
        makeLeaveBalanceDbRow({ id: 'lb-a', employer_id: 'er-001' }),
        makeLeaveBalanceDbRow({ id: 'lb-b', employer_id: 'er-001', employee_id: 'emp-002' }),
      ]
      mockSupabaseQuery({ data: rows, error: null })

      const { getLeaveBalancesForEmployer } = await import('@/services/leaveBalanceService')
      const result = await getLeaveBalancesForEmployer('er-001')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('lb-a')
      expect(result[1].id).toBe('lb-b')
    })

    it('retourne un tableau vide si erreur DB', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'Erreur employer' } })

      const { getLeaveBalancesForEmployer } = await import('@/services/leaveBalanceService')
      const { logger } = await import('@/lib/logger')
      const result = await getLeaveBalancesForEmployer('er-001')

      expect(result).toEqual([])
      expect(logger.error).toHaveBeenCalled()
    })

    it('appelle eq avec employer_id et order descending', async () => {
      const chain = mockSupabaseQuery({ data: [], error: null })

      const { getLeaveBalancesForEmployer } = await import('@/services/leaveBalanceService')
      await getLeaveBalancesForEmployer('er-001')

      expect(mockFrom).toHaveBeenCalledWith('leave_balances')
      expect(chain.eq).toHaveBeenCalledWith('employer_id', 'er-001')
      expect(chain.order).toHaveBeenCalledWith('leave_year', { ascending: false })
    })
  })

  // ============================================
  // TESTS: initializeLeaveBalance
  // ============================================

  describe('initializeLeaveBalance', () => {
    const contract = { startDate: new Date('2025-01-15'), weeklyHours: 35 }

    it('appelle calculateAcquiredDays et upsert puis retourne le solde', async () => {
      const dbRow = makeLeaveBalanceDbRow({ acquired_days: 25, taken_days: 0, adjustment_days: 0 })
      const chain = mockSupabaseQuery({ data: dbRow, error: null })

      const { initializeLeaveBalance } = await import('@/services/leaveBalanceService')
      const { calculateAcquiredDays, getLeaveYearStartDate } = await import('@/lib/absence')
      const result = await initializeLeaveBalance('c-001', 'emp-001', 'er-001', '2025', contract)

      expect(getLeaveYearStartDate).toHaveBeenCalledWith('2025')
      expect(calculateAcquiredDays).toHaveBeenCalledWith(
        contract,
        new Date('2025-06-01'),
        expect.any(Date)
      )
      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          contract_id: 'c-001',
          employee_id: 'emp-001',
          employer_id: 'er-001',
          leave_year: '2025',
          acquired_days: 25,
          taken_days: 0,
          adjustment_days: 0,
        }),
        { onConflict: 'contract_id,leave_year' }
      )
      expect(result).not.toBeNull()
      expect(result!.acquiredDays).toBe(25)
      expect(result!.takenDays).toBe(0)
    })

    it('retourne null et log erreur si erreur upsert', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'Upsert failed' } })

      const { initializeLeaveBalance } = await import('@/services/leaveBalanceService')
      const { logger } = await import('@/lib/logger')
      const result = await initializeLeaveBalance('c-001', 'emp-001', 'er-001', '2025', contract)

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalledWith(
        'Erreur initialisation solde congés:',
        expect.objectContaining({ message: 'Upsert failed' })
      )
    })

    it('appelle single() apres upsert + select', async () => {
      const chain = mockSupabaseQuery({
        data: makeLeaveBalanceDbRow(),
        error: null,
      })

      const { initializeLeaveBalance } = await import('@/services/leaveBalanceService')
      await initializeLeaveBalance('c-001', 'emp-001', 'er-001', '2025', contract)

      expect(chain.select).toHaveBeenCalled()
      expect(chain.single).toHaveBeenCalled()
    })
  })

  // ============================================
  // TESTS: addTakenDays
  // ============================================

  describe('addTakenDays', () => {
    it('ajoute les jours au solde existant', async () => {
      const fetchResult = { data: { taken_days: 5 }, error: null }
      const updateResult = { data: null, error: null }

      mockSupabaseQuerySequence([fetchResult, updateResult])

      const { addTakenDays } = await import('@/services/leaveBalanceService')
      await expect(addTakenDays('c-001', '2025', 3)).resolves.toBeUndefined()

      // Verifie que le 2e appel (update) a utilise taken_days = 5 + 3 = 8
      const secondCall = mockFrom.mock.results[1]?.value
      if (secondCall) {
        expect(secondCall.update).toHaveBeenCalledWith(
          expect.objectContaining({ taken_days: 8 })
        )
      }
    })

    it('throw si le solde est introuvable (fetchError)', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'Not found' } })

      const { addTakenDays } = await import('@/services/leaveBalanceService')
      await expect(addTakenDays('c-xxx', '2025', 2)).rejects.toThrow('Solde de congés introuvable')
    })

    it('throw si le solde est introuvable (data null)', async () => {
      mockSupabaseQuery({ data: null, error: null })

      const { addTakenDays } = await import('@/services/leaveBalanceService')
      await expect(addTakenDays('c-xxx', '2025', 2)).rejects.toThrow('Solde de congés introuvable')
    })

    it('throw et log si erreur lors de update', async () => {
      const fetchResult = { data: { taken_days: 5 }, error: null }
      const updateResult = { data: null, error: { message: 'Update failed' } }

      mockSupabaseQuerySequence([fetchResult, updateResult])

      const { addTakenDays } = await import('@/services/leaveBalanceService')
      const { logger } = await import('@/lib/logger')

      await expect(addTakenDays('c-001', '2025', 1)).rejects.toThrow('Update failed')
      expect(logger.error).toHaveBeenCalledWith(
        'Erreur mise à jour jours pris:',
        expect.objectContaining({ message: 'Update failed' })
      )
    })
  })

  // ============================================
  // TESTS: restoreTakenDays
  // ============================================

  describe('restoreTakenDays', () => {
    it('soustrait les jours du solde existant', async () => {
      const fetchResult = { data: { taken_days: 10 }, error: null }
      const updateResult = { data: null, error: null }

      mockSupabaseQuerySequence([fetchResult, updateResult])

      const { restoreTakenDays } = await import('@/services/leaveBalanceService')
      await expect(restoreTakenDays('c-001', '2025', 3)).resolves.toBeUndefined()

      const secondCall = mockFrom.mock.results[1]?.value
      if (secondCall) {
        expect(secondCall.update).toHaveBeenCalledWith(
          expect.objectContaining({ taken_days: 7 })
        )
      }
    })

    it('ne descend pas sous 0 (Math.max)', async () => {
      const fetchResult = { data: { taken_days: 2 }, error: null }
      const updateResult = { data: null, error: null }

      mockSupabaseQuerySequence([fetchResult, updateResult])

      const { restoreTakenDays } = await import('@/services/leaveBalanceService')
      await expect(restoreTakenDays('c-001', '2025', 10)).resolves.toBeUndefined()

      const secondCall = mockFrom.mock.results[1]?.value
      if (secondCall) {
        expect(secondCall.update).toHaveBeenCalledWith(
          expect.objectContaining({ taken_days: 0 })
        )
      }
    })

    it('throw si le solde est introuvable', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'Not found' } })

      const { restoreTakenDays } = await import('@/services/leaveBalanceService')
      await expect(restoreTakenDays('c-xxx', '2025', 5)).rejects.toThrow('Solde de congés introuvable')
    })

    it('throw si data est null sans erreur', async () => {
      mockSupabaseQuery({ data: null, error: null })

      const { restoreTakenDays } = await import('@/services/leaveBalanceService')
      await expect(restoreTakenDays('c-xxx', '2025', 5)).rejects.toThrow('Solde de congés introuvable')
    })

    it('throw et log si erreur lors de update', async () => {
      const fetchResult = { data: { taken_days: 10 }, error: null }
      const updateResult = { data: null, error: { message: 'Restore update failed' } }

      mockSupabaseQuerySequence([fetchResult, updateResult])

      const { restoreTakenDays } = await import('@/services/leaveBalanceService')
      const { logger } = await import('@/lib/logger')

      await expect(restoreTakenDays('c-001', '2025', 2)).rejects.toThrow('Restore update failed')
      expect(logger.error).toHaveBeenCalledWith(
        'Erreur restauration jours pris:',
        expect.objectContaining({ message: 'Restore update failed' })
      )
    })

    it('gere le cas ou taken_days est exactement egal aux jours a restaurer', async () => {
      const fetchResult = { data: { taken_days: 5 }, error: null }
      const updateResult = { data: null, error: null }

      mockSupabaseQuerySequence([fetchResult, updateResult])

      const { restoreTakenDays } = await import('@/services/leaveBalanceService')
      await expect(restoreTakenDays('c-001', '2025', 5)).resolves.toBeUndefined()

      const secondCall = mockFrom.mock.results[1]?.value
      if (secondCall) {
        expect(secondCall.update).toHaveBeenCalledWith(
          expect.objectContaining({ taken_days: 0 })
        )
      }
    })
  })

  describe('initializeLeaveBalanceWithOverride', () => {
    it('devrait initialiser un solde avec les valeurs fournies', async () => {
      // Premier appel: check existence (pas de solde existant)
      const checkResult = { data: null, error: null }
      // Deuxième appel: insert
      const insertResult = {
        data: makeLeaveBalanceDbRow({
          acquired_days: 13,
          taken_days: 3,
          is_manual_init: true,
        }),
        error: null,
      }

      mockSupabaseQuerySequence([checkResult, insertResult])

      const { initializeLeaveBalanceWithOverride } = await import('@/services/leaveBalanceService')
      const result = await initializeLeaveBalanceWithOverride(
        'c-001', 'emp-001', 'er-001', '2025-2026', 13, 3
      )

      expect(result).not.toBeNull()
      expect(result?.acquiredDays).toBe(13)
      expect(result?.takenDays).toBe(3)
      expect(result?.isManualInit).toBe(true)
    })

    it('devrait ne pas écraser un solde existant', async () => {
      // Un solde existe déjà
      const checkResult = { data: { id: 'existing-id' }, error: null }

      mockSupabaseQuery(checkResult)

      const { initializeLeaveBalanceWithOverride } = await import('@/services/leaveBalanceService')
      const result = await initializeLeaveBalanceWithOverride(
        'c-001', 'emp-001', 'er-001', '2025-2026', 13, 3
      )

      expect(result).toBeNull()
    })

    it('devrait retourner null en cas d\'erreur d\'insertion', async () => {
      // Pas de solde existant
      const checkResult = { data: null, error: null }
      // Erreur à l'insertion
      const insertResult = { data: null, error: { message: 'DB error', code: '42000' } }

      mockSupabaseQuerySequence([checkResult, insertResult])

      const { initializeLeaveBalanceWithOverride } = await import('@/services/leaveBalanceService')
      const result = await initializeLeaveBalanceWithOverride(
        'c-001', 'emp-001', 'er-001', '2025-2026', 13, 3
      )

      expect(result).toBeNull()
    })
  })
})
