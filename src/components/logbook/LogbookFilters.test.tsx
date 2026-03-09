import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { LogbookFilters } from './LogbookFilters'
import type { LogEntryFilters } from '@/services/logbookService'

describe('LogbookFilters', () => {
  const emptyFilters: LogEntryFilters = {}
  const defaultProps = {
    filters: emptyFilters,
    searchQuery: '',
    onSearchChange: vi.fn(),
    onFiltersChange: vi.fn(),
  }

  describe('Rendu de base', () => {
    it('affiche le champ de recherche', () => {
      renderWithProviders(<LogbookFilters {...defaultProps} />)
      expect(screen.getByPlaceholderText('Rechercher dans le journal...')).toBeInTheDocument()
    })

    it('affiche les boutons de categorie', () => {
      renderWithProviders(<LogbookFilters {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Observation' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Incident' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Alerte' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Instruction' })).toBeInTheDocument()
    })

    it('affiche le select "Importance"', () => {
      renderWithProviders(<LogbookFilters {...defaultProps} />)
      expect(screen.getByText('Importance')).toBeInTheDocument()
    })

    it('affiche le select "Auteur"', () => {
      renderWithProviders(<LogbookFilters {...defaultProps} />)
      expect(screen.getByText('Auteur')).toBeInTheDocument()
    })

    it('affiche la checkbox "Non lues uniquement"', () => {
      renderWithProviders(<LogbookFilters {...defaultProps} />)
      expect(screen.getByText('Non lues uniquement')).toBeInTheDocument()
    })
  })

  describe('Bouton Reinitialiser', () => {
    it('n\'affiche pas le bouton Reinitialiser si aucun filtre actif', () => {
      renderWithProviders(<LogbookFilters {...defaultProps} />)
      expect(screen.queryByRole('button', { name: /reinitialiser/i })).not.toBeInTheDocument()
    })

    it('affiche le bouton Reinitialiser si un filtre de type est actif', () => {
      renderWithProviders(
        <LogbookFilters {...defaultProps} filters={{ type: ['info'] }} />
      )
      expect(screen.getByRole('button', { name: /reinitialiser/i })).toBeInTheDocument()
    })

    it('affiche le bouton Reinitialiser si unreadOnly=true', () => {
      renderWithProviders(
        <LogbookFilters {...defaultProps} filters={{ unreadOnly: true }} />
      )
      expect(screen.getByRole('button', { name: /reinitialiser/i })).toBeInTheDocument()
    })

    it('affiche le bouton Reinitialiser si searchQuery non vide', () => {
      renderWithProviders(
        <LogbookFilters {...defaultProps} searchQuery="test" />
      )
      expect(screen.getByRole('button', { name: /reinitialiser/i })).toBeInTheDocument()
    })

    it('appelle onFiltersChange et onSearchChange au clic sur Reinitialiser', async () => {
      const user = userEvent.setup()
      const onFiltersChange = vi.fn()
      const onSearchChange = vi.fn()
      renderWithProviders(
        <LogbookFilters
          filters={{ type: ['info'] }}
          searchQuery="test"
          onSearchChange={onSearchChange}
          onFiltersChange={onFiltersChange}
        />
      )
      await user.click(screen.getByRole('button', { name: /reinitialiser/i }))
      expect(onFiltersChange).toHaveBeenCalledWith({})
      expect(onSearchChange).toHaveBeenCalledWith('')
    })
  })

  describe('Changement de filtre — categorie (pills)', () => {
    it('appelle onFiltersChange avec type=["incident"] au clic sur Incident', async () => {
      const user = userEvent.setup()
      const onFiltersChange = vi.fn()
      renderWithProviders(
        <LogbookFilters {...defaultProps} onFiltersChange={onFiltersChange} />
      )
      await user.click(screen.getByRole('button', { name: 'Incident' }))
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: ['incident'] })
      )
    })

    it('retire le type au second clic (toggle off)', async () => {
      const user = userEvent.setup()
      const onFiltersChange = vi.fn()
      renderWithProviders(
        <LogbookFilters
          {...defaultProps}
          filters={{ type: ['info'] }}
          onFiltersChange={onFiltersChange}
        />
      )
      await user.click(screen.getByRole('button', { name: 'Observation' }))
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: undefined })
      )
    })
  })

  describe('Changement de filtre — importance', () => {
    it('appelle onFiltersChange avec importance="urgent"', async () => {
      const user = userEvent.setup()
      const onFiltersChange = vi.fn()
      renderWithProviders(
        <LogbookFilters {...defaultProps} onFiltersChange={onFiltersChange} />
      )
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'urgent')
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ importance: 'urgent' })
      )
    })
  })

  describe('Changement de filtre — auteur', () => {
    it('appelle onFiltersChange avec authorRole="employer"', async () => {
      const user = userEvent.setup()
      const onFiltersChange = vi.fn()
      renderWithProviders(
        <LogbookFilters {...defaultProps} onFiltersChange={onFiltersChange} />
      )
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[1], 'employer')
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ authorRole: 'employer' })
      )
    })
  })

  describe('Recherche', () => {
    it('appelle onSearchChange quand on tape dans le champ', async () => {
      const user = userEvent.setup()
      const onSearchChange = vi.fn()
      renderWithProviders(
        <LogbookFilters {...defaultProps} onSearchChange={onSearchChange} />
      )
      await user.type(screen.getByPlaceholderText('Rechercher dans le journal...'), 'test')
      expect(onSearchChange).toHaveBeenCalled()
    })
  })
})
