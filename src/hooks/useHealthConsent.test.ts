import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock authStore
const mockUser = { id: 'user-123' }
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: mockUser }),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock Supabase
const mockMaybeSingle = vi.fn()
const mockUpsert = vi.fn()
const mockUpdate = vi.fn()

const mockEq = vi.fn().mockReturnThis()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (col: string, val: string) => {
          mockEq(col, val)
          return {
            eq: (col2: string, val2: string) => {
              mockEq(col2, val2)
              return { maybeSingle: () => mockMaybeSingle() }
            },
          }
        },
      }),
      upsert: (data: unknown, opts: unknown) => mockUpsert(data, opts),
      update: (data: unknown) => ({
        eq: () => ({
          eq: () => mockUpdate(data),
        }),
      }),
    }),
  },
}))

import { useHealthConsent } from './useHealthConsent'

describe('useHealthConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkConsent', () => {
    it('returns hasConsent=true when active consent exists', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'consent-1',
          granted_at: '2026-03-30T10:00:00Z',
          revoked_at: null,
        },
        error: null,
      })

      const { result } = renderHook(() => useHealthConsent())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasConsent).toBe(true)
      expect(result.current.grantedAt).toBe('2026-03-30T10:00:00Z')
    })

    it('returns hasConsent=false when consent is revoked', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'consent-1',
          granted_at: '2026-03-30T10:00:00Z',
          revoked_at: '2026-03-30T12:00:00Z',
        },
        error: null,
      })

      const { result } = renderHook(() => useHealthConsent())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasConsent).toBe(false)
      expect(result.current.grantedAt).toBeNull()
    })

    it('returns hasConsent=false when no consent record exists', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })

      const { result } = renderHook(() => useHealthConsent())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasConsent).toBe(false)
    })

    it('handles supabase error gracefully', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      })

      const { result } = renderHook(() => useHealthConsent())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasConsent).toBe(false)
    })
  })

  describe('grantConsent', () => {
    it('grants consent and updates state', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })
      mockUpsert.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useHealthConsent())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success: boolean = false
      await act(async () => {
        success = await result.current.grantConsent()
      })

      expect(success).toBe(true)
      expect(result.current.hasConsent).toBe(true)
      expect(result.current.grantedAt).toBeTruthy()
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          consent_type: 'health_data',
          revoked_at: null,
        }),
        expect.objectContaining({ onConflict: 'user_id,consent_type' })
      )
    })

    it('returns false on supabase error', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })
      mockUpsert.mockResolvedValue({ error: { message: 'insert failed' } })

      const { result } = renderHook(() => useHealthConsent())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success: boolean = true
      await act(async () => {
        success = await result.current.grantConsent()
      })

      expect(success).toBe(false)
      expect(result.current.hasConsent).toBe(false)
    })
  })

  describe('revokeConsent', () => {
    it('revokes consent and updates state', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'consent-1',
          granted_at: '2026-03-30T10:00:00Z',
          revoked_at: null,
        },
        error: null,
      })
      mockUpdate.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useHealthConsent())

      await waitFor(() => {
        expect(result.current.hasConsent).toBe(true)
      })

      let success: boolean = false
      await act(async () => {
        success = await result.current.revokeConsent()
      })

      expect(success).toBe(true)
      expect(result.current.hasConsent).toBe(false)
    })

    it('returns false on supabase error', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'consent-1',
          granted_at: '2026-03-30T10:00:00Z',
          revoked_at: null,
        },
        error: null,
      })
      mockUpdate.mockResolvedValue({ error: { message: 'update failed' } })

      const { result } = renderHook(() => useHealthConsent())

      await waitFor(() => {
        expect(result.current.hasConsent).toBe(true)
      })

      let success: boolean = true
      await act(async () => {
        success = await result.current.revokeConsent()
      })

      expect(success).toBe(false)
    })
  })
})
