/**
 * Hook pour les paramètres de convention collective.
 * Wrapper autour du store Zustand (qui persiste localStorage + Supabase).
 */

import { useEffect } from 'react'
import { useConventionSettingsStore, subscribeSyncToDb } from '@/stores/conventionSettingsStore'
import { useAuthStore } from '@/stores/authStore'
import type { ConventionSettings } from '@/services/conventionSettingsService'

export function useConventionSettings() {
  const profile = useAuthStore(s => s.profile)
  const profileId = profile?.id

  const store = useConventionSettingsStore()

  // Charger depuis la DB au premier mount si connecté
  useEffect(() => {
    if (profileId && !store.isSynced && !store.isLoading) {
      store.loadFromDb(profileId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  // Auto-save debounced vers la DB
  useEffect(() => {
    if (!profileId) return
    const unsub = subscribeSyncToDb(profileId)
    return () => { unsub?.() }
  }, [profileId])

  return {
    // État
    ruleBreak: store.ruleBreak,
    ruleDailyMax: store.ruleDailyMax,
    ruleOvertime: store.ruleOvertime,
    ruleNight: store.ruleNight,
    majDimanche: store.majDimanche,
    majFerie: store.majFerie,
    majNuit: store.majNuit,
    majSupp: store.majSupp,
    isLoading: store.isLoading,

    // Actions
    updateSettings: (patch: Partial<ConventionSettings>) => store.updateSettings(patch),
    resetToDefaults: store.resetToDefaults,
  }
}
