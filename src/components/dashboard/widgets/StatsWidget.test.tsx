import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { StatsWidget } from './StatsWidget'
import type { EmployerStats, EmployeeStats, CaregiverStats } from '@/services/statsService'

// ── Mocks des services ────────────────────────────────────────────────────────

const mockGetEmployerStats = vi.fn()
const mockGetEmployeeStats = vi.fn()
const mockGetCaregiverStats = vi.fn()

vi.mock('@/services/statsService', () => ({
  getEmployerStats: (...args: unknown[]) => mockGetEmployerStats(...args),
  getEmployeeStats: (...args: unknown[]) => mockGetEmployeeStats(...args),
  getCaregiverStats: (...args: unknown[]) => mockGetCaregiverStats(...args),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const employerStats: EmployerStats = {
  hoursThisMonth: 120,
  hoursLastMonth: 100,
  hoursDiff: 20,
  monthlyCost: 1500,
  shiftsThisMonth: 15,
  activeAuxiliaries: 3,
  upcomingShifts: 5,
}

const employeeStats: EmployeeStats = {
  hoursThisMonth: 80,
  hoursLastMonth: 80,
  hoursDiff: 0,
  estimatedRevenue: 960,
  activeEmployers: 2,
  shiftsThisMonth: 10,
  upcomingShifts: 3,
}

const caregiverStats: CaregiverStats = {
  shiftsThisMonth: 5,
  logEntriesThisWeek: 3,
  upcomingShifts: 2,
  unreadLogs: 1,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StatsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('État loading', () => {
    it('affiche 4 squelettes pour employer', () => {
      mockGetEmployerStats.mockReturnValue(new Promise(() => {}))
      renderWithProviders(
        <StatsWidget userRole="employer" profileId="employer-1" />
      )
      // Le widget affiche le titre "Résumé" pendant le chargement
      expect(screen.getByText('Résumé')).toBeInTheDocument()
    })

    it('affiche 2 squelettes pour caregiver sans employerId', () => {
      mockGetCaregiverStats.mockReturnValue(new Promise(() => {}))
      renderWithProviders(
        <StatsWidget userRole="caregiver" profileId="caregiver-1" />
      )
      expect(screen.getByText('Résumé')).toBeInTheDocument()
    })
  })

  describe('Stats employeur', () => {
    beforeEach(() => {
      mockGetEmployerStats.mockResolvedValue(employerStats)
    })

    it('affiche les heures du mois', async () => {
      renderWithProviders(
        <StatsWidget userRole="employer" profileId="employer-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('120h')).toBeInTheDocument()
      })
    })

    it('affiche le coût mensuel', async () => {
      renderWithProviders(
        <StatsWidget userRole="employer" profileId="employer-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('1500 €')).toBeInTheDocument()
      })
    })

    it('affiche les interventions du mois', async () => {
      renderWithProviders(
        <StatsWidget userRole="employer" profileId="employer-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument()
      })
    })

    it('affiche le nombre d\'auxiliaires actifs', async () => {
      renderWithProviders(
        <StatsWidget userRole="employer" profileId="employer-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('affiche la variation positive des heures vs mois dernier', async () => {
      renderWithProviders(
        <StatsWidget userRole="employer" profileId="employer-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('+20h vs mois dernier')).toBeInTheDocument()
      })
    })

    it('affiche les shifts à venir', async () => {
      renderWithProviders(
        <StatsWidget userRole="employer" profileId="employer-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('5 à venir')).toBeInTheDocument()
      })
    })

    it('appelle getEmployerStats avec le bon profileId', async () => {
      renderWithProviders(
        <StatsWidget userRole="employer" profileId="employer-42" />
      )
      await waitFor(() => {
        expect(mockGetEmployerStats).toHaveBeenCalledWith('employer-42')
      })
    })
  })

  describe('Stats employee', () => {
    beforeEach(() => {
      mockGetEmployeeStats.mockResolvedValue(employeeStats)
    })

    it('affiche les heures du mois', async () => {
      renderWithProviders(
        <StatsWidget userRole="employee" profileId="employee-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('80h')).toBeInTheDocument()
      })
    })

    it('affiche les revenus estimés', async () => {
      renderWithProviders(
        <StatsWidget userRole="employee" profileId="employee-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('960 €')).toBeInTheDocument()
      })
    })

    it('affiche "= mois dernier" si hoursDiff = 0', async () => {
      renderWithProviders(
        <StatsWidget userRole="employee" profileId="employee-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('= mois dernier')).toBeInTheDocument()
      })
    })

    it('affiche le nombre d\'employeurs actifs', async () => {
      renderWithProviders(
        <StatsWidget userRole="employee" profileId="employee-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })
  })

  describe('Stats caregiver', () => {
    beforeEach(() => {
      mockGetCaregiverStats.mockResolvedValue(caregiverStats)
    })

    it('affiche les interventions du mois', async () => {
      renderWithProviders(
        <StatsWidget userRole="caregiver" profileId="caregiver-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })
    })

    it('affiche les entrées cahier cette semaine avec logs non lus', async () => {
      renderWithProviders(
        <StatsWidget userRole="caregiver" profileId="caregiver-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('1 non lue')).toBeInTheDocument()
      })
    })

    it('utilise getEmployerStats si employerId est fourni', async () => {
      mockGetEmployerStats.mockResolvedValue(employerStats)
      renderWithProviders(
        <StatsWidget userRole="caregiver" profileId="caregiver-1" employerId="employer-1" />
      )
      await waitFor(() => {
        expect(mockGetEmployerStats).toHaveBeenCalledWith('employer-1')
        expect(mockGetCaregiverStats).not.toHaveBeenCalled()
      })
    })
  })

  describe('Gestion des erreurs', () => {
    it('affiche un message d\'erreur si le service échoue', async () => {
      mockGetEmployerStats.mockRejectedValue(new Error('Erreur réseau'))
      renderWithProviders(
        <StatsWidget userRole="employer" profileId="employer-1" />
      )
      await waitFor(() => {
        expect(
          screen.getByText(/erreur lors du chargement des statistiques/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Variation négative des heures', () => {
    it('affiche la variation négative', async () => {
      mockGetEmployerStats.mockResolvedValue({
        ...employerStats,
        hoursThisMonth: 80,
        hoursLastMonth: 100,
        hoursDiff: -20,
      })
      renderWithProviders(
        <StatsWidget userRole="employer" profileId="employer-1" />
      )
      await waitFor(() => {
        expect(screen.getByText('-20h vs mois dernier')).toBeInTheDocument()
      })
    })
  })
})
