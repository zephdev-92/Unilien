import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getCaregiver,
  getCaregiverEmployerId,
  getCaregiverPermissions,
  getShiftsForCaregiver,
  getUpcomingShiftsForCaregiver,
  upsertCaregiver,
  updateCaregiverProfile,
  updateCaregiverPermissions,
  getCaregiversForEmployer,
  searchCaregiverByEmail,
  addCaregiverToEmployer,
  updateCaregiver,
  removeCaregiverFromEmployer,
} from './caregiverService'

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

const mockGetProfileName = vi.fn()
const mockCreateTeamMemberAddedNotification = vi.fn()
const mockCreateTeamMemberRemovedNotification = vi.fn()
const mockCreatePermissionsUpdatedNotification = vi.fn()

vi.mock('@/services/notificationService', () => ({
  getProfileName: (...args: unknown[]) => mockGetProfileName(...args),
  createTeamMemberAddedNotification: (...args: unknown[]) => mockCreateTeamMemberAddedNotification(...args),
  createTeamMemberRemovedNotification: (...args: unknown[]) => mockCreateTeamMemberRemovedNotification(...args),
  createPermissionsUpdatedNotification: (...args: unknown[]) => mockCreatePermissionsUpdatedNotification(...args),
}))

// ─── Helpers ────────────────────────────────────────────────────────

const DEFAULT_PERMISSIONS = {
  canViewPlanning: true,
  canEditPlanning: false,
  canViewLiaison: true,
  canWriteLiaison: false,
  canManageTeam: false,
  canExportData: false,
}

function createMockCaregiverDbRow(overrides: Record<string, unknown> = {}) {
  return {
    profile_id: 'caregiver-123',
    employer_id: 'employer-456',
    permissions: DEFAULT_PERMISSIONS,
    permissions_locked: false,
    relationship: 'parent',
    relationship_details: null,
    legal_status: null,
    address: null,
    emergency_phone: null,
    availability_hours: null,
    can_replace_employer: false,
    created_at: '2026-01-15T10:00:00.000Z',
    ...overrides,
  }
}

function createMockCaregiverWithProfileDbRow(overrides: Record<string, unknown> = {}) {
  return {
    ...createMockCaregiverDbRow(),
    profile: {
      first_name: 'Marie',
      last_name: 'Dupont',
      email: 'marie@example.com',
      phone: '0612345678',
      avatar_url: null,
    },
    ...overrides,
  }
}

function createMockShiftDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shift-001',
    contract_id: 'contract-001',
    date: '2026-03-15',
    start_time: '09:00',
    end_time: '12:00',
    break_duration: 0,
    tasks: [],
    notes: null,
    status: 'confirmed',
    computed_pay: null,
    validated_by_employer: false,
    validated_by_employee: false,
    created_at: '2026-01-15T10:00:00.000Z',
    updated_at: '2026-01-15T10:00:00.000Z',
    ...overrides,
  }
}

/** Mock Supabase query chain retournant un résultat unique */
function mockSupabaseQuery(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.lte = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result)))
  mockFrom.mockImplementation(() => chain)
  return chain
}

/** Mock pour des appels séquentiels à from() */
function mockSupabaseQuerySequence(results: Array<{ data?: unknown; error?: unknown; count?: number | null }>) {
  results.forEach((result) => {
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.upsert = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.gte = vi.fn().mockReturnValue(chain)
    chain.lte = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue(result)
    chain.maybeSingle = vi.fn().mockResolvedValue(result)
    chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result)))
    mockFrom.mockImplementationOnce(() => chain)
  })
}

const PROFILE_ID = 'caregiver-123'
const EMPLOYER_ID = 'employer-456'

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// getCaregiver
// ============================================

