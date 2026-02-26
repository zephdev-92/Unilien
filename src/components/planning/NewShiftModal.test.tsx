import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import type { ContractWithEmployee } from '@/services/contractService'

// ─── Mocks composants compliance (Chakra + complexe) ─────────────────────────

vi.mock('@/components/compliance', () => ({
  ComplianceAlert: () => null,
  PaySummary: () => null,
  ComplianceBadge: () => null,
}))

// ─── Mocks services ───────────────────────────────────────────────────────────

vi.mock('@/services/shiftService', () => ({
  createShift: vi.fn(),
  getShifts: vi.fn(),
}))

vi.mock('@/services/contractService', () => ({
  getContractsForEmployer: vi.fn(),
  getContractById: vi.fn(),
}))

vi.mock('@/services/absenceService', () => ({
  getAbsencesForEmployer: vi.fn(),
}))

vi.mock('@/hooks/useComplianceCheck', () => ({
  useComplianceCheck: vi.fn(() => ({
    complianceResult: null,
    computedPay: null,
    durationHours: 3,
    isValidating: false,
    hasErrors: false,
    hasWarnings: false,
    violations: [],
    warnings: [],
    isLoading: false,
  })),
}))

vi.mock('@/lib/compliance', () => ({
  calculateNightHours: vi.fn(() => 0),
  calculateShiftDuration: vi.fn(() => 180),
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeText: vi.fn((s: string) => s),
}))

// ─── Imports après mocks ──────────────────────────────────────────────────────

import { createShift, getShifts } from '@/services/shiftService'
import { getContractsForEmployer } from '@/services/contractService'
import { getAbsencesForEmployer } from '@/services/absenceService'
import { NewShiftModal } from './NewShiftModal'

const mockCreateShift = vi.mocked(createShift)
const mockGetShifts = vi.mocked(getShifts)
const mockGetContractsForEmployer = vi.mocked(getContractsForEmployer)
const mockGetAbsencesForEmployer = vi.mocked(getAbsencesForEmployer)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const EMPLOYER_ID = 'employer-test-001'

const mockContract: ContractWithEmployee = {
  id: 'c-1',
  employerId: EMPLOYER_ID,
  employeeId: 'emp-1',
  contractType: 'CDI',
  startDate: new Date('2024-01-01'),
  endDate: undefined,
  weeklyHours: 35,
  hourlyRate: 13.5,
  status: 'active',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  employee: {
    profileId: 'emp-1',
    firstName: 'Marie',
    lastName: 'Dupont',
    email: 'marie.dupont@test.com',
  },
}

// Props par défaut pour le modal ouvert
const defaultOpenProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
  employerId: EMPLOYER_ID,
}

// ─── Setup par défaut ─────────────────────────────────────────────────────────

function setupWithContracts() {
  mockGetContractsForEmployer.mockResolvedValue([mockContract])
  mockGetShifts.mockResolvedValue([])
  mockGetAbsencesForEmployer.mockResolvedValue([])
}

