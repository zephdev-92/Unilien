/**
 * Hook pour les préférences de confidentialité (analytics).
 * Wrapper autour du store Zustand (persistance localStorage + Supabase).
 */

import { useEffect } from 'react'
import { usePrivacySettingsStore, subscribeSyncToDb } from '@/stores/privacySettingsStore'
import { useAuthStore } from '@/stores/authStore'
import type { PrivacySettings } from '@/services/privacySettingsService'

export function usePrivacySettings() {
  const profile = useAuthStore((s) => s.profile)
  const profileId = profile?.id

  const store = usePrivacySettingsStore()

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
    return () => {
      unsub?.()
    }
  }, [profileId])

  return {
    analyticsEnabled: store.analyticsEnabled,
    isLoading: store.isLoading,

    updateSettings: (patch: Partial<PrivacySettings>) => store.updateSettings(patch),
    resetToDefaults: store.resetToDefaults,
  }
}
