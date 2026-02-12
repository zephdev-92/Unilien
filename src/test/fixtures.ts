/**
 * Fixtures de test partagées — mocks réutilisables pour Supabase, User, Profile, etc.
 *
 * Usage :
 *   import { createMockUser, createMockProfile, createMockShift } from '@/test/fixtures'
 */

import type { User, Session } from '@supabase/supabase-js'
import type {
  Profile,
  Shift,
  Contract,
  ComputedPay,
  Employer,
  Employee,
  Address,
  AccessibilitySettings,
} from '@/types'

// ─── Valeurs par défaut ─────────────────────────────────────────────

const DEFAULT_USER_ID = 'user-test-123'
const DEFAULT_EMAIL = 'test@example.com'

const DEFAULT_ADDRESS: Address = {
  street: '1 rue de Test',
  city: 'Paris',
  postalCode: '75001',
  country: 'France',
}

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  screenReaderOptimized: false,
  voiceControlEnabled: false,
}

const DEFAULT_COMPUTED_PAY: ComputedPay = {
  basePay: 80,
  sundayMajoration: 0,
  holidayMajoration: 0,
  nightMajoration: 0,
  overtimeMajoration: 0,
  totalPay: 80,
}

// ─── Factories Supabase Auth ────────────────────────────────────────

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: DEFAULT_USER_ID,
    email: DEFAULT_EMAIL,
    app_metadata: {},
    user_metadata: {
      first_name: 'Jean',
      last_name: 'Dupont',
      role: 'employer',
    },
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as User
}

export function createMockSession(overrides: Partial<Session> = {}): Session {
  const user = overrides.user ?? createMockUser()
  return {
    access_token: 'access-token-test-123',
    refresh_token: 'refresh-token-test-123',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
    ...overrides,
  } as Session
}

// ─── Factories Domain ───────────────────────────────────────────────

export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: DEFAULT_USER_ID,
    role: 'employer',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: DEFAULT_EMAIL,
    phone: '0612345678',
    avatarUrl: undefined,
    accessibilitySettings: { ...DEFAULT_ACCESSIBILITY },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

/** Données profil telles que renvoyées par Supabase (snake_case) */
export function createMockProfileDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DEFAULT_USER_ID,
    role: 'employer',
    first_name: 'Jean',
    last_name: 'Dupont',
    email: DEFAULT_EMAIL,
    phone: '0612345678',
    avatar_url: null,
    accessibility_settings: {},
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function createMockShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 'shift-test-123',
    contractId: 'contract-test-456',
    date: new Date('2024-03-15'),
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    tasks: ['Aide au lever', 'Préparation repas'],
    notes: 'RAS',
    hasNightAction: false,
    status: 'planned',
    computedPay: { ...DEFAULT_COMPUTED_PAY },
    validatedByEmployer: false,
    validatedByEmployee: false,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    ...overrides,
  }
}

/** Données shift telles que renvoyées par Supabase (snake_case) */
export function createMockShiftDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shift-test-123',
    contract_id: 'contract-test-456',
    date: '2024-03-15',
    start_time: '09:00',
    end_time: '17:00',
    break_duration: 60,
    tasks: ['Aide au lever', 'Préparation repas'],
    notes: 'RAS',
    has_night_action: false,
    status: 'planned',
    computed_pay: { ...DEFAULT_COMPUTED_PAY },
    validated_by_employer: false,
    validated_by_employee: false,
    created_at: '2024-03-01T10:00:00.000Z',
    updated_at: '2024-03-01T10:00:00.000Z',
    ...overrides,
  }
}

export function createMockContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'contract-test-123',
    employerId: 'employer-test-456',
    employeeId: 'employee-test-789',
    contractType: 'CDI',
    startDate: new Date('2024-01-01'),
    endDate: undefined,
    weeklyHours: 35,
    hourlyRate: 12.5,
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

