import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'
import { EmployeeDashboard } from './EmployeeDashboard'

// ── Mocks widgets ─────────────────────────────────────────────────────────────

vi.mock('./widgets', () => ({
  WelcomeCard: ({
    profile,
    loading,
  }: {
    profile: { firstName: string }
    loading?: boolean
  }) => (
    <div data-testid="welcome-card" data-loading={String(!!loading)}>
      {profile.firstName}
    </div>
  ),
  StatsWidget: ({ userRole, profileId }: { userRole: string; profileId: string }) => (
    <div data-testid="stats-widget" data-role={userRole} data-profile-id={profileId} />
  ),
  EmployeeShiftTimeline: ({ employeeId }: { employeeId: string }) => (
    <div data-testid="employee-shift-timeline" data-employee-id={employeeId} />
  ),
  EmployeeHoursProgress: ({ employeeId }: { employeeId: string }) => (
    <div data-testid="employee-hours-progress" data-employee-id={employeeId} />
  ),
  RecentMessagesWidget: ({ userId }: { userId: string }) => (
    <div data-testid="recent-messages-widget" data-user-id={userId} />
  ),
  ClockInWidget: ({
    hasActiveShift,
  }: {
    hasActiveShift: boolean
  }) => (
    <div data-testid="clock-in-widget" data-has-active-shift={String(hasActiveShift)} />
  ),
  EmployeeLeaveWidget: ({ employeeId }: { employeeId: string }) => (
    <div data-testid="employee-leave-widget" data-employee-id={employeeId} />
  ),
  EmployeeDocumentsWidget: ({ employeeId }: { employeeId: string }) => (
    <div data-testid="employee-documents-widget" data-employee-id={employeeId} />
  ),
  OnboardingWidget: ({ userRole }: { userRole: string }) => (
    <div data-testid="onboarding-widget" data-role={userRole} />
  ),
}))

// ── Mocks services ────────────────────────────────────────────────────────────

const mockGetShifts = vi.fn()
vi.mock('@/services/shiftService', () => ({
  getShifts: (...args: unknown[]) => mockGetShifts(...args),
}))

// Mock Supabase — requête contracts pour hasContracts
const mockSupabaseChain = {
  from: vi.fn(),
}
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseChain.from(...args),
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const profile = createMockProfile({ id: 'employee-1', role: 'employee', firstName: 'Marc' })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EmployeeDashboard', () => {
  function mockHasContracts(count: number) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((cb: (v: { count: number }) => void) => Promise.resolve(cb({ count }))),
    }
    mockSupabaseChain.from.mockReturnValue(chain)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetShifts.mockResolvedValue([])
    // Par défaut : 1 contrat actif → affiche les widgets principaux
    mockHasContracts(1)
  })

  describe('Composition des widgets', () => {
    it('affiche le WelcomeCard avec le prénom', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('welcome-card')).toHaveTextContent('Marc')
      })
    })

    it('affiche le StatsWidget en mode employee', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('stats-widget')).toHaveAttribute('data-role', 'employee')
      })
    })

    it('affiche le EmployeeShiftTimeline avec le profileId', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('employee-shift-timeline')).toHaveAttribute(
          'data-employee-id',
          'employee-1'
        )
      })
    })

    it('affiche le EmployeeHoursProgress avec le profileId', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('employee-hours-progress')).toHaveAttribute(
          'data-employee-id',
          'employee-1'
        )
      })
    })

    it('affiche le RecentMessagesWidget avec le profileId', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('recent-messages-widget')).toHaveAttribute(
          'data-user-id',
          'employee-1'
        )
      })
    })

    // Désactivé tant que FEATURES.clockIn = false (v1).
    it.skip('affiche le ClockInWidget', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('clock-in-widget')).toBeInTheDocument()
      })
    })

    it("n'affiche pas le ComplianceWidget (non présent pour employee)", async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.queryByTestId('compliance-widget')).not.toBeInTheDocument()
      })
    })
  })

  describe('Chargement des shifts', () => {
    it('appelle getShifts avec le bon profileId et rôle employee', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(mockGetShifts).toHaveBeenCalledWith(
          'employee-1',
          'employee',
          expect.any(Date),
          expect.any(Date)
        )
      })
    })

    it('gère les erreurs de getShifts sans crash', async () => {
      mockGetShifts.mockRejectedValue(new Error('Réseau'))
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      // Le composant ne crash pas
      await waitFor(() => {
        expect(screen.getByTestId('welcome-card')).toBeInTheDocument()
      })
    })
  })

  describe('Empty state — aucun contrat actif', () => {
    it('affiche le message vide et masque les widgets principaux quand aucun contrat actif', async () => {
      mockHasContracts(0)
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByText('Aucun contrat actif pour le moment')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('stats-widget')).not.toBeInTheDocument()
      expect(screen.queryByTestId('employee-shift-timeline')).not.toBeInTheDocument()
      expect(screen.queryByTestId('employee-hours-progress')).not.toBeInTheDocument()
      expect(screen.queryByTestId('employee-leave-widget')).not.toBeInTheDocument()
      expect(screen.queryByTestId('employee-documents-widget')).not.toBeInTheDocument()
    })

    it('affiche les CTAs "Compléter mon profil" et "Centre d\'aide" dans le empty state', async () => {
      mockHasContracts(0)
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByText('Compléter mon profil')).toBeInTheDocument()
        expect(screen.getByText("Centre d'aide")).toBeInTheDocument()
      })
    })

    it('affiche toujours WelcomeCard et OnboardingWidget même en empty state', async () => {
      mockHasContracts(0)
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('welcome-card')).toBeInTheDocument()
        expect(screen.getByTestId('onboarding-widget')).toBeInTheDocument()
      })
    })

    it('affiche les widgets principaux quand il y a des contrats actifs', async () => {
      mockHasContracts(2)
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('employee-shift-timeline')).toBeInTheDocument()
        expect(screen.getByTestId('stats-widget')).toBeInTheDocument()
      })
      expect(screen.queryByText('Aucun contrat actif pour le moment')).not.toBeInTheDocument()
    })
  })
})
