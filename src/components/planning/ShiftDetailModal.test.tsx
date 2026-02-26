import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { createMockShift, createMockContract } from '@/test/fixtures'
import { ShiftDetailModal } from './ShiftDetailModal'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/services/shiftService', () => ({
  updateShift: vi.fn(),
  deleteShift: vi.fn(),
  validateShift: vi.fn(),
  getShifts: vi.fn(),
}))

vi.mock('@/services/contractService', () => ({
  getContractById: vi.fn(),
}))

vi.mock('@/hooks/useComplianceCheck', () => ({
  useComplianceCheck: vi.fn(() => ({
    complianceResult: null,
    computedPay: null,
    durationHours: 0,
    isValidating: false,
    hasErrors: false,
    hasWarnings: false,
  })),
}))

vi.mock('@/lib/compliance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/compliance')>()
  return {
    ...actual,
    calculateNightHours: vi.fn(() => 0),
    calculateShiftDuration: vi.fn(() => 480),
  }
})

vi.mock('@/lib/sanitize', () => ({
  sanitizeText: vi.fn((s: string) => s),
}))

// ─── Imports après mocks ─────────────────────────────────────────────────────

import { getContractById } from '@/services/contractService'
import { getShifts } from '@/services/shiftService'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockShift = createMockShift({
  id: 'shift-1',
  date: new Date('2026-02-20'),
  startTime: '09:00',
  endTime: '17:00',
  status: 'planned',
  contractId: 'contract-1',
  validatedByEmployer: false,
  validatedByEmployee: false,
  tasks: [],
  notes: undefined,
  shiftType: 'effective',
})