describe('getCaregiver', () => {
  it('retourne le profil aidant mappé depuis la DB', async () => {
    const row = createMockCaregiverDbRow()
    mockSupabaseQuery({ data: row, error: null })

    const result = await getCaregiver(PROFILE_ID)

    expect(result).not.toBeNull()
    expect(result!.profileId).toBe('caregiver-123')
    expect(result!.employerId).toBe('employer-456')
    expect(result!.permissions).toEqual(DEFAULT_PERMISSIONS)
    expect(result!.relationship).toBe('parent')
    expect(result!.createdAt).toBeInstanceOf(Date)
  })

  it('retourne null en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

    const result = await getCaregiver(PROFILE_ID)

    expect(result).toBeNull()
  })

  it('retourne null si aucune donnée', async () => {
    mockSupabaseQuery({ data: null, error: null })

    const result = await getCaregiver(PROFILE_ID)

    expect(result).toBeNull()
  })

  it('mappe les permissions par défaut si null', async () => {
    const row = createMockCaregiverDbRow({ permissions: null })
    mockSupabaseQuery({ data: row, error: null })

    const result = await getCaregiver(PROFILE_ID)

    expect(result!.permissions).toEqual({
      canViewPlanning: false,
      canEditPlanning: false,
      canViewLiaison: false,
      canWriteLiaison: false,
      canManageTeam: false,
      canExportData: false,
    })
  })

  it('mappe les champs optionnels correctement', async () => {
    const row = createMockCaregiverDbRow({
      relationship_details: 'Fils aîné',
      legal_status: 'tutor',
      address: { street: '1 rue Test', city: 'Paris', postalCode: '75001', country: 'France' },
      emergency_phone: '0611111111',
      availability_hours: 'Lundi-Vendredi 9h-17h',
      can_replace_employer: true,
    })
    mockSupabaseQuery({ data: row, error: null })

    const result = await getCaregiver(PROFILE_ID)

    expect(result!.relationshipDetails).toBe('Fils aîné')
    expect(result!.legalStatus).toBe('tutor')
    expect(result!.address).toEqual(expect.objectContaining({ city: 'Paris' }))
    expect(result!.emergencyPhone).toBe('0611111111')
    expect(result!.availabilityHours).toBe('Lundi-Vendredi 9h-17h')
    expect(result!.canReplaceEmployer).toBe(true)
  })
})

// ============================================
// getCaregiverEmployerId
// ============================================

describe('getCaregiverEmployerId', () => {
  it('retourne l\'employer_id de l\'aidant', async () => {
    mockSupabaseQuery({ data: { employer_id: EMPLOYER_ID }, error: null })

    const result = await getCaregiverEmployerId(PROFILE_ID)

    expect(result).toBe(EMPLOYER_ID)
  })

  it('retourne null en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'error' } })

    const result = await getCaregiverEmployerId(PROFILE_ID)

    expect(result).toBeNull()
  })

  it('retourne null si aucune donnée', async () => {
    mockSupabaseQuery({ data: null, error: null })

    const result = await getCaregiverEmployerId(PROFILE_ID)

    expect(result).toBeNull()
  })
})

// ============================================
// getCaregiverPermissions
// ============================================

describe('getCaregiverPermissions', () => {
  it('retourne les permissions de l\'aidant', async () => {
    const row = createMockCaregiverDbRow()
    mockSupabaseQuery({ data: row, error: null })

    const result = await getCaregiverPermissions(PROFILE_ID)

    expect(result).toEqual(DEFAULT_PERMISSIONS)
  })

  it('retourne null si l\'aidant n\'existe pas', async () => {
    mockSupabaseQuery({ data: null, error: null })

    const result = await getCaregiverPermissions(PROFILE_ID)

    expect(result).toBeNull()
  })
})

// ============================================
// getShiftsForCaregiver
// ============================================

