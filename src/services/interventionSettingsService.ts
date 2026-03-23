/**
 * Service CRUD pour les préférences d'intervention (tâches + liste de courses).
 * Table : intervention_settings (une ligne par utilisateur).
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type { ShoppingItem } from '@/lib/constants/taskDefaults'
import type { InterventionSettingsDbRow } from '@/types/database'

export interface InterventionSettings {
  defaultTasks: string[]
  customTasks: string[]
  shoppingList: ShoppingItem[]
}

const DEFAULTS: InterventionSettings = {
  defaultTasks: [],
  customTasks: [],
  shoppingList: [],
}

function mapFromDb(row: InterventionSettingsDbRow): InterventionSettings {
  return {
    defaultTasks: row.default_tasks ?? [],
    customTasks: row.custom_tasks ?? [],
    shoppingList: (row.shopping_list ?? []).map(item => ({
      name: item.name ?? '',
      brand: item.brand ?? '',
      quantity: item.quantity ?? 1,
      note: item.note ?? '',
    })),
  }
}

export async function getInterventionSettings(profileId: string): Promise<InterventionSettings> {
  const { data, error } = await supabase
    .from('intervention_settings')
    .select('profile_id, default_tasks, custom_tasks, shopping_list, created_at, updated_at')
    .eq('profile_id', profileId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return { ...DEFAULTS } // not found
    logger.error('Erreur chargement intervention settings:', error)
    return { ...DEFAULTS }
  }
  return mapFromDb(data as InterventionSettingsDbRow)
}

export async function upsertInterventionSettings(
  profileId: string,
  settings: InterventionSettings,
): Promise<void> {
  const { error } = await supabase
    .from('intervention_settings')
    .upsert({
      profile_id: profileId,
      default_tasks: settings.defaultTasks,
      custom_tasks: settings.customTasks.map(sanitizeText),
      shopping_list: settings.shoppingList.map(item => ({
        name: sanitizeText(item.name),
        brand: sanitizeText(item.brand),
        quantity: item.quantity,
        note: sanitizeText(item.note),
      })),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' })

  if (error) {
    logger.error('Erreur sauvegarde intervention settings:', error)
    throw error
  }
}

// ── Historique d'articles (autocomplétion) ──

export interface ArticleSuggestion {
  name: string
  brand: string
  useCount: number
}

export async function searchArticleHistory(
  profileId: string,
  query: string,
  limit = 5,
): Promise<ArticleSuggestion[]> {
  if (!query.trim()) return []

  const { data, error } = await supabase
    .from('shopping_article_history')
    .select('name, brand, use_count')
    .eq('profile_id', profileId)
    .ilike('name', `%${query}%`)
    .order('use_count', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('Erreur recherche historique articles:', error)
    return []
  }
  return (data ?? []).map(row => ({
    name: row.name,
    brand: row.brand,
    useCount: row.use_count,
  }))
}

export async function trackArticleUsage(
  profileId: string,
  name: string,
  brand: string,
): Promise<void> {
  const { error } = await supabase.rpc('upsert_article_history', {
    p_profile_id: profileId,
    p_name: sanitizeText(name),
    p_brand: sanitizeText(brand),
  })

  // Fallback si la RPC n'existe pas (proto) : insert simple
  if (error) {
    await supabase
      .from('shopping_article_history')
      .upsert({
        profile_id: profileId,
        name: sanitizeText(name),
        brand: sanitizeText(brand),
        use_count: 1,
        last_used_at: new Date().toISOString(),
      }, { onConflict: 'profile_id,name,brand' })
      .then(({ error: e2 }) => {
        if (e2) logger.error('Erreur tracking article:', e2)
      })
  }
}