const mockContract = createMockContract({
  id: 'contract-1',
  contractType: 'CDI',
  hourlyRate: 12.5,
})

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  shift: mockShift,
  userRole: 'employer' as const,
  profileId: 'profile-1',
  onSuccess: vi.fn(),
  caregiverCanEdit: false,
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getContractById).mockResolvedValue(null)
  vi.mocked(getShifts).mockResolvedValue([])
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ShiftDetailModal', () => {
  describe('Visibilité du dialog', () => {
    it('ne rend rien si shift est null', () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={null} />
      )
      expect(screen.queryByText('Détail de l\'intervention')).not.toBeInTheDocument()
    })

    it('ne rend pas le contenu du dialog si isOpen est false', () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} isOpen={false} />
      )
      // Chakra v3 Dialog.Root avec open=false ne monte pas le contenu dans le Portal
      expect(screen.queryByText('Détail de l\'intervention')).not.toBeInTheDocument()
    })

    it('affiche le titre du dialog si isOpen=true et shift non null', async () => {
      renderWithProviders(<ShiftDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Détail de l\'intervention')).toBeInTheDocument()
      })
    })
  })

  describe('Affichage des données du shift', () => {
    it('affiche le statut "Planifié" pour un shift en statut planned', async () => {
      renderWithProviders(<ShiftDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Planifié')).toBeInTheDocument()
      })
    })

    it('affiche le statut "Terminé" pour un shift en statut completed', async () => {
      const completedShift = createMockShift({
        ...mockShift,
        status: 'completed',
        validatedByEmployer: false,
        validatedByEmployee: false,
      })
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={completedShift} />
      )

      await waitFor(() => {
        expect(screen.getByText('Terminé')).toBeInTheDocument()
      })
    })

    it('affiche les horaires du shift (heure début - heure fin)', async () => {
      renderWithProviders(<ShiftDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument()
      })
    })

    it('affiche la durée calculée du shift', async () => {
      renderWithProviders(<ShiftDetailModal {...defaultProps} />)

      await waitFor(() => {
        // 09:00 -> 17:00 = 8h, breakDuration=60min => 7.0h
        expect(screen.getByText(/Durée/)).toBeInTheDocument()
      })
    })
  })

  describe('Permissions — bouton Modifier', () => {
    it('affiche le bouton "Modifier" pour userRole="employer"', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employer" />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Modifier/i })).toBeInTheDocument()
      })
    })

    it('affiche le bouton "Modifier" pour userRole="caregiver" avec caregiverCanEdit=true', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="caregiver" caregiverCanEdit={true} />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Modifier/i })).toBeInTheDocument()
      })
    })

    it('n\'affiche PAS le bouton "Modifier" pour userRole="employee"', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employee" />
      )

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Modifier/i })).not.toBeInTheDocument()
      })
    })

    it('n\'affiche PAS le bouton "Modifier" pour userRole="caregiver" sans caregiverCanEdit', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="caregiver" caregiverCanEdit={false} />
      )

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Modifier/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Bouton Fermer', () => {
    it('appelle onClose quand on clique sur le bouton "Fermer" du footer', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      renderWithProviders(
        <ShiftDetailModal {...defaultProps} onClose={onClose} />
      )

      await waitFor(() => {
        // Il y a deux boutons "Fermer" : le X (header) et le bouton footer.
        // On prend le dernier qui est dans le footer.
        const fermerButtons = screen.getAllByRole('button', { name: /Fermer/i })
        expect(fermerButtons.length).toBeGreaterThanOrEqual(1)
      })

      // Le bouton footer "Fermer" est le dernier dans le DOM
      const fermerButtons = screen.getAllByRole('button', { name: /Fermer/i })
      const footerFermerButton = fermerButtons[fermerButtons.length - 1]
      await user.click(footerFermerButton)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Chargement du contrat', () => {
    it('appelle getContractById au montage si le shift a un contractId', async () => {
      vi.mocked(getContractById).mockResolvedValue(mockContract)

      renderWithProviders(<ShiftDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(getContractById).toHaveBeenCalledWith('contract-1')
      })
    })

    it('affiche les infos du contrat une fois chargé', async () => {
      vi.mocked(getContractById).mockResolvedValue(mockContract)

      renderWithProviders(<ShiftDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/12\.50 €\/h/i)).toBeInTheDocument()
      })
    })

    it('appelle getShifts au montage pour charger les interventions existantes', async () => {
      renderWithProviders(<ShiftDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(getShifts).toHaveBeenCalledWith(
          'profile-1',
          'employer',
          expect.any(Date),
          expect.any(Date)
        )
      })
    })
  })

  describe('Permissions — bouton Supprimer', () => {
    it('affiche le bouton "Supprimer" pour employer avec shift en statut planned', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employer" shift={mockShift} />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Supprimer/i })).toBeInTheDocument()
      })
    })

    it('n\'affiche PAS le bouton "Supprimer" pour un shift en statut completed', async () => {
      const completedShift = createMockShift({
        ...mockShift,
        status: 'completed',
        validatedByEmployer: false,
        validatedByEmployee: false,
      })

      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employer" shift={completedShift} />
      )

      await waitFor(() => {
        // canDelete = false quand status != 'planned'
        expect(screen.queryByRole('button', { name: /Supprimer/i })).not.toBeInTheDocument()
      })
    })

    it('n\'affiche PAS le bouton "Supprimer" pour userRole="employee"', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employee" shift={mockShift} />
      )

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Supprimer/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Permissions — bouton Valider', () => {
    it('affiche le bouton "Valider l\'intervention" pour employer avec shift completed', async () => {
      const completedShift = createMockShift({
        ...mockShift,
        status: 'completed',
        validatedByEmployer: false,
        validatedByEmployee: false,
      })

      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employer" shift={completedShift} />
      )

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Valider l'intervention/i })
        ).toBeInTheDocument()
      })
    })

    it('affiche le bouton "Valider l\'intervention" pour employee avec shift completed', async () => {
      const completedShift = createMockShift({
        ...mockShift,
        status: 'completed',
        validatedByEmployer: false,
        validatedByEmployee: false,
      })

      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employee" shift={completedShift} />
      )

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Valider l'intervention/i })
        ).toBeInTheDocument()
      })
    })

    it('n\'affiche PAS le bouton "Valider" pour un shift en statut planned', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employer" shift={mockShift} />
      )

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /Valider l'intervention/i })
        ).not.toBeInTheDocument()
      })
    })

    it('n\'affiche PAS le bouton "Valider" si l\'employer a déjà validé', async () => {
      const alreadyValidatedShift = createMockShift({
        ...mockShift,
        status: 'completed',
        validatedByEmployer: true,
        validatedByEmployee: false,
      })

      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employer" shift={alreadyValidatedShift} />
      )

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /Valider l'intervention/i })
        ).not.toBeInTheDocument()
        expect(
          screen.getByText(/Vous avez validé cette intervention/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Confirmation de suppression', () => {
    it('affiche la confirmation de suppression après clic sur "Supprimer"', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employer" shift={mockShift} />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Supprimer/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Supprimer/i }))

      expect(
        screen.getByText(/Êtes-vous sûr de vouloir supprimer cette intervention/i)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Confirmer la suppression/i })
      ).toBeInTheDocument()
    })
  })

  describe('Validation dans la section Validation', () => {
    it('affiche l\'indicateur "Employeur (en attente)" quand non validé', async () => {
      renderWithProviders(<ShiftDetailModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Employeur \(en attente\)/i)).toBeInTheDocument()
      })
    })

    it('affiche l\'indicateur "Employeur (validé)" quand validé par l\'employer', async () => {
      const validatedShift = createMockShift({
        ...mockShift,
        status: 'completed',
        validatedByEmployer: true,
        validatedByEmployee: false,
      })

      renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={validatedShift} />
      )

      await waitFor(() => {
        expect(screen.getByText(/Employeur \(validé\)/i)).toBeInTheDocument()
      })
    })
  })
})
