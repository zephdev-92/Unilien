import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  listShoppingListTemplates,
  createShoppingListTemplate,
  updateShoppingListTemplate,
  deleteShoppingListTemplate,
  setDefaultShoppingListTemplate,
  SHOPPING_LIST_TEMPLATES_LIMIT,
} from './shoppingListTemplateService'

// ─── Mocks ──────────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeText: vi.fn((text: string) => text.trim()),
}))

// ─── Helpers ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ── list ────────────────────────────────────────────────────────────

describe('listShoppingListTemplates', () => {
  it('retourne la liste mappée', async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    let orderCount = 0
    chain.order = vi.fn().mockImplementation(() => {
      orderCount++
      if (orderCount >= 2) {
        return Promise.resolve({
          data: [
            {
              id: 't1',
              employer_id: 'e1',
              name: 'Liste par défaut',
              is_default: true,
              items: [{ name: 'Lait', brand: '', quantity: 1, note: '' }],
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
            },
          ],
          error: null,
        })
      }
      return chain
    })
    mockFrom.mockReturnValue(chain)

    const result = await listShoppingListTemplates('e1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('t1')
    expect(result[0].isDefault).toBe(true)
    expect(result[0].items[0].name).toBe('Lait')
  })

  it('retourne tableau vide si erreur', async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    let orderCount = 0
    chain.order = vi.fn().mockImplementation(() => {
      orderCount++
      if (orderCount >= 2) {
        return Promise.resolve({ data: null, error: { message: 'fail' } })
      }
      return chain
    })
    mockFrom.mockReturnValue(chain)

    const result = await listShoppingListTemplates('e1')
    expect(result).toEqual([])
  })
})

// ── create ──────────────────────────────────────────────────────────

describe('createShoppingListTemplate', () => {
  it('refuse si la limite est atteinte', async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    let orderCount = 0
    chain.order = vi.fn().mockImplementation(() => {
      orderCount++
      if (orderCount >= 2) {
        return Promise.resolve({
          data: Array.from({ length: SHOPPING_LIST_TEMPLATES_LIMIT }, (_, i) => ({
            id: `t${i}`,
            employer_id: 'e1',
            name: `Liste ${i}`,
            is_default: i === 0,
            items: [],
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          })),
          error: null,
        })
      }
      return chain
    })
    mockFrom.mockReturnValue(chain)

    await expect(
      createShoppingListTemplate('e1', { name: 'Sixième' }),
    ).rejects.toThrow(/Limite atteinte/)
  })

  it('refuse un nom vide', async () => {
    // listShoppingListTemplates retourne []
    const listChain: Record<string, ReturnType<typeof vi.fn>> = {}
    listChain.select = vi.fn().mockReturnValue(listChain)
    listChain.eq = vi.fn().mockReturnValue(listChain)
    let orderCount = 0
    listChain.order = vi.fn().mockImplementation(() => {
      orderCount++
      if (orderCount >= 2) return Promise.resolve({ data: [], error: null })
      return listChain
    })
    mockFrom.mockReturnValue(listChain)

    await expect(
      createShoppingListTemplate('e1', { name: '   ' }),
    ).rejects.toThrow(/nom de la liste est obligatoire/)
  })
})

// ── update ──────────────────────────────────────────────────────────

describe('updateShoppingListTemplate', () => {
  it('refuse un nom vide', async () => {
    await expect(
      updateShoppingListTemplate('t1', { name: '   ' }),
    ).rejects.toThrow(/nom de la liste est obligatoire/)
  })

  it('met à jour avec succès', async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.update = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await expect(
      updateShoppingListTemplate('t1', { name: 'Nouveau nom' }),
    ).resolves.toBeUndefined()
    expect(chain.update).toHaveBeenCalled()
  })
})

// ── delete ──────────────────────────────────────────────────────────

describe('deleteShoppingListTemplate', () => {
  it('supprime sans promotion si pas le default', async () => {
    const deleteChain: Record<string, ReturnType<typeof vi.fn>> = {}
    deleteChain.delete = vi.fn().mockReturnValue(deleteChain)
    deleteChain.eq = vi.fn().mockReturnValue(deleteChain)
    deleteChain.select = vi.fn().mockReturnValue(deleteChain)
    deleteChain.single = vi.fn().mockResolvedValue({
      data: { id: 't1', employer_id: 'e1', is_default: false },
      error: null,
    })
    mockFrom.mockReturnValue(deleteChain)

    await deleteShoppingListTemplate('t1')
    expect(deleteChain.delete).toHaveBeenCalled()
  })
})

// ── setDefault ──────────────────────────────────────────────────────

describe('setDefaultShoppingListTemplate', () => {
  it('désactive l\'ancien default puis active le nouveau', async () => {
    const calls: string[] = []
    mockFrom.mockImplementation(() => {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      chain.update = vi.fn().mockImplementation((data) => {
        calls.push(`update is_default=${(data as { is_default: boolean }).is_default}`)
        return chain
      })
      // .eq() peut être chaîné plusieurs fois ; le dernier appel sert de terminal
      // (le chain est thenable plus bas)
      chain.eq = vi.fn().mockReturnValue(chain)
      // thenable pour permettre `await chain.eq(...)` comme terminal
      chain.then = vi.fn().mockImplementation((fn: (v: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(fn)
      })
      return chain
    })

    await setDefaultShoppingListTemplate('t2', 'e1')
    // 2 updates : 1 pour désactiver l'ancien, 1 pour activer le nouveau
    expect(calls).toEqual([
      'update is_default=false',
      'update is_default=true',
    ])
  })
})