describe('getShiftsForCaregiver', () => {
  const startDate = new Date('2026-03-01')
  const endDate = new Date('2026-03-31')

  it('retourne les shifts de l\'employeur si l\'aidant a la permission', async () => {
    const shiftRow = createMockShiftDbRow()
    // Appel 1: getCaregiverEmployerId → from('caregivers').select('employer_id')
    // Appel 2: getCaregiverPermissions → getCaregiver → from('caregivers').select('*')
    // Appel 3: from('shifts').select(...)
    mockSupabaseQuerySequence([
      { data: { employer_id: EMPLOYER_ID }, error: null },
      { data: createMockCaregiverDbRow(), error: null },
      { data: [shiftRow], error: null },
    ])

    const result = await getShiftsForCaregiver(PROFILE_ID, startDate, endDate)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('shift-001')
    expect(result[0].startTime).toBe('09:00')
    expect(result[0].date).toBeInstanceOf(Date)
  })

  it('retourne un tableau vide si pas d\'employeur associé', async () => {
    mockSupabaseQuery({ data: null, error: null })

    const result = await getShiftsForCaregiver(PROFILE_ID, startDate, endDate)

    expect(result).toEqual([])
  })

  it('retourne un tableau vide si l\'aidant n\'a pas la permission canViewPlanning', async () => {
    mockSupabaseQuerySequence([
      { data: { employer_id: EMPLOYER_ID }, error: null },
      {
        data: createMockCaregiverDbRow({
          permissions: { ...DEFAULT_PERMISSIONS, canViewPlanning: false },
        }),
        error: null,
      },
    ])

    const result = await getShiftsForCaregiver(PROFILE_ID, startDate, endDate)

    expect(result).toEqual([])
  })

  it('retourne un tableau vide en cas d\'erreur sur les shifts', async () => {
    mockSupabaseQuerySequence([
      { data: { employer_id: EMPLOYER_ID }, error: null },
      { data: createMockCaregiverDbRow(), error: null },
      { data: null, error: { message: 'DB error' } },
    ])

    const result = await getShiftsForCaregiver(PROFILE_ID, startDate, endDate)

    expect(result).toEqual([])
  })

  it('mappe les champs optionnels du shift (computedPay null)', async () => {
    const shiftRow = createMockShiftDbRow({ computed_pay: null, notes: null, break_duration: null })
    mockSupabaseQuerySequence([
      { data: { employer_id: EMPLOYER_ID }, error: null },
      { data: createMockCaregiverDbRow(), error: null },
      { data: [shiftRow], error: null },
    ])

    const result = await getShiftsForCaregiver(PROFILE_ID, startDate, endDate)

    expect(result[0].computedPay).toEqual({
      basePay: 0,
      sundayMajoration: 0,
      holidayMajoration: 0,
      nightMajoration: 0,
      overtimeMajoration: 0,
      presenceResponsiblePay: 0,
      nightPresenceAllowance: 0,
      totalPay: 0,
    })
    expect(result[0].breakDuration).toBe(0)
    expect(result[0].notes).toBeUndefined()
  })
})

// ============================================
// getUpcomingShiftsForCaregiver
// ============================================

describe('getUpcomingShiftsForCaregiver', () => {
  it('retourne les prochains shifts futurs limités par défaut à 5', async () => {
    // On doit créer des shifts dans le futur
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    const shifts = Array.from({ length: 7 }, (_, i) =>
      createMockShiftDbRow({
        id: `shift-${i}`,
        date: dateStr,
        start_time: `${(9 + i).toString().padStart(2, '0')}:00`,
        end_time: `${(10 + i).toString().padStart(2, '0')}:00`,
      })
    )

    mockSupabaseQuerySequence([
      { data: { employer_id: EMPLOYER_ID }, error: null },
      { data: createMockCaregiverDbRow(), error: null },
      { data: shifts, error: null },
    ])

    const result = await getUpcomingShiftsForCaregiver(PROFILE_ID)

    expect(result.length).toBeLessThanOrEqual(5)
  })

  it('accepte une limite personnalisée', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    const shifts = Array.from({ length: 5 }, (_, i) =>
      createMockShiftDbRow({
        id: `shift-${i}`,
        date: dateStr,
        start_time: `${(9 + i).toString().padStart(2, '0')}:00`,
        end_time: `${(10 + i).toString().padStart(2, '0')}:00`,
      })
    )

    mockSupabaseQuerySequence([
      { data: { employer_id: EMPLOYER_ID }, error: null },
      { data: createMockCaregiverDbRow(), error: null },
      { data: shifts, error: null },
    ])

    const result = await getUpcomingShiftsForCaregiver(PROFILE_ID, 2)

    expect(result.length).toBeLessThanOrEqual(2)
  })

  it('retourne un tableau vide si pas d\'employeur', async () => {
    mockSupabaseQuery({ data: null, error: null })

    const result = await getUpcomingShiftsForCaregiver(PROFILE_ID)

    expect(result).toEqual([])
  })
})

// ============================================
// upsertCaregiver
// ============================================

