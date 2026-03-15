import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { AbsenceRequestModal } from './AbsenceRequestModal'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/services/absenceService', () => ({
  createAbsence: vi.fn(),
  uploadJustification: vi.fn(),
  validateJustificationFile: vi.fn(() => ({ valid: true, error: null })),
}))

vi.mock('@/lib/absence', () => ({
  countBusinessDays: vi.fn(() => 5),
  FAMILY_EVENT_LABELS: {
    marriage: 'Mariage',
    pacs: 'PACS',
    birth: 'Naissance',
    adoption: 'Adoption',
    death_spouse: 'Décès du conjoint',
    death_parent: 'Décès d\'un parent',
    death_child: 'Décès d\'un enfant',
    death_sibling: 'Décès d\'un frère/sœur',
    death_in_law: 'Décès beau-parent',
    child_marriage: 'Mariage d\'un enfant',
    disability_announcement: 'Annonce handicap enfant',
  },
  FAMILY_EVENT_DAYS: {
    marriage: 4,
    pacs: 4,
    birth: 3,
    adoption: 3,
    death_spouse: 3,
    death_parent: 3,
    death_child: 5,
    death_sibling: 3,
    death_in_law: 3,
    child_marriage: 1,
    disability_announcement: 2,
  },
}))

// ─── Imports après mocks ─────────────────────────────────────────────────────

import { createAbsence } from '@/services/absenceService'
import { validateJustificationFile } from '@/services/absenceService'

// ─── Props par défaut ────────────────────────────────────────────────────────

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  employeeId: 'employee-1',
  contractId: 'contract-1',
  defaultDate: new Date('2026-02-20'),
  onSuccess: vi.fn(),
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createAbsence).mockResolvedValue({
    id: 'absence-1',
    employeeId: 'employee-1',
    contractId: 'contract-1',
    absenceType: 'vacation',
    startDate: new Date('2026-02-20'),
    endDate: new Date('2026-02-20'),
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AbsenceRequestModal', () => {
  describe('Visibilité du dialog', () => {
    it('ne rend pas le dialog si isOpen=false', () => {
      renderWithProviders(
        <AbsenceRequestModal {...defaultProps} isOpen={false} />
      )
      expect(screen.queryByText('Demander une absence')).not.toBeInTheDocument()
    })

    it('affiche le titre "Demander une absence" si isOpen=true', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Demander une absence')).toBeInTheDocument()
      })
    })
  })

  describe('Onglets catégories', () => {
    it('affiche les onglets de catégorie', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Congés' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Médical' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Familial' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Autre' })).toBeInTheDocument()
      })
    })

    it('affiche les options de type congé par défaut', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Congé payé (CP)')).toBeInTheDocument()
        expect(screen.getByText('Congé sans solde')).toBeInTheDocument()
        expect(screen.getByText('Congé formation (CPF)')).toBeInTheDocument()
      })
    })

    it('affiche les options médicales au clic sur l\'onglet Médical', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Médical' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: 'Médical' }))

      await waitFor(() => {
        expect(screen.getByText('Arrêt maladie')).toBeInTheDocument()
        expect(screen.getByText('Accident du travail')).toBeInTheDocument()
      })
    })

    it('affiche les événements familiaux au clic sur l\'onglet Familial', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Familial' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: 'Familial' }))

      await waitFor(() => {
        expect(screen.getByText('Mariage')).toBeInTheDocument()
        expect(screen.getByText('Naissance')).toBeInTheDocument()
      })
    })
  })

  describe('Bouton Annuler', () => {
    it('appelle onClose quand on clique sur "Annuler"', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      renderWithProviders(
        <AbsenceRequestModal {...defaultProps} onClose={onClose} />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Annuler/i }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Info contextuelle', () => {
    it('affiche l\'info contextuelle pour un congé payé', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Congé payé · Rémunéré/i)).toBeInTheDocument()
      })
    })
  })

  describe('Upload de justificatif (arrêt maladie)', () => {
    it('affiche la section d\'upload quand un type médical est sélectionné', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Médical' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: 'Médical' }))

      await waitFor(() => {
        expect(screen.getByLabelText(/Sélectionner un arrêt de travail/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Sélectionner un fichier/i })).toBeInTheDocument()
      })
    })

    it('affiche une erreur de fichier si validateJustificationFile retourne une erreur', async () => {
      vi.mocked(validateJustificationFile).mockReturnValue({
        valid: false,
        error: 'Le fichier est trop volumineux (max 5 Mo)',
      })

      const user = userEvent.setup()
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await user.click(screen.getByRole('tab', { name: 'Médical' }))

      await waitFor(() => {
        expect(screen.getByLabelText(/Sélectionner un arrêt de travail/i)).toBeInTheDocument()
      })

      const fileInput = screen.getByLabelText(/Sélectionner un arrêt de travail/i)
      const invalidFile = new File(['contenu'], 'test.pdf', { type: 'application/pdf' })

      await user.upload(fileInput, invalidFile)

      await waitFor(() => {
        expect(screen.getByText(/Le fichier est trop volumineux/i)).toBeInTheDocument()
      })
    })

    it('n\'affiche pas la section d\'upload pour un type congé', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      // Par défaut, onglet "Congés" avec "Congé payé" sélectionné
      expect(screen.queryByLabelText(/Sélectionner un arrêt de travail/i)).not.toBeInTheDocument()
    })
  })

  describe('Soumission du formulaire', () => {
    it('appelle createAbsence lors de la soumission pour un congé payé', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()

      renderWithProviders(
        <AbsenceRequestModal {...defaultProps} onSuccess={onSuccess} />
      )

      await waitFor(() => {
        expect(screen.getByText('Congé payé (CP)')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Envoyer la demande/i }))

      await waitFor(() => {
        expect(createAbsence).toHaveBeenCalledWith(
          'employee-1',
          expect.objectContaining({
            absenceType: 'vacation',
          })
        )
      })
    })

    it('affiche le bouton "Envoyer la demande"', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Envoyer la demande/i })
        ).toBeInTheDocument()
      })
    })

    it('n\'appelle pas createAbsence si le type maladie est sélectionné sans justificatif', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await user.click(screen.getByRole('tab', { name: 'Médical' }))

      await user.click(screen.getByRole('button', { name: /Envoyer la demande/i }))

      await waitFor(() => {
        expect(createAbsence).not.toHaveBeenCalled()
        expect(screen.getByText(/L'arrêt de travail est obligatoire/i)).toBeInTheDocument()
      })
    })
  })

  describe('Dates', () => {
    it('affiche les champs Date de début et Date de fin', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Date de début/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Date de fin/i)).toBeInTheDocument()
      })
    })
  })

  describe('Texte informatif', () => {
    it('affiche le message de validation avec mention de l\'employeur', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Votre demande sera transmise à/i)
        ).toBeInTheDocument()
      })
    })
  })
})
