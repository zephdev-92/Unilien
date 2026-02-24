import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'
import { useAuthStore } from '@/stores/authStore'
import type { Profile } from '@/types'
import type { User, Session } from '@supabase/supabase-js'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock Supabase client
const mockGetSession = vi.fn()
const mockSignUp = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signUp: (data: unknown) => mockSignUp(data),
      signInWithPassword: (data: unknown) => mockSignInWithPassword(data),
      signOut: () => mockSignOut(),
      resetPasswordForEmail: (email: string, options: unknown) =>
        mockResetPasswordForEmail(email, options),
      onAuthStateChange: (callback: unknown) => mockOnAuthStateChange(callback),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => mockSelect(),
        }),
      }),
      insert: (data: unknown) => mockInsert(data),
    }),
  },
}))

// Helpers pour créer des mocks
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {
      first_name: 'Jean',
      last_name: 'Dupont',
      role: 'employer',
    },
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as User
}

function createMockSession(user?: User): Session {
  return {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: user || createMockUser(),
  } as Session
}

function createMockProfileData() {
  return {
    id: 'user-123',
    role: 'employer',
    first_name: 'Jean',
    last_name: 'Dupont',
    email: 'test@example.com',
    phone: '0612345678',
    avatar_url: null,
    accessibility_settings: {},
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().reset()

    // Configuration par défaut des mocks
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
  })

  describe('État initial', () => {
    it('devrait retourner l\'état initial du store', () => {
      const { result } = renderHook(() => useAuth())

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.profile).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.userRole).toBeNull()
    })

    it('devrait exposer toutes les fonctions d\'authentification', () => {
      const { result } = renderHook(() => useAuth())

      expect(typeof result.current.signUp).toBe('function')
      expect(typeof result.current.signIn).toBe('function')
      expect(typeof result.current.signOut).toBe('function')
      expect(typeof result.current.resetPassword).toBe('function')
      expect(typeof result.current.initialize).toBe('function')
    })
  })

  describe('signUp', () => {
    it('devrait créer un compte avec succès', async () => {
      const mockUser = createMockUser()
      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth())

      let signUpResult: { success: boolean; user?: User; error?: string }
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Jean',
          lastName: 'Dupont',
          role: 'employer',
        })
      })

      expect(signUpResult!.success).toBe(true)
      expect(signUpResult!.user).toEqual(mockUser)
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'Jean',
            last_name: 'Dupont',
            role: 'employer',
          },
        },
      })
    })

    it('devrait gérer les erreurs d\'inscription', async () => {
      // Simuler une erreur Supabase réaliste (email déjà utilisé)
      const error = new Error('User already registered')
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error,
      })

      const { result } = renderHook(() => useAuth())

      let signUpResult: { success: boolean; error?: string }
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Jean',
          lastName: 'Dupont',
          role: 'employer',
        })
      })

      expect(signUpResult!.success).toBe(false)
      // Message traduit en français pour l'utilisateur
      expect(signUpResult!.error).toBe('Cette adresse email est déjà associée à un compte. Connectez-vous ou utilisez une autre adresse.')
    })

    it('devrait gérer le cas où l\'utilisateur n\'est pas retourné', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth())

      let signUpResult: { success: boolean; error?: string }
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Jean',
          lastName: 'Dupont',
          role: 'employer',
        })
      })

      expect(signUpResult!.success).toBe(false)
      // Message générique pour erreur inconnue
      expect(signUpResult!.error).toBe('Une erreur est survenue lors de l\'inscription. Veuillez réessayer.')
    })
  })

  describe('signIn', () => {
    it('devrait connecter l\'utilisateur avec succès et récupérer le profil', async () => {
      const mockUser = createMockUser()
      const mockSession = createMockSession(mockUser)
      const mockProfile = createMockProfileData()

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
      mockSelect.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      const { result } = renderHook(() => useAuth())

      let signInResult: { success: boolean; error?: string }
      await act(async () => {
        signInResult = await result.current.signIn({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(signInResult!.success).toBe(true)
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('devrait créer un profil si inexistant', async () => {
      const mockUser = createMockUser()
      const mockSession = createMockSession(mockUser)

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
      mockSelect.mockResolvedValue({
        data: null,
        error: null,
      })
      mockInsert.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.signIn({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(mockInsert).toHaveBeenCalled()
    })

    it('devrait gérer les erreurs de connexion', async () => {
      const error = new Error('Identifiants invalides')
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error,
      })

      const { result } = renderHook(() => useAuth())

      let signInResult: { success: boolean; error?: string }
      await act(async () => {
        signInResult = await result.current.signIn({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      })

      expect(signInResult!.success).toBe(false)
      expect(signInResult!.error).toBe('Identifiants invalides')
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('devrait gérer le cas sans session retournée', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: createMockUser(), session: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth())

      let signInResult: { success: boolean; error?: string }
      await act(async () => {
        signInResult = await result.current.signIn({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(signInResult!.success).toBe(false)
      expect(signInResult!.error).toBe('Erreur de connexion')
    })
  })

  describe('signOut', () => {
    it('devrait déconnecter l\'utilisateur', async () => {
      mockSignOut.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.signOut()
      })

      expect(mockSignOut).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('devrait réinitialiser le store après déconnexion', async () => {
      // Pré-remplir le store
      useAuthStore.getState().setUser(createMockUser())
      useAuthStore.getState().setSession(createMockSession())

      mockSignOut.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.signOut()
      })

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
    })
  })

  describe('resetPassword', () => {
    it('devrait envoyer un email de réinitialisation', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth())

      let resetResult: { success: boolean; error?: string }
      await act(async () => {
        resetResult = await result.current.resetPassword('test@example.com')
      })

      expect(resetResult!.success).toBe(true)
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/reset-password'),
        })
      )
    })

    it('devrait gérer les erreurs de réinitialisation', async () => {
      const error = new Error('Email non trouvé')
      mockResetPasswordForEmail.mockResolvedValue({
        error,
      })

      const { result } = renderHook(() => useAuth())

      let resetResult: { success: boolean; error?: string }
      await act(async () => {
        resetResult = await result.current.resetPassword('unknown@example.com')
      })

      expect(resetResult!.success).toBe(false)
      expect(resetResult!.error).toBe('Email non trouvé')
    })
  })

  describe('initialize', () => {
    it('devrait initialiser avec une session existante', async () => {
      const mockUser = createMockUser()
      const mockSession = createMockSession(mockUser)
      const mockProfile = createMockProfileData()

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      mockSelect.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      // Marquer comme non initialisé pour déclencher l'initialisation
      useAuthStore.getState().setInitialized(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      expect(useAuthStore.getState().user).not.toBeNull()
      expect(useAuthStore.getState().session).not.toBeNull()
    })

    it('devrait gérer l\'absence de session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      useAuthStore.getState().setInitialized(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('devrait gérer les erreurs de session', async () => {
      const error = new Error('Session expirée')
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error,
      })

      useAuthStore.getState().setInitialized(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      expect(result.current.error).toBe('Session expirée')
    })

    it('devrait créer un profil manquant lors de l\'initialisation', async () => {
      const mockUser = createMockUser()
      const mockSession = createMockSession(mockUser)

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      mockSelect.mockResolvedValue({
        data: null,
        error: null,
      })
      mockInsert.mockResolvedValue({ error: null })

      useAuthStore.getState().setInitialized(false)

      renderHook(() => useAuth())

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
      })
    })
  })

  describe('onAuthStateChange', () => {
    it('devrait s\'abonner aux changements d\'authentification', () => {
      renderHook(() => useAuth())

      expect(mockOnAuthStateChange).toHaveBeenCalled()
    })

    it('devrait se désabonner lors du démontage', () => {
      const mockUnsubscribe = vi.fn()
      mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      })

      const { unmount } = renderHook(() => useAuth())
      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('Computed values', () => {
    it('devrait calculer isAuthenticated correctement', () => {
      const { result, rerender } = renderHook(() => useAuth())

      expect(result.current.isAuthenticated).toBe(false)

      act(() => {
        useAuthStore.getState().setUser(createMockUser())
        useAuthStore.getState().setSession(createMockSession())
      })
      rerender()

      expect(result.current.isAuthenticated).toBe(true)
    })

    it('devrait retourner le rôle utilisateur depuis le profil', () => {
      const { result, rerender } = renderHook(() => useAuth())

      expect(result.current.userRole).toBeNull()

      act(() => {
        useAuthStore.getState().setProfile({
          id: 'user-123',
          role: 'employee',
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'test@example.com',
          accessibilitySettings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Profile)
      })
      rerender()

      expect(result.current.userRole).toBe('employee')
    })
  })
})
