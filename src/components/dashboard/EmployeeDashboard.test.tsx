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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const profile = createMockProfile({ id: 'employee-1', role: 'employee', firstName: 'Marc' })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EmployeeDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetShifts.mockResolvedValue([])
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

    it('affiche le ClockInWidget', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('clock-in-widget')).toBeInTheDocument()
      })
    })

    it("n'affiche pas TeamWidget ni ComplianceWidget (non présents pour employee)", async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.queryByTestId('team-widget')).not.toBeInTheDocument()
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
})
