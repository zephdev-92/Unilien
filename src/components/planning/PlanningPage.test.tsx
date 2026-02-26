import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'

// ─── Mocks sous-composants lourds ────────────────────────────────────────────

vi.mock('@/components/planning/MonthView', () => ({
  MonthView: (props: { currentDate?: Date }) => (
    <div
      data-testid="month-view"
      data-month={props.currentDate?.getMonth()}
    />
  ),
}))

vi.mock('@/components/planning/WeekView', () => ({
  WeekView: () => <div data-testid="week-view" />,
}))

vi.mock('@/components/planning/ShiftDetailModal', () => ({
  ShiftDetailModal: () => null,
}))

vi.mock('@/components/planning/NewShiftModal', () => ({
  NewShiftModal: () => null,
}))

vi.mock('@/components/planning/AbsenceRequestModal', () => ({
  AbsenceRequestModal: () => null,
}))

vi.mock('@/components/planning/AbsenceDetailModal', () => ({
  AbsenceDetailModal: () => null,
}))

vi.mock('@/components/dashboard', () => ({
  DashboardLayout: ({
    children,
    title,
  }: {
    children: React.ReactNode
    title: string
  }) => (
    <div data-testid="layout" data-title={title}>
      {children}
    </div>
  ),
}))

// ─── Mocks services ───────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/services/shiftService', () => ({
  getShifts: vi.fn(),
}))

vi.mock('@/services/absenceService', () => ({
  getAbsencesForEmployee: vi.fn(),
  getAbsencesForEmployer: vi.fn(),
}))

vi.mock('@/services/contractService', () => ({
  getContracts: vi.fn(),
  getContractById: vi.fn(),
}))

vi.mock('@/services/caregiverService', () => ({
  getCaregiver: vi.fn(),
  getShiftsForCaregiver: vi.fn(),
}))

// ─── Imports après mocks ──────────────────────────────────────────────────────

import { useAuth } from '@/hooks/useAuth'
import { getShifts } from '@/services/shiftService'
import { getAbsencesForEmployer, getAbsencesForEmployee } from '@/services/absenceService'
import { getCaregiver } from '@/services/caregiverService'
import { PlanningPage } from './PlanningPage'

const mockUseAuth = vi.mocked(useAuth)
const mockGetShifts = vi.mocked(getShifts)
const mockGetAbsencesForEmployer = vi.mocked(getAbsencesForEmployer)
const mockGetAbsencesForEmployee = vi.mocked(getAbsencesForEmployee)
const mockGetCaregiver = vi.mocked(getCaregiver)

// ─── Setup par défaut ─────────────────────────────────────────────────────────

function setupEmployerProfile() {
  const profile = createMockProfile({ role: 'employer' })
  mockUseAuth.mockReturnValue({
    profile,
    isInitialized: true,
    user: null,
    session: null,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
  })
  return profile
}

