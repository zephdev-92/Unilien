/**
 * Store Zustand pour les préférences de confidentialité.
 * Double persistance : localStorage (immédiat) + Supabase (debounced).
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  getPrivacySettings,
  upsertPrivacySettings,
  PRIVACY_DEFAULTS,
} from '@/services/privacySettingsService'
import type { PrivacySettings } from '@/services/privacySettingsService'
import { logger } from '@/lib/logger'

interface PrivacySettingsState extends PrivacySettings {
  isLoading: boolean
  isSynced: boolean

  updateSettings: (patch: Partial<PrivacySettings>) => void
  resetToDefaults: () => void

  loadFromDb: (profileId: string) => Promise<void>
  saveToDb: (profileId: string) => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSave(profileId: string, state: PrivacySettingsState) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    state.saveToDb(profileId)
  }, 1500)
}

export const usePrivacySettingsStore = create<PrivacySettingsState>()(
  persist(
    (set, get) => ({
      ...PRIVACY_DEFAULTS,
      isLoading: false,
      isSynced: false,

      updateSettings: (patch) => {
        set((prev) => ({ ...prev, ...patch }))
      },

      resetToDefaults: () => {
        set({ ...PRIVACY_DEFAULTS })
      },

      loadFromDb: async (profileId) => {
        set({ isLoading: true })
        try {
          const settings = await getPrivacySettings(profileId)
          set({ ...settings, isSynced: true })
        } catch (err) {
          logger.error('Erreur chargement privacy settings depuis DB:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      saveToDb: async (profileId) => {
        const { analyticsEnabled } = get()
        try {
          await upsertPrivacySettings(profileId, { analyticsEnabled })
          set({ isSynced: true })
        } catch (err) {
          logger.error('Erreur sauvegarde privacy settings vers DB:', err)
          set({ isSynced: false })
        }
      },
    }),
    {
      name: 'unilien-privacy-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        analyticsEnabled: state.analyticsEnabled,
      }),
    },
  ),
)

/** Helper : sauvegarde debounced vers la DB après chaque changement */
export function subscribeSyncToDb(profileId: string | undefined) {
  const store = usePrivacySettingsStore
  if (!profileId) return

  return store.subscribe((state, prevState) => {
    const changed = state.analyticsEnabled !== prevState.analyticsEnabled
    if (changed && profileId) {
      debouncedSave(profileId, state)
    }
  })
}
