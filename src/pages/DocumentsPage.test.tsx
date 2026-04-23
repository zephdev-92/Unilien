import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'
import { DocumentsPage } from './DocumentsPage'
import type { Caregiver, CaregiverPermissions } from '@/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

vi.mock('@/services/caregiverService', () => ({ getCaregiver: vi.fn() }))

vi.mock('@/components/dashboard', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

vi.mock('@/components/documents', () => ({
  CesuDeclarationSection: ({ employerId }: { employerId: string }) => (
    <div data-testid="cesu-section" data-employer-id={employerId} />
  ),
  ContractsSection: ({ employerId }: { employerId: string }) => (
    <div data-testid="contracts-section" data-employer-id={employerId} />
  ),
  DocumentManagementSection: ({ employerId }: { employerId: string }) => (
    <div data-testid="doc-section" data-employer-id={employerId} />
  ),
  PayslipSection: () => <div data-testid="payslip-section" />,
  EmployeePayslipSection: ({ employeeId }: { employeeId: string }) => (
    <div data-testid="employee-payslip-section" data-employee-id={employeeId} />
  ),
  PlanningExportSection: () => <div data-testid="planning-export-section" />,
}))

// ── Imports apres mocks ────────────────────────────────────────────────────────

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

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCaregiver.mockReturnValue(new Promise(() => {}))
  })

  it('affiche un Spinner quand profile est null', () => {
    mockUseAuth.mockReturnValue({ profile: null } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    expect(screen.getByTestId('layout')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('affiche la page pour un role=employee', async () => {
    const profile = createMockProfile({ role: 'employee' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })
  })

  it('redirige si caregiver sans canExportData', async () => {
    const profile = createMockProfile({ id: 'caregiver-1', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)
    mockGetCaregiver.mockResolvedValue(createMockCaregiver({ permissions: noPermissions }))

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    })
  })

  it('affiche un Spinner pendant le chargement de l\'aidant', () => {
    const profile = createMockProfile({ id: 'caregiver-1', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    expect(screen.getByTestId('layout')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('affiche les 5 onglets pour un employeur', async () => {
    const profile = createMockProfile({ id: 'employer-99', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })
    expect(screen.getByRole('tab', { name: 'Bulletins de paie' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Contrats' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Absences' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Export planning' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Déclarations CESU' })).toBeInTheDocument()
  })

  it('rend les sections avec le bon employerId pour un employeur', async () => {
    const profile = createMockProfile({ id: 'employer-99', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('doc-section')).toHaveAttribute('data-employer-id', 'employer-99')
      expect(screen.getByTestId('contracts-section')).toHaveAttribute('data-employer-id', 'employer-99')
      expect(screen.getByTestId('cesu-section')).toHaveAttribute('data-employer-id', 'employer-99')
    })
  })

  it('rend les sections avec l\'employerId du caregiver pour un aidant avec acces', async () => {
    const profile = createMockProfile({ id: 'caregiver-1', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)
    mockGetCaregiver.mockResolvedValue(
      createMockCaregiver({ employerId: 'employer-42', permissions: exportPermissions })
    )

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('doc-section')).toHaveAttribute('data-employer-id', 'employer-42')
      expect(screen.getByTestId('cesu-section')).toHaveAttribute('data-employer-id', 'employer-42')
    })
  })

  it('appelle getCaregiver avec le profile.id quand role=caregiver', async () => {
    const profile = createMockProfile({ id: 'caregiver-5', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)
    mockGetCaregiver.mockResolvedValue(
      createMockCaregiver({ permissions: exportPermissions, employerId: 'emp-5' })
    )

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(mockGetCaregiver).toHaveBeenCalledWith('caregiver-5')
    })
  })

  it('n\'appelle pas getCaregiver quand le role est employer', () => {
    const profile = createMockProfile({ id: 'employer-1', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    expect(mockGetCaregiver).not.toHaveBeenCalled()
  })
})
