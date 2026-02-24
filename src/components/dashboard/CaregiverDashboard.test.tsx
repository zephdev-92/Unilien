import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'
import { CaregiverDashboard } from './CaregiverDashboard'
import type { Caregiver, CaregiverPermissions } from '@/types'

// ── Mocks widgets ─────────────────────────────────────────────────────────────

vi.mock('./widgets', () => ({
  WelcomeCard: ({ profile }: { profile: { firstName: string } }) => (
    <div data-testid="welcome-card">{profile.firstName}</div>
  ),
  StatsWidget: ({ userRole }: { userRole: string }) => (
    <div data-testid="stats-widget" data-role={userRole} />
  ),
  QuickActionsWidget: () => <div data-testid="quick-actions-widget" />,
  UpcomingShiftsWidget: ({ shifts }: { shifts: unknown[] }) => (
    <div data-testid="upcoming-shifts-widget" data-count={shifts.length} />
  ),
  TeamWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="team-widget" data-employer-id={employerId} />
  ),
  ComplianceWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="compliance-widget" data-employer-id={employerId} />
  ),
  RecentLogsWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="recent-logs-widget" data-employer-id={employerId} />
  ),
}))

// ── Mocks services ────────────────────────────────────────────────────────────

const mockGetCaregiver = vi.fn()
const mockGetUpcomingShiftsForCaregiver = vi.fn()