/** Données contrat telles que renvoyées par Supabase (snake_case) */
export function createMockContractDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-test-123',
    employer_id: 'employer-test-456',
    employee_id: 'employee-test-789',
    contract_type: 'CDI',
    start_date: '2024-01-01',
    end_date: null,
    weekly_hours: 35,
    hourly_rate: 12.5,
    status: 'active',
    created_at: '2024-01-01T10:00:00.000Z',
    updated_at: '2024-01-01T10:00:00.000Z',
    ...overrides,
  }
}

export function createMockEmployer(overrides: Partial<Employer> = {}): Employer {
  return {
    profileId: DEFAULT_USER_ID,
    address: { ...DEFAULT_ADDRESS },
    handicapType: 'moteur',
    handicapName: 'Tétraplégie',
    specificNeeds: 'Aide quotidienne',
    cesuNumber: '12345',
    pchBeneficiary: true,
    pchMonthlyAmount: 1500,
    emergencyContacts: [
      { name: 'Contact 1', phone: '0612345678', relationship: 'Famille' },
    ],
    ...overrides,
  }
}

export function createMockEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    profileId: DEFAULT_USER_ID,
    qualifications: ['DEAVS', 'Premiers secours'],
    languages: ['Français', 'Anglais'],
    maxDistanceKm: 20,
    availabilityTemplate: {
      monday: [{ startTime: '09:00', endTime: '17:00' }],
      tuesday: [{ startTime: '09:00', endTime: '17:00' }],
      wednesday: [{ startTime: '09:00', endTime: '17:00' }],
      thursday: [{ startTime: '09:00', endTime: '17:00' }],
      friday: [{ startTime: '09:00', endTime: '17:00' }],
      saturday: [],
      sunday: [],
    },
    ...overrides,
  }
}

// ─── Mock Supabase Client ───────────────────────────────────────────

export type MockSupabaseChain = {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
}

/**
 * Crée un ensemble de mocks pour les méthodes chaînées de Supabase.
 *
 * Usage dans un test :
 * ```ts
 * const chain = createMockSupabaseChain()
 * vi.mock('@/lib/supabase/client', () => ({
 *   supabase: { from: vi.fn(() => chain.fromReturn) }
 * }))
 * // Configurer les résultats :
 * chain.single.mockResolvedValue({ data: myData, error: null })
 * ```
 */
export function createMockSupabaseChain() {
  const single = vi.fn()
  const maybeSingle = vi.fn()
  const eq = vi.fn()
  const order = vi.fn()
  const select = vi.fn()
  const insert = vi.fn()
  const update = vi.fn()
  const deleteFn = vi.fn()
  const upsert = vi.fn()

  // Configuration par défaut du chaînage
  eq.mockReturnValue({ single, maybeSingle, eq, order })
  order.mockReturnValue({ eq })
  select.mockReturnValue({ eq, order })
  insert.mockReturnValue({ select: vi.fn().mockReturnValue({ single }) })
  update.mockReturnValue({ eq })
  deleteFn.mockReturnValue({ eq })
  upsert.mockResolvedValue({ error: null })

  const fromReturn = {
    select,
    insert,
    update,
    delete: deleteFn,
    upsert,
  }

  return {
    select,
    insert,
    update,
    delete: deleteFn,
    upsert,
    eq,
    order,
    single,
    maybeSingle,
    fromReturn,
  }
}

/**
 * Crée un mock Supabase Storage bucket.
 */
export function createMockSupabaseStorage() {
  const upload = vi.fn().mockResolvedValue({ error: null })
  const remove = vi.fn().mockResolvedValue({ error: null })
  const list = vi.fn().mockResolvedValue({ data: [], error: null })
  const getPublicUrl = vi.fn().mockReturnValue({
    data: { publicUrl: 'https://storage.example.com/test.jpg' },
  })

  return { upload, remove, list, getPublicUrl }
}

// ─── Re-exports pour compatibilité ─────────────────────────────────

export { DEFAULT_USER_ID, DEFAULT_EMAIL, DEFAULT_ADDRESS, DEFAULT_ACCESSIBILITY, DEFAULT_COMPUTED_PAY }
