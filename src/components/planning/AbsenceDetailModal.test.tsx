import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import type { Absence } from '@/types'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/services/absenceService', () => ({
  updateAbsenceStatus: vi.fn(),
  cancelAbsence: vi.fn(),
}))

// ─── Imports après mocks ──────────────────────────────────────────────────────

import { updateAbsenceStatus, cancelAbsence } from '@/services/absenceService'
import { AbsenceDetailModal } from './AbsenceDetailModal'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockAbsence: Absence = {
  id: 'absence-1',
  employeeId: 'employee-1',
  absenceType: 'vacation',
  startDate: new Date('2026-03-10'),
  endDate: new Date('2026-03-14'),
  status: 'pending',
  createdAt: new Date('2026-02-20'),
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  absence: mockAbsence,
  userRole: 'employer' as const,
  userId: 'employer-1',
  onSuccess: vi.fn(),
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(updateAbsenceStatus).mockResolvedValue(undefined as never)
  vi.mocked(cancelAbsence).mockResolvedValue(undefined as never)
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AbsenceDetailModal', () => {
  describe('Visibilité', () => {
    it('ne rend rien si absence est null', () => {
      renderWithProviders(
        <AbsenceDetailModal {...defaultProps} absence={null} />
      )
      expect(screen.queryByText('Demande d\'absence')).not.toBeInTheDocument()
    })

    it('affiche le titre "Demande d\'absence" si isOpen=true et absence non nulle', async () => {
      renderWithProviders(<AbsenceDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Demande d\'absence')).toBeInTheDocument()
      })
    })

    it('n\'affiche pas le contenu si isOpen=false', () => {
      renderWithProviders(
        <AbsenceDetailModal {...defaultProps} isOpen={false} />
      )
      expect(screen.queryByText('Demande d\'absence')).not.toBeInTheDocument()
    })
  })

  describe('Affichage des données', () => {
    it('affiche le type d\'absence "Congé payé" pour vacation', async () => {
      renderWithProviders(<AbsenceDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Congé payé')).toBeInTheDocument()
      })
    })

    it('affiche le type d\'absence "Maladie" pour sick', async () => {
      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          absence={{ ...mockAbsence, absenceType: 'sick' }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Maladie')).toBeInTheDocument()
      })
    })

    it('affiche le statut "En attente" pour pending', async () => {
      renderWithProviders(<AbsenceDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('En attente')).toBeInTheDocument()
      })
    })

    it('affiche le statut "Approuvée" pour approved', async () => {
      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          absence={{ ...mockAbsence, status: 'approved' }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Approuvée')).toBeInTheDocument()
      })
    })

    it('affiche le statut "Refusée" pour rejected', async () => {
      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          absence={{ ...mockAbsence, status: 'rejected' }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Refusée')).toBeInTheDocument()
      })
    })

    it('affiche le motif quand reason est présent', async () => {
      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          absence={{ ...mockAbsence, reason: 'Vacances en famille' }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Vacances en famille')).toBeInTheDocument()
      })
    })

    it('affiche la section "Date" pour une seule journée (même date début et fin)', async () => {
      const singleDayAbsence: Absence = {
        ...mockAbsence,
        startDate: new Date('2026-03-10'),
        endDate: new Date('2026-03-10'),
      }

      renderWithProviders(
        <AbsenceDetailModal {...defaultProps} absence={singleDayAbsence} />
      )

      await waitFor(() => {
        expect(screen.getByText('Date')).toBeInTheDocument()
      })
    })

    it('affiche la section "Période" pour une plage de dates', async () => {
      renderWithProviders(<AbsenceDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Période')).toBeInTheDocument()
      })
    })
  })

  describe('Section arrêt maladie', () => {
    it('affiche la section "Arrêt de travail" quand absenceType=sick', async () => {
      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          absence={{ ...mockAbsence, absenceType: 'sick' }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Arrêt de travail')).toBeInTheDocument()
      })
    })

    it('affiche "Aucun justificatif fourni" quand sick sans justificationUrl', async () => {
      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          absence={{ ...mockAbsence, absenceType: 'sick', justificationUrl: undefined }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Aucun justificatif fourni')).toBeInTheDocument()
      })
    })

    it('affiche "Justificatif fourni" avec lien si justificationUrl est présent', async () => {
      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          absence={{
            ...mockAbsence,
            absenceType: 'sick',
            justificationUrl: 'https://storage.example.com/doc.pdf',
          }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Justificatif fourni')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /voir/i })).toBeInTheDocument()
      })
    })

    it('n\'affiche PAS la section "Arrêt de travail" pour vacation', async () => {
      renderWithProviders(<AbsenceDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText('Arrêt de travail')).not.toBeInTheDocument()
      })
    })
  })

  describe('Permissions — boutons d\'action', () => {
    it('affiche Approuver et Refuser pour employer avec status pending', async () => {
      renderWithProviders(
        <AbsenceDetailModal {...defaultProps} userRole="employer" />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approuver/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /refuser/i })).toBeInTheDocument()
      })
    })

    it('affiche "Annuler ma demande" pour employee avec status pending', async () => {
      renderWithProviders(
        <AbsenceDetailModal {...defaultProps} userRole="employee" />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /annuler ma demande/i })).toBeInTheDocument()
      })
      expect(screen.queryByRole('button', { name: /approuver/i })).not.toBeInTheDocument()
    })

    it('affiche seulement "Fermer" pour employer avec status approved', async () => {
      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          userRole="employer"
          absence={{ ...mockAbsence, status: 'approved' }}
        />
      )

      await waitFor(() => {
        // Le CloseTrigger (X) + le bouton footer ont tous deux l'accessible name "Fermer"
        const fermerButtons = screen.getAllByRole('button', { name: /fermer/i })
        expect(fermerButtons.length).toBeGreaterThanOrEqual(1)
      })
      expect(screen.queryByRole('button', { name: /approuver/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /refuser/i })).not.toBeInTheDocument()
    })

    it('affiche seulement "Fermer" pour employee avec status approved', async () => {
      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          userRole="employee"
          absence={{ ...mockAbsence, status: 'approved' }}
        />
      )

      await waitFor(() => {
        const fermerButtons = screen.getAllByRole('button', { name: /fermer/i })
        expect(fermerButtons.length).toBeGreaterThanOrEqual(1)
      })
      expect(screen.queryByRole('button', { name: /annuler ma demande/i })).not.toBeInTheDocument()
    })
  })

  describe('Actions — Approuver', () => {
    it('appelle updateAbsenceStatus avec "approved" quand on clique sur Approuver', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      const onClose = vi.fn()

      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          userRole="employer"
          onSuccess={onSuccess}
          onClose={onClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approuver/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /approuver/i }))

      await waitFor(() => {
        expect(updateAbsenceStatus).toHaveBeenCalledWith('absence-1', 'approved')
        expect(onSuccess).toHaveBeenCalledTimes(1)
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Actions — Refuser', () => {
    it('appelle updateAbsenceStatus avec "rejected" quand on clique sur Refuser', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      const onClose = vi.fn()

      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          userRole="employer"
          onSuccess={onSuccess}
          onClose={onClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refuser/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /refuser/i }))

      await waitFor(() => {
        expect(updateAbsenceStatus).toHaveBeenCalledWith('absence-1', 'rejected')
        expect(onSuccess).toHaveBeenCalledTimes(1)
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })

    it('affiche une erreur si updateAbsenceStatus rejette', async () => {
      vi.mocked(updateAbsenceStatus).mockRejectedValue(new Error('Erreur serveur'))
      const user = userEvent.setup()

      renderWithProviders(
        <AbsenceDetailModal {...defaultProps} userRole="employer" />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refuser/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /refuser/i }))

      await waitFor(() => {
        expect(screen.getByText(/erreur serveur/i)).toBeInTheDocument()
      })
    })
  })

  describe('Actions — Annuler (employee)', () => {
    it('appelle cancelAbsence quand l\'employee confirme l\'annulation', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      const user = userEvent.setup()
      const onSuccess = vi.fn()
      const onClose = vi.fn()

      renderWithProviders(
        <AbsenceDetailModal
          {...defaultProps}
          userRole="employee"
          userId="employee-1"
          onSuccess={onSuccess}
          onClose={onClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /annuler ma demande/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /annuler ma demande/i }))

      await waitFor(() => {
        expect(cancelAbsence).toHaveBeenCalledWith('absence-1', 'employee-1')
        expect(onSuccess).toHaveBeenCalledTimes(1)
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })

    it('ne call pas cancelAbsence si l\'employee annule la confirmation', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)

      const user = userEvent.setup()

      renderWithProviders(
        <AbsenceDetailModal {...defaultProps} userRole="employee" />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /annuler ma demande/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /annuler ma demande/i }))

      expect(cancelAbsence).not.toHaveBeenCalled()
    })
  })
})
