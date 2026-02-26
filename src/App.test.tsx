import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import App from './App'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/stores/authStore', () => ({
  useAccessibilityStore: () => ({
    settings: {
      highContrast: false,
      reducedMotion: false,
      screenReaderOptimized: false,
      largeText: false,
      textScale: 100,
    },
  }),
}))

// Formulaires auth (imports statiques)
vi.mock('@/components/auth', () => ({
  LoginForm: () => <div data-testid="login-form">Login</div>,
  SignupForm: () => <div data-testid="signup-form">Signup</div>,
  ForgotPasswordForm: () => <div data-testid="forgot-password-form">ForgotPassword</div>,
  ResetPasswordForm: () => <div data-testid="reset-password-form">ResetPassword</div>,
}))

// Pages lazy-loaded
vi.mock('@/pages/HomePage', () => ({ default: () => <div data-testid="home-page">Home</div> }))
vi.mock('@/pages/ContactPage', () => ({ default: () => <div data-testid="contact-page">Contact</div> }))
vi.mock('@/components/dashboard/Dashboard', () => ({ default: () => <div data-testid="dashboard">Dashboard</div> }))
vi.mock('@/components/profile/ProfilePage', () => ({ default: () => <div data-testid="profile-page">Profile</div> }))
vi.mock('@/components/planning/PlanningPage', () => ({ default: () => <div data-testid="planning-page">Planning</div> }))
vi.mock('@/components/logbook/LogbookPage', () => ({ default: () => <div data-testid="logbook-page">Logbook</div> }))
vi.mock('@/components/liaison/LiaisonPage', () => ({ default: () => <div data-testid="liaison-page">Liaison</div> }))
vi.mock('@/components/team/TeamPage', () => ({ default: () => <div data-testid="team-page">Team</div> }))
vi.mock('@/components/clock-in/ClockInPage', () => ({ default: () => <div data-testid="clock-in-page">ClockIn</div> }))
vi.mock('@/pages/CompliancePage', () => ({ default: () => <div data-testid="compliance-page">Compliance</div> }))
vi.mock('@/pages/DocumentsPage', () => ({ default: () => <div data-testid="documents-page">Documents</div> }))

// ── Helper ─────────────────────────────────────────────────────────────────────

function renderApp(initialPath = '/') {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </ChakraProvider>
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('App', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      userRole: null,
    })
  })

  describe('LoadingPage', () => {
    it('affiche "Chargement..." quand auth non initialisée', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        isInitialized: false,
        userRole: null,
      })
      renderApp('/login')
      expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('affiche "Chargement..." sur une route protégée si auth en cours', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        isInitialized: false,
        userRole: null,
      })
      renderApp('/dashboard')
      expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })
  })

  describe('PublicRoute', () => {
    it('affiche le formulaire de login quand non connecté', () => {
      renderApp('/login')
      expect(screen.getByTestId('login-form')).toBeInTheDocument()
    })

    it('redirige vers /dashboard si déjà connecté (depuis /login)', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        userRole: 'employer',
      })
      renderApp('/login')
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      })
    })

    it('affiche /signup pour un utilisateur non connecté', () => {
      renderApp('/signup')
      expect(screen.getByTestId('signup-form')).toBeInTheDocument()
    })

    it('affiche /forgot-password pour un utilisateur non connecté', () => {
      renderApp('/forgot-password')
      expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument()
    })
  })

  describe('ProtectedRoute', () => {
    it('redirige vers /login si non connecté (depuis /dashboard)', () => {
      renderApp('/dashboard')
      expect(screen.getByTestId('login-form')).toBeInTheDocument()
    })

    it('affiche /dashboard pour un utilisateur connecté', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        userRole: 'employer',
      })
      renderApp('/dashboard')
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      })
    })

    it('redirige vers /dashboard si le rôle n\'est pas autorisé (/clock-in pour employer)', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        userRole: 'employer',
      })
      renderApp('/clock-in')
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      })
    })

    it('affiche /clock-in pour un employé', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        userRole: 'employee',
      })
      renderApp('/clock-in')
      await waitFor(() => {
        expect(screen.getByTestId('clock-in-page')).toBeInTheDocument()
      })
    })

    it('affiche /team pour employer', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        userRole: 'employer',
      })
      renderApp('/team')
      await waitFor(() => {
        expect(screen.getByTestId('team-page')).toBeInTheDocument()
      })
    })
  })

  describe('Routes publiques', () => {
    it('affiche la HomePage sur "/"', async () => {
      renderApp('/')
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument()
      })
    })

    it('affiche /reset-password sans PublicRoute', () => {
      renderApp('/reset-password')
      expect(screen.getByTestId('reset-password-form')).toBeInTheDocument()
    })

    it('redirige les routes inconnues vers "/"', async () => {
      renderApp('/route-inconnue')
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument()
      })
    })
  })
})
