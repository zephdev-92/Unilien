import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useSpotlightSearch } from '@/hooks/useSpotlightSearch'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', firstName: 'Test', lastName: 'User' },
    userRole: 'employer',
  }),
}))

vi.mock('@/hooks/useEmployerResolution', () => ({
  useEmployerResolution: () => ({
    resolvedEmployerId: 'user-1',
    caregiverPermissions: null,
    isResolving: false,
    accessDenied: false,
  }),
}))

vi.mock('@/services/auxiliaryService', () => ({
  getAuxiliariesForEmployer: vi.fn().mockResolvedValue([
    {
      id: 'aux-1',
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie@test.fr',
      qualifications: [],
      contractType: 'CDI',
      contractStatus: 'active',
      weeklyHours: 35,
      hourlyRate: 14,
      contractStartDate: new Date(),
      contractId: 'c-1',
    },
  ]),
}))

vi.mock('@/services/shiftService', () => ({
  getShifts: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/services/logbookService', () => ({
  getLogEntries: vi.fn().mockResolvedValue({ entries: [], totalCount: 0, hasMore: false }),
}))

vi.mock('@/services/liaisonService', () => ({
  getConversations: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/services/documentService', () => ({
  getDocumentsForEmployer: vi.fn().mockResolvedValue([]),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(BrowserRouter, null, children)
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useSpotlightSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('démarre fermé avec query vide', () => {
    const { result } = renderHook(() => useSpotlightSearch(), { wrapper })
    expect(result.current.isOpen).toBe(false)
    expect(result.current.query).toBe('')
    expect(result.current.results).toHaveLength(0)
  })

  it('open() ouvre le spotlight', () => {
    const { result } = renderHook(() => useSpotlightSearch(), { wrapper })
    act(() => {
      result.current.open()
    })
    expect(result.current.isOpen).toBe(true)
  })

  it('close() ferme et reset le state', () => {
    const { result } = renderHook(() => useSpotlightSearch(), { wrapper })
    act(() => {
      result.current.open()
      result.current.setQuery('test')
    })
    act(() => {
      result.current.close()
    })
    expect(result.current.isOpen).toBe(false)
    expect(result.current.query).toBe('')
    expect(result.current.results).toHaveLength(0)
  })

  it('recherche des pages après debounce', async () => {
    const { result } = renderHook(() => useSpotlightSearch(), { wrapper })

    act(() => {
      result.current.open()
    })

    // Attendre que le fetch se termine
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    act(() => {
      result.current.setQuery('planning')
    })

    // Avant debounce, pas de résultats
    expect(result.current.results).toHaveLength(0)

    // Après debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350)
    })

    expect(result.current.results.length).toBeGreaterThan(0)
    expect(result.current.results[0].title).toBe('Planning')
  })

  it('recherche dans les auxiliaires après fetch', async () => {
    const { result } = renderHook(() => useSpotlightSearch(), { wrapper })

    act(() => {
      result.current.open()
    })

    // Attendre le fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    act(() => {
      result.current.setQuery('marie')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350)
    })

    const teamResults = result.current.results.filter((r) => r.category === 'team')
    expect(teamResults.length).toBeGreaterThan(0)
    expect(teamResults[0].title).toBe('Marie Dupont')
  })

  it('activeIndex reset à 0 quand query change', async () => {
    const { result } = renderHook(() => useSpotlightSearch(), { wrapper })

    act(() => {
      result.current.open()
      result.current.setActiveIndex(3)
    })

    act(() => {
      result.current.setQuery('test')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350)
    })

    expect(result.current.activeIndex).toBe(0)
  })

  it('écoute Ctrl+K pour toggle', () => {
    const { result } = renderHook(() => useSpotlightSearch(), { wrapper })

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      )
    })

    expect(result.current.isOpen).toBe(true)

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      )
    })

    expect(result.current.isOpen).toBe(false)
  })
})
