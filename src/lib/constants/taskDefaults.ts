/**
 * Tâches prédéfinies et helpers pour le format de stockage tasks[].
 *
 * Convention de stockage dans le tableau tasks[] d'un shift :
 *   - Tâche normale : "Aide au lever"
 *   - Article de courses : "[courses]Lait (Lactel) x2 | pas trop mûres"
 */

export const DEFAULT_TASKS = [
  'Aide au lever',
  'Aide au coucher',
  'Toilette / habillage',
  'Préparation des repas',
  'Aide aux repas',
  'Courses',
  'Entretien du logement',
  'Repassage / linge',
  'Accompagnement sortie',
  'Aide administrative',
  'Activités / stimulation',
  'Soins infirmiers',
]

export const COURSES_PREFIX = '[courses]'

export interface ShoppingItem {
  name: string
  brand: string
  quantity: number
  note: string
}

export const emptyShoppingItem = (): ShoppingItem => ({
  name: '', brand: '', quantity: 1, note: '',
})

/** Parse un tableau tasks[] en 3 catégories */
export function parseTasksArray(tasks: string[]): {
  selectedTasks: string[]
  shoppingItems: string[]
  customTasks: string[]
} {
  const selectedTasks: string[] = []
  const shoppingItems: string[] = []
  const customTasks: string[] = []

  for (const t of tasks) {
    if (t.startsWith(COURSES_PREFIX)) {
      shoppingItems.push(t.slice(COURSES_PREFIX.length))
    } else if (DEFAULT_TASKS.includes(t)) {
      selectedTasks.push(t)
    } else {
      customTasks.push(t)
    }
  }
  return { selectedTasks, shoppingItems, customTasks }
}

/** Encode les 3 catégories en un tableau tasks[] plat */
export function encodeTasksArray(
  selectedTasks: string[],
  shoppingItems: string[],
  customTasks: string[],
): string[] {
  const result: string[] = []
  for (const t of selectedTasks) result.push(t)
  for (const item of shoppingItems) result.push(`${COURSES_PREFIX}${item}`)
  for (const t of customTasks) {
    if (t.trim()) result.push(t.trim())
  }
  return result
}

/** Formatte un ShoppingItem en string pour le tableau tasks[] */
export function formatShoppingItem(item: ShoppingItem): string {
  let str = item.brand ? `${item.name} (${item.brand})` : item.name
  if (item.quantity > 1) str += ` x${item.quantity}`
  if (item.note) str += ` | ${item.note}`
  return str
}

/** Parse un string de shopping en ShoppingItem */
export function parseShoppingItemString(str: string): ShoppingItem {
  let remaining = str
  let note = ''
  let quantity = 1

  // Extraire la note (après |)
  const pipeIdx = remaining.indexOf(' | ')
  if (pipeIdx !== -1) {
    note = remaining.slice(pipeIdx + 3).trim()
    remaining = remaining.slice(0, pipeIdx)
  }

  // Extraire la quantité (x2, x3...)
  const qtyMatch = remaining.match(/\s+x(\d+)$/)
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10)
    remaining = remaining.slice(0, -qtyMatch[0].length)
  }

  // Extraire la marque (entre parenthèses)
  const brandMatch = remaining.match(/^(.+?)\s*\(([^)]+)\)$/)
  if (brandMatch) {
    return { name: brandMatch[1].trim(), brand: brandMatch[2].trim(), quantity, note }
  }
  return { name: remaining.trim(), brand: '', quantity, note }
}

/** Clé unique pour identifier un ShoppingItem */
export function shoppingItemKey(item: ShoppingItem): string {
  return `${item.name}::${item.brand}`
}
