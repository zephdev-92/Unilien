import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore, useAccessibilityStore } from './authStore'
import type { Profile } from '@/types'
import type { User, Session } from '@supabase/supabase-js'

// Helper pour créer un utilisateur mock
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as User
}

// Helper pour créer une session mock
function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides,
  } as Session
}

// Helper pour créer un profil mock
function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-123',
    role: 'employer',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'test@example.com',
    phone: '0612345678',
    avatarUrl: undefined,
    accessibilitySettings: {
      highContrast: false,
      textScale: 100,
      reducedMotion: false,
      screenReaderOptimized: false,
      voiceControlEnabled: false,
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

describe('useAuthStore', () => {
  beforeEach(() => {
    // Réinitialiser le store avant chaque test
    useAuthStore.getState().reset()
  })

  describe('État initial', () => {
    it('devrait avoir un état initial correct', () => {
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
      expect(state.profile).toBeNull()
      expect(state.isLoading).toBe(true)
      expect(state.isInitialized).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('setUser', () => {
    it('devrait définir l\'utilisateur', () => {
      const mockUser = createMockUser()

      useAuthStore.getState().setUser(mockUser)

      expect(useAuthStore.getState().user).toEqual(mockUser)
    })

    it('devrait permettre de réinitialiser l\'utilisateur à null', () => {
      const mockUser = createMockUser()
      useAuthStore.getState().setUser(mockUser)

      useAuthStore.getState().setUser(null)

      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('setSession', () => {
    it('devrait définir la session', () => {
      const mockSession = createMockSession()

      useAuthStore.getState().setSession(mockSession)

      expect(useAuthStore.getState().session).toEqual(mockSession)
    })

    it('devrait permettre de réinitialiser la session à null', () => {
      const mockSession = createMockSession()
      useAuthStore.getState().setSession(mockSession)

      useAuthStore.getState().setSession(null)

      expect(useAuthStore.getState().session).toBeNull()
    })
  })

  describe('setProfile', () => {
    it('devrait définir le profil', () => {
      const mockProfile = createMockProfile()

      useAuthStore.getState().setProfile(mockProfile)

      expect(useAuthStore.getState().profile).toEqual(mockProfile)
    })

    it('devrait conserver tous les champs du profil', () => {
      const mockProfile = createMockProfile({
        role: 'employee',
        firstName: 'Marie',
        lastName: 'Martin',
        phone: '0698765432',
      })

      useAuthStore.getState().setProfile(mockProfile)

      const profile = useAuthStore.getState().profile
      expect(profile?.role).toBe('employee')
      expect(profile?.firstName).toBe('Marie')
      expect(profile?.lastName).toBe('Martin')
      expect(profile?.phone).toBe('0698765432')
    })
  })

  describe('setLoading', () => {
    it('devrait définir l\'état de chargement à true', () => {
      useAuthStore.getState().setLoading(false)
      useAuthStore.getState().setLoading(true)

      expect(useAuthStore.getState().isLoading).toBe(true)
    })

    it('devrait définir l\'état de chargement à false', () => {
      useAuthStore.getState().setLoading(false)

      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('setInitialized', () => {
    it('devrait définir l\'état d\'initialisation', () => {
      useAuthStore.getState().setInitialized(true)

      expect(useAuthStore.getState().isInitialized).toBe(true)
    })
  })

  describe('setError', () => {
    it('devrait définir un message d\'erreur', () => {
      useAuthStore.getState().setError('Erreur de connexion')

      expect(useAuthStore.getState().error).toBe('Erreur de connexion')
    })

    it('devrait permettre de réinitialiser l\'erreur à null', () => {
      useAuthStore.getState().setError('Erreur')
      useAuthStore.getState().setError(null)

      expect(useAuthStore.getState().error).toBeNull()
    })
  })

  describe('reset', () => {
    it('devrait réinitialiser tout l\'état', () => {
      // Remplir le store avec des données
      useAuthStore.getState().setUser(createMockUser())
      useAuthStore.getState().setSession(createMockSession())
      useAuthStore.getState().setProfile(createMockProfile())
      useAuthStore.getState().setLoading(false)
      useAuthStore.getState().setInitialized(true)
      useAuthStore.getState().setError('Une erreur')

      // Reset
      useAuthStore.getState().reset()

      // Vérifier l'état initial
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
      expect(state.profile).toBeNull()
      expect(state.isLoading).toBe(true)
      expect(state.isInitialized).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('devrait retourner false sans utilisateur ni session', () => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false)
    })

    it('devrait retourner false avec uniquement un utilisateur', () => {
      useAuthStore.getState().setUser(createMockUser())

      expect(useAuthStore.getState().isAuthenticated()).toBe(false)
    })

    it('devrait retourner false avec uniquement une session', () => {
      useAuthStore.getState().setSession(createMockSession())

      expect(useAuthStore.getState().isAuthenticated()).toBe(false)
    })

    it('devrait retourner true avec utilisateur ET session', () => {
      useAuthStore.getState().setUser(createMockUser())
      useAuthStore.getState().setSession(createMockSession())

      expect(useAuthStore.getState().isAuthenticated()).toBe(true)
    })
  })

  describe('getUserRole', () => {
    it('devrait retourner null sans profil', () => {
      expect(useAuthStore.getState().getUserRole()).toBeNull()
    })

    it('devrait retourner le rôle employer', () => {
      useAuthStore.getState().setProfile(createMockProfile({ role: 'employer' }))

      expect(useAuthStore.getState().getUserRole()).toBe('employer')
    })

    it('devrait retourner le rôle employee', () => {
      useAuthStore.getState().setProfile(createMockProfile({ role: 'employee' }))

      expect(useAuthStore.getState().getUserRole()).toBe('employee')
    })

    it('devrait retourner le rôle caregiver', () => {
      useAuthStore.getState().setProfile(createMockProfile({ role: 'caregiver' }))

      expect(useAuthStore.getState().getUserRole()).toBe('caregiver')
    })
  })
})

describe('useAccessibilityStore', () => {
  beforeEach(() => {
    useAccessibilityStore.getState().resetSettings()
  })

  describe('État initial', () => {
    it('devrait avoir des paramètres par défaut', () => {
      const { settings } = useAccessibilityStore.getState()

      expect(settings.highContrast).toBe(false)
      expect(settings.textScale).toBe(100)
      expect(settings.reducedMotion).toBe(false)
      expect(settings.screenReaderOptimized).toBe(false)
      expect(settings.voiceControlEnabled).toBe(false)
    })
  })

  describe('updateSettings', () => {
    it('devrait mettre à jour un seul paramètre', () => {
      useAccessibilityStore.getState().updateSettings({ highContrast: true })

      const { settings } = useAccessibilityStore.getState()
      expect(settings.highContrast).toBe(true)
      expect(settings.textScale).toBe(100)
    })

    it('devrait mettre à jour plusieurs paramètres', () => {
      useAccessibilityStore.getState().updateSettings({
        highContrast: true,
        textScale: 120,
        reducedMotion: true,
      })

      const { settings } = useAccessibilityStore.getState()
      expect(settings.highContrast).toBe(true)
      expect(settings.textScale).toBe(120)
      expect(settings.reducedMotion).toBe(true)
      expect(settings.screenReaderOptimized).toBe(false)
    })

    it('devrait conserver les paramètres existants lors de la mise à jour', () => {
      useAccessibilityStore.getState().updateSettings({ highContrast: true })
      useAccessibilityStore.getState().updateSettings({ textScale: 115 })

      const { settings } = useAccessibilityStore.getState()
      expect(settings.highContrast).toBe(true)
      expect(settings.textScale).toBe(115)
    })
  })

  describe('resetSettings', () => {
    it('devrait réinitialiser tous les paramètres', () => {
      useAccessibilityStore.getState().updateSettings({
        highContrast: true,
        textScale: 125,
        reducedMotion: true,
        screenReaderOptimized: true,
        voiceControlEnabled: true,
      })

      useAccessibilityStore.getState().resetSettings()

      const { settings } = useAccessibilityStore.getState()
      expect(settings.highContrast).toBe(false)
      expect(settings.textScale).toBe(100)
      expect(settings.reducedMotion).toBe(false)
      expect(settings.screenReaderOptimized).toBe(false)
      expect(settings.voiceControlEnabled).toBe(false)
    })
  })
})
