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
      expect(screen.getByPlaceholderText('Rechercher dans le journal\u2026')).toBeInTheDocument()
    })

    it('affiche le select de filtrage par auteur', () => {
      renderWithProviders(<LogbookFilters {...defaultProps} />)
      expect(screen.getByLabelText('Filtrer par auteur')).toBeInTheDocument()
    })

    it('affiche le select de filtrage par categorie', () => {
      renderWithProviders(<LogbookFilters {...defaultProps} />)
      expect(screen.getByLabelText('Filtrer par catégorie')).toBeInTheDocument()
    })

    it('affiche les options de categorie dans le dropdown', () => {
      renderWithProviders(<LogbookFilters {...defaultProps} />)
      expect(screen.getByText('Toutes les catégories')).toBeInTheDocument()
      expect(screen.getByText('Observation')).toBeInTheDocument()
      expect(screen.getByText('Incident')).toBeInTheDocument()
      expect(screen.getByText('Alerte')).toBeInTheDocument()
      expect(screen.getByText('Instruction')).toBeInTheDocument()
    })

    it('affiche les options d\'auteur dans le dropdown', () => {
      renderWithProviders(<LogbookFilters {...defaultProps} />)
      expect(screen.getByText('Tous les auteurs')).toBeInTheDocument()
      expect(screen.getByText('Employeur')).toBeInTheDocument()
      expect(screen.getByText('Auxiliaire')).toBeInTheDocument()
      expect(screen.getByText('Aidant')).toBeInTheDocument()
    })
  })

  describe('Changement de filtre — categorie (select)', () => {
    it('appelle onFiltersChange avec type=["incident"] au changement de categorie', async () => {
      const user = userEvent.setup()
      const onFiltersChange = vi.fn()
      renderWithProviders(
        <LogbookFilters {...defaultProps} onFiltersChange={onFiltersChange} />
      )
      const categorySelect = screen.getByLabelText('Filtrer par catégorie')
      await user.selectOptions(categorySelect, 'incident')
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: ['incident'] })
      )
    })

    it('appelle onFiltersChange avec type=undefined si "Toutes" selectionne', async () => {
      const user = userEvent.setup()
      const onFiltersChange = vi.fn()
      renderWithProviders(
        <LogbookFilters
          {...defaultProps}
          filters={{ type: ['info'] }}
          onFiltersChange={onFiltersChange}
        />
      )
      const categorySelect = screen.getByLabelText('Filtrer par catégorie')
      await user.selectOptions(categorySelect, '')
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: undefined })
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
      const authorSelect = screen.getByLabelText('Filtrer par auteur')
      await user.selectOptions(authorSelect, 'employer')
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ authorRole: 'employer' })
      )
    })

    it('appelle onFiltersChange avec authorRole=undefined si "Tous" selectionne', async () => {
      const user = userEvent.setup()
      const onFiltersChange = vi.fn()
      renderWithProviders(
        <LogbookFilters
          {...defaultProps}
          filters={{ authorRole: 'employer' }}
          onFiltersChange={onFiltersChange}
        />
      )
      const authorSelect = screen.getByLabelText('Filtrer par auteur')
      await user.selectOptions(authorSelect, '')
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ authorRole: undefined })
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
      await user.type(screen.getByPlaceholderText('Rechercher dans le journal\u2026'), 'test')
      expect(onSearchChange).toHaveBeenCalled()
    })
  })
})
