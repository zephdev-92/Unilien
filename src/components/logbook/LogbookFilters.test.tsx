import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { LogbookFilters } from './LogbookFilters'
import type { LogEntryFilters } from '@/services/logbookService'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LogbookFilters', () => {
  const emptyFilters: LogEntryFilters = {}

  describe('Rendu de base', () => {
    it('affiche le titre "Filtres"', () => {
      renderWithProviders(
        <LogbookFilters filters={emptyFilters} onFiltersChange={vi.fn()} />
      )
      expect(screen.getByText('Filtres')).toBeInTheDocument()
    })

    it('affiche le select "Type"', () => {
      renderWithProviders(
        <LogbookFilters filters={emptyFilters} onFiltersChange={vi.fn()} />
      )
      expect(screen.getByText('Type')).toBeInTheDocument()
    })

    it('affiche le select "Importance"', () => {
      renderWithProviders(
        <LogbookFilters filters={emptyFilters} onFiltersChange={vi.fn()} />
      )
      expect(screen.getByText('Importance')).toBeInTheDocument()
    })

    it('affiche le select "Auteur"', () => {
      renderWithProviders(
        <LogbookFilters filters={emptyFilters} onFiltersChange={vi.fn()} />
      )
      expect(screen.getByText('Auteur')).toBeInTheDocument()
    })

    it('affiche la checkbox "Non lues uniquement"', () => {
      renderWithProviders(
        <LogbookFilters filters={emptyFilters} onFiltersChange={vi.fn()} />
      )
      expect(screen.getByText('Non lues uniquement')).toBeInTheDocument()
    })
  })

  describe('Bouton Réinitialiser', () => {
    it('n\'affiche pas le bouton Réinitialiser si aucun filtre actif', () => {
      renderWithProviders(
        <LogbookFilters filters={emptyFilters} onFiltersChange={vi.fn()} />
      )
      expect(screen.queryByText(/réinitialiser/i)).not.toBeInTheDocument()
    })

    it('affiche le bouton Réinitialiser si un filtre de type est actif', () => {
      renderWithProviders(
        <LogbookFilters
          filters={{ type: ['info'] }}
          onFiltersChange={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeInTheDocument()
    })

    it('affiche le bouton Réinitialiser si unreadOnly=true', () => {
      renderWithProviders(
        <LogbookFilters
          filters={{ unreadOnly: true }}
          onFiltersChange={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeInTheDocument()
    })

    it('appelle onFiltersChange avec {} au clic sur Réinitialiser', async () => {
      const user = userEvent.setup()
      const onFiltersChange = vi.fn()
      renderWithProviders(
        <LogbookFilters
          filters={{ type: ['info'] }}
          onFiltersChange={onFiltersChange}
        />
      )
      await user.click(screen.getByRole('button', { name: /réinitialiser/i }))
      expect(onFiltersChange).toHaveBeenCalledWith({})
    })
  })

  describe('Changement de filtre — type', () => {
    it('appelle onFiltersChange avec type=["alert"] quand on sélectionne "Alerte"', async () => {
      const user = userEvent.setup()
      const onFiltersChange = vi.fn()
      renderWithProviders(
        <LogbookFilters filters={emptyFilters} onFiltersChange={onFiltersChange} />
      )
      // Trouver le select de Type via le select lui-même (premier select)
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'alert')
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: ['alert'] })
      )
    })

    it('appelle onFiltersChange avec type=undefined quand on sélectionne "Tous les types"', async () => {
      const user = userEvent.setup()
      const onFiltersChange = vi.fn()
      renderWithProviders(
        <LogbookFilters filters={{ type: ['info'] }} onFiltersChange={onFiltersChange} />
      )
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], '')
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
        <LogbookFilters filters={emptyFilters} onFiltersChange={onFiltersChange} />
      )
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[1], 'urgent')
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
        <LogbookFilters filters={emptyFilters} onFiltersChange={onFiltersChange} />
      )
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[2], 'employer')
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ authorRole: 'employer' })
      )
    })
  })
})
