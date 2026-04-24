import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetPublicUrl = vi.fn()

vi.mock('./client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
}))

import { resolveAvatarUrl } from './avatars'

describe('resolveAvatarUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne undefined pour null / undefined / chaîne vide', () => {
    expect(resolveAvatarUrl(null)).toBeUndefined()
    expect(resolveAvatarUrl(undefined)).toBeUndefined()
    expect(resolveAvatarUrl('')).toBeUndefined()
    expect(mockGetPublicUrl).not.toHaveBeenCalled()
  })

  it('retourne la valeur telle quelle si elle commence par http (rétrocompat legacy)', () => {
    const legacyUrl = 'https://lczfygydhnyygguvponw.supabase.co/storage/v1/object/public/avatars/user-1/123.jpg'
    expect(resolveAvatarUrl(legacyUrl)).toBe(legacyUrl)
    expect(mockGetPublicUrl).not.toHaveBeenCalled()
  })

  it('résout un path Storage vers une URL publique via getPublicUrl', () => {
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://api.unilien.app/storage/v1/object/public/avatars/user-1/123.jpg' },
    })

    const result = resolveAvatarUrl('user-1/123.jpg')

    expect(mockGetPublicUrl).toHaveBeenCalledWith('user-1/123.jpg')
    expect(result).toBe('https://api.unilien.app/storage/v1/object/public/avatars/user-1/123.jpg')
  })
})
