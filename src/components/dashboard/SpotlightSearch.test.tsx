import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { SpotlightSearch } from '@/components/dashboard/SpotlightSearch'
import type { UseSpotlightSearchReturn } from '@/hooks/useSpotlightSearch'
import type { SearchResult } from '@/services/searchService'

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockSpotlight(overrides: Partial<UseSpotlightSearchReturn> = {}): UseSpotlightSearchReturn {
  return {
    isOpen: true,
    open: vi.fn(),
    close: vi.fn(),
    query: '',
    setQuery: vi.fn(),
    results: [],
    activeIndex: 0,
    setActiveIndex: vi.fn(),
    isLoading: false,
    handleKeyDown: vi.fn(),
    selectResult: vi.fn(),
    ...overrides,
  }
}

const mockResults: SearchResult[] = [
  { id: 'page-/planning', category: 'pages', icon: 'calendar', title: 'Planning', href: '/planning' },
  { id: 'team-aux-1', category: 'team', icon: 'users', title: 'Marie Dupont', subtitle: 'CDI', href: '/equipe' },
  { id: 'log-1', category: 'logbook', icon: 'book', title: 'Patient a bien mangé', subtitle: 'Information · Marie Dupont', href: '/cahier-de-liaison' },
]

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SpotlightSearch', () => {
  it('affiche le placeholder quand ouvert sans query', () => {
    const spotlight = createMockSpotlight()
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)
    expect(screen.getByPlaceholderText(/rechercher une page/i)).toBeInTheDocument()
    expect(screen.getByText(/tapez pour rechercher/i)).toBeInTheDocument()
  })

  it('ne rend rien quand fermé', () => {
    const spotlight = createMockSpotlight({ isOpen: false })
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)
    expect(screen.queryByPlaceholderText(/rechercher/i)).not.toBeInTheDocument()
  })

  it('affiche le message de chargement', () => {
    const spotlight = createMockSpotlight({ isLoading: true })
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)
    expect(screen.getByText(/chargement/i)).toBeInTheDocument()
  })

  it('affiche "aucun résultat" quand query sans match', () => {
    const spotlight = createMockSpotlight({ query: 'xyz', results: [] })
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)
    expect(screen.getByText(/aucun résultat pour « xyz »/i)).toBeInTheDocument()
  })

  it('affiche les résultats groupés par catégorie', () => {
    const spotlight = createMockSpotlight({ query: 'mar', results: mockResults })
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)

    // Labels de catégorie
    expect(screen.getByText('Pages')).toBeInTheDocument()
    expect(screen.getByText('Équipe')).toBeInTheDocument()
    expect(screen.getByText('Cahier de liaison')).toBeInTheDocument()

    // Résultats
    expect(screen.getByText('Planning')).toBeInTheDocument()
    expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
    expect(screen.getByText('Patient a bien mangé')).toBeInTheDocument()
  })

  it('affiche le subtitle des résultats', () => {
    const spotlight = createMockSpotlight({ query: 'test', results: mockResults })
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)
    expect(screen.getByText('CDI')).toBeInTheDocument()
  })

  it('appelle selectResult au clic sur un résultat', async () => {
    const user = userEvent.setup()
    const spotlight = createMockSpotlight({ query: 'test', results: mockResults })
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)

    await user.click(screen.getByText('Marie Dupont'))
    expect(spotlight.selectResult).toHaveBeenCalledWith(mockResults[1])
  })

  it('appelle setQuery quand on tape dans l input', async () => {
    const user = userEvent.setup()
    const spotlight = createMockSpotlight()
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)

    const input = screen.getByPlaceholderText(/rechercher une page/i)
    await user.type(input, 'a')
    expect(spotlight.setQuery).toHaveBeenCalled()
  })

  it('affiche le footer avec les raccourcis', () => {
    const spotlight = createMockSpotlight()
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)
    expect(screen.getByText('naviguer')).toBeInTheDocument()
    expect(screen.getByText('ouvrir')).toBeInTheDocument()
    expect(screen.getByText('fermer')).toBeInTheDocument()
  })

  it('marque le résultat actif avec aria-selected', () => {
    const spotlight = createMockSpotlight({
      query: 'test',
      results: mockResults,
      activeIndex: 1,
    })
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)

    const options = screen.getAllByRole('option')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    expect(options[0]).toHaveAttribute('aria-selected', 'false')
  })

  it('a les attributs ARIA corrects sur l input', () => {
    const spotlight = createMockSpotlight({ results: mockResults, query: 'test' })
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)

    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(input).toHaveAttribute('aria-controls', 'spotlight-results')
  })

  it('annonce le nombre de résultats pour les screen readers', () => {
    const spotlight = createMockSpotlight({ query: 'test', results: mockResults })
    renderWithProviders(<SpotlightSearch spotlight={spotlight} />)
    // L'annonce live est dans un élément sr-only
    expect(screen.getByText(/3 résultats trouvés/)).toBeInTheDocument()
  })
})
