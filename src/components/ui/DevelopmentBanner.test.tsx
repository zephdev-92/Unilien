import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { DevelopmentBanner } from './DevelopmentBanner'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('DevelopmentBanner', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Rendu initial', () => {
    it('affiche le bandeau par défaut', () => {
      renderWithProviders(<DevelopmentBanner />)
      expect(screen.getByText(/application en cours de développement/i)).toBeInTheDocument()
    })

    it('affiche le lien de feedback', () => {
      renderWithProviders(<DevelopmentBanner />)
      expect(screen.getByText(/donnez votre avis/i)).toBeInTheDocument()
    })

    it('affiche le bouton de fermeture', () => {
      renderWithProviders(<DevelopmentBanner />)
      expect(screen.getByRole('button', { name: /fermer le bandeau/i })).toBeInTheDocument()
    })
  })

  describe('Masquage via localStorage', () => {
    it('ne s\'affiche pas si déjà rejeté (localStorage)', () => {
      localStorage.setItem('unilien_dev_banner_dismissed', 'true')
      const { container } = renderWithProviders(<DevelopmentBanner />)
      expect(container).toBeEmptyDOMElement()
    })

    it('utilise la storageKey personnalisée', () => {
      localStorage.setItem('custom_key', 'true')
      const { container } = renderWithProviders(<DevelopmentBanner storageKey="custom_key" />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('Interaction — fermeture', () => {
    it('masque le bandeau après clic sur fermer', async () => {
      const user = userEvent.setup()
      renderWithProviders(<DevelopmentBanner />)

      await user.click(screen.getByRole('button', { name: /fermer le bandeau/i }))

      expect(screen.queryByText(/application en cours de développement/i)).not.toBeInTheDocument()
    })

    it('persiste le rejet dans localStorage après clic', async () => {
      const user = userEvent.setup()
      renderWithProviders(<DevelopmentBanner />)

      await user.click(screen.getByRole('button', { name: /fermer le bandeau/i }))

      expect(localStorage.getItem('unilien_dev_banner_dismissed')).toBe('true')
    })

    it('appelle onDismiss si fourni', async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()
      renderWithProviders(<DevelopmentBanner onDismiss={onDismiss} />)

      await user.click(screen.getByRole('button', { name: /fermer le bandeau/i }))

      expect(onDismiss).toHaveBeenCalledOnce()
    })
  })
})
