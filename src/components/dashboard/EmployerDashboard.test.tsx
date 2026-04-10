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
  BudgetForecastWidget: ({ employerId }: { employerId: string }) => (
    <div data-testid="budget-forecast-widget" data-employer-id={employerId} />
  ),
  OnboardingWidget: ({ userRole }: { userRole: string }) => (
    <div data-testid="onboarding-widget" data-role={userRole} />
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

// Mock Supabase — requête contracts pour hasEmployees
const mockSupabaseChain = {
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  head: vi.fn(),
}
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseChain.from(...args),
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const profile = createMockProfile({ id: 'employer-1', role: 'employer', firstName: 'Alice' })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EmployerDashboard', () => {
  // Helper — simule un employeur avec N contrats actifs
  function mockHasEmployees(count: number) {
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
    mockGetEmployer.mockResolvedValue(null)
    mockGetWeeklyComplianceOverview.mockResolvedValue({ summary: { critical: 0, warnings: 0 } })
    mockUseComplianceMonitor.mockReturnValue(undefined)
    // Par défaut : 1 employé actif → affiche les widgets principaux
    mockHasEmployees(1)
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

  describe('Empty state — aucun employé', () => {
    it('affiche le message vide et masque les widgets principaux quand aucun contrat actif', async () => {
      mockHasEmployees(0)
      renderWithProviders(<EmployerDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByText('Ajoutez votre premier auxiliaire')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('today-planning-widget')).not.toBeInTheDocument()
      expect(screen.queryByTestId('compliance-widget')).not.toBeInTheDocument()
      expect(screen.queryByTestId('budget-forecast-widget')).not.toBeInTheDocument()
    })

    it('affiche les CTAs "Ajouter un auxiliaire" et "Voir le planning" dans le empty state', async () => {
      mockHasEmployees(0)
      renderWithProviders(<EmployerDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByText('Ajouter un auxiliaire')).toBeInTheDocument()
        expect(screen.getByText('Voir le planning')).toBeInTheDocument()
      })
    })

    it('affiche toujours WelcomeCard et OnboardingWidget même en empty state', async () => {
      mockHasEmployees(0)
      renderWithProviders(<EmployerDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('welcome-card')).toBeInTheDocument()
        expect(screen.getByTestId('onboarding-widget')).toBeInTheDocument()
      })
    })

    it('affiche les widgets principaux quand il y a des contrats actifs', async () => {
      mockHasEmployees(2)
      renderWithProviders(<EmployerDashboard profile={profile} />)
      await waitFor(() => {
        expect(screen.getByTestId('today-planning-widget')).toBeInTheDocument()
        expect(screen.getByTestId('compliance-widget')).toBeInTheDocument()
      })
      expect(screen.queryByText('Ajoutez votre premier auxiliaire')).not.toBeInTheDocument()
    })
  })
})
