import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TASKS,
  COURSES_PREFIX,
  emptyShoppingItem,
  parseTasksArray,
  encodeTasksArray,
  formatShoppingItem,
  parseShoppingItemString,
  shoppingItemKey,
} from './taskDefaults'
import type { ShoppingItem } from './taskDefaults'

// ── DEFAULT_TASKS ──

describe('DEFAULT_TASKS', () => {
  it('contient 12 tâches prédéfinies', () => {
    expect(DEFAULT_TASKS).toHaveLength(12)
  })

  it('contient "Courses" pour la liste de courses', () => {
    expect(DEFAULT_TASKS).toContain('Courses')
  })

  it('toutes les tâches sont des chaînes non vides', () => {
    for (const task of DEFAULT_TASKS) {
      expect(typeof task).toBe('string')
      expect(task.trim().length).toBeGreaterThan(0)
    }
  })
})

// ── COURSES_PREFIX ──

describe('COURSES_PREFIX', () => {
  it('vaut "[courses]"', () => {
    expect(COURSES_PREFIX).toBe('[courses]')
  })
})

// ── emptyShoppingItem ──

describe('emptyShoppingItem', () => {
  it('retourne un item vide avec quantité 1', () => {
    const item = emptyShoppingItem()
    expect(item).toEqual({ name: '', brand: '', quantity: 1, note: '' })
  })

  it('retourne une nouvelle instance à chaque appel', () => {
    const a = emptyShoppingItem()
    const b = emptyShoppingItem()
    expect(a).not.toBe(b)
  })
})

// ── parseTasksArray ──

describe('parseTasksArray', () => {
  it('sépare les tâches prédéfinies', () => {
    const result = parseTasksArray(['Aide au lever', 'Courses'])
    expect(result.selectedTasks).toEqual(['Aide au lever', 'Courses'])
    expect(result.shoppingItems).toEqual([])
    expect(result.customTasks).toEqual([])
  })

  it('sépare les articles de courses (préfixe [courses])', () => {
    const result = parseTasksArray([
      'Courses',
      '[courses]Lait (Lactel) x2 | demi-écrémé',
      '[courses]Pain',
    ])
    expect(result.selectedTasks).toEqual(['Courses'])
    expect(result.shoppingItems).toEqual([
      'Lait (Lactel) x2 | demi-écrémé',
      'Pain',
    ])
  })

  it('sépare les tâches personnalisées', () => {
    const result = parseTasksArray([
      'Aide au lever',
      'Sortir le chien',
      'Arroser les plantes',
    ])
    expect(result.selectedTasks).toEqual(['Aide au lever'])
    expect(result.customTasks).toEqual(['Sortir le chien', 'Arroser les plantes'])
  })

  it('gère un tableau vide', () => {
    const result = parseTasksArray([])
    expect(result.selectedTasks).toEqual([])
    expect(result.shoppingItems).toEqual([])
    expect(result.customTasks).toEqual([])
  })

  it('gère un mix des 3 catégories', () => {
    const result = parseTasksArray([
      'Aide au lever',
      'Courses',
      '[courses]Lait',
      'Tâche spéciale',
    ])
    expect(result.selectedTasks).toEqual(['Aide au lever', 'Courses'])
    expect(result.shoppingItems).toEqual(['Lait'])
    expect(result.customTasks).toEqual(['Tâche spéciale'])
  })
})

// ── encodeTasksArray ──

describe('encodeTasksArray', () => {
  it('encode les 3 catégories en un tableau plat', () => {
    const result = encodeTasksArray(
      ['Aide au lever', 'Courses'],
      ['Lait', 'Pain'],
      ['Sortir le chien'],
    )
    expect(result).toEqual([
      'Aide au lever',
      'Courses',
      '[courses]Lait',
      '[courses]Pain',
      'Sortir le chien',
    ])
  })

  it('ignore les tâches custom vides ou whitespace', () => {
    const result = encodeTasksArray([], [], ['  ', '', 'Valide'])
    expect(result).toEqual(['Valide'])
  })

  it('trim les tâches custom', () => {
    const result = encodeTasksArray([], [], ['  Avec espaces  '])
    expect(result).toEqual(['Avec espaces'])
  })

  it('gère des tableaux vides', () => {
    const result = encodeTasksArray([], [], [])
    expect(result).toEqual([])
  })
})

// ── roundtrip parse → encode ──

describe('parseTasksArray ↔ encodeTasksArray roundtrip', () => {
  it('retour identique après parse puis encode', () => {
    const original = [
      'Aide au lever',
      'Courses',
      '[courses]Lait (Lactel) x2 | bio',
      '[courses]Pain',
      'Sortir le chien',
    ]
    const parsed = parseTasksArray(original)
    const encoded = encodeTasksArray(
      parsed.selectedTasks,
      parsed.shoppingItems,
      parsed.customTasks,
    )
    expect(encoded).toEqual(original)
  })
})

// ── formatShoppingItem ──