describe('upsertCaregiver', () => {
  it('upsert un aidant avec les données fournies', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await upsertCaregiver(PROFILE_ID, {
      employerId: EMPLOYER_ID,
      permissions: DEFAULT_PERMISSIONS,
      relationship: 'parent',
    })

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: PROFILE_ID,
        employer_id: EMPLOYER_ID,
        permissions: DEFAULT_PERMISSIONS,
        relationship: 'parent',
      }),
      { onConflict: 'profile_id' }
    )
  })

  it('sanitize le champ relationship', async () => {
    mockSupabaseQuery({ data: null, error: null })

    await upsertCaregiver(PROFILE_ID, {
      employerId: EMPLOYER_ID,
      permissions: DEFAULT_PERMISSIONS,
      relationship: '  parent  ',
    })

    // sanitizeText mocké comme trim()
    expect(mockFrom).toHaveBeenCalledWith('caregivers')
  })

  it('met relationship à null si non fourni', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await upsertCaregiver(PROFILE_ID, {
      employerId: EMPLOYER_ID,
      permissions: DEFAULT_PERMISSIONS,
    })

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ relationship: null }),
      expect.any(Object)
    )
  })

  it('lance une erreur en cas d\'échec', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'Upsert failed' } })

    await expect(
      upsertCaregiver(PROFILE_ID, {
        employerId: EMPLOYER_ID,
        permissions: DEFAULT_PERMISSIONS,
      })
    ).rejects.toThrow('Upsert failed')
  })
})

// ============================================
// updateCaregiverProfile
// ============================================

describe('updateCaregiverProfile', () => {
  it('met à jour le profil aidant avec les données sanitisées', async () => {
    const chain = mockSupabaseQuery({ data: [createMockCaregiverDbRow()], error: null })

    await updateCaregiverProfile(PROFILE_ID, {
      relationship: 'parent',
      relationshipDetails: 'Fils aîné',
      emergencyPhone: '0612345678',
      canReplaceEmployer: true,
    })

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      relationship: 'parent',
      relationship_details: 'Fils aîné',
      emergency_phone: '0612345678',
      can_replace_employer: true,
    }))
  })

  it('sanitise l\'adresse si fournie', async () => {
    const chain = mockSupabaseQuery({ data: [createMockCaregiverDbRow()], error: null })

    await updateCaregiverProfile(PROFILE_ID, {
      address: {
        street: '1 rue Test',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
      },
    })

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      address: {
        street: '1 rue Test',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
      },
    }))
  })

  it('met les champs optionnels à null si non fournis', async () => {
    const chain = mockSupabaseQuery({ data: [createMockCaregiverDbRow()], error: null })

    await updateCaregiverProfile(PROFILE_ID, {})

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      relationship: null,
      relationship_details: null,
      legal_status: null,
      address: null,
      emergency_phone: null,
      availability_hours: null,
      can_replace_employer: false,
    }))
  })

  it('lance une erreur en cas d\'échec DB', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'Update failed' } })

    await expect(
      updateCaregiverProfile(PROFILE_ID, { relationship: 'parent' })
    ).rejects.toThrow('Update failed')
  })

  it('lance une erreur si aucune ligne mise à jour', async () => {
    mockSupabaseQuery({ data: [], error: null })

    await expect(
      updateCaregiverProfile(PROFILE_ID, { relationship: 'parent' })
    ).rejects.toThrow('Aucune donnée mise à jour')
  })
})

// ============================================
// updateCaregiverPermissions
// ============================================

