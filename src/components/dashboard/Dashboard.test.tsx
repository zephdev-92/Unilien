import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'

// ─── Mocks sous-composants lourds ────────────────────────────────────────────

vi.mock('@/components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({
    children,
    title,
  }: {
    children: React.ReactNode
    title: string
  }) => (
    <div data-testid="dashboard-layout" data-title={title}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/dashboard/EmployerDashboard', () => ({
  EmployerDashboard: () => <div data-testid="employer-dashboard" />,
}))

vi.mock('@/components/dashboard/EmployeeDashboard', () => ({
  EmployeeDashboard: () => <div data-testid="employee-dashboard" />,
}))

vi.mock('@/components/dashboard/CaregiverDashboard', () => ({
  CaregiverDashboard: () => <div data-testid="caregiver-dashboard" />,
}))

vi.mock('@/components/notifications', () => ({
  PushPermissionBanner: () => <div data-testid="push-permission-banner" />,
}))

vi.mock('@/hooks/useShiftReminders', () => ({
  useShiftReminders: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

// ─── Imports après mocks ──────────────────────────────────────────────────────

import { useAuth } from '@/hooks/useAuth'
import { Dashboard } from './Dashboard'

const mockUseAuth = vi.mocked(useAuth)

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Profil non chargé', () => {
    it('affiche le spinner de chargement si profile est null', () => {
      mockUseAuth.mockReturnValue({
        profile: null,
        userRole: null,
        isInitialized: false,
        user: null,
        session: null,
        isLoading: true,
        signIn: vi.fn(),
        signOut: vi.fn(),
        updateProfile: vi.fn(),
      })

      renderWithProviders(<Dashboard />)

      expect(screen.getByText(/chargement du profil/i)).toBeInTheDocument()
      const spinner = document.querySelector('.chakra-spinner')
      expect(spinner).not.toBeNull()
    })

    it('rend le DashboardLayout avec le titre "Tableau de bord" même sans profil', () => {
      mockUseAuth.mockReturnValue({
        profile: null,
        userRole: null,
        isInitialized: false,
        user: null,
        session: null,
        isLoading: true,
        signIn: vi.fn(),
        signOut: vi.fn(),
        updateProfile: vi.fn(),
      })

      renderWithProviders(<Dashboard />)

      expect(screen.getByTestId('dashboard-layout')).toHaveAttribute(
        'data-title',
        'Tableau de bord'
      )
    })
  })

  describe('Rôle employer', () => {
    it('affiche EmployerDashboard pour un profil employer', async () => {
      const profile = createMockProfile({ role: 'employer' })
      mockUseAuth.mockReturnValue({
        profile,
        userRole: 'employer',
        isInitialized: true,
        user: null,
        session: null,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        updateProfile: vi.fn(),
      })

      renderWithProviders(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('employer-dashboard')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('employee-dashboard')).not.toBeInTheDocument()
      expect(screen.queryByTestId('caregiver-dashboard')).not.toBeInTheDocument()
    })
  })

  describe('Rôle employee', () => {
    it('affiche EmployeeDashboard pour un profil employee', async () => {
      const profile = createMockProfile({ role: 'employee' })
      mockUseAuth.mockReturnValue({
        profile,
        userRole: 'employee',
        isInitialized: true,
        user: null,
        session: null,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        updateProfile: vi.fn(),
      })

      renderWithProviders(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('employee-dashboard')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('employer-dashboard')).not.toBeInTheDocument()
      expect(screen.queryByTestId('caregiver-dashboard')).not.toBeInTheDocument()
    })
  })

  describe('Rôle caregiver', () => {
    it('affiche CaregiverDashboard pour un profil caregiver', async () => {
      const profile = createMockProfile({ role: 'caregiver' })
      mockUseAuth.mockReturnValue({
        profile,
        userRole: 'caregiver',
        isInitialized: true,
        user: null,
        session: null,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        updateProfile: vi.fn(),
      })

      renderWithProviders(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('caregiver-dashboard')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('employer-dashboard')).not.toBeInTheDocument()
      expect(screen.queryByTestId('employee-dashboard')).not.toBeInTheDocument()
    })
  })

  describe('PushPermissionBanner', () => {
    it('affiche le PushPermissionBanner quand le profil est chargé', async () => {
      const profile = createMockProfile({ role: 'employer' })
      mockUseAuth.mockReturnValue({
        profile,
        userRole: 'employer',
        isInitialized: true,
        user: null,
        session: null,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        updateProfile: vi.fn(),
      })

      renderWithProviders(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('push-permission-banner')).toBeInTheDocument()
      })
    })
  })
})