describe('formatShoppingItem', () => {
  it('formate un item simple (nom seul)', () => {
    const item: ShoppingItem = { name: 'Lait', brand: '', quantity: 1, note: '' }
    expect(formatShoppingItem(item)).toBe('Lait')
  })

  it('formate avec marque', () => {
    const item: ShoppingItem = { name: 'Lait', brand: 'Lactel', quantity: 1, note: '' }
    expect(formatShoppingItem(item)).toBe('Lait (Lactel)')
  })

  it('formate avec quantité > 1', () => {
    const item: ShoppingItem = { name: 'Lait', brand: '', quantity: 3, note: '' }
    expect(formatShoppingItem(item)).toBe('Lait x3')
  })

  it('formate avec note', () => {
    const item: ShoppingItem = { name: 'Bananes', brand: '', quantity: 1, note: 'pas trop mûres' }
    expect(formatShoppingItem(item)).toBe('Bananes | pas trop mûres')
  })

  it('formate un item complet (marque + quantité + note)', () => {
    const item: ShoppingItem = { name: 'Lait', brand: 'Lactel', quantity: 2, note: 'demi-écrémé' }
    expect(formatShoppingItem(item)).toBe('Lait (Lactel) x2 | demi-écrémé')
  })

  it('n\'ajoute pas xN si quantité = 1', () => {
    const item: ShoppingItem = { name: 'Pain', brand: 'Maison', quantity: 1, note: '' }
    expect(formatShoppingItem(item)).toBe('Pain (Maison)')
    expect(formatShoppingItem(item)).not.toContain('x1')
  })
})

// ── parseShoppingItemString ──

describe('parseShoppingItemString', () => {
  it('parse un nom simple', () => {
    expect(parseShoppingItemString('Lait')).toEqual({
      name: 'Lait', brand: '', quantity: 1, note: '',
    })
  })

  it('parse nom + marque', () => {
    expect(parseShoppingItemString('Lait (Lactel)')).toEqual({
      name: 'Lait', brand: 'Lactel', quantity: 1, note: '',
    })
  })

  it('parse nom + quantité', () => {
    expect(parseShoppingItemString('Lait x3')).toEqual({
      name: 'Lait', brand: '', quantity: 3, note: '',
    })
  })

  it('parse nom + note', () => {
    expect(parseShoppingItemString('Bananes | pas trop mûres')).toEqual({
      name: 'Bananes', brand: '', quantity: 1, note: 'pas trop mûres',
    })
  })

  it('parse un item complet', () => {
    expect(parseShoppingItemString('Lait (Lactel) x2 | demi-écrémé')).toEqual({
      name: 'Lait', brand: 'Lactel', quantity: 2, note: 'demi-écrémé',
    })
  })

  it('parse marque + quantité sans note', () => {
    expect(parseShoppingItemString('Yaourt (Danone) x4')).toEqual({
      name: 'Yaourt', brand: 'Danone', quantity: 4, note: '',
    })
  })
})

// ── formatShoppingItem ↔ parseShoppingItemString roundtrip ──

describe('formatShoppingItem ↔ parseShoppingItemString roundtrip', () => {
  const items: ShoppingItem[] = [
    { name: 'Lait', brand: '', quantity: 1, note: '' },
    { name: 'Lait', brand: 'Lactel', quantity: 1, note: '' },
    { name: 'Lait', brand: 'Lactel', quantity: 2, note: '' },
    { name: 'Lait', brand: 'Lactel', quantity: 2, note: 'bio' },
    { name: 'Bananes', brand: '', quantity: 1, note: 'pas trop mûres' },
    { name: 'Yaourt', brand: 'Danone', quantity: 4, note: 'nature' },
  ]

  for (const item of items) {
    it(`roundtrip : ${JSON.stringify(item)}`, () => {
      const formatted = formatShoppingItem(item)
      const parsed = parseShoppingItemString(formatted)
      expect(parsed).toEqual(item)
    })
  }
})

// ── shoppingItemKey ──

describe('shoppingItemKey', () => {
  it('génère une clé unique basée sur nom et marque', () => {
    const item: ShoppingItem = { name: 'Lait', brand: 'Lactel', quantity: 1, note: '' }
    expect(shoppingItemKey(item)).toBe('Lait::Lactel')
  })

  it('génère une clé sans marque', () => {
    const item: ShoppingItem = { name: 'Pain', brand: '', quantity: 1, note: '' }
    expect(shoppingItemKey(item)).toBe('Pain::')
  })

  it('items identiques → même clé', () => {
    const a: ShoppingItem = { name: 'Lait', brand: 'Lactel', quantity: 1, note: '' }
    const b: ShoppingItem = { name: 'Lait', brand: 'Lactel', quantity: 5, note: 'bio' }
    expect(shoppingItemKey(a)).toBe(shoppingItemKey(b))
  })

  it('items différents → clés différentes', () => {
    const a: ShoppingItem = { name: 'Lait', brand: 'Lactel', quantity: 1, note: '' }
    const b: ShoppingItem = { name: 'Lait', brand: 'Candia', quantity: 1, note: '' }
    expect(shoppingItemKey(a)).not.toBe(shoppingItemKey(b))
  })
})