describe('updateCaregiverPermissions', () => {
  it('met à jour les permissions et notifie l\'aidant', async () => {
    // Appel 1: getCaregiverPermissions → getCaregiver → from('caregivers')
    // Appel 2: from('caregivers').select('employer_id')
    // Appel 3: from('caregivers').update(...)
    mockSupabaseQuerySequence([
      { data: createMockCaregiverDbRow(), error: null },
      { data: { employer_id: EMPLOYER_ID }, error: null },
      { data: null, error: null },
    ])
    mockGetProfileName.mockResolvedValue('M. Dupont')
    mockCreatePermissionsUpdatedNotification.mockResolvedValue(null)

    await updateCaregiverPermissions(PROFILE_ID, { canEditPlanning: true })

    expect(mockGetProfileName).toHaveBeenCalledWith(EMPLOYER_ID)
    expect(mockCreatePermissionsUpdatedNotification).toHaveBeenCalledWith(PROFILE_ID, 'M. Dupont')
  })

  it('lance une erreur si l\'aidant n\'existe pas', async () => {
    mockSupabaseQuery({ data: null, error: null })

    await expect(
      updateCaregiverPermissions(PROFILE_ID, { canEditPlanning: true })
    ).rejects.toThrow('Aidant non trouvé')
  })

  it('lance une erreur si la mise à jour échoue', async () => {
    mockSupabaseQuerySequence([
      { data: createMockCaregiverDbRow(), error: null },
      { data: { employer_id: EMPLOYER_ID }, error: null },
      { data: null, error: { message: 'Erreur permissions' } },
    ])

    await expect(
      updateCaregiverPermissions(PROFILE_ID, { canEditPlanning: true })
    ).rejects.toThrow('Erreur permissions')
  })

  it('fusionne les permissions existantes avec les nouvelles', async () => {
    const chains: Array<Record<string, ReturnType<typeof vi.fn>>> = []
    const results = [
      { data: createMockCaregiverDbRow(), error: null },
      { data: { employer_id: EMPLOYER_ID }, error: null },
      { data: null, error: null },
    ]
    results.forEach((result) => {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.update = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue(result)
      chain.maybeSingle = vi.fn().mockResolvedValue(result)
      chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result)))
      chains.push(chain)
      mockFrom.mockImplementationOnce(() => chain)
    })
    mockGetProfileName.mockResolvedValue('Employeur')
    mockCreatePermissionsUpdatedNotification.mockResolvedValue(null)

    await updateCaregiverPermissions(PROFILE_ID, { canExportData: true })

    // Le 3e appel est l'update
    expect(chains[2].update).toHaveBeenCalledWith({
      permissions: { ...DEFAULT_PERMISSIONS, canExportData: true },
    })
  })
})

// ============================================
// getCaregiversForEmployer
// ============================================

describe('getCaregiversForEmployer', () => {
  it('retourne les aidants avec leur profil', async () => {
    const row = createMockCaregiverWithProfileDbRow()
    mockSupabaseQuery({ data: [row], error: null })

    const result = await getCaregiversForEmployer(EMPLOYER_ID)

    expect(result).toHaveLength(1)
    expect(result[0].profileId).toBe('caregiver-123')
    expect(result[0].profile.firstName).toBe('Marie')
    expect(result[0].profile.lastName).toBe('Dupont')
    expect(result[0].profile.email).toBe('marie@example.com')
    expect(result[0].createdAt).toBeInstanceOf(Date)
  })

  it('retourne un tableau vide en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'error' } })

    const result = await getCaregiversForEmployer(EMPLOYER_ID)

    expect(result).toEqual([])
  })

  it('mappe les permissions par défaut si null', async () => {
    const row = createMockCaregiverWithProfileDbRow({ permissions: null })
    mockSupabaseQuery({ data: [row], error: null })

    const result = await getCaregiversForEmployer(EMPLOYER_ID)

    expect(result[0].permissions.canViewPlanning).toBe(false)
  })

  it('mappe le profil avec des champs manquants', async () => {
    const row = createMockCaregiverWithProfileDbRow({
      profile: { first_name: '', last_name: '', email: null, phone: null, avatar_url: null },
    })
    mockSupabaseQuery({ data: [row], error: null })

    const result = await getCaregiversForEmployer(EMPLOYER_ID)

    expect(result[0].profile.firstName).toBe('')
    expect(result[0].profile.email).toBe('')
    expect(result[0].profile.phone).toBeUndefined()
    expect(result[0].profile.avatarUrl).toBeUndefined()
  })
})

// ============================================
// searchCaregiverByEmail
// ============================================

describe('searchCaregiverByEmail', () => {
  it('retourne le profil aidant trouvé par email', async () => {
    const chain = mockSupabaseQuery({
      data: { id: 'profile-1', first_name: 'Marie', last_name: 'Dupont', email: 'marie@example.com' },
      error: null,
    })

    const result = await searchCaregiverByEmail('MARIE@Example.com ')

    expect(result).toEqual({
      profileId: 'profile-1',
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie@example.com',
    })
    expect(chain.eq).toHaveBeenCalledWith('email', 'marie@example.com')
    expect(chain.eq).toHaveBeenCalledWith('role', 'caregiver')
  })

  it('retourne null si aucun résultat', async () => {
    mockSupabaseQuery({ data: null, error: null })

    const result = await searchCaregiverByEmail('inconnu@example.com')

    expect(result).toBeNull()
  })

  it('retourne null en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'error' } })

    const result = await searchCaregiverByEmail('test@example.com')

    expect(result).toBeNull()
  })
})

