/**
 * Hook React pour la gestion des modèles de listes de courses.
 *
 * Charge les templates de l'employeur connecté au mount, expose des mutations
 * (create / update / delete / setDefault) qui re-fetchent automatiquement.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  listShoppingListTemplates,
  createShoppingListTemplate,
  updateShoppingListTemplate,
  deleteShoppingListTemplate,
  setDefaultShoppingListTemplate,
  SHOPPING_LIST_TEMPLATES_LIMIT,
  type ShoppingListTemplate,
} from '@/services/shoppingListTemplateService'
import type { ShoppingItem } from '@/lib/constants/taskDefaults'
import { logger } from '@/lib/logger'

interface UseShoppingListTemplatesResult {
  templates: ShoppingListTemplate[]
  defaultTemplate: ShoppingListTemplate | null
  isLoading: boolean
  error: string | null
  /** True si l'employeur a déjà atteint la limite de 5 templates */
  isAtLimit: boolean
  /** Crée un template (refus si limite atteinte) */
  createTemplate: (input: { name: string; items?: ShoppingItem[]; isDefault?: boolean }) => Promise<ShoppingListTemplate | null>
  /** Met à jour le nom et/ou les items d'un template */
  updateTemplate: (id: string, patch: { name?: string; items?: ShoppingItem[] }) => Promise<boolean>
  /** Supprime un template (promotion auto du suivant si c'était le default) */
  deleteTemplate: (id: string) => Promise<boolean>
  /** Définit un template comme "par défaut" */
  setDefault: (id: string) => Promise<boolean>
  /** Force un re-fetch */
  refresh: () => Promise<void>
}

export function useShoppingListTemplates(): UseShoppingListTemplatesResult {
  const profileId = useAuthStore(s => s.profile?.id)
  const [templates, setTemplates] = useState<ShoppingListTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    if (!profileId) {
      setTemplates([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const data = await listShoppingListTemplates(profileId)
      setTemplates(data)
    } catch (e) {
      logger.error('Erreur chargement templates listes de courses:', e)
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  const createTemplate = useCallback(
    async (input: { name: string; items?: ShoppingItem[]; isDefault?: boolean }) => {
      if (!profileId) return null
      try {
        const created = await createShoppingListTemplate(profileId, input)
        await fetchTemplates()
        return created
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur lors de la création'
        setError(msg)
        return null
      }
    },
    [profileId, fetchTemplates],
  )

  const updateTemplate = useCallback(
    async (id: string, patch: { name?: string; items?: ShoppingItem[] }) => {
      try {
        await updateShoppingListTemplate(id, patch)
        await fetchTemplates()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur lors de la mise à jour')
        return false
      }
    },
    [fetchTemplates],
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      try {
        await deleteShoppingListTemplate(id)
        await fetchTemplates()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur lors de la suppression')
        return false
      }
    },
    [fetchTemplates],
  )

  const setDefault = useCallback(
    async (id: string) => {
      if (!profileId) return false
      try {
        await setDefaultShoppingListTemplate(id, profileId)
        await fetchTemplates()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur lors du changement de défaut')
        return false
      }
    },
    [profileId, fetchTemplates],
  )

  const defaultTemplate = templates.find(t => t.isDefault) ?? null
  const isAtLimit = templates.length >= SHOPPING_LIST_TEMPLATES_LIMIT

  return {
    templates,
    defaultTemplate,
    isLoading,
    error,
    isAtLimit,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefault,
    refresh: fetchTemplates,
  }
}
