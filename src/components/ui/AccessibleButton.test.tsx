import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { AccessibleButton } from './AccessibleButton'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AccessibleButton', () => {
  describe('Rendu de base', () => {
    it('affiche le texte enfant', () => {
      renderWithProviders(<AccessibleButton>Cliquez ici</AccessibleButton>)
      expect(screen.getByText('Cliquez ici')).toBeInTheDocument()
    })

    it('est un élément button', () => {
      renderWithProviders(<AccessibleButton>Action</AccessibleButton>)
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })

    it('appelle onClick au clic', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      renderWithProviders(<AccessibleButton onClick={onClick}>Clic</AccessibleButton>)
      await user.click(screen.getByRole('button'))
      expect(onClick).toHaveBeenCalledOnce()
    })
  })

  describe('État désactivé', () => {
    it('est désactivé si disabled=true', () => {
      renderWithProviders(<AccessibleButton disabled>Désactivé</AccessibleButton>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('a aria-disabled=true si disabled=true', () => {
      renderWithProviders(<AccessibleButton disabled>Btn</AccessibleButton>)
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
    })

    it('n\'appelle pas onClick si désactivé', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      renderWithProviders(<AccessibleButton disabled onClick={onClick}>Désactivé</AccessibleButton>)
      await user.click(screen.getByRole('button'))
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('État chargement', () => {
    it('est désactivé si loading=true', () => {
      renderWithProviders(<AccessibleButton loading>Charger</AccessibleButton>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('a aria-busy=true si loading=true', () => {
      renderWithProviders(<AccessibleButton loading>Charger</AccessibleButton>)
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    })

    it('affiche loadingText pendant le chargement si fourni', () => {
      renderWithProviders(
        <AccessibleButton loading loadingText="Chargement...">Envoyer</AccessibleButton>
      )
      expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('affiche le contenu original si loading sans loadingText', () => {
      renderWithProviders(<AccessibleButton loading>Envoyer</AccessibleButton>)
      expect(screen.getByText('Envoyer')).toBeInTheDocument()
    })
  })

  describe('Label accessible', () => {
    it('utilise accessibleLabel comme aria-label', () => {
      renderWithProviders(
        <AccessibleButton accessibleLabel="Fermer la boîte de dialogue">✕</AccessibleButton>
      )
      expect(screen.getByRole('button', { name: 'Fermer la boîte de dialogue' })).toBeInTheDocument()
    })
  })

  describe('Icônes', () => {
    it('affiche leftIcon si non en chargement', () => {
      renderWithProviders(
        <AccessibleButton leftIcon={<span data-testid="left-icon">⬅</span>}>
          Action
        </AccessibleButton>
      )
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('n\'affiche pas leftIcon si loading=true', () => {
      renderWithProviders(
        <AccessibleButton loading leftIcon={<span data-testid="left-icon">⬅</span>}>
          Action
        </AccessibleButton>
      )
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument()
    })

    it('affiche rightIcon si non en chargement', () => {
      renderWithProviders(
        <AccessibleButton rightIcon={<span data-testid="right-icon">➡</span>}>
          Action
        </AccessibleButton>
      )
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('n\'affiche pas rightIcon si loading=true', () => {
      renderWithProviders(
        <AccessibleButton loading rightIcon={<span data-testid="right-icon">➡</span>}>
          Action
        </AccessibleButton>
      )
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument()
    })
  })
})
