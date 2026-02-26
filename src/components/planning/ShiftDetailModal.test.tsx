import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { createMockShift, createMockContract } from '@/test/fixtures'
import { ShiftDetailModal } from './ShiftDetailModal'
import type { Shift } from '@/types'

// ── Mocks services ─────────────────────────────────────────────────────────────

const mockUpdateShift = vi.fn()
const mockDeleteShift = vi.fn()
const mockValidateShift = vi.fn()
const mockGetShifts = vi.fn()
vi.mock('@/services/shiftService', () => ({
  updateShift: (...args: unknown[]) => mockUpdateShift(...args),
  deleteShift: (...args: unknown[]) => mockDeleteShift(...args),
  validateShift: (...args: unknown[]) => mockValidateShift(...args),
  getShifts: (...args: unknown[]) => mockGetShifts(...args),
}))

const mockGetContractById = vi.fn()
vi.mock('@/services/contractService', () => ({
  getContractById: (...args: unknown[]) => mockGetContractById(...args),
}))

vi.mock('@/services/profileService', () => ({
  getEmployer: vi.fn().mockResolvedValue(null),
}))

// ── Mocks hooks ───────────────────────────────────────────────────────────────

vi.mock('@/hooks/useComplianceCheck', () => ({
  useComplianceCheck: () => ({
    complianceResult: null,
    computedPay: null,
    durationHours: 8,
    isValidating: false,
    hasErrors: false,
    hasWarnings: false,
    validationError: null,
    revalidate: vi.fn(),
  }),
}))

vi.mock('@/hooks/useShiftNightHours', () => ({
  useShiftNightHours: () => ({ nightHoursCount: 0, hasNightHours: false }),
}))

vi.mock('@/hooks/useShiftRequalification', () => ({
  useShiftRequalification: () => ({ isRequalified: false }),
}))

