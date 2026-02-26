import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/services/logbookService', () => ({
  createLogEntry: vi.fn(),
}))

// ─── Imports après mocks ──────────────────────────────────────────────────────

import { createLogEntry } from '@/services/logbookService'
import { NewLogEntryModal } from './NewLogEntryModal'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  employerId: 'employer-1',
  authorId: 'author-1',
  authorRole: 'employer' as const,
  onSuccess: vi.fn(),
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createLogEntry).mockResolvedValue({
    id: 'entry-1',
    employerId: 'employer-1',
    authorId: 'author-1',
    authorRole: 'employer',
    type: 'info',
    importance: 'normal',
    content: 'Test',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NewLogEntryModal', () => {
  describe('Visibilité', () => {
    it('affiche le titre "Nouvelle entrée" si isOpen=true', async () => {
      renderWithProviders(<NewLogEntryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Nouvelle entrée')).toBeInTheDocument()
      })
    })

    it('ne rend pas le contenu si isOpen=false', () => {
      renderWithProviders(
        <NewLogEntryModal {...defaultProps} isOpen={false} />
      )
      expect(screen.queryByText('Nouvelle entrée')).not.toBeInTheDocument()
    })
  })

  describe('Champs du formulaire', () => {
    it('affiche le select "Type d\'entrée" avec les options attendues', async () => {
      renderWithProviders(<NewLogEntryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /type d'entrée/i })).toBeInTheDocument()
      })

      const typeSelect = screen.getByRole('combobox', { name: /type d'entrée/i })
      expect(typeSelect).toContainHTML('Information - Note générale')
      expect(typeSelect).toContainHTML('Alerte - À surveiller')
      expect(typeSelect).toContainHTML('Incident - Événement important')
    })

    it('affiche le select "Importance" avec les options Normal/Urgent', async () => {
      renderWithProviders(<NewLogEntryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /importance/i })).toBeInTheDocument()
      })

      const importanceSelect = screen.getByRole('combobox', { name: /importance/i })
      expect(importanceSelect).toContainHTML('Normal')
      expect(importanceSelect).toContainHTML('Urgent')
    })

    it('affiche le textarea de contenu', async () => {
      renderWithProviders(<NewLogEntryModal {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/écrivez votre message ici/i)
        ).toBeInTheDocument()
      })
    })

    it('affiche le compteur de caractères 0/5000', async () => {
      renderWithProviders(<NewLogEntryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('0/5000')).toBeInTheDocument()
      })
    })

    it('met à jour le compteur quand on tape dans le textarea', async () => {
      const user = userEvent.setup()
      renderWithProviders(<NewLogEntryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/écrivez votre message ici/i)).toBeInTheDocument()
      })

      await user.type(
        screen.getByPlaceholderText(/écrivez votre message ici/i),
        'Hello'
      )

      await waitFor(() => {
        expect(screen.getByText('5/5000')).toBeInTheDocument()
      })
    })
  })

  describe('Boutons d\'action', () => {
    it('affiche les boutons Annuler et Enregistrer', async () => {
      renderWithProviders(<NewLogEntryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument()
      })
    })

    it('appelle onClose quand on clique sur Annuler', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      renderWithProviders(
        <NewLogEntryModal {...defaultProps} onClose={onClose} />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /annuler/i }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Soumission du formulaire', () => {
    it('appelle createLogEntry avec les bons paramètres lors de la soumission', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      const onClose = vi.fn()

      renderWithProviders(
        <NewLogEntryModal
          {...defaultProps}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/écrivez votre message ici/i)).toBeInTheDocument()
      })

      // Remplir le contenu
      await user.type(
        screen.getByPlaceholderText(/écrivez votre message ici/i),
        'Note importante concernant la patiente'
      )

      await user.click(screen.getByRole('button', { name: /enregistrer/i }))

      await waitFor(() => {
        expect(createLogEntry).toHaveBeenCalledWith(
          'employer-1',
          'author-1',
          'employer',
          expect.objectContaining({
            type: 'info',
            importance: 'normal',
            content: 'Note importante concernant la patiente',
          })
        )
        expect(onSuccess).toHaveBeenCalledTimes(1)
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })

    it('affiche une erreur si createLogEntry échoue', async () => {
      vi.mocked(createLogEntry).mockRejectedValue(new Error('Erreur réseau'))
      const user = userEvent.setup()

      renderWithProviders(<NewLogEntryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/écrivez votre message ici/i)).toBeInTheDocument()
      })

      await user.type(
        screen.getByPlaceholderText(/écrivez votre message ici/i),
        'Contenu test'
      )

      await user.click(screen.getByRole('button', { name: /enregistrer/i }))

      await waitFor(() => {
        expect(screen.getByText('Erreur réseau')).toBeInTheDocument()
      })
    })
  })
})