function setupEmployeeProfile() {
  const profile = createMockProfile({ role: 'employee' })
  mockUseAuth.mockReturnValue({
    profile,
    isInitialized: true,
    user: null,
    session: null,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
  })
  return profile
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PlanningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetShifts.mockResolvedValue([])
    mockGetAbsencesForEmployer.mockResolvedValue([])
    mockGetAbsencesForEmployee.mockResolvedValue([])
    mockGetCaregiver.mockResolvedValue(null)
  })

  // 1. Spinner si profile est null
  it('affiche un Spinner si profile est null', () => {
    mockUseAuth.mockReturnValue({
      profile: null,
      isInitialized: false,
      user: null,
      session: null,
      isLoading: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
    })

    renderWithProviders(<PlanningPage />)

    // Le DashboardLayout mocké est toujours rendu — on vérifie le spinner
    expect(screen.getByTestId('layout')).toBeInTheDocument()
    // Aucune vue planning ne doit être affichée
    expect(screen.queryByTestId('month-view')).not.toBeInTheDocument()
    expect(screen.queryByTestId('week-view')).not.toBeInTheDocument()
    // Chakra v3 Spinner rend un <span class="chakra-spinner">
    const spinner = document.querySelector('.chakra-spinner')
    expect(spinner).not.toBeNull()
  })

  // 2. Layout avec titre "Planning" pour un employeur
  it('affiche le layout avec le titre "Planning" pour un employeur', async () => {
    setupEmployerProfile()

    renderWithProviders(<PlanningPage />)

    await waitFor(() => {
      expect(screen.getByTestId('layout')).toHaveAttribute('data-title', 'Planning')
    })
  })

  // 3. Vue par défaut : WeekView (la page démarre en mode semaine)
  it('affiche WeekView par défaut (mode semaine)', async () => {
    setupEmployerProfile()

    renderWithProviders(<PlanningPage />)

    await waitFor(() => {
      expect(screen.getByTestId('week-view')).toBeInTheDocument()
      expect(screen.queryByTestId('month-view')).not.toBeInTheDocument()
    })
  })

  // 4. Cliquer sur "Mois" affiche MonthView
  it('cliquer sur "Mois" affiche MonthView', async () => {
    setupEmployerProfile()

    renderWithProviders(<PlanningPage />)

    // Attendre que la page soit chargée (WeekView visible)
    await waitFor(() => {
      expect(screen.getByTestId('week-view')).toBeInTheDocument()
    })

    // Cliquer sur le bouton "Mois"
    fireEvent.click(screen.getByRole('button', { name: /mois/i }))

    await waitFor(() => {
      expect(screen.getByTestId('month-view')).toBeInTheDocument()
      expect(screen.queryByTestId('week-view')).not.toBeInTheDocument()
    })
  })

  // 5. Bouton "← Précédent" navigue au mois précédent (en mode mois)
  it('bouton "Précédent" navigue au mois précédent en mode mois', async () => {
    setupEmployerProfile()

    renderWithProviders(<PlanningPage />)

    await waitFor(() => {
      expect(screen.getByTestId('week-view')).toBeInTheDocument()
    })

    // Passer en vue mois
    fireEvent.click(screen.getByRole('button', { name: /mois/i }))

    await waitFor(() => {
      expect(screen.getByTestId('month-view')).toBeInTheDocument()
    })

    // Capturer le mois courant affiché
    const currentMonthAttr = screen.getByTestId('month-view').getAttribute('data-month')
    const currentMonth = parseInt(currentMonthAttr ?? '0', 10)

    // Naviguer au mois précédent
    fireEvent.click(screen.getByRole('button', { name: /précédent/i }))

    await waitFor(() => {
      const newMonthAttr = screen.getByTestId('month-view').getAttribute('data-month')
      const newMonth = parseInt(newMonthAttr ?? '0', 10)
      const expectedMonth = currentMonth === 0 ? 11 : currentMonth - 1
      expect(newMonth).toBe(expectedMonth)
    })
  })

  // 6. Bouton "Suivant →" navigue au mois suivant (en mode mois)
  it('bouton "Suivant" navigue au mois suivant en mode mois', async () => {
    setupEmployerProfile()

    renderWithProviders(<PlanningPage />)

    await waitFor(() => {
      expect(screen.getByTestId('week-view')).toBeInTheDocument()
    })

    // Passer en vue mois
    fireEvent.click(screen.getByRole('button', { name: /mois/i }))

    await waitFor(() => {
      expect(screen.getByTestId('month-view')).toBeInTheDocument()
    })

    // Capturer le mois courant affiché
    const currentMonthAttr = screen.getByTestId('month-view').getAttribute('data-month')
    const currentMonth = parseInt(currentMonthAttr ?? '0', 10)

    // Naviguer au mois suivant
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }))

    await waitFor(() => {
      const newMonthAttr = screen.getByTestId('month-view').getAttribute('data-month')
      const newMonth = parseInt(newMonthAttr ?? '0', 10)
      const expectedMonth = currentMonth === 11 ? 0 : currentMonth + 1
      expect(newMonth).toBe(expectedMonth)
    })
  })

  // 7. Appelle getShifts au montage avec les bons paramètres
  it('appelle getShifts au montage avec profileId et role', async () => {
    const profile = setupEmployerProfile()

    renderWithProviders(<PlanningPage />)

    await waitFor(() => {
      expect(mockGetShifts).toHaveBeenCalledWith(
        profile.id,
        'employer',
        expect.any(Date),
        expect.any(Date)
      )
    })
  })

  // 8. Appelle getAbsencesForEmployer au montage pour un employeur
  it('appelle getAbsencesForEmployer au montage pour un employeur', async () => {
    const profile = setupEmployerProfile()

    renderWithProviders(<PlanningPage />)

    await waitFor(() => {
      expect(mockGetAbsencesForEmployer).toHaveBeenCalledWith(profile.id)
    })
  })

  // 8b. Appelle getAbsencesForEmployee au montage pour un employé
  it('appelle getAbsencesForEmployee au montage pour un employé', async () => {
    const profile = setupEmployeeProfile()

    renderWithProviders(<PlanningPage />)

    await waitFor(() => {
      expect(mockGetAbsencesForEmployee).toHaveBeenCalledWith(profile.id)
    })
  })

  // 9. Pour role='employee' : pas de bouton "+ Nouvelle intervention"
  it('ne montre pas le bouton "+ Nouvelle intervention" pour un employé', async () => {
    setupEmployeeProfile()

    renderWithProviders(<PlanningPage />)

    await waitFor(() => {
      expect(screen.getByTestId('week-view')).toBeInTheDocument()
    })

    expect(
      screen.queryByRole('button', { name: /nouvelle intervention/i })
    ).not.toBeInTheDocument()
  })

  // 10. Pour role='employer' : bouton "+ Nouvelle intervention" présent
  it('affiche le bouton "+ Nouvelle intervention" pour un employeur', async () => {
    setupEmployerProfile()

    renderWithProviders(<PlanningPage />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /nouvelle intervention/i })
      ).toBeInTheDocument()
    })
  })

  // 11. Gère les erreurs de getShifts silencieusement (pas de crash)
  it('gere les erreurs de getShifts sans crash', async () => {
    setupEmployerProfile()
    mockGetShifts.mockRejectedValue(new Error('Erreur réseau'))

    renderWithProviders(<PlanningPage />)

    // La page ne doit pas crasher, le layout doit rester visible
    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument()
    })

    // Pas de message d'erreur affiché à l'utilisateur (erreur silencieuse)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // 12. Le bouton "Déclarer absence" est présent pour un employé
  it('affiche le bouton "+ Declarer absence" pour un employe', async () => {
    setupEmployeeProfile()

    renderWithProviders(<PlanningPage />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /déclarer absence/i })
      ).toBeInTheDocument()
    })
  })
})