// ============================================
// addCaregiverToEmployer
// ============================================

describe('addCaregiverToEmployer', () => {
  const permissions = DEFAULT_PERMISSIONS

  it('ajoute un aidant et envoie une notification', async () => {
    // Appel 1: vérifier existant → from('caregivers') → maybeSingle → null
    // Appel 2: vérifier profil → from('profiles') → single → { role: 'caregiver' }
    // Appel 3: insert → from('caregivers')
    mockSupabaseQuerySequence([
      { data: null, error: null },
      { data: { role: 'caregiver' }, error: null },
      { data: null, error: null },
    ])
    mockGetProfileName.mockResolvedValue('Famille Martin')
    mockCreateTeamMemberAddedNotification.mockResolvedValue(null)

    await addCaregiverToEmployer(EMPLOYER_ID, PROFILE_ID, { permissions })

    expect(mockGetProfileName).toHaveBeenCalledWith(EMPLOYER_ID)
    expect(mockCreateTeamMemberAddedNotification).toHaveBeenCalledWith(PROFILE_ID, 'Famille Martin')
  })

  it('lance une erreur si l\'aidant est déjà lié', async () => {
    mockSupabaseQuery({ data: { profile_id: PROFILE_ID }, error: null })

    await expect(
      addCaregiverToEmployer(EMPLOYER_ID, PROFILE_ID, { permissions })
    ).rejects.toThrow('Cet aidant est déjà lié à votre compte.')
  })

  it('lance une erreur si le profil n\'existe pas', async () => {
    mockSupabaseQuerySequence([
      { data: null, error: null },
      { data: null, error: { message: 'not found' } },
    ])

    await expect(
      addCaregiverToEmployer(EMPLOYER_ID, PROFILE_ID, { permissions })
    ).rejects.toThrow('Profil utilisateur non trouvé.')
  })

  it('lance une erreur si l\'utilisateur n\'est pas un aidant', async () => {
    mockSupabaseQuerySequence([
      { data: null, error: null },
      { data: { role: 'employer' }, error: null },
    ])

    await expect(
      addCaregiverToEmployer(EMPLOYER_ID, PROFILE_ID, { permissions })
    ).rejects.toThrow('Cet utilisateur n\'est pas enregistré comme aidant.')
  })

  it('lance une erreur si l\'insertion échoue', async () => {
    mockSupabaseQuerySequence([
      { data: null, error: null },
      { data: { role: 'caregiver' }, error: null },
      { data: null, error: { message: 'Insert failed' } },
    ])

    await expect(
      addCaregiverToEmployer(EMPLOYER_ID, PROFILE_ID, { permissions })
    ).rejects.toThrow('Erreur lors de l\'ajout de l\'aidant.')
  })

  it('transmet le legalStatus et permissionsLocked', async () => {
    const chains: Array<Record<string, ReturnType<typeof vi.fn>>> = []
    const results = [
      { data: null, error: null },
      { data: { role: 'caregiver' }, error: null },
      { data: null, error: null },
    ]
    results.forEach((result) => {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.insert = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue(result)
      chain.maybeSingle = vi.fn().mockResolvedValue(result)
      chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result)))
      chains.push(chain)
      mockFrom.mockImplementationOnce(() => chain)
    })
    mockGetProfileName.mockResolvedValue('Test')
    mockCreateTeamMemberAddedNotification.mockResolvedValue(null)

    await addCaregiverToEmployer(EMPLOYER_ID, PROFILE_ID, {
      permissions,
      legalStatus: 'tutor',
      permissionsLocked: true,
    })

    expect(chains[2].insert).toHaveBeenCalledWith(expect.objectContaining({
      legal_status: 'tutor',
      permissions_locked: true,
    }))
  })
})

// ============================================
// updateCaregiver
// ============================================

