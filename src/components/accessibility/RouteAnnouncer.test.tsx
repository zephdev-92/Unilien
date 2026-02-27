import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RouteAnnouncer } from './RouteAnnouncer'

// Composants fictifs pour les tests de navigation
function PageA() {
  return <div>Page A</div>
}
function PageB() {
  return <div>Page B</div>
}

function TestApp({ initialEntries }: { initialEntries: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <RouteAnnouncer />
      <Routes>
        <Route path="/tableau-de-bord" element={<PageA />} />
        <Route path="/planning" element={<PageB />} />
        <Route path="/connexion" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RouteAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.title = 'Unilien'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rend la région aria-live sans texte au montage initial', () => {
    render(<TestApp initialEntries={['/tableau-de-bord']} />)
    const region = screen.getByTestId('route-announcer')

    expect(region).toBeInTheDocument()
    expect(region).toHaveAttribute('aria-live', 'assertive')
    expect(region).toHaveAttribute('aria-atomic', 'true')
  })

  it('met à jour document.title dès le montage initial', () => {
    render(<TestApp initialEntries={['/tableau-de-bord']} />)
    // Le title est mis à jour même sur le premier rendu
    expect(document.title).toBe('Tableau de bord — Unilien')
  })

  it("met à jour document.title pour d'autres routes connues", () => {
    render(<TestApp initialEntries={['/planning']} />)
    expect(document.title).toBe('Planning — Unilien')
  })

  it("utilise 'Page inconnue' pour une route non répertoriée", () => {
    render(
      <MemoryRouter initialEntries={['/route-inconnue']}>
        <RouteAnnouncer />
      </MemoryRouter>
    )
    expect(document.title).toBe('Page inconnue — Unilien')
  })

  it("n'annonce pas la navigation initiale dans la région live", () => {
    render(<TestApp initialEntries={['/tableau-de-bord']} />)
    act(() => { vi.runAllTimers() })

    const region = screen.getByTestId('route-announcer')
    // Pas d'annonce au premier rendu
    expect(region.textContent).toBe('')
  })

  it('est visuellement masqué (styles clip)', () => {
    render(<TestApp initialEntries={['/tableau-de-bord']} />)
    const region = screen.getByTestId('route-announcer')

    expect(region).toHaveStyle({
      position: 'absolute',
      width: '1px',
      height: '1px',
    })
  })
})
