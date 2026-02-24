import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile, createMockShift } from '@/test/fixtures'
import { EmployeeDashboard } from './EmployeeDashboard'

// ── Mocks widgets ─────────────────────────────────────────────────────────────

vi.mock('./widgets', () => ({
  WelcomeCard: ({ profile }: { profile: { firstName: string } }) => (
    <div data-testid="welcome-card">{profile.firstName}</div>
  ),
  StatsWidget: ({ userRole }: { userRole: string }) => (
    <div data-testid="stats-widget" data-role={userRole} />
  ),
  QuickActionsWidget: ({ userRole }: { userRole: string }) => (
    <div data-testid="quick-actions-widget" data-role={userRole} />
  ),
  UpcomingShiftsWidget: ({
    loading,
    userRole,
    shifts,
  }: {
    loading?: boolean
    userRole: string
    shifts: unknown[]
  }) => (
    <div
      data-testid="upcoming-shifts-widget"
      data-loading={String(loading)}
      data-role={userRole}
      data-count={shifts.length}
    />
  ),
  RecentLogsWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="recent-logs-widget" data-employer-id={employerId} />
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

    it('affiche le QuickActionsWidget en mode employee', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('quick-actions-widget')).toHaveAttribute(
          'data-role',
          'employee'
        )
      })
    })

    it('affiche l\'UpcomingShiftsWidget en mode employee', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('upcoming-shifts-widget')).toHaveAttribute(
          'data-role',
          'employee'
        )
      })
    })

    it('affiche le RecentLogsWidget avec le profileId comme employerId', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('recent-logs-widget')).toHaveAttribute(
          'data-employer-id',
          'employee-1'
        )
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
    it('passe loading=true pendant le chargement', () => {
      mockGetShifts.mockReturnValue(new Promise(() => {}))
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      expect(screen.getByTestId('upcoming-shifts-widget')).toHaveAttribute(
        'data-loading',
        'true'
      )
    })

    it('passe loading=false après chargement', async () => {
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('upcoming-shifts-widget')).toHaveAttribute(
          'data-loading',
          'false'
        )
      })
    })

    it('filtre les shifts non-planifiés', async () => {
      const planned = createMockShift({ id: 'sh-1', status: 'planned' })
      const cancelled = createMockShift({ id: 'sh-2', status: 'cancelled' })
      mockGetShifts.mockResolvedValue([planned, cancelled])
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('upcoming-shifts-widget')).toHaveAttribute(
          'data-count',
          '1'
        )
      })
    })

    it('limite les shifts à 5 au maximum', async () => {
      const shifts = Array.from({ length: 10 }, (_, i) =>
        createMockShift({ id: `sh-${i}`, status: 'planned' })
      )
      mockGetShifts.mockResolvedValue(shifts)
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('upcoming-shifts-widget')).toHaveAttribute(
          'data-count',
          '5'
        )
      })
    })

    it('passe un tableau vide si le service échoue', async () => {
      mockGetShifts.mockRejectedValue(new Error('Réseau'))
      renderWithProviders(<EmployeeDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('upcoming-shifts-widget')).toHaveAttribute(
          'data-count',
          '0'
        )
      })
    })

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
  })
})
