import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validateJustificationFile,
  uploadJustification,
  getAbsencesForEmployee,
  getAbsencesForEmployer,
  getPendingAbsencesForEmployer,
  createAbsence,
  updateAbsenceStatus,
  cancelAbsence,
  deleteAbsence,
} from './absenceService'

// ─── Mocks ──────────────────────────────────────────────────────────

const mockFrom = vi.fn()
const mockStorage = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: (...args: unknown[]) => mockStorage(...args),
    },
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

const mockValidateAbsenceRequest = vi.fn()
const mockCountBusinessDays = vi.fn()
const mockGetLeaveYear = vi.fn()
const mockCalculateJustificationDueDate = vi.fn()

vi.mock('@/lib/absence', () => ({
  validateAbsenceRequest: (...args: unknown[]) => mockValidateAbsenceRequest(...args),
  countBusinessDays: (...args: unknown[]) => mockCountBusinessDays(...args),
  getLeaveYear: (...args: unknown[]) => mockGetLeaveYear(...args),
  calculateJustificationDueDate: (...args: unknown[]) => mockCalculateJustificationDueDate(...args),
}))

const mockGetProfileName = vi.fn()
const mockCreateAbsenceRequestedNotification = vi.fn()
const mockCreateAbsenceResolvedNotification = vi.fn()

vi.mock('@/services/notificationService', () => ({
  getProfileName: (...args: unknown[]) => mockGetProfileName(...args),
  createAbsenceRequestedNotification: (...args: unknown[]) => mockCreateAbsenceRequestedNotification(...args),
  createAbsenceResolvedNotification: (...args: unknown[]) => mockCreateAbsenceResolvedNotification(...args),
}))

const mockAddTakenDays = vi.fn()
const mockRestoreTakenDays = vi.fn()
const mockGetLeaveBalance = vi.fn()
const mockInitializeLeaveBalance = vi.fn()

vi.mock('@/services/leaveBalanceService', () => ({
  addTakenDays: (...args: unknown[]) => mockAddTakenDays(...args),
  restoreTakenDays: (...args: unknown[]) => mockRestoreTakenDays(...args),
  getLeaveBalance: (...args: unknown[]) => mockGetLeaveBalance(...args),
  initializeLeaveBalance: (...args: unknown[]) => mockInitializeLeaveBalance(...args),
}))

// ─── Helpers ────────────────────────────────────────────────────────

function createMockAbsenceDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'absence-123',
    employee_id: 'emp-456',
    absence_type: 'sick',
    start_date: '2024-03-18',
    end_date: '2024-03-22',
    reason: 'Grippe',
    justification_url: null,
    status: 'pending',
    business_days_count: 5,
    justification_due_date: '2024-03-20',
    family_event_type: null,
    leave_year: null,
    created_at: '2024-03-18T08:00:00.000Z',
    ...overrides,
  }
}

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
  chain.order = vi.fn().mockResolvedValue(resolvedValue)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  chain.limit = vi.fn().mockReturnValue(chain)

  // Pour les requêtes qui finissent par .eq sans .order/.single
  chain.eq.mockReturnValue(chain)
  // Résoudre aussi comme promesse (quand la chaîne se termine sans .order/.single)
  const promise = Promise.resolve(resolvedValue)
  Object.assign(chain, { then: promise.then.bind(promise), catch: promise.catch.bind(promise) })

  mockFrom.mockReturnValue(chain)
  return chain
}

