import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getPrivacySettings,
  upsertPrivacySettings,
  PRIVACY_DEFAULTS,
} from './privacySettingsService'
import type { PrivacySettings } from './privacySettingsService'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

function mockSupabaseQuery(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve(result))
  )
  mockFrom.mockImplementation(() => chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

const PROFILE_ID = 'prof-abc'

const DB_ROW = {
  profile_id: PROFILE_ID,
  analytics_enabled: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const MAPPED_SETTINGS: PrivacySettings = {
  analyticsEnabled: false,
}

describe('getPrivacySettings', () => {
  it('retourne les settings mappés depuis la DB', async () => {
    mockSupabaseQuery({ data: DB_ROW, error: null })

    const result = await getPrivacySettings(PROFILE_ID)

    expect(result).toEqual(MAPPED_SETTINGS)
  })

  it('appelle supabase avec le bon profile_id', async () => {
    const chain = mockSupabaseQuery({ data: DB_ROW, error: null })

    await getPrivacySettings(PROFILE_ID)

    expect(mockFrom).toHaveBeenCalledWith('privacy_settings')
    expect(chain.eq).toHaveBeenCalledWith('profile_id', PROFILE_ID)
    expect(chain.single).toHaveBeenCalled()
  })

  it('retourne les defaults si aucune ligne (PGRST116)', async () => {
    mockSupabaseQuery({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    const result = await getPrivacySettings(PROFILE_ID)

    expect(result).toEqual(PRIVACY_DEFAULTS)
    expect(result.analyticsEnabled).toBe(true)
  })

  it('log l erreur si code != PGRST116', async () => {
    const { logger } = await import('@/lib/logger')
    const supabaseError = { code: '42P01', message: 'Table not found' }
    mockSupabaseQuery({ data: null, error: supabaseError })

    await getPrivacySettings(PROFILE_ID)

    expect(logger.error).toHaveBeenCalledWith(
      'Erreur chargement privacy settings:',
      supabaseError
    )
  })

  it('ne log pas pour PGRST116 (cas normal premier usage)', async () => {
    const { logger } = await import('@/lib/logger')
    mockSupabaseQuery({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    await getPrivacySettings(PROFILE_ID)

    expect(logger.error).not.toHaveBeenCalled()
  })
})

describe('upsertPrivacySettings', () => {
  it('appelle upsert avec les bons paramètres', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await upsertPrivacySettings(PROFILE_ID, MAPPED_SETTINGS)

    expect(mockFrom).toHaveBeenCalledWith('privacy_settings')
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: PROFILE_ID,
        analytics_enabled: false,
      }),
      { onConflict: 'profile_id' }
    )
  })

  it('inclut updated_at en ISO string', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await upsertPrivacySettings(PROFILE_ID, MAPPED_SETTINGS)

    const upsertArg = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(upsertArg.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('throw l erreur Supabase en cas d échec', async () => {
    const supabaseError = { message: 'RLS violation', code: '42501' }
    mockSupabaseQuery({ data: null, error: supabaseError })

    await expect(
      upsertPrivacySettings(PROFILE_ID, MAPPED_SETTINGS)
    ).rejects.toEqual(supabaseError)
  })

  it('ne throw pas si pas d erreur', async () => {
    mockSupabaseQuery({ data: null, error: null })

    await expect(
      upsertPrivacySettings(PROFILE_ID, MAPPED_SETTINGS)
    ).resolves.toBeUndefined()
  })
})
