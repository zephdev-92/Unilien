/**
 * Hook pour les préférences d'intervention.
 * Wrapper autour du store Zustand (qui persiste localStorage + Supabase).
 *
 * Les fonctions standalone (loadDefaultTasks, etc.) restent disponibles
 * pour les composants qui n'ont pas besoin de réactivité (ex: TaskSelector prefill).
 */

import { useEffect } from 'react'
import { useInterventionSettingsStore, subscribeSyncToDb } from '@/stores/interventionSettingsStore'
import { useAuthStore } from '@/stores/authStore'
import type { ShoppingItem } from '@/lib/constants/taskDefaults'

// ── Fonctions standalone (lecture seule, pas réactive) ──

/** Charge les tâches habituelles cochées */
export function loadDefaultTasks(): string[] {
  return useInterventionSettingsStore.getState().defaultTasks
}

/** Charge les tâches personnalisées */
export function loadCustomTasks(): string[] {
  return useInterventionSettingsStore.getState().customTasks
}

/** Charge la liste de courses */
export function loadShoppingList(): ShoppingItem[] {
  return useInterventionSettingsStore.getState().shoppingList
}

// ── Hook réactif ──

export function useInterventionSettings() {
  const profile = useAuthStore(s => s.profile)
  const profileId = profile?.id

  const store = useInterventionSettingsStore()

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
    defaultTasks: store.defaultTasks,
    customTasks: store.customTasks,
    shoppingList: store.shoppingList,
    isLoading: store.isLoading,
    articleSuggestions: store.articleSuggestions,

    saveDefaultTasks: store.setDefaultTasks,
    saveCustomTasks: (tasks: string[]) => {
      // Replace all custom tasks
      const current = useInterventionSettingsStore.getState().customTasks
      // Clear then set
      for (const t of current) store.removeCustomTask(t)
      for (const t of tasks) store.addCustomTask(t)
    },
    addCustomTask: store.addCustomTask,
    removeCustomTask: store.removeCustomTask,

    addShoppingItem: store.addShoppingItem,
    removeShoppingItem: (item: ShoppingItem) => {
      store.removeShoppingItem(item.name, item.brand)
    },
    updateShoppingItem: store.updateShoppingItem,

    searchArticles: (query: string) => {
      if (profileId) store.searchArticles(profileId, query)
    },
    trackArticle: (name: string, brand: string) => {
      if (profileId) store.trackArticle(profileId, name, brand)
    },
  }
}