function setupNoContracts() {
  mockGetContractsForEmployer.mockResolvedValue([])
  mockGetShifts.mockResolvedValue([])
  mockGetAbsencesForEmployer.mockResolvedValue([])
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NewShiftModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Ne rend rien si isOpen=false
  it('ne rend rien si isOpen est false', () => {
    setupNoContracts()

    renderWithProviders(
      <NewShiftModal
        isOpen={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        employerId={EMPLOYER_ID}
      />
    )

    // Le titre du modal ne doit pas être présent
    expect(screen.queryByText('Nouvelle intervention')).not.toBeInTheDocument()
  })

  // 2. Rend le dialog avec titre "Nouvelle intervention" si isOpen=true
  it('affiche le dialog avec le titre "Nouvelle intervention" si isOpen est true', async () => {
    setupWithContracts()

    renderWithProviders(<NewShiftModal {...defaultOpenProps} />)

    await waitFor(() => {
      expect(screen.getByText('Nouvelle intervention')).toBeInTheDocument()
    })
  })

  // 3. Appelle getContractsForEmployer au montage avec l'employerId
  it('appelle getContractsForEmployer au montage avec l\'employerId', async () => {
    setupWithContracts()

    renderWithProviders(<NewShiftModal {...defaultOpenProps} />)

    await waitFor(() => {
      expect(mockGetContractsForEmployer).toHaveBeenCalledWith(EMPLOYER_ID)
    })
  })

  // 4. Affiche un sélecteur de contrat si des contrats sont disponibles
  it('affiche le selecteur auxiliaire avec les contrats disponibles', async () => {
    setupWithContracts()

    renderWithProviders(<NewShiftModal {...defaultOpenProps} />)

    await waitFor(() => {
      // Le select "Auxiliaire" doit être présent après chargement
      const select = screen.getByRole('combobox', { name: /auxiliaire/i })
      expect(select).toBeInTheDocument()
    })
  })

  // 5. Le bouton "Annuler" appelle onClose
  it('le bouton "Annuler" appelle onClose', async () => {
    setupWithContracts()
    const onClose = vi.fn()

    renderWithProviders(
      <NewShiftModal
        isOpen={true}
        onClose={onClose}
        onSuccess={vi.fn()}
        employerId={EMPLOYER_ID}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Nouvelle intervention')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // 6. Le formulaire a les champs Date, Heure de début, Heure de fin
  it('affiche les champs Date, Heure de debut et Heure de fin', async () => {
    setupWithContracts()

    renderWithProviders(<NewShiftModal {...defaultOpenProps} />)

    await waitFor(() => {
      expect(screen.getByText('Nouvelle intervention')).toBeInTheDocument()
    })

    // Chakra v3 AccessibleInput rend un <input> — queryable via getByLabelText
    // Champ date
    expect(screen.getByLabelText(/^date/i)).toBeInTheDocument()

    // Heure de début
    expect(screen.getByLabelText(/heure de début/i)).toBeInTheDocument()

    // Heure de fin
    expect(screen.getByLabelText(/heure de fin/i)).toBeInTheDocument()
  })

  // 7. Champ "Type d'intervention" présent avec les options attendues
  it('affiche le champ type d\'intervention avec les options attendues', async () => {
    setupWithContracts()

    renderWithProviders(<NewShiftModal {...defaultOpenProps} />)

    await waitFor(() => {
      expect(screen.getByText('Nouvelle intervention')).toBeInTheDocument()
    })

    // Le select "Type d'intervention" doit être présent
    const typeSelect = screen.getByRole('combobox', { name: /type d'intervention/i })
    expect(typeSelect).toBeInTheDocument()

    // Vérifier que les options clés sont présentes dans le DOM
    expect(screen.getByText('Travail effectif')).toBeInTheDocument()
    expect(screen.getByText(/présence responsable \(jour\)/i)).toBeInTheDocument()
  })

  // 8. createShift est appelée lors de la soumission d'un formulaire valide
  it('appelle createShift lors de la soumission avec un formulaire valide', async () => {
    setupWithContracts()
    mockCreateShift.mockResolvedValue({
      id: 'new-shift-1',
      contractId: 'c-1',
      date: new Date(),
      startTime: '09:00',
      endTime: '12:00',
      breakDuration: 0,
      tasks: [],
      notes: undefined,
      hasNightAction: false,
      shiftType: 'effective',
      nightInterventionsCount: undefined,
      isRequalified: false,
      effectiveHours: undefined,
      status: 'planned',
      computedPay: {
        basePay: 0,
        sundayMajoration: 0,
        holidayMajoration: 0,
        nightMajoration: 0,
        overtimeMajoration: 0,
        presenceResponsiblePay: 0,
        nightPresenceAllowance: 0,
        totalPay: 0,
      },
      validatedByEmployer: false,
      validatedByEmployee: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const onSuccess = vi.fn()
    const onClose = vi.fn()

    renderWithProviders(
      <NewShiftModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        employerId={EMPLOYER_ID}
      />
    )

    // Attendre que les contrats soient chargés et le select auxiliaire visible
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /auxiliaire/i })).toBeInTheDocument()
    })

    // Sélectionner l'auxiliaire
    const auxiliaireSelect = screen.getByRole('combobox', { name: /auxiliaire/i })
    await userEvent.selectOptions(auxiliaireSelect, 'c-1')

    // Soumettre le formulaire
    fireEvent.click(screen.getByRole('button', { name: /créer l'intervention/i }))

    await waitFor(() => {
      expect(mockCreateShift).toHaveBeenCalledWith(
        'c-1',
        expect.objectContaining({
          startTime: '09:00',
          endTime: '12:00',
          shiftType: 'effective',
        })
      )
    })
  })

  // 9. Affiche le message "Aucun contrat actif" si aucun contrat n'est disponible
  it('affiche le message "Aucun contrat actif" si aucun contrat n\'est disponible', async () => {
    setupNoContracts()

    renderWithProviders(<NewShiftModal {...defaultOpenProps} />)

    await waitFor(() => {
      expect(screen.getByText(/aucun contrat actif/i)).toBeInTheDocument()
    })
  })

  // 10. Appelle getShifts pour charger les interventions existantes
  it('appelle getShifts pour charger les interventions existantes', async () => {
    setupWithContracts()

    renderWithProviders(<NewShiftModal {...defaultOpenProps} />)

    await waitFor(() => {
      expect(mockGetShifts).toHaveBeenCalledWith(
        EMPLOYER_ID,
        'employer',
        expect.any(Date),
        expect.any(Date)
      )
    })
  })
})
