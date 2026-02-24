import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// ─── Mocks ──────────────────────────────────────────────────────────

const mockUseAuth = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockGetActiveEmployerIdForEmployee = vi.fn()

vi.mock('@/services/contractService', () => ({
  getActiveEmployerIdForEmployee: (...args: unknown[]) =>
    mockGetActiveEmployerIdForEmployee(...args),
}))

const mockGetCaregiver = vi.fn()
const mockGetCaregiverEmployerId = vi.fn()

vi.mock('@/services/caregiverService', () => ({
  getCaregiver: (...args: unknown[]) => mockGetCaregiver(...args),
  getCaregiverEmployerId: (...args: unknown[]) => mockGetCaregiverEmployerId(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { useEmployerResolution } from './useEmployerResolution'
import { logger } from '@/lib/logger'

// ─── Helpers ────────────────────────────────────────────────────────

function mockAuth(role: string | null, id = 'user-123', isInitialized = true) {
  mockUseAuth.mockReturnValue({
    profile: role ? { id, role } : null,
    isInitialized,
  })
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('useEmployerResolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── État initial ─────────────────────────────────────────────────

  it('retourne null si profile est null', () => {
    mockAuth(null)

    const { result } = renderHook(() => useEmployerResolution())

    expect(result.current.resolvedEmployerId).toBeNull()
    expect(result.current.isResolving).toBe(false)
    expect(result.current.accessDenied).toBe(false)
  })

  it('ne résout pas si isInitialized est false', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: 'user-123', role: 'employee' },
      isInitialized: false,
    })

    renderHook(() => useEmployerResolution())

    expect(mockGetActiveEmployerIdForEmployee).not.toHaveBeenCalled()
  })

  // ── Rôle employer ────────────────────────────────────────────────

  it('résout directement le profile.id pour le rôle employer', async () => {
    mockAuth('employer', 'employer-abc')

    const { result } = renderHook(() => useEmployerResolution())

    await waitFor(() => {
      expect(result.current.resolvedEmployerId).toBe('employer-abc')
    })
    expect(result.current.isResolving).toBe(false)
    expect(result.current.accessDenied).toBe(false)
    expect(mockGetActiveEmployerIdForEmployee).not.toHaveBeenCalled()
  })

  // ── Rôle employee ────────────────────────────────────────────────

  it('résout via contrat actif pour le rôle employee', async () => {
    mockAuth('employee')
    mockGetActiveEmployerIdForEmployee.mockResolvedValue('employer-456')

    const { result } = renderHook(() => useEmployerResolution())

    await waitFor(() => {
      expect(result.current.resolvedEmployerId).toBe('employer-456')
    })
    expect(result.current.isResolving).toBe(false)
    expect(result.current.accessDenied).toBe(false)
    expect(mockGetActiveEmployerIdForEmployee).toHaveBeenCalledWith('user-123')
  })

  it('accessDenied si aucun contrat actif trouvé (employee)', async () => {
    mockAuth('employee')
    mockGetActiveEmployerIdForEmployee.mockResolvedValue(null)

    const { result } = renderHook(() => useEmployerResolution())

    await waitFor(() => {
      expect(result.current.accessDenied).toBe(true)
    })
    expect(result.current.resolvedEmployerId).toBeNull()
  })

  it('accessDenied si getActiveEmployerIdForEmployee lance une erreur', async () => {
    mockAuth('employee')
    mockGetActiveEmployerIdForEmployee.mockRejectedValue(new Error('DB error'))

    const { result } = renderHook(() => useEmployerResolution())

    await waitFor(() => {
      expect(result.current.accessDenied).toBe(true)
    })
    expect(result.current.isResolving).toBe(false)
  })

  // ── Rôle caregiver ───────────────────────────────────────────────

  it('accessDenied si getCaregiver retourne null', async () => {
    mockAuth('caregiver')
    mockGetCaregiver.mockResolvedValue(null)

    const { result } = renderHook(() => useEmployerResolution())

    await waitFor(() => {
      expect(result.current.accessDenied).toBe(true)
    })
    expect(mockGetCaregiverEmployerId).not.toHaveBeenCalled()
  })

  it('résout l\'employerId pour le rôle caregiver sans permission requise', async () => {
    mockAuth('caregiver')
    mockGetCaregiver.mockResolvedValue({
      permissions: { canViewLiaison: true, canViewPlanning: false },
    })
    mockGetCaregiverEmployerId.mockResolvedValue('employer-789')

    const { result } = renderHook(() => useEmployerResolution())

    await waitFor(() => {
      expect(result.current.resolvedEmployerId).toBe('employer-789')
    })
    expect(result.current.caregiverPermissions).toEqual({
      canViewLiaison: true,
      canViewPlanning: false,
    })
    expect(result.current.accessDenied).toBe(false)
  })

  it('résout si la permission requise est présente et vraie', async () => {
    mockAuth('caregiver')
    mockGetCaregiver.mockResolvedValue({
      permissions: { canViewLiaison: true, canViewPlanning: false },
    })
    mockGetCaregiverEmployerId.mockResolvedValue('employer-789')

    const { result } = renderHook(() =>
      useEmployerResolution({ requiredCaregiverPermission: 'canViewLiaison' })
    )

    await waitFor(() => {
      expect(result.current.resolvedEmployerId).toBe('employer-789')
    })
    expect(result.current.accessDenied).toBe(false)
  })

  it('accessDenied si la permission requise est absente ou false', async () => {
    mockAuth('caregiver')
    mockGetCaregiver.mockResolvedValue({
      permissions: { canViewLiaison: false, canViewPlanning: false },
    })

    const { result } = renderHook(() =>
      useEmployerResolution({ requiredCaregiverPermission: 'canViewLiaison' })
    )

    await waitFor(() => {
      expect(result.current.accessDenied).toBe(true)
    })
    expect(result.current.resolvedEmployerId).toBeNull()
    expect(mockGetCaregiverEmployerId).not.toHaveBeenCalled()
  })

  it('accessDenied et logger.error si getCaregiver lance une erreur', async () => {
    mockAuth('caregiver')
    mockGetCaregiver.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useEmployerResolution())

    await waitFor(() => {
      expect(result.current.accessDenied).toBe(true)
    })
    expect(logger.error).toHaveBeenCalledWith(
      'Erreur résolution employeur pour aidant:',
      expect.any(Error)
    )
    expect(result.current.isResolving).toBe(false)
  })

  it('expose caregiverPermissions dans le résultat', async () => {
    const permissions = { canViewLiaison: true, canViewPlanning: true, canManageShifts: false }
    mockAuth('caregiver')
    mockGetCaregiver.mockResolvedValue({ permissions })
    mockGetCaregiverEmployerId.mockResolvedValue('employer-789')

    const { result } = renderHook(() => useEmployerResolution())

    await waitFor(() => {
      expect(result.current.caregiverPermissions).toEqual(permissions)
    })
  })
})
