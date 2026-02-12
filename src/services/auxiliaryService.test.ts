import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getAuxiliariesForEmployer,
  getActiveAuxiliariesForEmployer,
  getAuxiliaryDetails,
} from './auxiliaryService'

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

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// FIXTURES
// ============================================================

const EMPLOYER_ID = 'employer-123'
const CONTRACT_ID = 'contract-1'

function makeContractWithEmployee(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-1',
    contract_type: 'CDI',
    status: 'active',
    weekly_hours: 20,
    hourly_rate: 14.5,
    start_date: '2026-01-01',
    end_date: null,
    employee_id: 'emp-1',
    employee_profile: {
      profile_id: 'prof-1',
      qualifications: ['aide_menagere'],
      profile: {
        id: 'prof-1',
        first_name: 'Marie',
        last_name: 'Dupont',
        phone: '0612345678',
        avatar_url: null,
      },
    },
    ...overrides,
  }
}

function makeFullContractRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-1',
    employer_id: EMPLOYER_ID,
    employee_id: 'emp-1',
    contract_type: 'CDI',
    status: 'active',
    weekly_hours: 20,
    hourly_rate: 14.5,
    start_date: '2026-01-01',
    end_date: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    employee_profile: {
      profile_id: 'prof-1',
      qualifications: ['aide_menagere'],
      languages: ['fr'],
      max_distance_km: 10,
      availability_template: null,
      profile: {
        id: 'prof-1',
        role: 'employee',
        first_name: 'Marie',
        last_name: 'Dupont',
        email: 'marie@test.fr',
        phone: '0612345678',
        avatar_url: 'https://avatar.test/marie.jpg',
        accessibility_settings: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    },
    ...overrides,
  }
}

function makeShift(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shift-1',
    date: '2026-02-01',
    start_time: '09:00',
    end_time: '12:00',
    break_duration: 0,
    status: 'completed',
    contract_id: 'contract-1',
    ...overrides,
  }
}

// ============================================================
// getAuxiliariesForEmployer
// ============================================================

describe('getAuxiliariesForEmployer', () => {
  it('retourne les auxiliaires mappes correctement', async () => {
    const row = makeContractWithEmployee()
    mockSupabaseQuery({ data: [row], error: null })

    const result = await getAuxiliariesForEmployer(EMPLOYER_ID)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'prof-1',
      firstName: 'Marie',
      lastName: 'Dupont',
      phone: '0612345678',
      avatarUrl: undefined,
      qualifications: ['aide_menagere'],
      contractType: 'CDI',
      contractStatus: 'active',
      weeklyHours: 20,
      hourlyRate: 14.5,
      contractId: 'contract-1',
    })
    expect(result[0].contractStartDate).toEqual(new Date('2026-01-01'))
    expect(result[0].contractEndDate).toBeUndefined()
  })

  it('appelle supabase avec le bon employer_id et le bon tri', async () => {
    const chain = mockSupabaseQuery({ data: [], error: null })

    await getAuxiliariesForEmployer(EMPLOYER_ID)

    expect(mockFrom).toHaveBeenCalledWith('contracts')
    expect(chain.eq).toHaveBeenCalledWith('employer_id', EMPLOYER_ID)
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('retourne un tableau vide si aucun contrat', async () => {
    mockSupabaseQuery({ data: [], error: null })

    const result = await getAuxiliariesForEmployer(EMPLOYER_ID)

    expect(result).toEqual([])
  })

  it('retourne un tableau vide en cas d erreur Supabase', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

    const result = await getAuxiliariesForEmployer(EMPLOYER_ID)

    expect(result).toEqual([])
  })

  it('retourne un tableau vide si data est null (sans erreur)', async () => {
    mockSupabaseQuery({ data: null, error: null })

    const result = await getAuxiliariesForEmployer(EMPLOYER_ID)

    expect(result).toEqual([])
  })

  it('gere les champs optionnels null dans le profil', async () => {
    const row = makeContractWithEmployee({
      employee_profile: {
        profile_id: 'prof-2',
        qualifications: null,
        profile: {
          id: 'prof-2',
          first_name: 'Jean',
          last_name: 'Martin',
          phone: null,
          avatar_url: null,
        },
      },
    })
    mockSupabaseQuery({ data: [row], error: null })

    const result = await getAuxiliariesForEmployer(EMPLOYER_ID)

    expect(result[0].phone).toBeUndefined()
    expect(result[0].avatarUrl).toBeUndefined()
    expect(result[0].qualifications).toEqual([])
  })

  it('gere un contrat CDD avec end_date', async () => {
    const row = makeContractWithEmployee({
      contract_type: 'CDD',
      end_date: '2026-06-30',
    })
    mockSupabaseQuery({ data: [row], error: null })

    const result = await getAuxiliariesForEmployer(EMPLOYER_ID)

    expect(result[0].contractType).toBe('CDD')
    expect(result[0].contractEndDate).toEqual(new Date('2026-06-30'))
  })

  it('gere employee_profile undefined avec des valeurs par defaut', async () => {
    const row = makeContractWithEmployee({
      employee_profile: undefined,
    })
    mockSupabaseQuery({ data: [row], error: null })

    const result = await getAuxiliariesForEmployer(EMPLOYER_ID)

    // id fallback sur employee_id du contrat quand employee_profile est absent
    expect(result[0].id).toBe('emp-1')
    expect(result[0].firstName).toBe('')
    expect(result[0].lastName).toBe('')
  })
})