/**
 * Configure mockFrom pour retourner des résultats différents selon la table.
 * Utile quand une fonction appelle supabase.from('table1') puis .from('table2').
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
    chain.order = vi.fn().mockResolvedValue(resolvedValue)
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

// ─── Tests ──────────────────────────────────────────────────────────

describe('absenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ================================================================
  // validateJustificationFile
  // ================================================================

  describe('validateJustificationFile', () => {
    it('devrait accepter un PDF valide', () => {
      const file = new File(['content'], 'arret.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 })

      expect(validateJustificationFile(file)).toEqual({ valid: true })
    })

    it('devrait accepter un JPEG valide', () => {
      const file = new File(['content'], 'arret.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 500 * 1024 })

      expect(validateJustificationFile(file)).toEqual({ valid: true })
    })

    it('devrait accepter un PNG valide', () => {
      const file = new File(['content'], 'arret.png', { type: 'image/png' })
      Object.defineProperty(file, 'size', { value: 500 * 1024 })

      expect(validateJustificationFile(file)).toEqual({ valid: true })
    })

    it('devrait accepter un WebP valide', () => {
      const file = new File(['content'], 'arret.webp', { type: 'image/webp' })
      Object.defineProperty(file, 'size', { value: 500 * 1024 })

      expect(validateJustificationFile(file)).toEqual({ valid: true })
    })

    it('devrait rejeter un format non supporté (DOCX)', () => {
      const file = new File(['content'], 'doc.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const result = validateJustificationFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Format non supporté')
    })

    it('devrait rejeter un fichier SVG', () => {
      const file = new File(['<svg></svg>'], 'image.svg', { type: 'image/svg+xml' })

      const result = validateJustificationFile(file)
      expect(result.valid).toBe(false)
    })

    it('devrait rejeter un fichier trop volumineux (> 5 Mo)', () => {
      const file = new File(['content'], 'big.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 })

      const result = validateJustificationFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('trop volumineux')
      expect(result.error).toContain('5 Mo')
    })

    it('devrait accepter un fichier exactement à 5 Mo', () => {
      const file = new File(['content'], 'exact.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 })

      expect(validateJustificationFile(file)).toEqual({ valid: true })
    })
  })

  // ================================================================
  // uploadJustification
  // ================================================================

  describe('uploadJustification', () => {
    const mockUpload = vi.fn()
    const mockGetPublicUrl = vi.fn()

    beforeEach(() => {
      mockStorage.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })
    })

    it('devrait uploader un fichier valide et retourner l\'URL', async () => {
      const file = new File(['content'], 'arret.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 })

      mockUpload.mockResolvedValue({ error: null })
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/justifications/emp-456/arret.pdf' },
      })

      const result = await uploadJustification('emp-456', file)

      expect(result.url).toContain('storage.example.com')
      expect(mockUpload).toHaveBeenCalled()
      expect(mockStorage).toHaveBeenCalledWith('justifications')
    })

    it('devrait rejeter un fichier invalide sans appeler storage', async () => {
      const file = new File(['content'], 'doc.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      await expect(uploadJustification('emp-456', file)).rejects.toThrow('Format non supporté')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('devrait lancer une erreur si l\'upload échoue', async () => {
      const file = new File(['content'], 'arret.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 })

      mockUpload.mockResolvedValue({ error: { message: 'Storage full' } })

      await expect(uploadJustification('emp-456', file)).rejects.toThrow(
        'Erreur lors de l\'upload du justificatif.'
      )
    })

    it('devrait utiliser le type absence pour nommer le fichier (sick)', async () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: 100 * 1024 })

      mockUpload.mockResolvedValue({ error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/f.pdf' } })

      await uploadJustification('emp-456', file, {
        absenceType: 'sick',
        startDate: new Date('2024-03-18'),
      })

      const uploadArgs = mockUpload.mock.calls[0]
      expect(uploadArgs[0]).toContain('emp-456/')
      expect(uploadArgs[0]).toContain('arret_2024_03_18')
    })

    it('devrait utiliser "justificatif" pour les types non-sick', async () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: 100 * 1024 })

      mockUpload.mockResolvedValue({ error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/f.pdf' } })

      await uploadJustification('emp-456', file, {
        absenceType: 'family_event',
        startDate: new Date('2024-06-15'),
      })

      const uploadArgs = mockUpload.mock.calls[0]
      expect(uploadArgs[0]).toContain('justificatif_2024_06_15')
    })
  })

  // ================================================================
  // getAbsencesForEmployee
  // ================================================================

  describe('getAbsencesForEmployee', () => {
    it('devrait retourner les absences mappées en camelCase', async () => {
      const absenceRow = createMockAbsenceDbRow()
      mockSupabaseQuery({ data: [absenceRow], error: null })

      const result = await getAbsencesForEmployee('emp-456')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('absence-123')
      expect(result[0].employeeId).toBe('emp-456')
      expect(result[0].absenceType).toBe('sick')
      expect(result[0].startDate).toBeInstanceOf(Date)
      expect(result[0].endDate).toBeInstanceOf(Date)
      expect(result[0].reason).toBe('Grippe')
      expect(result[0].status).toBe('pending')
      expect(result[0].businessDaysCount).toBe(5)
    })

    it('devrait retourner un tableau vide en cas d\'erreur', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

      const result = await getAbsencesForEmployee('emp-456')

      expect(result).toEqual([])
    })

    it('devrait retourner un tableau vide si aucune absence', async () => {
      mockSupabaseQuery({ data: [], error: null })

      const result = await getAbsencesForEmployee('emp-456')

      expect(result).toEqual([])
    })

    it('devrait mapper les champs optionnels null en undefined', async () => {
      const absenceRow = createMockAbsenceDbRow({
        reason: null,
        justification_url: null,
        business_days_count: null,
        justification_due_date: null,
        family_event_type: null,
        leave_year: null,
      })
      mockSupabaseQuery({ data: [absenceRow], error: null })

      const result = await getAbsencesForEmployee('emp-456')

      expect(result[0].reason).toBeUndefined()
      expect(result[0].justificationUrl).toBeUndefined()
      expect(result[0].businessDaysCount).toBeUndefined()
      expect(result[0].justificationDueDate).toBeUndefined()
      expect(result[0].familyEventType).toBeUndefined()
      expect(result[0].leaveYear).toBeUndefined()
    })

    it('devrait mapper la justificationDueDate comme Date', async () => {
      const absenceRow = createMockAbsenceDbRow({
        justification_due_date: '2024-03-20',
      })
      mockSupabaseQuery({ data: [absenceRow], error: null })

      const result = await getAbsencesForEmployee('emp-456')

      expect(result[0].justificationDueDate).toBeInstanceOf(Date)
    })

    it('devrait mapper le familyEventType', async () => {
      const absenceRow = createMockAbsenceDbRow({
        absence_type: 'family_event',
        family_event_type: 'marriage',
      })
      mockSupabaseQuery({ data: [absenceRow], error: null })

      const result = await getAbsencesForEmployee('emp-456')

      expect(result[0].familyEventType).toBe('marriage')
    })
  })

  // ================================================================
  // getAbsencesForEmployer
  // ================================================================

  describe('getAbsencesForEmployer', () => {
    it('devrait récupérer les absences via les contrats actifs', async () => {
      const absenceRow = createMockAbsenceDbRow()
      const chains = mockSupabaseQuerySequence([
        // 1. Requête contracts
        { data: [{ employee_id: 'emp-456' }], error: null },
        // 2. Requête absences
        { data: [absenceRow], error: null },
      ])
      // La 2e chaîne finit par .order, pas .eq
      chains[1].order!.mockResolvedValue({ data: [absenceRow], error: null })

      const result = await getAbsencesForEmployer('employer-789')

      expect(result).toHaveLength(1)
      expect(result[0].employeeId).toBe('emp-456')
    })

    it('devrait retourner vide si aucun contrat actif', async () => {
      mockSupabaseQuerySequence([
        { data: [], error: null },
      ])

      const result = await getAbsencesForEmployer('employer-789')

      expect(result).toEqual([])
    })

    it('devrait retourner vide si erreur sur les contrats', async () => {
      mockSupabaseQuerySequence([
        { data: null, error: { message: 'DB error' } },
      ])

      const result = await getAbsencesForEmployer('employer-789')

      expect(result).toEqual([])
    })

    it('devrait retourner vide si erreur sur les absences', async () => {
      const chains = mockSupabaseQuerySequence([
        { data: [{ employee_id: 'emp-456' }], error: null },
        { data: null, error: { message: 'Query error' } },
      ])
      chains[1].order!.mockResolvedValue({ data: null, error: { message: 'Query error' } })

      const result = await getAbsencesForEmployer('employer-789')

      expect(result).toEqual([])
    })
  })

  // ================================================================
  // getPendingAbsencesForEmployer
  // ================================================================

  describe('getPendingAbsencesForEmployer', () => {
    it('devrait ne retourner que les absences pending', async () => {
      const pendingRow = createMockAbsenceDbRow({ status: 'pending' })
      const chains = mockSupabaseQuerySequence([
        { data: [{ employee_id: 'emp-456' }], error: null },
        { data: [pendingRow], error: null },
      ])
      chains[1].order!.mockResolvedValue({ data: [pendingRow], error: null })

      const result = await getPendingAbsencesForEmployer('employer-789')

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('pending')
    })

    it('devrait retourner vide si aucun contrat', async () => {
      mockSupabaseQuerySequence([
        { data: null, error: null },
      ])

      const result = await getPendingAbsencesForEmployer('employer-789')

      expect(result).toEqual([])
    })
  })

  // ================================================================
  // createAbsence
  // ================================================================

  describe('createAbsence', () => {
    const baseAbsenceData = {
      absenceType: 'sick' as const,
      startDate: new Date('2024-03-18'),
      endDate: new Date('2024-03-22'),
      reason: 'Grippe',
    }

    beforeEach(() => {
      // Validation par défaut : OK
      mockValidateAbsenceRequest.mockReturnValue({ valid: true, errors: [], warnings: [] })
      mockCountBusinessDays.mockReturnValue(5)
      mockGetLeaveYear.mockReturnValue('2023-2024')
      mockCalculateJustificationDueDate.mockReturnValue(new Date('2024-03-20'))
      mockGetProfileName.mockResolvedValue('Jean Dupont')
      mockCreateAbsenceRequestedNotification.mockResolvedValue(undefined)
    })

    it('devrait créer une absence sick avec succès', async () => {
      const createdRow = createMockAbsenceDbRow()
      const chains = mockSupabaseQuerySequence([
        // 1. Récupération absences existantes (pour validation)
        { data: [], error: null },
        // 2. Insert absence
        { data: createdRow, error: null },
        // 3. Récupération contrat pour notification
        { data: { employer_id: 'employer-789' }, error: null },
      ])
      // L'insert finit par .single()
      chains[1].single!.mockResolvedValue({ data: createdRow, error: null })

      const result = await createAbsence('emp-456', baseAbsenceData)

      expect(result).not.toBeNull()
      expect(result!.id).toBe('absence-123')
      expect(result!.absenceType).toBe('sick')
      expect(mockValidateAbsenceRequest).toHaveBeenCalled()
      expect(mockCountBusinessDays).toHaveBeenCalledWith(
        baseAbsenceData.startDate,
        baseAbsenceData.endDate
      )
    })

    it('devrait sanitiser la raison avant insertion', async () => {
      const { sanitizeText } = await import('@/lib/sanitize')
      const createdRow = createMockAbsenceDbRow()
      const chains = mockSupabaseQuerySequence([
        { data: [], error: null },
        { data: createdRow, error: null },
        { data: { employer_id: 'employer-789' }, error: null },
      ])
      chains[1].single!.mockResolvedValue({ data: createdRow, error: null })

      await createAbsence('emp-456', {
        ...baseAbsenceData,
        reason: '  Grippe avec fièvre  ',
      })

      expect(sanitizeText).toHaveBeenCalledWith('  Grippe avec fièvre  ')
    })

    it('devrait lancer une erreur si la validation échoue', async () => {
      mockValidateAbsenceRequest.mockReturnValue({
        valid: false,
        errors: ['Chevauchement avec une absence existante'],
        warnings: [],
      })
      // On a besoin au moins du 1er appel from() pour récupérer les absences existantes
      mockSupabaseQuerySequence([
        { data: [], error: null },
      ])

      await expect(createAbsence('emp-456', baseAbsenceData)).rejects.toThrow(
        'Chevauchement avec une absence existante'
      )
    })

    it('devrait gérer l\'erreur de contrainte de chevauchement DB', async () => {
      const chains = mockSupabaseQuerySequence([
        { data: [], error: null },
        { data: null, error: { message: 'violates exclusion constraint "absences_no_overlap"' } },
      ])
      chains[1].single!.mockResolvedValue({
        data: null,
        error: { message: 'violates exclusion constraint "absences_no_overlap"' },
      })

      await expect(createAbsence('emp-456', baseAbsenceData)).rejects.toThrow(
        'Une absence est déjà déclarée sur cette période.'
      )
    })

    it('devrait calculer justificationDueDate pour sick leave', async () => {
      const createdRow = createMockAbsenceDbRow()
      const chains = mockSupabaseQuerySequence([
        { data: [], error: null },
        { data: createdRow, error: null },
        { data: { employer_id: 'employer-789' }, error: null },
      ])
      chains[1].single!.mockResolvedValue({ data: createdRow, error: null })

      await createAbsence('emp-456', baseAbsenceData)

      expect(mockCalculateJustificationDueDate).toHaveBeenCalledWith(baseAbsenceData.startDate)
    })

    it('devrait ne pas calculer justificationDueDate pour vacation', async () => {
      const createdRow = createMockAbsenceDbRow({ absence_type: 'vacation', leave_year: '2023-2024' })
      const chains = mockSupabaseQuerySequence([
        // 1. Absences existantes
        { data: [], error: null },
        // 2. Contract lookup (pour vacation leave balance)
        { data: { id: 'contract-1', employer_id: 'employer-789', start_date: '2024-01-01', weekly_hours: 35 }, error: null },
        // 3. Insert absence
        { data: createdRow, error: null },
        // 4. Contract pour notification
        { data: { employer_id: 'employer-789' }, error: null },
      ])
      chains[1].maybeSingle!.mockResolvedValue({
        data: { id: 'contract-1', employer_id: 'employer-789', start_date: '2024-01-01', weekly_hours: 35 },
        error: null,
      })
      chains[2].single!.mockResolvedValue({ data: createdRow, error: null })
      mockGetLeaveBalance.mockResolvedValue({ acquiredDays: 25, takenDays: 5, adjustmentDays: 0 })

      await createAbsence('emp-456', {
        ...baseAbsenceData,
        absenceType: 'vacation',
      })

      // Pour vacation, pas de justificationDueDate
      expect(mockCalculateJustificationDueDate).not.toHaveBeenCalled()
    })

    it('devrait notifier l\'employeur après création', async () => {
      const createdRow = createMockAbsenceDbRow()
      const chains = mockSupabaseQuerySequence([
        { data: [], error: null },
        { data: createdRow, error: null },
        { data: { employer_id: 'employer-789' }, error: null },
      ])
      chains[1].single!.mockResolvedValue({ data: createdRow, error: null })

      await createAbsence('emp-456', baseAbsenceData)

      expect(mockGetProfileName).toHaveBeenCalledWith('emp-456')
      expect(mockCreateAbsenceRequestedNotification).toHaveBeenCalledWith(
        'employer-789',
        'Jean Dupont',
        'sick',
        baseAbsenceData.startDate,
        baseAbsenceData.endDate
      )
    })

    it('devrait ne pas échouer si la notification rate', async () => {
      const createdRow = createMockAbsenceDbRow()
      const chains = mockSupabaseQuerySequence([
        { data: [], error: null },
        { data: createdRow, error: null },
        { data: { employer_id: 'employer-789' }, error: null },
      ])
      chains[1].single!.mockResolvedValue({ data: createdRow, error: null })
      mockCreateAbsenceRequestedNotification.mockRejectedValue(new Error('Notif failed'))

      // Ne devrait PAS throw malgré l'erreur de notification
      const result = await createAbsence('emp-456', baseAbsenceData)
      expect(result).not.toBeNull()
    })

    it('devrait passer le familyEventType à la validation', async () => {
      const createdRow = createMockAbsenceDbRow({ absence_type: 'family_event', family_event_type: 'marriage' })
      const chains = mockSupabaseQuerySequence([
        { data: [], error: null },
        { data: createdRow, error: null },
        { data: { employer_id: 'employer-789' }, error: null },
      ])
      chains[1].single!.mockResolvedValue({ data: createdRow, error: null })

      await createAbsence('emp-456', {
        absenceType: 'family_event',
        startDate: new Date('2024-06-15'),
        endDate: new Date('2024-06-19'),
        familyEventType: 'marriage',
      })

      expect(mockValidateAbsenceRequest).toHaveBeenCalledWith(
        expect.objectContaining({ familyEventType: 'marriage' }),
        expect.any(Array),
        null
      )
    })
  })

  // ================================================================
  // updateAbsenceStatus
  // ================================================================

  describe('updateAbsenceStatus', () => {
    it('devrait approuver une absence', async () => {
      const chains = mockSupabaseQuerySequence([
        // 1. Fetch absence
        { data: { employee_id: 'emp-456', start_date: '2024-03-18', end_date: '2024-03-22', absence_type: 'sick', business_days_count: 5, leave_year: null }, error: null },
        // 2. Update status
        { data: null, error: null },
        // 3. Contracts lookup (cancelShiftsForAbsence)
        { data: [{ id: 'contract-1' }], error: null },
        // 4. Shifts lookup
        { data: [], error: null },
      ])
      chains[0].single!.mockResolvedValue({
        data: { employee_id: 'emp-456', start_date: '2024-03-18', end_date: '2024-03-22', absence_type: 'sick', business_days_count: 5, leave_year: null },
        error: null,
      })
      mockCreateAbsenceResolvedNotification.mockResolvedValue(undefined)

      await expect(updateAbsenceStatus('absence-123', 'approved')).resolves.not.toThrow()

      expect(mockCreateAbsenceResolvedNotification).toHaveBeenCalledWith(
        'emp-456',
        'approved',
        expect.any(Date),
        expect.any(Date)
      )
    })

    it('devrait rejeter une absence', async () => {
      const chains = mockSupabaseQuerySequence([
        { data: { employee_id: 'emp-456', start_date: '2024-03-18', end_date: '2024-03-22', absence_type: 'sick', business_days_count: null, leave_year: null }, error: null },
        { data: null, error: null },
      ])
      chains[0].single!.mockResolvedValue({
        data: { employee_id: 'emp-456', start_date: '2024-03-18', end_date: '2024-03-22', absence_type: 'sick', business_days_count: null, leave_year: null },
        error: null,
      })
      mockCreateAbsenceResolvedNotification.mockResolvedValue(undefined)

      await expect(updateAbsenceStatus('absence-123', 'rejected')).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si l\'absence n\'existe pas', async () => {
      const chain = mockSupabaseQuery({ data: null, error: { message: 'Not found' } })
      chain.single!.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      await expect(updateAbsenceStatus('bad-id', 'approved')).rejects.toThrow('Absence non trouvée')
    })

    it('devrait lancer une erreur si la mise à jour échoue', async () => {
      const chains = mockSupabaseQuerySequence([
        { data: { employee_id: 'emp-456', start_date: '2024-03-18', end_date: '2024-03-22', absence_type: 'sick', business_days_count: null, leave_year: null }, error: null },
        { data: null, error: { message: 'Update failed' } },
      ])
      chains[0].single!.mockResolvedValue({
        data: { employee_id: 'emp-456', start_date: '2024-03-18', end_date: '2024-03-22', absence_type: 'sick', business_days_count: null, leave_year: null },
        error: null,
      })
      // Le 2e appel (update) se résout aussi comme promesse via le chain
      // Mais update().eq() renvoie une promesse, donc on configure eq pour résoudre l'erreur
      chains[1].eq!.mockResolvedValue({ data: null, error: { message: 'Update failed' } })

      await expect(updateAbsenceStatus('absence-123', 'approved')).rejects.toThrow('Update failed')
    })

    it('devrait décompter les jours si vacation approuvée', async () => {
      const absenceData = {
        employee_id: 'emp-456',
        start_date: '2024-03-18',
        end_date: '2024-03-22',
        absence_type: 'vacation',
        business_days_count: 5,
        leave_year: '2023-2024',
      }
      const chains = mockSupabaseQuerySequence([
        // 1. Fetch absence
        { data: absenceData, error: null },
        // 2. Update status
        { data: null, error: null },
        // 3. Contract lookup (pour addTakenDays)
        { data: { id: 'contract-1' }, error: null },
        // 4. Contract lookup (cancelShiftsForAbsence)
        { data: [{ id: 'contract-1' }], error: null },
        // 5. Shifts lookup
        { data: [], error: null },
      ])
      chains[0].single!.mockResolvedValue({ data: absenceData, error: null })
      chains[2].maybeSingle!.mockResolvedValue({ data: { id: 'contract-1' }, error: null })
      mockAddTakenDays.mockResolvedValue(undefined)
      mockCreateAbsenceResolvedNotification.mockResolvedValue(undefined)

      await updateAbsenceStatus('absence-123', 'approved')

      expect(mockAddTakenDays).toHaveBeenCalledWith('contract-1', '2023-2024', 5)
    })

    it('devrait ne pas décompter les jours pour sick leave approuvée', async () => {
      const absenceData = {
        employee_id: 'emp-456',
        start_date: '2024-03-18',
        end_date: '2024-03-22',
        absence_type: 'sick',
        business_days_count: 5,
        leave_year: null,
      }
      const chains = mockSupabaseQuerySequence([
        { data: absenceData, error: null },
        { data: null, error: null },
        // cancelShiftsForAbsence lookups
        { data: [{ id: 'contract-1' }], error: null },
        { data: [], error: null },
      ])
      chains[0].single!.mockResolvedValue({ data: absenceData, error: null })
      mockCreateAbsenceResolvedNotification.mockResolvedValue(undefined)

      await updateAbsenceStatus('absence-123', 'approved')

      expect(mockAddTakenDays).not.toHaveBeenCalled()
    })
  })

  // ================================================================
  // cancelAbsence
  // ================================================================

  describe('cancelAbsence', () => {
    it('devrait annuler une absence pending', async () => {
      const chains = mockSupabaseQuerySequence([
        // 1. Fetch absence
        { data: { employee_id: 'emp-456', status: 'pending', absence_type: 'sick', business_days_count: null, leave_year: null }, error: null },
        // 2. Delete
        { data: null, error: null },
      ])
      chains[0].single!.mockResolvedValue({
        data: { employee_id: 'emp-456', status: 'pending', absence_type: 'sick', business_days_count: null, leave_year: null },
        error: null,
      })

      await expect(cancelAbsence('absence-123', 'emp-456')).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si l\'absence n\'appartient pas à l\'employé', async () => {
      const chain = mockSupabaseQuery({
        data: { employee_id: 'autre-emp', status: 'pending', absence_type: 'sick', business_days_count: null, leave_year: null },
        error: null,
      })
      chain.single!.mockResolvedValue({
        data: { employee_id: 'autre-emp', status: 'pending', absence_type: 'sick', business_days_count: null, leave_year: null },
        error: null,
      })

      await expect(cancelAbsence('absence-123', 'emp-456')).rejects.toThrow(
        'Vous ne pouvez annuler que vos propres absences'
      )
    })

    it('devrait refuser d\'annuler une absence rejected', async () => {
      const chain = mockSupabaseQuery({
        data: { employee_id: 'emp-456', status: 'rejected', absence_type: 'sick', business_days_count: null, leave_year: null },
        error: null,
      })
      chain.single!.mockResolvedValue({
        data: { employee_id: 'emp-456', status: 'rejected', absence_type: 'sick', business_days_count: null, leave_year: null },
        error: null,
      })

      await expect(cancelAbsence('absence-123', 'emp-456')).rejects.toThrow(
        'Cette absence ne peut plus être annulée'
      )
    })

    it('devrait restaurer les jours si annulation d\'une vacation approuvée', async () => {
      const chains = mockSupabaseQuerySequence([
        // 1. Fetch absence
        { data: { employee_id: 'emp-456', status: 'approved', absence_type: 'vacation', business_days_count: 5, leave_year: '2023-2024' }, error: null },
        // 2. Contract lookup (restoreTakenDays)
        { data: { id: 'contract-1' }, error: null },
        // 3. Delete
        { data: null, error: null },
      ])
      chains[0].single!.mockResolvedValue({
        data: { employee_id: 'emp-456', status: 'approved', absence_type: 'vacation', business_days_count: 5, leave_year: '2023-2024' },
        error: null,
      })
      chains[1].maybeSingle!.mockResolvedValue({ data: { id: 'contract-1' }, error: null })
      mockRestoreTakenDays.mockResolvedValue(undefined)

      await cancelAbsence('absence-123', 'emp-456')

      expect(mockRestoreTakenDays).toHaveBeenCalledWith('contract-1', '2023-2024', 5)
    })

    it('devrait ne pas restaurer les jours si annulation d\'une pending vacation', async () => {
      const chains = mockSupabaseQuerySequence([
        { data: { employee_id: 'emp-456', status: 'pending', absence_type: 'vacation', business_days_count: 5, leave_year: '2023-2024' }, error: null },
        { data: null, error: null },
      ])
      chains[0].single!.mockResolvedValue({
        data: { employee_id: 'emp-456', status: 'pending', absence_type: 'vacation', business_days_count: 5, leave_year: '2023-2024' },
        error: null,
      })

      await cancelAbsence('absence-123', 'emp-456')

      // Pas de restauration car l'absence n'était pas encore approuvée
      expect(mockRestoreTakenDays).not.toHaveBeenCalled()
    })

    it('devrait lancer une erreur si la suppression échoue', async () => {
      const chains = mockSupabaseQuerySequence([
        { data: { employee_id: 'emp-456', status: 'pending', absence_type: 'sick', business_days_count: null, leave_year: null }, error: null },
        { data: null, error: { message: 'Delete failed' } },
      ])
      chains[0].single!.mockResolvedValue({
        data: { employee_id: 'emp-456', status: 'pending', absence_type: 'sick', business_days_count: null, leave_year: null },
        error: null,
      })
      // delete().eq() résout en promesse
      chains[1].eq!.mockResolvedValue({ data: null, error: { message: 'Delete failed' } })

      await expect(cancelAbsence('absence-123', 'emp-456')).rejects.toThrow('Delete failed')
    })

    it('devrait lancer une erreur si l\'absence n\'existe pas', async () => {
      const chain = mockSupabaseQuery({ data: null, error: { message: 'Not found' } })
      chain.single!.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      await expect(cancelAbsence('bad-id', 'emp-456')).rejects.toThrow('Absence non trouvée')
    })
  })

  // ================================================================
  // deleteAbsence
  // ================================================================

  describe('deleteAbsence', () => {
    it('devrait supprimer une absence avec succès', async () => {
      mockSupabaseQuery({ data: null, error: null })

      await expect(deleteAbsence('absence-123')).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si la suppression échoue', async () => {
      const chain = mockSupabaseQuery({ data: null, error: { message: 'FK constraint' } })
      chain.eq!.mockResolvedValue({ data: null, error: { message: 'FK constraint' } })

      await expect(deleteAbsence('absence-123')).rejects.toThrow('FK constraint')
    })
  })
})
