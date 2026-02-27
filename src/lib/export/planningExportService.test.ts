import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getPlanningExportData, getPlanningExportDataForEmployee } from './planningExportService'
import type { PlanningExportOptions } from './types'

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(resolved: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.lte = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolved)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolved)
  // Thenable
  const promise = Promise.resolve(resolved)
  Object.assign(chain, { then: promise.then.bind(promise), catch: promise.catch.bind(promise) })
  return chain
}

function mockSupabaseSequence(calls: Array<{ data: unknown; error: unknown }>) {
  const chains = calls.map(makeChain)
  let idx = 0
  mockFrom.mockImplementation(() => {
    const chain = chains[Math.min(idx, chains.length - 1)]
    idx++
    return chain
  })
  return chains
}

const MOCK_PROFILE = { first_name: 'Pierre', last_name: 'Dupont' }

const MOCK_CONTRACT = {
  id: 'contract-1',
  employee_id: 'emp-1',
  contract_type: 'CDI' as const,
  hourly_rate: 12.5,
  weekly_hours: 35,
  employee_profile: {
    profile: { id: 'profile-1', first_name: 'Marie', last_name: 'Curie' },
  },
}

const MOCK_SHIFT = {
  id: 'shift-1',
  contract_id: 'contract-1',
  date: '2024-03-15',
  start_time: '09:00',
  end_time: '17:00',
  break_duration: 60,
  shift_type: 'effective',
  status: 'completed',
  has_night_action: false,
  is_requalified: false,
  effective_hours: 7,
  guard_segments: null,
  computed_pay: null,
  night_interventions_count: null,
  tasks: null,
  notes: null,
  created_at: '2024-03-15T08:00:00Z',
  updated_at: '2024-03-15T17:00:00Z',
}

const OPTIONS: PlanningExportOptions = { year: 2024, month: 3 }

describe('getPlanningExportData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne null si le profil employeur est introuvable', async () => {
    mockSupabaseSequence([{ data: null, error: { message: 'not found' } }])
    const result = await getPlanningExportData('employer-1', OPTIONS)
    expect(result).toBeNull()
  })

  it('retourne null si aucun contrat actif', async () => {
    mockSupabaseSequence([
      { data: MOCK_PROFILE, error: null },
      { data: [], error: null },
    ])
    const result = await getPlanningExportData('employer-1', OPTIONS)
    expect(result).toBeNull()
  })

  it('retourne les données correctement avec shifts', async () => {
    mockSupabaseSequence([
      { data: MOCK_PROFILE, error: null },     // profile
      { data: [MOCK_CONTRACT], error: null },  // contracts
      { data: [MOCK_SHIFT], error: null },     // shifts emp-1
      { data: [], error: null },               // absences emp-1
    ])
    const result = await getPlanningExportData('employer-1', OPTIONS)
    expect(result).not.toBeNull()
    expect(result!.periodLabel).toBe('Mars 2024')
    expect(result!.employees).toHaveLength(1)
    expect(result!.employees[0].firstName).toBe('Marie')
    expect(result!.employees[0].shifts).toHaveLength(1)
    expect(result!.totalShifts).toBe(1)
  })

  it('filtre par employeeId si fourni dans les options', async () => {
    mockSupabaseSequence([
      { data: MOCK_PROFILE, error: null },
      { data: [MOCK_CONTRACT], error: null },
      { data: [MOCK_SHIFT], error: null },
      { data: [], error: null },
    ])
    const result = await getPlanningExportData('employer-1', { ...OPTIONS, employeeId: 'emp-1' })
    expect(result).not.toBeNull()
  })

  it('inclut les absences dans les données employé', async () => {
    const MOCK_ABSENCE = {
      id: 'abs-1',
      employee_id: 'emp-1',
      absence_type: 'vacation',
      start_date: '2024-03-20',
      end_date: '2024-03-22',
      status: 'approved',
      reason: null,
      justification_url: null,
      business_days_count: 3,
      justification_due_date: null,
      family_event_type: null,
      leave_year: '2024',
      created_at: '2024-03-01T00:00:00Z',
    }
    mockSupabaseSequence([
      { data: MOCK_PROFILE, error: null },
      { data: [MOCK_CONTRACT], error: null },
      { data: [], error: null },          // shifts
      { data: [MOCK_ABSENCE], error: null }, // absences
    ])
    const result = await getPlanningExportData('employer-1', OPTIONS)
    expect(result).not.toBeNull()
    expect(result!.employees[0].absences).toHaveLength(1)
    expect(result!.employees[0].absences[0].absenceType).toBe('vacation')
  })

  it('calcule correctement les totaux', async () => {
    mockSupabaseSequence([
      { data: MOCK_PROFILE, error: null },
      { data: [MOCK_CONTRACT], error: null },
      { data: [MOCK_SHIFT], error: null }, // 7h * 12.5 = 87.5€
      { data: [], error: null },
    ])
    const result = await getPlanningExportData('employer-1', OPTIONS)
    expect(result!.employees[0].totalHours).toBeCloseTo(7, 1)
    expect(result!.employees[0].totalPay).toBeCloseTo(87.5, 1)
  })
})

describe('getPlanningExportDataForEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it(`retourne null si aucun contrat actif pour l'employé`, async () => {
    mockSupabaseSequence([{ data: null, error: { message: 'not found' } }])
    const result = await getPlanningExportDataForEmployee('emp-1', OPTIONS)
    expect(result).toBeNull()
  })

  it(`résout l'employerId et délègue à getPlanningExportData`, async () => {
    mockSupabaseSequence([
      { data: { employer_id: 'employer-1' }, error: null }, // résolution contrat
      { data: MOCK_PROFILE, error: null },                  // profil employeur
      { data: [MOCK_CONTRACT], error: null },               // contrats
      { data: [MOCK_SHIFT], error: null },                  // shifts
      { data: [], error: null },                            // absences
    ])
    const result = await getPlanningExportDataForEmployee('emp-1', OPTIONS)
    expect(result).not.toBeNull()
    expect(result!.employees[0].firstName).toBe('Marie')
  })
})
