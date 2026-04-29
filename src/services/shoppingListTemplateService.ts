/**
 * Service CRUD pour les modèles de listes de courses.
 * Table : shopping_list_templates (jusqu'à 5 par employeur).
 *
 * Le snapshot est natif : les items sont copiés dans `shifts.tasks` à la
 * création d'une intervention, donc modifier un template ne modifie pas
 * les interventions passées.
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type { ShoppingItem } from '@/lib/constants/taskDefaults'
import type { ShoppingListTemplateDbRow } from '@/types/database'

export const SHOPPING_LIST_TEMPLATES_LIMIT = 5
export const SHOPPING_LIST_TEMPLATE_NAME_MAX = 60

export interface ShoppingListTemplate {
  id: string
  employerId: string
  name: string
  isDefault: boolean
  items: ShoppingItem[]
  createdAt: Date
  updatedAt: Date
}

function mapFromDb(row: ShoppingListTemplateDbRow): ShoppingListTemplate {
  return {
    id: row.id,
    employerId: row.employer_id,
    name: row.name,
    isDefault: row.is_default,
    items: (row.items ?? []).map(item => ({
      name: item.name ?? '',
      brand: item.brand ?? '',
      quantity: item.quantity ?? 1,
      note: item.note ?? '',
    })),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function sanitizeItems(items: ShoppingItem[]): ShoppingItem[] {
  return items.map(item => ({
    name: sanitizeText(item.name),
    brand: sanitizeText(item.brand),
    quantity: item.quantity,
    note: sanitizeText(item.note),
  }))
}

/**
 * Liste les templates d'un employeur, triés par défaut en tête puis par date.
 */
export async function listShoppingListTemplates(
  employerId: string,
): Promise<ShoppingListTemplate[]> {
  const { data, error } = await supabase
    .from('shopping_list_templates')
    .select('*')
    .eq('employer_id', employerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('Erreur chargement shopping list templates:', error)
    return []
  }
  return (data ?? []).map(row => mapFromDb(row as ShoppingListTemplateDbRow))
}

interface CreateInput {
  name: string
  items?: ShoppingItem[]
  isDefault?: boolean
}

/**
 * Crée un template. Refuse si l'employeur en a déjà 5.
 * Si `isDefault` est passé à `true`, désactive le précédent default.
 */
export async function createShoppingListTemplate(
  employerId: string,
  input: CreateInput,
): Promise<ShoppingListTemplate> {
  const existing = await listShoppingListTemplates(employerId)
  if (existing.length >= SHOPPING_LIST_TEMPLATES_LIMIT) {
    throw new Error(
      `Limite atteinte : ${SHOPPING_LIST_TEMPLATES_LIMIT} listes maximum par employeur.`,
    )
  }

  const name = sanitizeText(input.name).slice(0, SHOPPING_LIST_TEMPLATE_NAME_MAX)
  if (!name) throw new Error('Le nom de la liste est obligatoire.')

  const wantsDefault = input.isDefault ?? existing.length === 0
  if (wantsDefault) await unsetDefault(employerId)

  const { data, error } = await supabase
    .from('shopping_list_templates')
    .insert({
      employer_id: employerId,
      name,
      is_default: wantsDefault,
      items: sanitizeItems(input.items ?? []),
    })
    .select()
    .single()

  if (error || !data) {
    logger.error('Erreur création template liste de courses:', error)
    throw error ?? new Error('Échec de création du template.')
  }
  return mapFromDb(data as ShoppingListTemplateDbRow)
}

interface UpdateInput {
  name?: string
  items?: ShoppingItem[]
}

/**
 * Met à jour un template (nom et/ou items). Le statut `isDefault` se gère
 * via `setDefaultShoppingListTemplate` pour préserver l'invariant.
 */
export async function updateShoppingListTemplate(
  id: string,
  patch: UpdateInput,
): Promise<void> {
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (patch.name !== undefined) {
    const name = sanitizeText(patch.name).slice(0, SHOPPING_LIST_TEMPLATE_NAME_MAX)
    if (!name) throw new Error('Le nom de la liste est obligatoire.')
    update.name = name
  }
  if (patch.items !== undefined) {
    update.items = sanitizeItems(patch.items)
  }

  const { error } = await supabase
    .from('shopping_list_templates')
    .update(update)
    .eq('id', id)

  if (error) {
    logger.error('Erreur mise à jour template liste de courses:', error)
    throw error
  }
}

/**
 * Supprime un template. Si c'était le default et qu'il reste d'autres listes,
 * promeut la plus ancienne en nouveau default.
 */
export async function deleteShoppingListTemplate(id: string): Promise<void> {
  const { data: deleted, error } = await supabase
    .from('shopping_list_templates')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('Erreur suppression template liste de courses:', error)
    throw error
  }

  // Si on a supprimé le default, promouvoir le suivant comme nouveau default
  const row = deleted as ShoppingListTemplateDbRow | null
  if (row?.is_default) {
    const { data: next } = await supabase
      .from('shopping_list_templates')
      .select('id')
      .eq('employer_id', row.employer_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (next) {
      await supabase
        .from('shopping_list_templates')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', (next as { id: string }).id)
    }
  }
}

async function unsetDefault(employerId: string): Promise<void> {
  await supabase
    .from('shopping_list_templates')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('employer_id', employerId)
    .eq('is_default', true)
}

/**
 * Définit un template comme "par défaut". Désactive le précédent default
 * de l'employeur (l'index unique partiel garantit l'unicité côté DB).
 */
export async function setDefaultShoppingListTemplate(
  id: string,
  employerId: string,
): Promise<void> {
  await unsetDefault(employerId)

  const { error } = await supabase
    .from('shopping_list_templates')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    logger.error('Erreur set default template liste de courses:', error)
    throw error
  }
}