vi.mock('@/hooks/useShiftEffectiveHours', () => ({
  useShiftEffectiveHours: () => ({ effectiveHoursComputed: undefined }),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const contract = createMockContract({
  id: 'contract-1',
  employerId: 'employer-1',
  employeeId: 'employee-1',
  contractType: 'CDI',
  hourlyRate: 13.5,
  weeklyHours: 35,
  status: 'active',
})

function createShift(overrides: Partial<Shift> = {}): Shift {
  return createMockShift({
    id: 'shift-1',
    contractId: 'contract-1',
    status: 'planned',
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    tasks: ['Aide au lever', 'Repas'],
    notes: 'Note de test',
    shiftType: 'effective',
    validatedByEmployer: false,
    validatedByEmployee: false,
    ...overrides,
  })
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  userRole: 'employer' as const,
  profileId: 'employer-1',
  onSuccess: vi.fn(),
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ShiftDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetContractById.mockResolvedValue(contract)
    mockGetShifts.mockResolvedValue([])
    mockUpdateShift.mockResolvedValue(undefined)
    mockDeleteShift.mockResolvedValue(undefined)
    mockValidateShift.mockResolvedValue(undefined)
  })

  describe('Mode lecture (visualisation)', () => {
    it('affiche les horaires du shift', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={createShift()} />
      )
      await waitFor(() => {
        expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument()
      })
    })

    it('affiche les tâches', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={createShift()} />
      )
      await waitFor(() => {
        expect(screen.getByText('Aide au lever')).toBeInTheDocument()
        expect(screen.getByText('Repas')).toBeInTheDocument()
      })
    })

    it('affiche les notes', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={createShift()} />
      )
      await waitFor(() => {
        expect(screen.getByText('Note de test')).toBeInTheDocument()
      })
    })

    it('retourne null si shift est null', () => {
      const { container } = renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={null} />
      )
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('Permissions RBAC', () => {
    it('employeur voit le bouton Modifier pour shift planifié', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employer" shift={createShift({ status: 'planned' })} />
      )
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument()
      })
    })

    it('employeur voit le bouton Supprimer pour shift planifié', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} userRole="employer" shift={createShift({ status: 'planned' })} />
      )
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument()
      })
    })

    it('caregiver sans permission ne voit pas le bouton Modifier', async () => {
      renderWithProviders(
        <ShiftDetailModal
          {...defaultProps}
          userRole="caregiver"
          caregiverCanEdit={false}
          shift={createShift({ status: 'planned' })}
        />
      )
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /modifier/i })).not.toBeInTheDocument()
      })
    })

    it('caregiver avec permission voit le bouton Modifier', async () => {
      renderWithProviders(
        <ShiftDetailModal
          {...defaultProps}
          userRole="caregiver"
          caregiverCanEdit={true}
          shift={createShift({ status: 'planned' })}
        />
      )
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument()
      })
    })

    it('employeur voit Valider pour shift terminé', async () => {
      renderWithProviders(
        <ShiftDetailModal
          {...defaultProps}
          userRole="employer"
          shift={createShift({ status: 'completed' })}
        />
      )
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /valider l'intervention/i })).toBeInTheDocument()
      })
    })

    it('caregiver ne voit pas Valider', async () => {
      renderWithProviders(
        <ShiftDetailModal
          {...defaultProps}
          userRole="caregiver"
          shift={createShift({ status: 'completed' })}
        />
      )
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /valider/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Mode édition', () => {
    it('passe en mode édition au clic sur Modifier', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={createShift()} />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /modifier/i }))

      expect(screen.getByText("Modifier l'intervention")).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()
    })

    it('retourne en mode lecture sur Annuler', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={createShift()} />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /modifier/i }))
      await user.click(screen.getByRole('button', { name: /annuler/i }))

      expect(screen.getByText("Détail de l'intervention")).toBeInTheDocument()
    })
  })

  describe('Suppression', () => {
    it('affiche la confirmation de suppression au clic sur Supprimer', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={createShift({ status: 'planned' })} />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /supprimer/i }))

      expect(screen.getByText(/êtes-vous sûr/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirmer la suppression/i })).toBeInTheDocument()
    })

    it('appelle deleteShift et onSuccess sur confirmation', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const onSuccess = vi.fn()

      renderWithProviders(
        <ShiftDetailModal
          {...defaultProps}
          shift={createShift({ status: 'planned' })}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /supprimer/i }))
      await user.click(screen.getByRole('button', { name: /confirmer la suppression/i }))

      await waitFor(() => {
        expect(mockDeleteShift).toHaveBeenCalledWith('shift-1')
        expect(onSuccess).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  describe('Validation du shift', () => {
    it('appelle validateShift et onSuccess sur Valider', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()

      renderWithProviders(
        <ShiftDetailModal
          {...defaultProps}
          userRole="employer"
          shift={createShift({ status: 'completed' })}
          onSuccess={onSuccess}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /valider l'intervention/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /valider l'intervention/i }))

      await waitFor(() => {
        expect(mockValidateShift).toHaveBeenCalledWith('shift-1', 'employer')
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    it('affiche "Vous avez validé" si déjà validé par l\'employeur', async () => {
      renderWithProviders(
        <ShiftDetailModal
          {...defaultProps}
          userRole="employer"
          shift={createShift({ status: 'completed', validatedByEmployer: true })}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/vous avez validé/i)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /valider l'intervention/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Chargement des données', () => {
    it('appelle getContractById avec le bon contractId', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={createShift()} />
      )

      await waitFor(() => {
        expect(mockGetContractById).toHaveBeenCalledWith('contract-1')
      })
    })

    it('appelle getShifts pour charger le contexte de validation', async () => {
      renderWithProviders(
        <ShiftDetailModal {...defaultProps} shift={createShift()} />
      )

      await waitFor(() => {
        expect(mockGetShifts).toHaveBeenCalledWith(
          'employer-1',
          'employer',
          expect.any(Date),
          expect.any(Date)
        )
      })
    })
  })
})
