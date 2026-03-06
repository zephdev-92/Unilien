import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'
import { EmployerDashboard } from './EmployerDashboard'

// ── Mocks widgets ─────────────────────────────────────────────────────────────

vi.mock('./widgets', () => ({
  WelcomeCard: ({ profile }: { profile: { firstName: string } }) => (
    <div data-testid="welcome-card">{profile.firstName}</div>
  ),
  ActionNudgesWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="action-nudges-widget" data-employer-id={employerId} />
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
  TeamWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="team-widget" data-employer-id={employerId} />
  ),
  ComplianceWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="compliance-widget" data-employer-id={employerId} />
  ),
  RecentLogsWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="recent-logs-widget" data-employer-id={employerId} />
  ),
  PchEnvelopeWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="pch-envelope-widget" data-employer-id={employerId} />
  ),
  TodayPlanningWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="today-planning-widget" data-employer-id={employerId} />
  ),
}))

// ── Mocks services / hooks ────────────────────────────────────────────────────

const mockGetShifts = vi.fn()
vi.mock('@/services/shiftService', () => ({
  getShifts: (...args: unknown[]) => mockGetShifts(...args),
}))

const mockGetEmployer = vi.fn()
vi.mock('@/services/profileService', () => ({
  getEmployer: (...args: unknown[]) => mockGetEmployer(...args),
}))

const mockGetWeeklyComplianceOverview = vi.fn()
vi.mock('@/services/complianceService', () => ({
  getWeeklyComplianceOverview: (...args: unknown[]) => mockGetWeeklyComplianceOverview(...args),
}))

const mockUseComplianceMonitor = vi.fn()
vi.mock('@/hooks/useComplianceMonitor', () => ({
  useComplianceMonitor: (...args: unknown[]) => mockUseComplianceMonitor(...args),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const profile = createMockProfile({ id: 'employer-1', role: 'employer', firstName: 'Alice' })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EmployerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetShifts.mockResolvedValue([])
    mockGetEmployer.mockResolvedValue(null)
    mockGetWeeklyComplianceOverview.mockResolvedValue({ summary: { critical: 0, warnings: 0 } })
    mockUseComplianceMonitor.mockReturnValue(undefined)
  })

  describe('Composition des widgets', () => {
    it('affiche le WelcomeCard avec le prénom', async () => {
      renderWithProviders(<EmployerDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('welcome-card')).toHaveTextContent('Alice')
      })
    })

    it('affiche le StatsWidget en mode employer', async () => {
      renderWithProviders(<EmployerDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('stats-widget')).toHaveAttribute('data-role', 'employer')
      })
    })

    it('affiche le QuickActionsWidget en mode employer', async () => {
      renderWithProviders(<EmployerDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('quick-actions-widget')).toHaveAttribute(
          'data-role',
          'employer'
        )
      })
    })

    // TODO: réactiver quand les widgets seront remis
    // it('affiche le TeamWidget avec le bon employerId', async () => {
    //   renderWithProviders(<EmployerDashboard profile={profile} />)
    //   await waitFor(() => {
    //     expect(screen.getByTestId('team-widget')).toHaveAttribute(
    //       'data-employer-id',
    //       'employer-1'
    //     )
    //   })
    // })

    it('affiche le ComplianceWidget avec le bon employerId', async () => {
      renderWithProviders(<EmployerDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('compliance-widget')).toHaveAttribute(
          'data-employer-id',
          'employer-1'
        )
      })
    })

    // TODO: réactiver quand les widgets seront remis
    // it('affiche le RecentLogsWidget avec le bon employerId', async () => {
    //   renderWithProviders(<EmployerDashboard profile={profile} />)
    //   await waitFor(() => {
    //     expect(screen.getByTestId('recent-logs-widget')).toHaveAttribute(
    //       'data-employer-id',
    //       'employer-1'
    //     )
    //   })
    // })
  })

  // TODO: réactiver quand UpcomingShiftsWidget sera remis
  // describe('Chargement des shifts', () => {
  //   it('passe loading=true pendant le chargement', () => { ... })
  //   it('passe loading=false après chargement', async () => { ... })
  //   it('filtre les shifts non-planifiés et passe seulement les planned', async () => { ... })
  //   it('limite les shifts à 5 au maximum', async () => { ... })
  //   it('passe un tableau vide si le service échoue', async () => { ... })
  //   it('appelle getShifts avec le bon profileId et rôle employer', async () => { ... })
  // })

  describe('Monitoring conformité', () => {
    it('active useComplianceMonitor avec le bon employerId', () => {
      renderWithProviders(<EmployerDashboard profile={profile} />)
      expect(mockUseComplianceMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          employerId: 'employer-1',
          userId: 'employer-1',
          enabled: true,
        })
      )
    })
  })
})