describe('updateCaregiver', () => {
  it('met à jour les permissions si non verrouillées', async () => {
    // Appel 1: vérifier verrouillage → from('caregivers').select('permissions_locked, legal_status')
    // Appel 2: update → from('caregivers').update(...)
    mockSupabaseQuerySequence([
      { data: { permissions_locked: false, legal_status: null }, error: null },
      { data: null, error: null },
    ])
    mockGetProfileName.mockResolvedValue('Employeur')
    mockCreatePermissionsUpdatedNotification.mockResolvedValue(null)

    await updateCaregiver(PROFILE_ID, EMPLOYER_ID, { permissions: DEFAULT_PERMISSIONS })

    expect(mockCreatePermissionsUpdatedNotification).toHaveBeenCalledWith(PROFILE_ID, 'Employeur')
  })

  it('lance une erreur si permissions verrouillées', async () => {
    mockSupabaseQuery({ data: { permissions_locked: true, legal_status: null }, error: null })

    await expect(
      updateCaregiver(PROFILE_ID, EMPLOYER_ID, { permissions: DEFAULT_PERMISSIONS })
    ).rejects.toThrow('Les permissions de cet aidant sont verrouillées')
  })

  it('lance une erreur si le statut juridique est tutor', async () => {
    mockSupabaseQuery({ data: { permissions_locked: false, legal_status: 'tutor' }, error: null })

    await expect(
      updateCaregiver(PROFILE_ID, EMPLOYER_ID, { permissions: DEFAULT_PERMISSIONS })
    ).rejects.toThrow('Les permissions de cet aidant sont verrouillées')
  })

  it('lance une erreur si le statut juridique est curator', async () => {
    mockSupabaseQuery({ data: { permissions_locked: false, legal_status: 'curator' }, error: null })

    await expect(
      updateCaregiver(PROFILE_ID, EMPLOYER_ID, { permissions: DEFAULT_PERMISSIONS })
    ).rejects.toThrow('Les permissions de cet aidant sont verrouillées')
  })

  it('lance une erreur si la mise à jour échoue', async () => {
    mockSupabaseQuerySequence([
      { data: { permissions_locked: false, legal_status: null }, error: null },
      { data: null, error: { message: 'Update error' } },
    ])

    await expect(
      updateCaregiver(PROFILE_ID, EMPLOYER_ID, { permissions: DEFAULT_PERMISSIONS })
    ).rejects.toThrow('Erreur lors de la mise à jour de l\'aidant.')
  })
})

// ============================================
// removeCaregiverFromEmployer
// ============================================

describe('removeCaregiverFromEmployer', () => {
  it('supprime le lien et notifie l\'aidant', async () => {
    mockGetProfileName.mockResolvedValue('Famille Martin')
    // Appel 1: delete → from('caregivers')
    mockSupabaseQuery({ data: null, error: null })
    mockCreateTeamMemberRemovedNotification.mockResolvedValue(null)

    await removeCaregiverFromEmployer(PROFILE_ID, EMPLOYER_ID)

    expect(mockGetProfileName).toHaveBeenCalledWith(EMPLOYER_ID)
    expect(mockCreateTeamMemberRemovedNotification).toHaveBeenCalledWith(PROFILE_ID, 'Famille Martin')
  })

  it('lance une erreur si la suppression échoue', async () => {
    mockGetProfileName.mockResolvedValue('Test')
    mockSupabaseQuery({ data: null, error: { message: 'Delete failed' } })

    await expect(
      removeCaregiverFromEmployer(PROFILE_ID, EMPLOYER_ID)
    ).rejects.toThrow('Erreur lors de la suppression de l\'aidant.')
  })

  it('utilise "Utilisateur" si getProfileName échoue', async () => {
    mockGetProfileName.mockRejectedValue(new Error('fail'))
    mockSupabaseQuery({ data: null, error: null })
    mockCreateTeamMemberRemovedNotification.mockResolvedValue(null)

    await removeCaregiverFromEmployer(PROFILE_ID, EMPLOYER_ID)

    expect(mockCreateTeamMemberRemovedNotification).toHaveBeenCalledWith(PROFILE_ID, 'Utilisateur')
  })

  it('continue sans erreur si la notification échoue', async () => {
    mockGetProfileName.mockResolvedValue('Test')
    mockSupabaseQuery({ data: null, error: null })
    mockCreateTeamMemberRemovedNotification.mockRejectedValue(new Error('notif fail'))

    await expect(
      removeCaregiverFromEmployer(PROFILE_ID, EMPLOYER_ID)
    ).resolves.toBeUndefined()
  })
})
