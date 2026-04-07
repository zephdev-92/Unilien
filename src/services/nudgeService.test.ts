import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getUnvalidatedShiftsCount, getMissingPayslipEmployees } from './nudgeService'

// ============================================================
// MOCKS
// ============================================================

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

function mockSupabaseQuery(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.lte = vi.fn().mockReturnValue(chain)
  chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result)))
  mockFrom.mockImplementationOnce(() => chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// FIXTURES
// ============================================================

const EMPLOYER_ID = 'employer-123'

function makeContract(id: string, firstName: string, lastName: string) {
  return {
    id,
    employees: { profiles: { first_name: firstName, last_name: lastName } },
  }
}

// ============================================================
// getUnvalidatedShiftsCount
// ============================================================

describe('getUnvalidatedShiftsCount', () => {
  const weekStart = new Date('2026-04-06')
  const weekEnd = new Date('2026-04-12')

  it('retourne 0 si aucun contrat actif', async () => {
    mockSupabaseQuery({ data: [] })

    const result = await getUnvalidatedShiftsCount(EMPLOYER_ID, weekStart, weekEnd)
    expect(result).toBe(0)
  })

  it('retourne 0 si contracts null', async () => {
    mockSupabaseQuery({ data: null })

    const result = await getUnvalidatedShiftsCount(EMPLOYER_ID, weekStart, weekEnd)
    expect(result).toBe(0)
  })

  it('retourne le count des shifts non validés', async () => {
    mockSupabaseQuery({ data: [{ id: 'c1' }, { id: 'c2' }] })
    mockSupabaseQuery({ count: 3, error: null })

    const result = await getUnvalidatedShiftsCount(EMPLOYER_ID, weekStart, weekEnd)
    expect(result).toBe(3)
  })

  it('retourne 0 en cas d\'erreur sur les shifts', async () => {
    mockSupabaseQuery({ data: [{ id: 'c1' }] })
    mockSupabaseQuery({ count: null, error: { message: 'db error' } })

    const result = await getUnvalidatedShiftsCount(EMPLOYER_ID, weekStart, weekEnd)
    expect(result).toBe(0)
  })
})

// ============================================================
// getMissingPayslipEmployees
// ============================================================

describe('getMissingPayslipEmployees', () => {
  it('retourne count 0 si aucun contrat actif', async () => {
    mockSupabaseQuery({ data: [], error: null })

    const result = await getMissingPayslipEmployees(EMPLOYER_ID, 2026, 3)
    expect(result).toEqual({ count: 0, names: '' })
  })

  it('retourne count 0 en cas d\'erreur sur les contrats', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'db error' } })

    const result = await getMissingPayslipEmployees(EMPLOYER_ID, 2026, 3)
    expect(result).toEqual({ count: 0, names: '' })
  })

  it('retourne les employés sans bulletin', async () => {
    mockSupabaseQuery({
      data: [
        makeContract('c1', 'Alice', 'Dupont'),
        makeContract('c2', 'Bob', 'Martin'),
      ],
      error: null,
    })
    // Seul c1 a un bulletin
    mockSupabaseQuery({ data: [{ contract_id: 'c1' }], error: null })

    const result = await getMissingPayslipEmployees(EMPLOYER_ID, 2026, 3)
    expect(result.count).toBe(1)
    expect(result.names).toBe('Bob M.')
  })

  it('retourne count 0 si tous les bulletins existent', async () => {
    mockSupabaseQuery({
      data: [makeContract('c1', 'Alice', 'Dupont')],
      error: null,
    })
    mockSupabaseQuery({ data: [{ contract_id: 'c1' }], error: null })

    const result = await getMissingPayslipEmployees(EMPLOYER_ID, 2026, 3)
    expect(result).toEqual({ count: 0, names: '' })
  })

  it('affiche +N quand plus de 2 employés manquants', async () => {
    mockSupabaseQuery({
      data: [
        makeContract('c1', 'Alice', 'Dupont'),
        makeContract('c2', 'Bob', 'Martin'),
        makeContract('c3', 'Clara', 'Leroy'),
      ],
      error: null,
    })
    mockSupabaseQuery({ data: [], error: null })

    const result = await getMissingPayslipEmployees(EMPLOYER_ID, 2026, 3)
    expect(result.count).toBe(3)
    expect(result.names).toBe('Alice D., Bob M. +1')
  })

  it('exclut les contrats qui commencent après le mois vérifié', async () => {
    // Vérifie mars 2026 — un contrat commençant en avril ne doit pas apparaître
    // La requête filtre avec .lte('start_date', '2026-03-31')
    mockSupabaseQuery({ data: [], error: null })

    const result = await getMissingPayslipEmployees(EMPLOYER_ID, 2026, 3)
    expect(result).toEqual({ count: 0, names: '' })

    // Vérifie que le filtre lte est bien appelé avec la bonne date
    const chain = mockFrom.mock.results[0]?.value
    expect(chain.lte).toHaveBeenCalledWith('start_date', '2026-03-31')
  })

  it('retourne count 0 en cas d\'erreur sur les payslips', async () => {
    mockSupabaseQuery({
      data: [makeContract('c1', 'Alice', 'Dupont')],
      error: null,
    })
    mockSupabaseQuery({ data: null, error: { message: 'db error' } })

    const result = await getMissingPayslipEmployees(EMPLOYER_ID, 2026, 3)
    expect(result).toEqual({ count: 0, names: '' })
  })
})
