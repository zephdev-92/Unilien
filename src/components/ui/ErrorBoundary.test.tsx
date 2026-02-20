import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { ErrorBoundary } from './ErrorBoundary'

// ── Helpers ────────────────────────────────────────────────────────────────────

// Composant qui lance une erreur
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test Error Message')
  }
  return <div data-testid="child">Enfant rendu correctement</div>
}

// Supprimer les erreurs console attendues
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  describe('Sans erreur', () => {
    it('rend les enfants normalement', () => {
      renderWithProviders(
        <ErrorBoundary>
          <div data-testid="child">Contenu</div>
        </ErrorBoundary>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })
  })

  describe('Avec erreur', () => {
    it('affiche "Une erreur est survenue" quand un enfant lance une erreur', () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      )
      expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument()
    })

    it('affiche le message de secours plutôt que les enfants', () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      )
      expect(screen.queryByTestId('child')).not.toBeInTheDocument()
    })

    it('affiche "Retour à l\'accueil" comme bouton de récupération', () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      )
      expect(screen.getByRole('button', { name: /Retour à l'accueil/i })).toBeInTheDocument()
    })

    it('affiche le fallback custom si fourni', () => {
      renderWithProviders(
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Erreur personnalisée</div>}>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      )
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.queryByText(/Une erreur est survenue/i)).not.toBeInTheDocument()
    })
  })
})
