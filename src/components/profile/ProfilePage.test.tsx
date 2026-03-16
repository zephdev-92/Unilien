import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'

// --- Mocks sous-composants lourds ---

vi.mock('@/components/dashboard', () => ({
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

vi.mock('@/components/profile/sections', () => ({
  PersonalInfoSection: () => <div data-testid="personal-info-section" />,
  AccessibilitySection: () => <div data-testid="accessibility-section" />,
  EmployerSection: () => <div data-testid="employer-section" />,
  EmployeeSection: () => <div data-testid="employee-section" />,
  CaregiverSection: () => <div data-testid="caregiver-section" />,
}))

vi.mock('@/components/profile/ProfileHero', () => ({
  ProfileHero: ({ profile }: { profile: { firstName: string; lastName: string } }) => (
    <div data-testid="profile-hero">{profile.firstName} {profile.lastName}</div>
  ),
}))

vi.mock('@/components/profile/ProfileJumpNav', () => ({
  ProfileJumpNav: ({ items }: { items: { label: string }[] }) => (
    <nav data-testid="profile-jump-nav">
      {items.map((item) => (
        <span key={item.label}>{item.label}</span>
      ))}
    </nav>
  ),
}))

vi.mock('@/components/profile/ProfileViewList', () => ({
  ProfileViewList: () => <div data-testid="profile-view-list" />,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (state: { setProfile: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ setProfile: vi.fn() })
  ),
}))

vi.mock('@/services/profileService', () => ({
  updateProfile: vi.fn(),
  getEmployer: vi.fn(),
  upsertEmployer: vi.fn(),
  getEmployee: vi.fn(),
  upsertEmployee: vi.fn(),
}))

// --- Imports apres mocks ---

import { useAuth } from '@/hooks/useAuth'
import { getEmployer, getEmployee } from '@/services/profileService'
import { ProfilePage } from './ProfilePage'

const mockUseAuth = vi.mocked(useAuth)

// --- Tests ---

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getEmployer).mockResolvedValue(null)
    vi.mocked(getEmployee).mockResolvedValue(null)
  })

  describe('Profil null', () => {
    it('affiche "Profil incomplet" si profile est null', () => {
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

      renderWithProviders(<ProfilePage />)

      expect(screen.getByText('Profil incomplet')).toBeInTheDocument()
    })

    it('affiche le DashboardLayout avec le titre "Mon profil"', () => {
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

      renderWithProviders(<ProfilePage />)

      expect(screen.getByTestId('dashboard-layout')).toHaveAttribute(
        'data-title',
        'Mon profil'
      )
    })
  })

  describe('Profil employeur', () => {
    it('affiche le hero, la jump nav avec sections employeur', async () => {
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

      renderWithProviders(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByTestId('profile-hero')).toBeInTheDocument()
        expect(screen.getByTestId('profile-jump-nav')).toBeInTheDocument()
        // "Mon profil" apparait dans la jump nav + SectionTitle
        expect(screen.getAllByText('Mon profil').length).toBeGreaterThanOrEqual(1)
        // "Ma situation" apparait dans la jump nav + SectionTitle
        expect(screen.getAllByText('Ma situation').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText("Contacts d'urgence").length).toBeGreaterThanOrEqual(1)
      })
    })

    it('affiche les informations personnelles en mode lecture par defaut', async () => {
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

      renderWithProviders(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Informations personnelles')).toBeInTheDocument()
      })
    })

    it('appelle getEmployer avec le profileId au montage', async () => {
      const profile = createMockProfile({ id: 'test-employer-id', role: 'employer' })
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

      renderWithProviders(<ProfilePage />)

      await waitFor(() => {
        expect(getEmployer).toHaveBeenCalledWith('test-employer-id')
      })
    })
  })

  describe('Profil employee', () => {
    it('affiche la jump nav avec section Mon metier', async () => {
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

      renderWithProviders(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getAllByText('Mon métier').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('n\'affiche pas la section Ma situation pour un employee', async () => {
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

      renderWithProviders(<ProfilePage />)

      await waitFor(() => {
        expect(screen.queryByText('Ma situation')).not.toBeInTheDocument()
      })
    })

    it('appelle getEmployee avec le profileId au montage', async () => {
      const profile = createMockProfile({ id: 'test-employee-id', role: 'employee' })
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

      renderWithProviders(<ProfilePage />)

      await waitFor(() => {
        expect(getEmployee).toHaveBeenCalledWith('test-employee-id')
      })
    })
  })

  describe('Profil caregiver', () => {
    it('affiche la jump nav avec section Mon profil aidant', async () => {
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

      renderWithProviders(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getAllByText('Mon profil aidant').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('n\'appelle ni getEmployer ni getEmployee pour un caregiver', async () => {
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

      renderWithProviders(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getAllByText('Mon profil aidant').length).toBeGreaterThanOrEqual(1)
      })

      expect(getEmployer).not.toHaveBeenCalled()
      expect(getEmployee).not.toHaveBeenCalled()
    })
  })
})
