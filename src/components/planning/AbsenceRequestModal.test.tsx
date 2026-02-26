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

vi.mock('@/services/leaveBalanceService', () => ({
  getLeaveBalance: vi.fn(),
}))

vi.mock('@/lib/absence', () => ({
  countBusinessDays: vi.fn(() => 5),
  getLeaveYear: vi.fn(() => 2026),
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
import { getLeaveBalance } from '@/services/leaveBalanceService'
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
  vi.mocked(getLeaveBalance).mockResolvedValue({
    contractId: 'contract-1',
    leaveYear: 2026,
    acquiredDays: 25,
    takenDays: 0,
    adjustmentDays: 0,
    remainingDays: 25,
    updatedAt: new Date(),
  })
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
      expect(screen.queryByText('Déclarer une absence')).not.toBeInTheDocument()
    })

    it('affiche le titre "Déclarer une absence" si isOpen=true', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Déclarer une absence')).toBeInTheDocument()
      })
    })
  })

  describe('Options du select type d\'absence', () => {
    it('affiche le label du select "Type d\'absence"', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Type d\'absence')).toBeInTheDocument()
      })
    })

    it('affiche les options de type d\'absence dans le select', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        // Le select est un NativeSelect — les options sont dans le DOM
        expect(screen.getByRole('combobox', { name: /Type d'absence/i })).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox', { name: /Type d'absence/i })
      expect(select).toContainHTML('Maladie')
      expect(select).toContainHTML('Congé payé')
      expect(select).toContainHTML('Événement familial')
      expect(select).toContainHTML('Formation')
      expect(select).toContainHTML('Indisponibilité')
      expect(select).toContainHTML('Urgence personnelle')
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

  describe('Chargement du solde de congés', () => {
    it('appelle getLeaveBalance avec le bon employeeId quand le type est "vacation"', async () => {
      const user = userEvent.setup()

      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Type d'absence/i })).toBeInTheDocument()
      })

      // Sélectionner "Congé payé" pour déclencher le chargement du solde
      await user.selectOptions(
        screen.getByRole('combobox', { name: /Type d'absence/i }),
        'vacation'
      )

      await waitFor(() => {
        expect(getLeaveBalance).toHaveBeenCalledWith('contract-1', 2026)
      })
    })

    it('affiche le solde de congés disponible après sélection de "Congé payé"', async () => {
      const user = userEvent.setup()

      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Type d'absence/i })).toBeInTheDocument()
      })

      await user.selectOptions(
        screen.getByRole('combobox', { name: /Type d'absence/i }),
        'vacation'
      )

      await waitFor(() => {
        expect(screen.getByText(/Solde de congés/i)).toBeInTheDocument()
        expect(screen.getByText(/25\.0 jour\(s\) disponible\(s\)/i)).toBeInTheDocument()
      })
    })
  })

  describe('Événement familial', () => {
    it('affiche le select "Type d\'événement" quand le type "Événement familial" est sélectionné', async () => {
      const user = userEvent.setup()

      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Type d'absence/i })).toBeInTheDocument()
      })

      await user.selectOptions(
        screen.getByRole('combobox', { name: /Type d'absence/i }),
        'family_event'
      )

      await waitFor(() => {
        expect(screen.getByText('Type d\'événement')).toBeInTheDocument()
        expect(screen.getByRole('combobox', { name: /Type d'événement/i })).toBeInTheDocument()
      })
    })

    it('n\'affiche PAS le select d\'événement familial pour un autre type d\'absence', async () => {
      const user = userEvent.setup()

      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Type d'absence/i })).toBeInTheDocument()
      })

      await user.selectOptions(
        screen.getByRole('combobox', { name: /Type d'absence/i }),
        'sick'
      )

      expect(screen.queryByText('Type d\'événement')).not.toBeInTheDocument()
    })
  })

  describe('Upload de justificatif (arrêt maladie)', () => {
    it('affiche la section d\'upload quand le type "Maladie" est sélectionné', async () => {
      const user = userEvent.setup()

      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Type d'absence/i })).toBeInTheDocument()
      })

      await user.selectOptions(
        screen.getByRole('combobox', { name: /Type d'absence/i }),
        'sick'
      )

      await waitFor(() => {
        // L'input file est présent dans le DOM (même masqué)
        expect(
          screen.getByLabelText(/Sélectionner un arrêt de travail/i)
        ).toBeInTheDocument()
        // Le bouton "Parcourir..." est visible
        expect(screen.getByRole('button', { name: /Sélectionner un fichier/i })).toBeInTheDocument()
      })
    })

    it('affiche une erreur de fichier si validateJustificationFile retourne une erreur', async () => {
      // Simuler une validation échouée
      vi.mocked(validateJustificationFile).mockReturnValue({
        valid: false,
        error: 'Le fichier est trop volumineux (max 5 Mo)',
      })

      const user = userEvent.setup()

      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Type d'absence/i })).toBeInTheDocument()
      })

      await user.selectOptions(
        screen.getByRole('combobox', { name: /Type d'absence/i }),
        'sick'
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Sélectionner un arrêt de travail/i)).toBeInTheDocument()
      })

      // Simuler un upload de fichier invalide
      const fileInput = screen.getByLabelText(/Sélectionner un arrêt de travail/i)
      const invalidFile = new File(['contenu'], 'test.pdf', { type: 'application/pdf' })

      await user.upload(fileInput, invalidFile)

      await waitFor(() => {
        expect(
          screen.getByText(/Le fichier est trop volumineux/i)
        ).toBeInTheDocument()
      })
    })

    it('n\'affiche pas la section d\'upload pour un type d\'absence autre que maladie', async () => {
      const user = userEvent.setup()

      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Type d'absence/i })).toBeInTheDocument()
      })

      await user.selectOptions(
        screen.getByRole('combobox', { name: /Type d'absence/i }),
        'vacation'
      )

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
        expect(screen.getByRole('combobox', { name: /Type d'absence/i })).toBeInTheDocument()
      })

      // Sélectionner le type d'absence
      await user.selectOptions(
        screen.getByRole('combobox', { name: /Type d'absence/i }),
        'vacation'
      )

      // Soumettre le formulaire
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

    it('n\'appelle pas createAbsence si le type "Maladie" est sélectionné sans justificatif', async () => {
      const user = userEvent.setup()

      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Type d'absence/i })).toBeInTheDocument()
      })

      await user.selectOptions(
        screen.getByRole('combobox', { name: /Type d'absence/i }),
        'sick'
      )

      await user.click(screen.getByRole('button', { name: /Envoyer la demande/i }))

      await waitFor(() => {
        expect(createAbsence).not.toHaveBeenCalled()
        expect(
          screen.getByText(/L'arrêt de travail est obligatoire/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Checkbox "Toute la journée"', () => {
    it('affiche la checkbox "Toute la journée (une seule date)"', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Toute la journée \(une seule date\)/i)
        ).toBeInTheDocument()
      })
    })

    it('affiche le champ "Date de fin" quand la checkbox est décochée', async () => {
      const user = userEvent.setup()

      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Toute la journée \(une seule date\)/i)
        ).toBeInTheDocument()
      })

      // Décocher la checkbox (elle est cochée par défaut)
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      await waitFor(() => {
        expect(screen.getByLabelText(/Date de fin/i)).toBeInTheDocument()
      })
    })
  })

  describe('Texte informatif', () => {
    it('affiche le message d\'info sur la validation par l\'employeur', async () => {
      renderWithProviders(<AbsenceRequestModal {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Votre demande sera envoyée à votre employeur pour validation/i)
        ).toBeInTheDocument()
      })
    })
  })
})
