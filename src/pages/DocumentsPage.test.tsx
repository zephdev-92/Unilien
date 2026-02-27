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

vi.mock('@/lib/export', () => ({
  getMonthlyDeclarationData: vi.fn(),
  generateCesuCsv: vi.fn(),
  generateCesuSummary: vi.fn(),
  generateCesuPdf: vi.fn(),
  downloadExport: vi.fn(),
  MONTHS_FR: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ],
}))

vi.mock('@/components/documents', () => ({
  DocumentManagementSection: ({ employerId }: { employerId: string }) => (
    <div data-testid="doc-section" data-employer-id={employerId} />
  ),
  PayslipSection: () => <div data-testid="payslip-section" />,
  PlanningExportSection: () => <div data-testid="planning-export-section" />,
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

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Par défaut : getCaregiver ne résout jamais (simule le chargement en cours)
    mockGetCaregiver.mockReturnValue(new Promise(() => {}))
  })

  // 1. Spinner si profile est null
  it('affiche un Spinner quand profile est null', () => {
    mockUseAuth.mockReturnValue({ profile: null } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    expect(screen.getByTestId('layout')).toBeInTheDocument()
    expect(screen.queryByText('Documents et Déclarations')).not.toBeInTheDocument()
    expect(screen.queryByTestId('doc-section')).not.toBeInTheDocument()
  })

  // 2. Un employé peut accéder à la page (onglet Planning visible)
  it('affiche la page pour un role=employee (acces planning)', async () => {
    const profile = createMockProfile({ role: 'employee' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Documents et Déclarations')).toBeInTheDocument()
    })
  })

  // 3. Redirection si caregiver sans canExportData
  it('redirige vers /dashboard si caregiver sans canExportData', async () => {
    const profile = createMockProfile({ id: 'caregiver-1', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)
    mockGetCaregiver.mockResolvedValue(createMockCaregiver({ permissions: noPermissions }))

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.queryByText('Documents et Déclarations')).not.toBeInTheDocument()
    })
  })

  // 4. Spinner pendant isLoadingCaregiver (role=caregiver, promise non résolue)
  it('affiche un Spinner pendant le chargement de l\'aidant', () => {
    const profile = createMockProfile({ id: 'caregiver-1', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)
    // mockGetCaregiver déjà configuré comme promise infinie dans beforeEach

    renderWithProviders(<DocumentsPage />)

    expect(screen.getByTestId('layout')).toBeInTheDocument()
    expect(screen.queryByText('Documents et Déclarations')).not.toBeInTheDocument()
  })

  // 5. Affiche le contenu complet pour un employeur (titre + tabs)
  it('affiche le titre et les onglets de navigation pour un employeur', async () => {
    const profile = createMockProfile({ id: 'employer-99', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Documents et Déclarations')).toBeInTheDocument()
    })

    expect(screen.getByText('Déclarations CESU')).toBeInTheDocument()
    expect(screen.getByText('Gestion des documents')).toBeInTheDocument()
  })

  // 6. Les boutons de sélection de mois sont présents pour un employeur
  it('affiche les boutons de sélection de mois pour un employeur', async () => {
    const profile = createMockProfile({ id: 'employer-99', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Documents et Déclarations')).toBeInTheDocument()
    })

    // Vérifie la présence de quelques mois — .slice(0, 3) sur le nom du mois
    // 'Janvier' → 'Jan', 'Février' → 'Fév', 'Juillet' → 'Jui', 'Décembre' → 'Déc'
    expect(screen.getByText('Jan')).toBeInTheDocument()
    expect(screen.getByText('Fév')).toBeInTheDocument()
    // Juin et Juillet donnent tous deux 'Jui' — on vérifie qu'il y en a au moins 2
    expect(screen.getAllByText('Jui').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Déc')).toBeInTheDocument()
  })

  // 7. Les boutons de sélection d'année sont présents pour un employeur
  it('affiche les boutons de sélection d\'année pour un employeur', async () => {
    const profile = createMockProfile({ id: 'employer-99', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Documents et Déclarations')).toBeInTheDocument()
    })

    const currentYear = new Date().getFullYear()
    expect(screen.getByText(String(currentYear))).toBeInTheDocument()
    expect(screen.getByText(String(currentYear - 1))).toBeInTheDocument()
    expect(screen.getByText(String(currentYear - 2))).toBeInTheDocument()
  })

  // 8. DocumentManagementSection est rendu dans l'onglet documents pour un employeur
  it('rend DocumentManagementSection avec l\'employerId correct pour un employeur', async () => {
    const profile = createMockProfile({ id: 'employer-99', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      const docSection = screen.getByTestId('doc-section')
      expect(docSection).toBeInTheDocument()
      expect(docSection).toHaveAttribute('data-employer-id', 'employer-99')
    })
  })

  // 9. DocumentManagementSection utilise l'employerId du caregiver, pas du profil
  it('rend DocumentManagementSection avec l\'employerId du caregiver pour un aidant avec accès', async () => {
    const profile = createMockProfile({ id: 'caregiver-1', role: 'caregiver' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)
    const caregiver = createMockCaregiver({
      employerId: 'employer-42',
      permissions: exportPermissions,
    })
    mockGetCaregiver.mockResolvedValue(caregiver)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      const docSection = screen.getByTestId('doc-section')
      expect(docSection).toBeInTheDocument()
      expect(docSection).toHaveAttribute('data-employer-id', 'employer-42')
    })
  })

  // 10. getCaregiver est appelé avec le profile.id quand role=caregiver
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

  // 11. Pas d'appel à getCaregiver pour un employeur
  it('n\'appelle pas getCaregiver quand le rôle est employer', () => {
    const profile = createMockProfile({ id: 'employer-1', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    expect(mockGetCaregiver).not.toHaveBeenCalled()
  })

  // 12. Le bouton de génération d'aperçu est présent
  it('affiche le bouton de génération d\'aperçu pour un employeur', async () => {
    const profile = createMockProfile({ id: 'employer-99', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Générer l'aperçu pour/)).toBeInTheDocument()
    })
  })

  // 13. La description de la page est affichée
  it('affiche la description de la page pour un employeur', async () => {
    const profile = createMockProfile({ id: 'employer-99', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(
        screen.getByText(/Gérez vos documents et générez les fichiers pour vos déclarations CESU/)
      ).toBeInTheDocument()
    })
  })

  // 14. L'onglet "Gestion des documents" affiche le sous-titre de gestion des absences
  it('affiche le sous-titre de gestion des absences dans l\'onglet documents', async () => {
    const profile = createMockProfile({ id: 'employer-99', role: 'employer' })
    mockUseAuth.mockReturnValue({ profile } as ReturnType<typeof useAuth>)

    renderWithProviders(<DocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Gestion des absences et justificatifs')).toBeInTheDocument()
    })
  })
})
