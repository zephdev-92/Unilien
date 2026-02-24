import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { AccessibleInput } from './AccessibleInput'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AccessibleInput', () => {
  describe('Rendu de base', () => {
    it('affiche le label', () => {
      renderWithProviders(<AccessibleInput label="Email" />)
      expect(screen.getByText('Email')).toBeInTheDocument()
    })

    it('rend un champ input', () => {
      renderWithProviders(<AccessibleInput label="Email" />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('associe le label à l\'input via htmlFor', () => {
      renderWithProviders(<AccessibleInput label="Email" />)
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('accepte et affiche une valeur (type text par défaut)', () => {
      renderWithProviders(<AccessibleInput label="Nom" value="Jean Dupont" readOnly />)
      expect(screen.getByDisplayValue('Jean Dupont')).toBeInTheDocument()
    })

    it('accepte un placeholder', () => {
      renderWithProviders(<AccessibleInput label="Email" placeholder="exemple@mail.fr" />)
      expect(screen.getByPlaceholderText('exemple@mail.fr')).toBeInTheDocument()
    })
  })

  describe('Message d\'erreur', () => {
    it('affiche le message d\'erreur si error fourni', () => {
      renderWithProviders(<AccessibleInput label="Email" error="Format invalide" />)
      expect(screen.getByText('Format invalide')).toBeInTheDocument()
    })

    it('n\'affiche pas de message d\'erreur si error absent', () => {
      renderWithProviders(<AccessibleInput label="Email" />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Texte d\'aide', () => {
    it('affiche le texte d\'aide si helperText fourni et pas d\'erreur', () => {
      renderWithProviders(<AccessibleInput label="Email" helperText="Utilisez votre email principal" />)
      expect(screen.getByText('Utilisez votre email principal')).toBeInTheDocument()
    })

    it('n\'affiche pas helperText si une erreur est présente', () => {
      renderWithProviders(
        <AccessibleInput label="Email" helperText="Conseil" error="Erreur" />
      )
      expect(screen.queryByText('Conseil')).not.toBeInTheDocument()
    })
  })

  describe('Éléments latéraux', () => {
    it('affiche leftElement si fourni', () => {
      renderWithProviders(
        <AccessibleInput label="Email" leftElement={<span data-testid="left">@</span>} />
      )
      expect(screen.getByTestId('left')).toBeInTheDocument()
    })

    it('affiche rightElement si fourni', () => {
      renderWithProviders(
        <AccessibleInput label="Email" rightElement={<span data-testid="right">✓</span>} />
      )
      expect(screen.getByTestId('right')).toBeInTheDocument()
    })
  })

  describe('État désactivé', () => {
    it('est désactivé si disabled=true', () => {
      renderWithProviders(<AccessibleInput label="Email" disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })
})
