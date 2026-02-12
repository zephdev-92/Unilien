import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getEmployerStats,
  getEmployeeStats,
  getCaregiverStats,
} from './statsService'

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

vi.mock('@/lib/compliance/utils', () => ({
  calculateShiftDuration: vi.fn((start: string, end: string, breakMin: number) => {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    return (eh * 60 + em) - (sh * 60 + sm) - breakMin
  }),
}))

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

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// FIXTURES
// ============================================================

const EMPLOYER_ID = 'employer-123'
const EMPLOYEE_ID = 'employee-456'
const CAREGIVER_ID = 'caregiver-789'

function makeShift(overrides: Record<string, unknown> = {}) {
  return {
    start_time: '09:00',
    end_time: '12:00',
    break_duration: 0,
    status: 'completed',
    date: '2026-02-05',
    contract_id: 'contract-1',
    ...overrides,
  }
}

// ============================================================
// getEmployerStats
// ============================================================

describe('getEmployerStats', () => {
  it('retourne les statistiques completes avec les bons calculs', async () => {
    const contracts = [
      { id: 'contract-1', hourly_rate: 14 },
      { id: 'contract-2', hourly_rate: 16 },
    ]
    const shiftsThisMonth = [
      makeShift({ start_time: '09:00', end_time: '12:00', break_duration: 0, status: 'completed', contract_id: 'contract-1' }),
      makeShift({ start_time: '14:00', end_time: '17:00', break_duration: 30, status: 'completed', contract_id: 'contract-2' }),
    ]
    const shiftsLastMonth = [
      makeShift({ start_time: '09:00', end_time: '11:00', break_duration: 0, status: 'completed' }),
    ]
    const upcomingShifts = [{ id: 'shift-up-1' }, { id: 'shift-up-2' }]

    mockSupabaseQuerySequence([
      { data: contracts, error: null },         // contracts
      { data: shiftsThisMonth, error: null },   // shiftsThisMonth
      { data: shiftsLastMonth, error: null },    // shiftsLastMonth
      { data: upcomingShifts, error: null },     // upcomingShifts
    ])

    const result = await getEmployerStats(EMPLOYER_ID)

    // calculateShiftDuration retourne des minutes :
    // shift1: (12*60) - (9*60) - 0 = 180min = 3h
    // shift2: (17*60) - (14*60) - 30 = 150min = 2.5h
    // total this month = 5.5h
    // shift last month: (11*60) - (9*60) - 0 = 120min = 2h
    expect(result.hoursThisMonth).toBe(5.5)
    expect(result.hoursLastMonth).toBe(2)
    expect(result.hoursDiff).toBe(3.5)
    expect(result.shiftsThisMonth).toBe(2)
    expect(result.activeAuxiliaries).toBe(2)
    expect(result.upcomingShifts).toBe(2)

    // monthlyCost = 5.5 * avgRate(15) * 1.42 = 117.15 -> arrondi 117
    expect(result.monthlyCost).toBe(Math.round(5.5 * 15 * 1.42))
  })

  it('retourne tout a 0 si aucun contrat actif', async () => {
    mockSupabaseQuerySequence([
      { data: [], error: null },  // pas de contrats
    ])

    const result = await getEmployerStats(EMPLOYER_ID)

    expect(result).toEqual({
      hoursThisMonth: 0,
      hoursLastMonth: 0,
      hoursDiff: 0,
      monthlyCost: 0,
      shiftsThisMonth: 0,
      activeAuxiliaries: 0,
      upcomingShifts: 0,
    })
  })

  it('retourne tout a 0 si contracts est null', async () => {
    mockSupabaseQuerySequence([
      { data: null, error: null },
    ])

    const result = await getEmployerStats(EMPLOYER_ID)

    expect(result).toEqual({
      hoursThisMonth: 0,
      hoursLastMonth: 0,
      hoursDiff: 0,
      monthlyCost: 0,
      shiftsThisMonth: 0,
      activeAuxiliaries: 0,
      upcomingShifts: 0,
    })
  })

  it('calcule monthlyCost avec charges patronales de 42%', async () => {
    const contracts = [{ id: 'c-1', hourly_rate: 20 }]
    // 1 shift de 2h
    const shiftsThisMonth = [
      makeShift({ start_time: '10:00', end_time: '12:00', break_duration: 0, status: 'completed' }),
    ]

    mockSupabaseQuerySequence([
      { data: contracts, error: null },
      { data: shiftsThisMonth, error: null },
      { data: [], error: null },
      { data: [], error: null },
    ])

    const result = await getEmployerStats(EMPLOYER_ID)

    // 2h * 20EUR * 1.42 = 56.8 -> arrondi 57
    expect(result.monthlyCost).toBe(Math.round(2 * 20 * 1.42))
  })

  it('gere les shifts null en retournant 0 heures', async () => {
    const contracts = [{ id: 'c-1', hourly_rate: 15 }]

    mockSupabaseQuerySequence([
      { data: contracts, error: null },
      { data: null, error: null },  // shiftsThisMonth null
      { data: null, error: null },  // shiftsLastMonth null
      { data: null, error: null },  // upcomingShifts null
    ])

    const result = await getEmployerStats(EMPLOYER_ID)

    expect(result.hoursThisMonth).toBe(0)
    expect(result.hoursLastMonth).toBe(0)
    expect(result.shiftsThisMonth).toBe(0)
    expect(result.upcomingShifts).toBe(0)
    expect(result.monthlyCost).toBe(0)
  })
})

