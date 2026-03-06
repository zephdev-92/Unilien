import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { TodayPlanningWidget } from './TodayPlanningWidget'

// ── Mock Supabase ────────────────────────────────────────────────────────────

let mockQueryResult: { data: unknown[] | null; error: unknown } = { data: [], error: null }

vi.mock('@/lib/supabase/client', () => {
  const mockFrom = vi.fn(() => {
    const builder: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'gte', 'lte', 'order', 'in', 'single']
    for (const m of methods) {
      builder[m] = vi.fn(() => builder)
    }
    Object.defineProperty(builder, 'then', {
      value: (resolve: (v: unknown) => void) => {
        resolve(mockQueryResult)
        return Promise.resolve(mockQueryResult)
      },
    })
    return builder
  })

  return {
    supabase: {
      from: mockFrom,
    },
  }
})

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TodayPlanningWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryResult = { data: [], error: null }
  })

  it('affiche des skeletons pendant le chargement', () => {
    // Delay resolution to keep loading state
    mockQueryResult = { data: null, error: null }
    const { container } = renderWithProviders(
      <TodayPlanningWidget employerId="emp-123" />
    )
    const skeletons = container.querySelectorAll('[class*="chakra-skeleton"], [data-status]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('affiche l\'empty state quand aucune intervention aujourd\'hui', async () => {
    mockQueryResult = { data: [], error: null }
    renderWithProviders(<TodayPlanningWidget employerId="emp-123" />)

    await waitFor(() => {
      expect(screen.getByText(/Aucune intervention aujourd'hui/)).toBeInTheDocument()
    })
  })

  it('affiche le CTA "Planifier une intervention" dans l\'empty state', async () => {
    mockQueryResult = { data: [], error: null }
    renderWithProviders(<TodayPlanningWidget employerId="emp-123" />)

    await waitFor(() => {
      expect(screen.getByText('Planifier une intervention')).toBeInTheDocument()
    })
  })

  it('affiche le titre "Planning du jour"', () => {
    renderWithProviders(<TodayPlanningWidget employerId="emp-123" />)
    expect(screen.getByText('Planning du jour')).toBeInTheDocument()
  })

  it('affiche les shifts du jour avec noms des employes', async () => {
    mockQueryResult = {
      data: [
        {
          id: 'shift-1',
          start_time: '08:00',
          end_time: '12:00',
          shift_type: 'effective',
          status: 'planned',
          contract: {
            employer_id: 'emp-123',
            employee: {
              first_name: 'Amara',
              last_name: 'Diallo',
              avatar_url: null,
            },
          },
        },
        {
          id: 'shift-2',
          start_time: '14:00',
          end_time: '18:00',
          shift_type: 'guard_24h',
          status: 'completed',
          contract: {
            employer_id: 'emp-123',
            employee: {
              first_name: 'Sofia',
              last_name: 'Reyes',
              avatar_url: null,
            },
          },
        },
      ],
      error: null,
    }

    renderWithProviders(<TodayPlanningWidget employerId="emp-123" />)

    await waitFor(() => {
      expect(screen.getByText('Amara Diallo')).toBeInTheDocument()
      expect(screen.getByText('Sofia Reyes')).toBeInTheDocument()
    })

    expect(screen.getByText('08:00 - 12:00')).toBeInTheDocument()
    expect(screen.getByText('14:00 - 18:00')).toBeInTheDocument()
    expect(screen.getByText('Travail effectif')).toBeInTheDocument()
    expect(screen.getByText('Garde 24h')).toBeInTheDocument()
    expect(screen.getByText('Planifié')).toBeInTheDocument()
    expect(screen.getByText('Terminé')).toBeInTheDocument()
  })

  it('affiche le lien "Voir tout" vers le planning', () => {
    renderWithProviders(<TodayPlanningWidget employerId="emp-123" />)
    expect(screen.getByText('Voir tout')).toBeInTheDocument()
  })
})
