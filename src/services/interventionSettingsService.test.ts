import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getInterventionSettings,
  upsertInterventionSettings,
  searchArticleHistory,
  trackArticleUsage,
} from './interventionSettingsService'

// ─── Mocks ──────────────────────────────────────────────────────────

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
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

function mockSupabaseChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.ilike = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  chain.upsert = vi.fn().mockResolvedValue(result)

  // Pour les appels terminaux qui retournent la Promise directement
  Object.assign(chain.select, { then: undefined })
  Object.assign(chain.limit, { then: (fn: (v: unknown) => void) => Promise.resolve(result).then(fn) })
  // Réécriture: limit retourne Promise pour searchArticleHistory
  chain.limit = vi.fn().mockResolvedValue(result)

  mockFrom.mockReturnValue(chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getInterventionSettings ──

describe('getInterventionSettings', () => {
  it('retourne les settings depuis la DB', async () => {
    const dbRow = {
      profile_id: 'p1',
      default_tasks: ['Aide au lever', 'Courses'],
      custom_tasks: ['Sortir le chien'],
      shopping_list: [
        { name: 'Lait', brand: 'Lactel', quantity: 2, note: 'bio' },
      ],
    }
    mockSupabaseChain({ data: dbRow, error: null })

    const result = await getInterventionSettings('p1')

    expect(mockFrom).toHaveBeenCalledWith('intervention_settings')
    expect(result).toEqual({
      defaultTasks: ['Aide au lever', 'Courses'],
      customTasks: ['Sortir le chien'],
      shoppingList: [{ name: 'Lait', brand: 'Lactel', quantity: 2, note: 'bio' }],
    })
  })

  it('retourne les valeurs par défaut si aucun row (PGRST116)', async () => {
    mockSupabaseChain({ data: null, error: { code: 'PGRST116', message: 'not found' } })

    const result = await getInterventionSettings('p1')

    expect(result).toEqual({
      defaultTasks: [],
      customTasks: [],
      shoppingList: [],
    })
  })

  it('retourne les valeurs par défaut en cas d\'erreur', async () => {
    mockSupabaseChain({ data: null, error: { code: '500', message: 'server error' } })

    const result = await getInterventionSettings('p1')

    expect(result).toEqual({
      defaultTasks: [],
      customTasks: [],
      shoppingList: [],
    })
  })

  it('gère les champs null dans le row DB', async () => {
    const dbRow = {
      profile_id: 'p1',
      default_tasks: null,
      custom_tasks: null,
      shopping_list: null,
    }
    mockSupabaseChain({ data: dbRow, error: null })

    const result = await getInterventionSettings('p1')

    expect(result).toEqual({
      defaultTasks: [],
      customTasks: [],
      shoppingList: [],
    })
  })

  it('gère les items shopping avec des champs manquants', async () => {
    const dbRow = {
      profile_id: 'p1',
      default_tasks: [],
      custom_tasks: [],
      shopping_list: [{ name: 'Lait' }],
    }
    mockSupabaseChain({ data: dbRow, error: null })

    const result = await getInterventionSettings('p1')

    expect(result.shoppingList[0]).toEqual({
      name: 'Lait',
      brand: '',
      quantity: 1,
      note: '',
    })
  })
})

// ── upsertInterventionSettings ──

describe('upsertInterventionSettings', () => {
  it('upsert les settings avec sanitization', async () => {
    const chain = mockSupabaseChain({ data: null, error: null })

    await upsertInterventionSettings('p1', {
      defaultTasks: ['Aide au lever'],
      customTasks: ['  Ma tâche  '],
      shoppingList: [{ name: '  Lait  ', brand: '  Lactel  ', quantity: 2, note: '  bio  ' }],
    })

    expect(mockFrom).toHaveBeenCalledWith('intervention_settings')
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 'p1',
        default_tasks: ['Aide au lever'],
        custom_tasks: ['Ma tâche'],
        shopping_list: [{ name: 'Lait', brand: 'Lactel', quantity: 2, note: 'bio' }],
      }),
      { onConflict: 'profile_id' },
    )
  })

  it('throw en cas d\'erreur', async () => {
    mockSupabaseChain({ data: null, error: { message: 'DB error' } })
    // upsert retourne aussi un résultat directement
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.upsert = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(chain)

    await expect(upsertInterventionSettings('p1', {
      defaultTasks: [],
      customTasks: [],
      shoppingList: [],
    })).rejects.toEqual({ message: 'DB error' })
  })
})

// ── searchArticleHistory ──

describe('searchArticleHistory', () => {
  it('retourne les suggestions mappées', async () => {
    const data = [
      { name: 'Lait', brand: 'Lactel', use_count: 5 },
      { name: 'Lait', brand: 'Candia', use_count: 2 },
    ]
    mockSupabaseChain({ data, error: null })

    const result = await searchArticleHistory('p1', 'Lait')

    expect(mockFrom).toHaveBeenCalledWith('shopping_article_history')
    expect(result).toEqual([
      { name: 'Lait', brand: 'Lactel', useCount: 5 },
      { name: 'Lait', brand: 'Candia', useCount: 2 },
    ])
  })

  it('retourne [] si query vide', async () => {
    const result = await searchArticleHistory('p1', '   ')
    expect(mockFrom).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })

  it('retourne [] en cas d\'erreur', async () => {
    mockSupabaseChain({ data: null, error: { message: 'error' } })

    const result = await searchArticleHistory('p1', 'Lait')
    expect(result).toEqual([])
  })
})

// ── trackArticleUsage ──

describe('trackArticleUsage', () => {
  it('appelle la RPC upsert_article_history', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await trackArticleUsage('p1', 'Lait', 'Lactel')

    expect(mockRpc).toHaveBeenCalledWith('upsert_article_history', {
      p_profile_id: 'p1',
      p_name: 'Lait',
      p_brand: 'Lactel',
    })
  })

  it('fallback sur upsert si RPC échoue', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc not found' } })

    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.upsert = vi.fn().mockResolvedValue({ data: null, error: null })
    // Le then est appelé sur le résultat de upsert
    chain.upsert.mockReturnValue({ then: (fn: (v: unknown) => void) => Promise.resolve({ data: null, error: null }).then(fn) })
    mockFrom.mockReturnValue(chain)

    await trackArticleUsage('p1', 'Lait', 'Lactel')

    expect(mockFrom).toHaveBeenCalledWith('shopping_article_history')
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 'p1',
        name: 'Lait',
        brand: 'Lactel',
        use_count: 1,
      }),
      { onConflict: 'profile_id,name,brand' },
    )
  })
})