// ============================================================
// getActiveAuxiliariesForEmployer
// ============================================================

describe('getActiveAuxiliariesForEmployer', () => {
  it('filtre sur status active et retourne les auxiliaires', async () => {
    const row = makeContractWithEmployee({ status: 'active' })
    const chain = mockSupabaseQuery({ data: [row], error: null })

    const result = await getActiveAuxiliariesForEmployer(EMPLOYER_ID)

    expect(result).toHaveLength(1)
    expect(chain.eq).toHaveBeenCalledWith('employer_id', EMPLOYER_ID)
    expect(chain.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('retourne un tableau vide en cas d erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'Network error' } })

    const result = await getActiveAuxiliariesForEmployer(EMPLOYER_ID)

    expect(result).toEqual([])
  })

  it('retourne un tableau vide si aucun auxiliaire actif', async () => {
    mockSupabaseQuery({ data: [], error: null })

    const result = await getActiveAuxiliariesForEmployer(EMPLOYER_ID)

    expect(result).toEqual([])
  })
})

// ============================================================
// getAuxiliaryDetails
// ============================================================

describe('getAuxiliaryDetails', () => {
  it('retourne les details avec les stats calculees', async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    // Creer un shift completed dans le mois en cours
    const dateInMonth = new Date(startOfMonth)
    dateInMonth.setDate(dateInMonth.getDate() + 1)
    const shiftDateStr = dateInMonth.toISOString().split('T')[0]

    // Creer un shift planned dans le futur
    const futureDate = new Date(now)
    futureDate.setDate(futureDate.getDate() + 5)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const contractRow = makeFullContractRow()
    const shifts = [
      makeShift({ id: 'shift-1', date: shiftDateStr, start_time: '09:00', end_time: '12:00', break_duration: 0, status: 'completed' }),
      makeShift({ id: 'shift-2', date: futureDateStr, start_time: '14:00', end_time: '17:00', break_duration: 30, status: 'planned' }),
    ]

    mockSupabaseQuerySequence([
      { data: contractRow, error: null },
      { data: shifts, error: null },
    ])

    const result = await getAuxiliaryDetails(CONTRACT_ID)

    expect(result).not.toBeNull()
    expect(result!.profile.firstName).toBe('Marie')
    expect(result!.profile.lastName).toBe('Dupont')
    expect(result!.employee.qualifications).toEqual(['aide_menagere'])
    expect(result!.contract.contractType).toBe('CDI')
    expect(result!.contract.id).toBe('contract-1')
    expect(result!.stats.totalShifts).toBe(2)
    expect(result!.stats.upcomingShifts).toBe(1)
  })

  it('retourne null en cas d erreur sur le contrat', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'Not found' } })

    const result = await getAuxiliaryDetails(CONTRACT_ID)

    expect(result).toBeNull()
  })

  it('retourne null si contractData est null', async () => {
    mockSupabaseQuery({ data: null, error: null })

    const result = await getAuxiliaryDetails(CONTRACT_ID)

    expect(result).toBeNull()
  })

  it('calcule hoursThisMonth a partir des shifts completed du mois', async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const dateInMonth = new Date(startOfMonth)
    dateInMonth.setDate(dateInMonth.getDate() + 1)
    // S'assurer que la date est dans le passe par rapport a now
    if (dateInMonth > now) {
      dateInMonth.setDate(1) // premier du mois
    }
    const shiftDateStr = dateInMonth.toISOString().split('T')[0]

    const shifts = [
      // 3h de travail : 09:00 -> 12:00, 0 pause
      makeShift({ date: shiftDateStr, start_time: '09:00', end_time: '12:00', break_duration: 0, status: 'completed' }),
      // 2.5h de travail : 14:00 -> 17:00, 30 min pause
      makeShift({ id: 'shift-2', date: shiftDateStr, start_time: '14:00', end_time: '17:00', break_duration: 30, status: 'completed' }),
    ]

    mockSupabaseQuerySequence([
      { data: makeFullContractRow(), error: null },
      { data: shifts, error: null },
    ])

    const result = await getAuxiliaryDetails(CONTRACT_ID)

    expect(result).not.toBeNull()
    // 3 + 2.5 = 5.5 heures
    expect(result!.stats.hoursThisMonth).toBe(5.5)
  })

  it('retourne 0 heures si aucun shift', async () => {
    mockSupabaseQuerySequence([
      { data: makeFullContractRow(), error: null },
      { data: [], error: null },
    ])

    const result = await getAuxiliaryDetails(CONTRACT_ID)

    expect(result).not.toBeNull()
    expect(result!.stats.totalShifts).toBe(0)
    expect(result!.stats.upcomingShifts).toBe(0)
    expect(result!.stats.hoursThisMonth).toBe(0)
  })

  it('gere shiftsData null en retournant des stats a 0', async () => {
    mockSupabaseQuerySequence([
      { data: makeFullContractRow(), error: null },
      { data: null, error: { message: 'Shift query failed' } },
    ])

    const result = await getAuxiliaryDetails(CONTRACT_ID)

    expect(result).not.toBeNull()
    expect(result!.stats.totalShifts).toBe(0)
    expect(result!.stats.upcomingShifts).toBe(0)
    expect(result!.stats.hoursThisMonth).toBe(0)
  })

  it('mappe un profil par defaut quand employee_profile est undefined', async () => {
    const contractRow = makeFullContractRow({ employee_profile: undefined })

    mockSupabaseQuerySequence([
      { data: contractRow, error: null },
      { data: [], error: null },
    ])

    const result = await getAuxiliaryDetails(CONTRACT_ID)

    expect(result).not.toBeNull()
    expect(result!.profile.id).toBe('')
    expect(result!.profile.firstName).toBe('')
    expect(result!.employee.qualifications).toEqual([])
  })

  it('mappe un profil par defaut quand profile est undefined dans employee_profile', async () => {
    const contractRow = makeFullContractRow({
      employee_profile: {
        profile_id: 'prof-1',
        qualifications: ['aide_menagere'],
        languages: ['fr'],
        max_distance_km: 10,
        availability_template: null,
        profile: undefined,
      },
    })

    mockSupabaseQuerySequence([
      { data: contractRow, error: null },
      { data: [], error: null },
    ])

    const result = await getAuxiliaryDetails(CONTRACT_ID)

    expect(result).not.toBeNull()
    expect(result!.profile.id).toBe('')
    expect(result!.profile.firstName).toBe('')
    expect(result!.profile.lastName).toBe('')
  })
})
