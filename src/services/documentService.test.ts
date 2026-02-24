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

const EMPLOYER_ID = 'employer-001'

function makeContractRow(employeeId: string, firstName: string, lastName: string) {
  return {
    employee_id: employeeId,
    employee_profile: {
      profile: {
        id: `profile-${employeeId}`,
        first_name: firstName,
        last_name: lastName,
      },
    },
  }
}

function makeAbsenceDbRow(overrides: Partial<{
  id: string
  employee_id: string
  absence_type: string
  start_date: string
  end_date: string
  reason: string | null
  justification_url: string | null
  status: string
  created_at: string
}> = {}) {
  return {
    id: overrides.id ?? 'abs-001',
    employee_id: overrides.employee_id ?? 'emp-001',
    absence_type: overrides.absence_type ?? 'vacation',
    start_date: overrides.start_date ?? '2025-07-01',
    end_date: overrides.end_date ?? '2025-07-05',
    reason: overrides.reason ?? null,
    justification_url: overrides.justification_url ?? null,
    status: overrides.status ?? 'pending',
    business_days_count: null,
    justification_due_date: null,
    family_event_type: null,
    leave_year: null,
    created_at: overrides.created_at ?? '2025-06-20T10:00:00Z',
  }
}

// ============================================
// TESTS: getDocumentsForEmployer
// ============================================

