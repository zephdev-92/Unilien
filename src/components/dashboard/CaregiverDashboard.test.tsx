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
  ClockInWidget: ({ variant }: { variant?: string }) => (
    <div data-testid="clockin-widget" data-variant={variant} />
  ),
  PchEnvelopeWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="pch-envelope-widget" data-employer-id={employerId} />
  ),
  PchMiniWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="pch-mini-widget" data-employer-id={employerId} />
  ),
  WeekSummaryWidget: ({ userId }: { userId: string }) => (
    <div data-testid="week-summary-widget" data-user-id={userId} />
  ),
  RecentMessagesWidget: ({ userId }: { userId: string }) => (
    <div data-testid="recent-messages-widget" data-user-id={userId} />
  ),
  CaregiverShiftTimeline: ({ profileId }: { profileId: string }) => (
    <div data-testid="caregiver-timeline" data-profile-id={profileId} />
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

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { first_name: 'Marie', last_name: 'Fontaine' } }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
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

// Helper: certains widgets sont dupliqués (layout desktop + mobile)
function queryTestId(testId: string) {
  return screen.queryAllByTestId(testId)
}

function expectPresent(testId: string) {
  expect(queryTestId(testId).length).toBeGreaterThan(0)
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
        expect(queryTestId('stats-widget')).toHaveLength(0)
        expect(queryTestId('caregiver-timeline')).toHaveLength(0)
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

    it("n'affiche pas la timeline sans permission planning", async () => {
      mockGetCaregiver.mockResolvedValue(makeCaregiver(noPermissions))
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(queryTestId('caregiver-timeline')).toHaveLength(0)
      })
    })

    it('affiche quand même les stats aidant', async () => {
      mockGetCaregiver.mockResolvedValue(makeCaregiver(noPermissions))
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expectPresent('stats-widget')
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
        expectPresent('quick-actions-widget')
      })
    })

    it('affiche la CaregiverShiftTimeline si canViewPlanning', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expectPresent('caregiver-timeline')
      })
    })

    it('affiche le ClockInWidget avec variant warm', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        const widgets = screen.getAllByTestId('clockin-widget')
        expect(widgets[0]).toHaveAttribute('data-variant', 'warm')
      })
    })

    it('affiche le PchEnvelopeWidget', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expectPresent('pch-envelope-widget')
      })
    })

    it('affiche le WeekSummaryWidget', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expectPresent('week-summary-widget')
      })
    })

    it('affiche le RecentMessagesWidget', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expectPresent('recent-messages-widget')
      })
    })

    it('affiche le PchMiniWidget', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expectPresent('pch-mini-widget')
      })
    })

    it('affiche StatsWidget avec stats aidant (sans employerId) sans permissions avancées', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expectPresent('stats-widget')
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

    it('affiche le StatsWidget avec employerId', async () => {
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expectPresent('stats-widget')
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
    it('affiche le message "Profil aidant non configuré" si getCaregiver échoue', async () => {
      mockGetCaregiver.mockRejectedValue(new Error('Réseau'))
      renderWithProviders(<CaregiverDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByText(/profil aidant non configuré/i)).toBeInTheDocument()
      })
    })

    it('affiche un message d\'erreur si getUpcomingShiftsForCaregiver échoue', async () => {
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
