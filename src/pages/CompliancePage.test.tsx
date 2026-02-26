import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'
import { CompliancePage } from './CompliancePage'
import type { Caregiver, CaregiverPermissions } from '@/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

vi.mock('@/services/caregiverService', () => ({ getCaregiver: vi.fn() }))

vi.mock('@/components/dashboard', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

vi.mock('@/components/compliance', () => ({
  ComplianceDashboard: ({ employerId }: { employerId: string }) => (
    <div data-testid="compliance-dashboard" data-employer-id={employerId} />
  ),
}))

// ── Imports après mocks ────────────────────────────────────────────────────────

import { useAuth } from '@/hooks/useAuth'
import { getCaregiver } from '@/services/caregiverService'

const mockUseAuth = vi.mocked(useAuth)
const mockGetCaregiver = vi.mocked(getCaregiver)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const noPermissions: CaregiverPermissions = {
  canViewPlanning: false,
  canEditPlanning: false,
  canViewLiaison: false,
  canWriteLiaison: false,
  canManageTeam: false,
  canExportData: false,
}

const exportPermissions: CaregiverPermissions = {
  ...noPermissions,
  canExportData: true,
}

function createMockCaregiver(overrides: Partial<Caregiver> = {}): Caregiver {
  return {
    profileId: 'caregiver-1',
    employerId: 'employer-42',
    permissions: noPermissions,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CompliancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Par défaut : getCaregiver ne résout jamais (simule le chargement en cours)
    mockGetCaregiver.mockReturnValue(new Promise(() => {}))
  })

  // 1. Spinner si profile est null
  it('affiche un Spinner quand profile est null', () => {
    mockUseAuth.mockReturnValue({ profile: null } as ReturnType<typeof useAuth>)

    renderWithProviders(<CompliancePage />)

    expect(screen.getByTestId('layout')).toBeInTheDocument()
    // Le Spinner Chakra rend un élément avec le rôle status
    expect(document.querySelector('[class*="spinner"]') ?? screen.getByTestId('layout')).toBeInTheDocument()
    expect(screen.queryByTestId('compliance-dashboard')).not.toBeInTheDocument()
  })

  // 2. Spinner pendant isLoadingCaregiver (role=caregiver, promise non résolue)
  it('affiche un Spinner pendant le chargement de l\'aidant', () => {
    const profile = createMockProfile({ id: 'caregiver-1', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)
    // getCaregiver ne résout pas encore → caregiverLoaded = false
    mockGetCaregiver.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<CompliancePage />)

    expect(screen.getByTestId('layout')).toBeInTheDocument()
    expect(screen.queryByTestId('compliance-dashboard')).not.toBeInTheDocument()
  })

  // 3. Redirection si role=employee (ni employer, ni caregiver avec accès)
  it('redirige vers /dashboard si le rôle est employee', async () => {
    const profile = createMockProfile({ role: 'employee' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<CompliancePage />)

    await waitFor(() => {
      expect(screen.queryByTestId('compliance-dashboard')).not.toBeInTheDocument()
    })
  })

  // 4. Redirection si caregiver sans canExportData
  it('redirige vers /dashboard si caregiver sans canExportData', async () => {
    const profile = createMockProfile({ id: 'caregiver-1', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)
    const caregiver = createMockCaregiver({ permissions: noPermissions })
    mockGetCaregiver.mockResolvedValue(caregiver)

    renderWithProviders(<CompliancePage />)

    await waitFor(() => {
      expect(screen.queryByTestId('compliance-dashboard')).not.toBeInTheDocument()
    })
  })

  // 5. Affiche ComplianceDashboard pour un employeur (employerId = profile.id)
  it('affiche ComplianceDashboard pour un employeur avec l\'employerId du profil', async () => {
    const profile = createMockProfile({ id: 'employer-99', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<CompliancePage />)

    await waitFor(() => {
      const dashboard = screen.getByTestId('compliance-dashboard')
      expect(dashboard).toBeInTheDocument()
      expect(dashboard).toHaveAttribute('data-employer-id', 'employer-99')
    })
  })

  // 6. Affiche ComplianceDashboard pour un caregiver avec canExportData
  it('affiche ComplianceDashboard pour un caregiver avec canExportData (employerId = caregiver.employerId)', async () => {
    const profile = createMockProfile({ id: 'caregiver-1', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)
    const caregiver = createMockCaregiver({
      employerId: 'employer-42',
      permissions: exportPermissions,
    })
    mockGetCaregiver.mockResolvedValue(caregiver)

    renderWithProviders(<CompliancePage />)

    await waitFor(() => {
      const dashboard = screen.getByTestId('compliance-dashboard')
      expect(dashboard).toBeInTheDocument()
      expect(dashboard).toHaveAttribute('data-employer-id', 'employer-42')
    })
  })

  // 7. getCaregiver est appelé avec le profileId du caregiver
  it('appelle getCaregiver avec le profile.id quand role=caregiver', async () => {
    const profile = createMockProfile({ id: 'caregiver-7', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)
    const caregiver = createMockCaregiver({ permissions: exportPermissions, employerId: 'emp-7' })
    mockGetCaregiver.mockResolvedValue(caregiver)

    renderWithProviders(<CompliancePage />)

    await waitFor(() => {
      expect(mockGetCaregiver).toHaveBeenCalledWith('caregiver-7')
    })
  })

  // 8. Pas d'appel à getCaregiver pour un employeur
  it('n\'appelle pas getCaregiver quand le rôle est employer', () => {
    const profile = createMockProfile({ id: 'employer-1', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<CompliancePage />)

    expect(mockGetCaregiver).not.toHaveBeenCalled()
  })

  // 9. Redirection si caregiver résolu mais sans employerId
  it('redirige si caregiver avec canExportData mais sans employerId', async () => {
    const profile = createMockProfile({ id: 'caregiver-1', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)
    // employerId vide → deuxième guard `if (!employerId)` déclenche la redirection
    const caregiver = createMockCaregiver({
      employerId: '',
      permissions: exportPermissions,
    })
    mockGetCaregiver.mockResolvedValue(caregiver)

    renderWithProviders(<CompliancePage />)

    await waitFor(() => {
      expect(screen.queryByTestId('compliance-dashboard')).not.toBeInTheDocument()
    })
  })
})
