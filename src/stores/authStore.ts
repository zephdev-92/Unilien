import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, UserRole, AccessibilitySettings } from '@/types'

interface AuthState {
  // État
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (isLoading: boolean) => void
  setInitialized: (isInitialized: boolean) => void
  setError: (error: string | null) => void
  reset: () => void

  // Computed
  isAuthenticated: () => boolean
  getUserRole: () => UserRole | null
}

const initialState = {
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  error: null,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user }),

      setSession: (session) => set({ session }),

      setProfile: (profile) => set({ profile }),

      setLoading: (isLoading) => set({ isLoading }),

      setInitialized: (isInitialized) => set({ isInitialized }),

      setError: (error) => set({ error }),

      reset: () => set(initialState),

      isAuthenticated: () => {
        const state = get()
        return !!state.user && !!state.session
      },

      getUserRole: () => {
        const state = get()
        return state.profile?.role ?? null
      },
    }),
    {
      name: 'unilien-auth',
      storage: createJSONStorage(() => localStorage),
      // Ne persister que certaines données
      partialize: (state) => ({
        profile: state.profile,
      }),
    }
  )
)

// Store séparé pour les paramètres d'accessibilité (persistés localement)
interface AccessibilityState {
  settings: AccessibilitySettings
  updateSettings: (settings: Partial<AccessibilitySettings>) => void
  resetSettings: () => void
}

const defaultAccessibilitySettings: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  textScale: 120,
  reducedMotion: false,
  screenReaderOptimized: false,
  voiceControlEnabled: false,
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      settings: defaultAccessibilitySettings,

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      resetSettings: () => set({ settings: defaultAccessibilitySettings }),
    }),
    {
      name: 'unilien-accessibility',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useAuthStore