// ============================================================
// getEmployeeStats
// ============================================================

describe('getEmployeeStats', () => {
  it('retourne les statistiques completes pour un employe', async () => {
    const contracts = [
      { id: 'contract-1', hourly_rate: 14, employer_id: 'emp-A' },
      { id: 'contract-2', hourly_rate: 16, employer_id: 'emp-B' },
    ]
    const shiftsThisMonth = [
      makeShift({ start_time: '09:00', end_time: '12:00', break_duration: 0, contract_id: 'contract-1' }),
      makeShift({ start_time: '14:00', end_time: '18:00', break_duration: 0, contract_id: 'contract-2' }),
    ]
    const shiftsLastMonth = [
      makeShift({ start_time: '08:00', end_time: '12:00', break_duration: 0 }),
    ]
    const upcomingShifts = [{ id: 'up-1' }]

    mockSupabaseQuerySequence([
      { data: contracts, error: null },
      { data: shiftsThisMonth, error: null },
      { data: shiftsLastMonth, error: null },
      { data: upcomingShifts, error: null },
    ])

    const result = await getEmployeeStats(EMPLOYEE_ID)

    // Heures ce mois: shift1=180min=3h, shift2=240min=4h -> 7h
    // Heures mois dernier: 240min=4h
    expect(result.hoursThisMonth).toBe(7)
    expect(result.hoursLastMonth).toBe(4)
    expect(result.hoursDiff).toBe(3)
    expect(result.activeEmployers).toBe(2)
    expect(result.shiftsThisMonth).toBe(2)
    expect(result.upcomingShifts).toBe(1)

    // Revenu: shift1 -> 180min/60 * 14 = 42, shift2 -> 240min/60 * 16 = 64 => 106
    expect(result.estimatedRevenue).toBe(106)
  })

  it('retourne tout a 0 si aucun contrat actif', async () => {
    mockSupabaseQuerySequence([
      { data: [], error: null },
    ])

    const result = await getEmployeeStats(EMPLOYEE_ID)

    expect(result).toEqual({
      hoursThisMonth: 0,
      hoursLastMonth: 0,
      hoursDiff: 0,
      estimatedRevenue: 0,
      activeEmployers: 0,
      shiftsThisMonth: 0,
      upcomingShifts: 0,
    })
  })

  it('retourne tout a 0 si contracts est null', async () => {
    mockSupabaseQuerySequence([
      { data: null, error: null },
    ])

    const result = await getEmployeeStats(EMPLOYEE_ID)

    expect(result).toEqual({
      hoursThisMonth: 0,
      hoursLastMonth: 0,
      hoursDiff: 0,
      estimatedRevenue: 0,
      activeEmployers: 0,
      shiftsThisMonth: 0,
      upcomingShifts: 0,
    })
  })

  it('calcule estimatedRevenue par contrat avec le bon taux horaire', async () => {
    const contracts = [
      { id: 'c-1', hourly_rate: 20, employer_id: 'emp-A' },
    ]
    // 1 shift de 2h sur contract c-1
    const shiftsThisMonth = [
      makeShift({ start_time: '10:00', end_time: '12:00', break_duration: 0, contract_id: 'c-1' }),
    ]

    mockSupabaseQuerySequence([
      { data: contracts, error: null },
      { data: shiftsThisMonth, error: null },
      { data: [], error: null },
      { data: [], error: null },
    ])

    const result = await getEmployeeStats(EMPLOYEE_ID)

    // 120min / 60 * 20 = 40 EUR
    expect(result.estimatedRevenue).toBe(40)
  })

  it('compte les employeurs uniques via employer_id distinct', async () => {
    const contracts = [
      { id: 'c-1', hourly_rate: 14, employer_id: 'emp-A' },
      { id: 'c-2', hourly_rate: 15, employer_id: 'emp-A' },
      { id: 'c-3', hourly_rate: 16, employer_id: 'emp-B' },
    ]

    mockSupabaseQuerySequence([
      { data: contracts, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ])

    const result = await getEmployeeStats(EMPLOYEE_ID)

    // 3 contrats mais seulement 2 employeurs distincts
    expect(result.activeEmployers).toBe(2)
  })

  it('ignore les shifts sans contrat correspondant pour le revenu', async () => {
    const contracts = [
      { id: 'c-1', hourly_rate: 20, employer_id: 'emp-A' },
    ]
    const shiftsThisMonth = [
      makeShift({ start_time: '09:00', end_time: '12:00', break_duration: 0, contract_id: 'c-unknown' }),
    ]

    mockSupabaseQuerySequence([
      { data: contracts, error: null },
      { data: shiftsThisMonth, error: null },
      { data: [], error: null },
      { data: [], error: null },
    ])

    const result = await getEmployeeStats(EMPLOYEE_ID)

    // Le shift n'a pas de contrat correspondant -> revenu = 0
    expect(result.estimatedRevenue).toBe(0)
    // Mais le shift est quand meme compte
    expect(result.shiftsThisMonth).toBe(1)
  })
})

// ============================================================
// getCaregiverStats
// ============================================================

describe('getCaregiverStats', () => {
  it('retourne les statistiques completes pour un aidant', async () => {
    const contracts = [{ id: 'c-1' }, { id: 'c-2' }]
    const shiftsThisMonth = [{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }]
    const upcomingShifts = [{ id: 's-4' }]
    const logEntries = [
      { id: 'log-1', read_by: ['other-user'] },
      { id: 'log-2', read_by: [CAREGIVER_ID] },
      { id: 'log-3', read_by: null },
      { id: 'log-4', read_by: [] },
    ]

    mockSupabaseQuerySequence([
      { data: { employer_id: EMPLOYER_ID }, error: null },     // caregiver.single()
      { data: contracts, error: null },                        // contracts
      { data: shiftsThisMonth, error: null },                  // shiftsThisMonth
      { data: upcomingShifts, error: null },                   // upcomingShifts
      { data: logEntries, error: null },                       // logEntries
    ])

    const result = await getCaregiverStats(CAREGIVER_ID)

    expect(result.shiftsThisMonth).toBe(3)
    expect(result.upcomingShifts).toBe(1)
    expect(result.logEntriesThisWeek).toBe(4)
    // log-1: read_by = ['other-user'] -> pas lu par caregiver -> unread
    // log-2: read_by = [CAREGIVER_ID] -> lu -> pas unread
    // log-3: read_by = null -> null?.includes -> false -> unread
    // log-4: read_by = [] -> pas inclus -> unread
    expect(result.unreadLogs).toBe(3)
  })

  it('retourne tout a 0 si pas d employeur associe', async () => {
    mockSupabaseQuerySequence([
      { data: { employer_id: null }, error: null },
    ])

    const result = await getCaregiverStats(CAREGIVER_ID)

    expect(result).toEqual({
      shiftsThisMonth: 0,
      logEntriesThisWeek: 0,
      upcomingShifts: 0,
      unreadLogs: 0,
    })
  })

  it('retourne tout a 0 si caregiver non trouve', async () => {
    mockSupabaseQuerySequence([
      { data: null, error: { message: 'Not found' } },
    ])

    const result = await getCaregiverStats(CAREGIVER_ID)

    expect(result).toEqual({
      shiftsThisMonth: 0,
      logEntriesThisWeek: 0,
      upcomingShifts: 0,
      unreadLogs: 0,
    })
  })

  it('gere le cas ou les contrats sont vides (pas de shifts queries)', async () => {
    mockSupabaseQuerySequence([
      { data: { employer_id: EMPLOYER_ID }, error: null },
      { data: [], error: null },          // contracts vides
      // Pas de query shifts car contractIds.length === 0
      { data: [], error: null },          // logEntries
    ])

    const result = await getCaregiverStats(CAREGIVER_ID)

    expect(result.shiftsThisMonth).toBe(0)
    expect(result.upcomingShifts).toBe(0)
  })

  it('calcule les unreadLogs en excluant ceux lus par le caregiver', async () => {
    const logEntries = [
      { id: 'log-1', read_by: [CAREGIVER_ID, 'other'] },
      { id: 'log-2', read_by: [CAREGIVER_ID] },
      { id: 'log-3', read_by: ['only-other'] },
      { id: 'log-4', read_by: null },
    ]

    mockSupabaseQuerySequence([
      { data: { employer_id: EMPLOYER_ID }, error: null },
      { data: [{ id: 'c-1' }], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: logEntries, error: null },
    ])

    const result = await getCaregiverStats(CAREGIVER_ID)

    // log-1 et log-2 sont lus, log-3 et log-4 ne le sont pas
    expect(result.unreadLogs).toBe(2)
  })

  it('gere logEntries null', async () => {
    mockSupabaseQuerySequence([
      { data: { employer_id: EMPLOYER_ID }, error: null },
      { data: [{ id: 'c-1' }], error: null },
      { data: [{ id: 's-1' }], error: null },
      { data: [], error: null },
      { data: null, error: null },    // logEntries null
    ])

    const result = await getCaregiverStats(CAREGIVER_ID)

    expect(result.logEntriesThisWeek).toBe(0)
    expect(result.unreadLogs).toBe(0)
  })
})
