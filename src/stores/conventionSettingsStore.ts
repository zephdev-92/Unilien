/**
 * Store Zustand pour les paramètres de convention collective.
 * Double persistance : localStorage (immédiat) + Supabase (debounced).
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  getConventionSettings,
  upsertConventionSettings,
  CONVENTION_DEFAULTS,
} from '@/services/conventionSettingsService'
import type { ConventionSettings } from '@/services/conventionSettingsService'
import { logger } from '@/lib/logger'

interface ConventionSettingsState extends ConventionSettings {
  isLoading: boolean
  isSynced: boolean

  updateSettings: (patch: Partial<ConventionSettings>) => void
  resetToDefaults: () => void

  loadFromDb: (profileId: string) => Promise<void>
  saveToDb: (profileId: string) => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSave(profileId: string, state: ConventionSettingsState) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    state.saveToDb(profileId)
  }, 1500)
}

export const useConventionSettingsStore = create<ConventionSettingsState>()(
  persist(
    (set, get) => ({
      ...CONVENTION_DEFAULTS,
      isLoading: false,
      isSynced: false,

      updateSettings: (patch) => {
        set((prev) => ({ ...prev, ...patch }))
      },

      resetToDefaults: () => {
        set({ ...CONVENTION_DEFAULTS })
      },

      loadFromDb: async (profileId) => {
        set({ isLoading: true })
        try {
          const settings = await getConventionSettings(profileId)
          set({ ...settings, isSynced: true })
        } catch (err) {
          logger.error('Erreur chargement convention settings depuis DB:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      saveToDb: async (profileId) => {
        const { ruleBreak, ruleDailyMax, ruleOvertime, ruleNight, majDimanche, majFerie, majNuit, majSupp } = get()
        try {
          await upsertConventionSettings(profileId, {
            ruleBreak, ruleDailyMax, ruleOvertime, ruleNight,
            majDimanche, majFerie, majNuit, majSupp,
          })
          set({ isSynced: true })
        } catch (err) {
          logger.error('Erreur sauvegarde convention settings vers DB:', err)
          set({ isSynced: false })
        }
      },
    }),
    {
      name: 'unilien-convention-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ruleBreak: state.ruleBreak,
        ruleDailyMax: state.ruleDailyMax,
        ruleOvertime: state.ruleOvertime,
        ruleNight: state.ruleNight,
        majDimanche: state.majDimanche,
        majFerie: state.majFerie,
        majNuit: state.majNuit,
        majSupp: state.majSupp,
      }),
    },
  ),
)

/** Helper : sauvegarde debounced vers la DB après chaque changement */
export function subscribeSyncToDb(profileId: string | undefined) {
  const store = useConventionSettingsStore
  if (!profileId) return

  return store.subscribe((state, prevState) => {
    const changed =
      state.ruleBreak !== prevState.ruleBreak ||
      state.ruleDailyMax !== prevState.ruleDailyMax ||
      state.ruleOvertime !== prevState.ruleOvertime ||
      state.ruleNight !== prevState.ruleNight ||
      state.majDimanche !== prevState.majDimanche ||
      state.majFerie !== prevState.majFerie ||
      state.majNuit !== prevState.majNuit ||
      state.majSupp !== prevState.majSupp
    if (changed && profileId) {
      debouncedSave(profileId, state)
    }
  })
}