vi.mock('@/services/caregiverService', () => ({
  getCaregiver: (...args: unknown[]) => mockGetCaregiver(...args),
  getUpcomingShiftsForCaregiver: (...args: unknown[]) =>
    mockGetUpcomingShiftsForCaregiver(...args),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const profile = createMockProfile({ id: 'caregiver-1', role: 'caregiver', firstName: 'Sophie' })

const noPermissions: CaregiverPermissions = {
  canViewPlanning: false,
  canEditPlanning: false,
  canViewLiaison: false,
  canWriteLiaison: false,
  canManageTeam: false,
  canExportData: false,
}

const viewPermissions: CaregiverPermissions = {
  ...noPermissions,
  canViewPlanning: true,
  canViewLiaison: true,
}

const advancedPermissions: CaregiverPermissions = {
  canViewPlanning: true,
  canEditPlanning: true,
  canViewLiaison: true,
  canWriteLiaison: true,
  canManageTeam: true,
  canExportData: true,
}

function makeCaregiver(permissions: CaregiverPermissions, employerId = 'employer-42'): Caregiver {
  return {
    profileId: 'caregiver-1',
    employerId,
    permissions,
    createdAt: new Date(),
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CaregiverDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUpcomingShiftsForCaregiver.mockResolvedValue([])
  })

  describe('État loading', () => {
    it('affiche un spinner pendant le chargement', () => {
      mockGetCaregiver.mockReturnValue(new Promise(() => {}))
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      // Le WelcomeCard n'est pas encore affiché — spinner à la place
      expect(screen.queryByTestId('welcome-card')).not.toBeInTheDocument()
    })
  })

  describe('Profil aidant introuvable', () => {
    it('affiche le WelcomeCard et un message de configuration', async () => {
      mockGetCaregiver.mockResolvedValue(null)
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('welcome-card')).toHaveTextContent('Sophie')
        expect(screen.getByText(/profil aidant non configuré/i)).toBeInTheDocument()
      })
    })

    it("n'affiche aucun widget fonctionnel", async () => {
      mockGetCaregiver.mockResolvedValue(null)
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.queryByTestId('stats-widget')).not.toBeInTheDocument()
        expect(screen.queryByTestId('upcoming-shifts-widget')).not.toBeInTheDocument()
      })
    })
  })

  describe('Aucune permission', () => {
    it('affiche le message "Accès limité"', async () => {
      mockGetCaregiver.mockResolvedValue(makeCaregiver(noPermissions))
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByText(/accès limité/i)).toBeInTheDocument()
      })
    })

    it("n'affiche pas les widgets planifiés ou liaison", async () => {
      mockGetCaregiver.mockResolvedValue(makeCaregiver(noPermissions))
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.queryByTestId('upcoming-shifts-widget')).not.toBeInTheDocument()
        expect(screen.queryByTestId('recent-logs-widget')).not.toBeInTheDocument()
      })
    })
  })

  describe('Permissions de base (view planning + liaison)', () => {
    beforeEach(() => {
      mockGetCaregiver.mockResolvedValue(makeCaregiver(viewPermissions))
    })

    it('affiche le WelcomeCard', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('welcome-card')).toHaveTextContent('Sophie')
      })
    })

    it('affiche le QuickActionsWidget', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('quick-actions-widget')).toBeInTheDocument()
      })
    })

    it('affiche l\'UpcomingShiftsWidget si canViewPlanning', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('upcoming-shifts-widget')).toBeInTheDocument()
      })
    })

    it('affiche le RecentLogsWidget si canViewLiaison', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('recent-logs-widget')).toBeInTheDocument()
      })
    })

    it("n'affiche pas StatsWidget, TeamWidget, ComplianceWidget sans permissions avancées", async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.queryByTestId('stats-widget')).not.toBeInTheDocument()
        expect(screen.queryByTestId('team-widget')).not.toBeInTheDocument()
        expect(screen.queryByTestId('compliance-widget')).not.toBeInTheDocument()
      })
    })

    it('charge les shifts si canViewPlanning est true', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(mockGetUpcomingShiftsForCaregiver).toHaveBeenCalledWith('caregiver-1', 5)
      })
    })
  })

  describe('Permissions avancées (tuteur/curateur)', () => {
    beforeEach(() => {
      mockGetCaregiver.mockResolvedValue(makeCaregiver(advancedPermissions, 'employer-99'))
    })

    it('affiche le StatsWidget avec employerId de l\'aidant', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('stats-widget')).toBeInTheDocument()
      })
    })

    it('affiche le TeamWidget si canManageTeam', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        const teamWidget = screen.getByTestId('team-widget')
        expect(teamWidget).toBeInTheDocument()
        expect(teamWidget).toHaveAttribute('data-employer-id', 'employer-99')
      })
    })

    it('affiche le ComplianceWidget si canExportData', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        const complianceWidget = screen.getByTestId('compliance-widget')
        expect(complianceWidget).toBeInTheDocument()
        expect(complianceWidget).toHaveAttribute('data-employer-id', 'employer-99')
      })
    })

    it('ne charge pas les shifts si canViewPlanning est false', async () => {
      const permsNoPlanning: CaregiverPermissions = {
        ...advancedPermissions,
        canViewPlanning: false,
      }
      mockGetCaregiver.mockResolvedValue(makeCaregiver(permsNoPlanning))
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(mockGetUpcomingShiftsForCaregiver).not.toHaveBeenCalled()
      })
    })
  })

  describe('Gestion des erreurs', () => {
    it('affiche le message "Profil aidant non configuré" si getCaregiver échoue (caregiver reste null)', async () => {
      // Quand getCaregiver rejette, caregiver reste null → early return "non configuré"
      mockGetCaregiver.mockRejectedValue(new Error('Réseau'))
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByText(/profil aidant non configuré/i)).toBeInTheDocument()
      })
    })

    it('affiche un message d\'erreur si getUpcomingShiftsForCaregiver échoue', async () => {
      // getCaregiver réussit (caregiver non-null) → le catch atteint setError visible
      mockGetCaregiver.mockResolvedValue(makeCaregiver(viewPermissions))
      mockGetUpcomingShiftsForCaregiver.mockRejectedValue(new Error('Réseau'))
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(
          screen.getByText(/erreur lors du chargement des données/i)
        ).toBeInTheDocument()
      })
    })

    it('appelle getCaregiver avec le bon profileId', async () => {
      mockGetCaregiver.mockResolvedValue(null)
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(mockGetCaregiver).toHaveBeenCalledWith('caregiver-1')
      })
    })
  })
})