describe('documentService', () => {
  describe('getDocumentsForEmployer', () => {
    it('retourne les documents avec le mapping employeeId -> profil', async () => {
      const contracts = [
        makeContractRow('emp-001', 'Alice', 'Dupont'),
        makeContractRow('emp-002', 'Bob', 'Martin'),
      ]
      const absences = [
        makeAbsenceDbRow({ id: 'abs-001', employee_id: 'emp-001', status: 'approved' }),
        makeAbsenceDbRow({ id: 'abs-002', employee_id: 'emp-002', status: 'pending' }),
      ]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: absences, error: null },
      ])

      const { getDocumentsForEmployer } = await import('@/services/documentService')
      const result = await getDocumentsForEmployer(EMPLOYER_ID)

      expect(result).toHaveLength(2)
      expect(result[0].employee.firstName).toBe('Alice')
      expect(result[0].employee.lastName).toBe('Dupont')
      expect(result[0].absence.id).toBe('abs-001')
      expect(result[0].absence.status).toBe('approved')
      expect(result[1].employee.firstName).toBe('Bob')
      expect(result[1].absence.status).toBe('pending')
    })

    it('retourne un tableau vide si erreur sur les contrats', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

      const { getDocumentsForEmployer } = await import('@/services/documentService')
      const result = await getDocumentsForEmployer(EMPLOYER_ID)

      expect(result).toEqual([])
    })

    it('retourne un tableau vide si aucun contrat actif', async () => {
      mockSupabaseQuery({ data: [], error: null })

      const { getDocumentsForEmployer } = await import('@/services/documentService')
      const result = await getDocumentsForEmployer(EMPLOYER_ID)

      expect(result).toEqual([])
    })

    it('retourne un tableau vide si contracts est null', async () => {
      mockSupabaseQuery({ data: null, error: null })

      const { getDocumentsForEmployer } = await import('@/services/documentService')
      const result = await getDocumentsForEmployer(EMPLOYER_ID)

      expect(result).toEqual([])
    })

    it('retourne un tableau vide si erreur sur les absences', async () => {
      const contracts = [makeContractRow('emp-001', 'Alice', 'Dupont')]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: null, error: { message: 'Absences error' } },
      ])

      const { getDocumentsForEmployer } = await import('@/services/documentService')
      const result = await getDocumentsForEmployer(EMPLOYER_ID)

      expect(result).toEqual([])
    })

    it('utilise "Inconnu" quand employee_id absent du map des profils', async () => {
      // Contrat pour emp-001 mais absence pour emp-999 (non dans le map)
      const contracts = [makeContractRow('emp-001', 'Alice', 'Dupont')]
      const absences = [
        makeAbsenceDbRow({ id: 'abs-x', employee_id: 'emp-999', status: 'pending' }),
      ]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: absences, error: null },
      ])

      const { getDocumentsForEmployer } = await import('@/services/documentService')
      const result = await getDocumentsForEmployer(EMPLOYER_ID)

      expect(result).toHaveLength(1)
      expect(result[0].employee.firstName).toBe('Inconnu')
      expect(result[0].employee.lastName).toBe('')
      expect(result[0].employee.id).toBe('emp-999')
    })

    it('gere un contrat sans profil (employee_profile undefined)', async () => {
      const contracts = [
        { employee_id: 'emp-001', employee_profile: undefined },
      ]
      const absences = [
        makeAbsenceDbRow({ id: 'abs-001', employee_id: 'emp-001' }),
      ]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: absences, error: null },
      ])

      const { getDocumentsForEmployer } = await import('@/services/documentService')
      const result = await getDocumentsForEmployer(EMPLOYER_ID)

      expect(result).toHaveLength(1)
      expect(result[0].employee.firstName).toBe('Inconnu')
    })

    it('mappe correctement les champs de absence (snake_case -> camelCase)', async () => {
      const contracts = [makeContractRow('emp-001', 'Alice', 'Dupont')]
      const absences = [
        makeAbsenceDbRow({
          id: 'abs-map',
          employee_id: 'emp-001',
          absence_type: 'sick',
          start_date: '2025-08-10',
          end_date: '2025-08-12',
          reason: 'Grippe',
          justification_url: 'https://example.com/doc.pdf',
          status: 'approved',
          created_at: '2025-08-09T08:00:00Z',
        }),
      ]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: absences, error: null },
      ])

      const { getDocumentsForEmployer } = await import('@/services/documentService')
      const result = await getDocumentsForEmployer(EMPLOYER_ID)

      const absence = result[0].absence
      expect(absence.id).toBe('abs-map')
      expect(absence.employeeId).toBe('emp-001')
      expect(absence.absenceType).toBe('sick')
      expect(absence.startDate).toEqual(new Date('2025-08-10'))
      expect(absence.endDate).toEqual(new Date('2025-08-12'))
      expect(absence.reason).toBe('Grippe')
      expect(absence.justificationUrl).toBe('https://example.com/doc.pdf')
      expect(absence.status).toBe('approved')
      expect(absence.createdAt).toEqual(new Date('2025-08-09T08:00:00Z'))
    })

    it('retourne un tableau vide si absences est null (pas erreur)', async () => {
      const contracts = [makeContractRow('emp-001', 'Alice', 'Dupont')]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: null, error: null },
      ])

      const { getDocumentsForEmployer } = await import('@/services/documentService')
      const result = await getDocumentsForEmployer(EMPLOYER_ID)

      expect(result).toEqual([])
    })
  })

  // ============================================
  // TESTS: getDocumentStatsForEmployer
  // ============================================

  describe('getDocumentStatsForEmployer', () => {
    it('compte correctement les absences par status', async () => {
      const contracts = [
        makeContractRow('emp-001', 'Alice', 'Dupont'),
      ]
      const absences = [
        makeAbsenceDbRow({ id: 'a1', employee_id: 'emp-001', status: 'pending' }),
        makeAbsenceDbRow({ id: 'a2', employee_id: 'emp-001', status: 'approved' }),
        makeAbsenceDbRow({ id: 'a3', employee_id: 'emp-001', status: 'approved' }),
        makeAbsenceDbRow({ id: 'a4', employee_id: 'emp-001', status: 'rejected' }),
      ]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: absences, error: null },
      ])

      const { getDocumentStatsForEmployer } = await import('@/services/documentService')
      const stats = await getDocumentStatsForEmployer(EMPLOYER_ID)

      expect(stats.totalAbsences).toBe(4)
      expect(stats.pendingAbsences).toBe(1)
      expect(stats.approvedAbsences).toBe(2)
      expect(stats.rejectedAbsences).toBe(1)
    })

    it('compte les absences avec justificatif', async () => {
      const contracts = [makeContractRow('emp-001', 'Alice', 'Dupont')]
      const absences = [
        makeAbsenceDbRow({ id: 'a1', employee_id: 'emp-001', justification_url: 'https://doc.pdf' }),
        makeAbsenceDbRow({ id: 'a2', employee_id: 'emp-001', justification_url: null }),
        makeAbsenceDbRow({ id: 'a3', employee_id: 'emp-001', justification_url: 'https://doc2.pdf' }),
      ]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: absences, error: null },
      ])

      const { getDocumentStatsForEmployer } = await import('@/services/documentService')
      const stats = await getDocumentStatsForEmployer(EMPLOYER_ID)

      expect(stats.withJustification).toBe(2)
      expect(stats.totalAbsences).toBe(3)
    })

    it('retourne des compteurs a zero si aucun document', async () => {
      mockSupabaseQuery({ data: [], error: null })

      const { getDocumentStatsForEmployer } = await import('@/services/documentService')
      const stats = await getDocumentStatsForEmployer(EMPLOYER_ID)

      expect(stats).toEqual({
        totalAbsences: 0,
        pendingAbsences: 0,
        approvedAbsences: 0,
        rejectedAbsences: 0,
        withJustification: 0,
      })
    })
  })

  // ============================================
  // TESTS: getDocumentsWithJustification
  // ============================================

  describe('getDocumentsWithJustification', () => {
    it('retourne uniquement les documents avec justificationUrl', async () => {
      const contracts = [makeContractRow('emp-001', 'Alice', 'Dupont')]
      const absences = [
        makeAbsenceDbRow({ id: 'a1', employee_id: 'emp-001', justification_url: 'https://justif.pdf' }),
        makeAbsenceDbRow({ id: 'a2', employee_id: 'emp-001', justification_url: null }),
        makeAbsenceDbRow({ id: 'a3', employee_id: 'emp-001', justification_url: 'https://justif2.pdf' }),
      ]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: absences, error: null },
      ])

      const { getDocumentsWithJustification } = await import('@/services/documentService')
      const result = await getDocumentsWithJustification(EMPLOYER_ID)

      expect(result).toHaveLength(2)
      expect(result[0].absence.justificationUrl).toBe('https://justif.pdf')
      expect(result[1].absence.justificationUrl).toBe('https://justif2.pdf')
    })

    it('retourne un tableau vide si aucun document avec justificatif', async () => {
      const contracts = [makeContractRow('emp-001', 'Alice', 'Dupont')]
      const absences = [
        makeAbsenceDbRow({ id: 'a1', employee_id: 'emp-001', justification_url: null }),
      ]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: absences, error: null },
      ])

      const { getDocumentsWithJustification } = await import('@/services/documentService')
      const result = await getDocumentsWithJustification(EMPLOYER_ID)

      expect(result).toEqual([])
    })
  })

  // ============================================
  // TESTS: getPendingDocuments
  // ============================================

  describe('getPendingDocuments', () => {
    it('retourne uniquement les documents avec status pending', async () => {
      const contracts = [makeContractRow('emp-001', 'Alice', 'Dupont')]
      const absences = [
        makeAbsenceDbRow({ id: 'a1', employee_id: 'emp-001', status: 'pending' }),
        makeAbsenceDbRow({ id: 'a2', employee_id: 'emp-001', status: 'approved' }),
        makeAbsenceDbRow({ id: 'a3', employee_id: 'emp-001', status: 'pending' }),
        makeAbsenceDbRow({ id: 'a4', employee_id: 'emp-001', status: 'rejected' }),
      ]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: absences, error: null },
      ])

      const { getPendingDocuments } = await import('@/services/documentService')
      const result = await getPendingDocuments(EMPLOYER_ID)

      expect(result).toHaveLength(2)
      expect(result.every((d) => d.absence.status === 'pending')).toBe(true)
    })

    it('retourne un tableau vide si aucune absence en attente', async () => {
      const contracts = [makeContractRow('emp-001', 'Alice', 'Dupont')]
      const absences = [
        makeAbsenceDbRow({ id: 'a1', employee_id: 'emp-001', status: 'approved' }),
        makeAbsenceDbRow({ id: 'a2', employee_id: 'emp-001', status: 'rejected' }),
      ]

      mockSupabaseQuerySequence([
        { data: contracts, error: null },
        { data: absences, error: null },
      ])

      const { getPendingDocuments } = await import('@/services/documentService')
      const result = await getPendingDocuments(EMPLOYER_ID)

      expect(result).toEqual([])
    })

    it('retourne un tableau vide si getDocumentsForEmployer echoue', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'Erreur' } })

      const { getPendingDocuments } = await import('@/services/documentService')
      const result = await getPendingDocuments(EMPLOYER_ID)

      expect(result).toEqual([])
    })
  })
})
