/**
 * Store Zustand pour les préférences d'intervention.
 * Double persistance : localStorage (immédiat) + Supabase (debounced).
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ShoppingItem } from '@/lib/constants/taskDefaults'
import {
  getInterventionSettings,
  upsertInterventionSettings,
  searchArticleHistory,
  trackArticleUsage,
} from '@/services/interventionSettingsService'
import type { ArticleSuggestion } from '@/services/interventionSettingsService'
import { logger } from '@/lib/logger'

interface InterventionSettingsState {
  // État
  defaultTasks: string[]
  customTasks: string[]
  shoppingList: ShoppingItem[]
  isLoading: boolean
  isSynced: boolean
  articleSuggestions: ArticleSuggestion[]

  // Actions — tâches
  setDefaultTasks: (tasks: string[]) => void
  addCustomTask: (task: string) => void
  removeCustomTask: (task: string) => void

  // Actions — shopping
  setShoppingList: (items: ShoppingItem[]) => void
  addShoppingItem: (item: ShoppingItem) => void
  removeShoppingItem: (name: string, brand: string) => void
  updateShoppingItem: (name: string, brand: string, updates: Partial<ShoppingItem>) => void

  // Sync DB
  loadFromDb: (profileId: string) => Promise<void>
  saveToDb: (profileId: string) => Promise<void>

  // Autocomplete
  searchArticles: (profileId: string, query: string) => Promise<void>
  trackArticle: (profileId: string, name: string, brand: string) => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSave(profileId: string, state: InterventionSettingsState) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    state.saveToDb(profileId)
  }, 1500)
}

export const useInterventionSettingsStore = create<InterventionSettingsState>()(
  persist(
    (set, get) => ({
      defaultTasks: [],
      customTasks: [],
      shoppingList: [],
      isLoading: false,
      isSynced: false,
      articleSuggestions: [],

      // ── Tâches ──

      setDefaultTasks: (tasks) => {
        set({ defaultTasks: tasks })
      },

      addCustomTask: (task) => {
        const trimmed = task.trim()
        if (!trimmed) return
        const { customTasks } = get()
        if (customTasks.includes(trimmed)) return
        set({ customTasks: [...customTasks, trimmed] })
      },

      removeCustomTask: (task) => {
        set({ customTasks: get().customTasks.filter(t => t !== task) })
      },

      // ── Shopping ──

      setShoppingList: (items) => {
        set({ shoppingList: items })
      },

      addShoppingItem: (item) => {
        if (!item.name.trim()) return
        const { shoppingList } = get()
        if (shoppingList.some(i => i.name === item.name && i.brand === item.brand)) return
        set({
          shoppingList: [...shoppingList, {
            name: item.name.trim(),
            brand: item.brand.trim(),
            quantity: item.quantity ?? 1,
            note: item.note ?? '',
          }],
        })
      },

      removeShoppingItem: (name, brand) => {
        set({
          shoppingList: get().shoppingList.filter(
            i => !(i.name === name && i.brand === brand),
          ),
        })
      },

      updateShoppingItem: (name, brand, updates) => {
        set({
          shoppingList: get().shoppingList.map(i =>
            i.name === name && i.brand === brand ? { ...i, ...updates } : i,
          ),
        })
      },

      // ── Sync DB ──

      loadFromDb: async (profileId) => {
        set({ isLoading: true })
        try {
          const settings = await getInterventionSettings(profileId)
          set({
            defaultTasks: settings.defaultTasks,
            customTasks: settings.customTasks,
            shoppingList: settings.shoppingList,
            isSynced: true,
          })
        } catch (err) {
          logger.error('Erreur chargement intervention settings depuis DB:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      saveToDb: async (profileId) => {
        const { defaultTasks, customTasks, shoppingList } = get()
        try {
          await upsertInterventionSettings(profileId, {
            defaultTasks,
            customTasks,
            shoppingList,
          })
          set({ isSynced: true })
        } catch (err) {
          logger.error('Erreur sauvegarde intervention settings vers DB:', err)
          set({ isSynced: false })
        }
      },

      // ── Autocomplete ──

      searchArticles: async (profileId, query) => {
        if (!query.trim()) {
          set({ articleSuggestions: [] })
          return
        }
        try {
          const suggestions = await searchArticleHistory(profileId, query)
          set({ articleSuggestions: suggestions })
        } catch (err) {
          logger.error('Erreur recherche articles:', err)
        }
      },

      trackArticle: async (profileId, name, brand) => {
        try {
          await trackArticleUsage(profileId, name, brand)
        } catch (err) {
          logger.error('Erreur tracking article:', err)
        }
      },
    }),
    {
      name: 'unilien-intervention-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        defaultTasks: state.defaultTasks,
        customTasks: state.customTasks,
        shoppingList: state.shoppingList,
      }),
    },
  ),
)

/** Helper : sauvegarde debounced vers la DB après chaque changement */
export function subscribeSyncToDb(profileId: string | undefined) {
  const store = useInterventionSettingsStore
  if (!profileId) return

  // Subscribe aux changements pour auto-save
  return store.subscribe((state, prevState) => {
    const changed =
      state.defaultTasks !== prevState.defaultTasks ||
      state.customTasks !== prevState.customTasks ||
      state.shoppingList !== prevState.shoppingList
    if (changed && profileId) {
      debouncedSave(profileId, state)
    }
  })
}
