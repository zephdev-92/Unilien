import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { ComplianceDashboard } from './ComplianceDashboard'
import type {
  WeeklyComplianceOverview,
  EmployeeComplianceStatus,
} from '@/services/complianceService'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetWeeklyComplianceOverview = vi.fn()
const mockGetComplianceHistory = vi.fn()

vi.mock('@/services/complianceService', () => ({
  getWeeklyComplianceOverview: (...args: unknown[]) =>
    mockGetWeeklyComplianceOverview(...args),
  getComplianceHistory: (...args: unknown[]) => mockGetComplianceHistory(...args),
}))

vi.mock('./ComplianceHelp', () => ({
  ComplianceHelp: () => <div data-testid="compliance-help">Aide conformité</div>,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeEmployee(overrides: Partial<EmployeeComplianceStatus> = {}): EmployeeComplianceStatus {
  return {
    employeeId: 'emp-1',
    employeeName: 'Marie Dupont',
    contractId: 'contract-1',
    weeklyHours: 35,
    currentWeekHours: 20,
    remainingWeeklyHours: 28,
    remainingDailyHours: 8,
    weeklyRestStatus: { longestRest: 36, isCompliant: true },
    alerts: [],
    status: 'ok',
    ...overrides,
  }
}

const emptyOverview: WeeklyComplianceOverview = {
  weekStart: new Date('2026-02-16'),
  weekEnd: new Date('2026-02-22'),
  weekLabel: 'S. 16-22 fév.',
  employees: [],
  summary: { totalEmployees: 0, compliant: 0, warnings: 0, critical: 0 },
}

const overviewWithData: WeeklyComplianceOverview = {
  weekStart: new Date('2026-02-16'),
  weekEnd: new Date('2026-02-22'),
  weekLabel: 'S. 16-22 fév.',
  employees: [
    makeEmployee({ employeeId: 'emp-1', employeeName: 'Marie Dupont', status: 'ok' }),
    makeEmployee({
      employeeId: 'emp-2',
      employeeName: 'Jean Martin',
      status: 'critical',
      currentWeekHours: 46,
      alerts: [{ type: 'weekly_hours', severity: 'critical', message: 'Dépasse 44h' }],
    }),
  ],
  summary: { totalEmployees: 2, compliant: 1, warnings: 0, critical: 1 },
}

const mockHistory = [
  { weekStart: new Date('2026-02-02'), weekLabel: 'S1', compliant: 2, warnings: 1, critical: 0 },
  { weekStart: new Date('2026-02-09'), weekLabel: 'S2', compliant: 3, warnings: 0, critical: 0 },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ComplianceDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetComplianceHistory.mockResolvedValue([])
  })

  describe('État loading', () => {
    it('affiche le spinner et le message de chargement', () => {
      mockGetWeeklyComplianceOverview.mockReturnValue(new Promise(() => {}))
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      expect(screen.getByText(/chargement des données de conformité/i)).toBeInTheDocument()
    })

    it('appelle les deux services au montage', async () => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(emptyOverview)
      renderWithProviders(<ComplianceDashboard employerId="employer-99" />)
      await waitFor(() => {
        expect(mockGetWeeklyComplianceOverview).toHaveBeenCalledWith(
          'employer-99',
          expect.any(Date)
        )
        expect(mockGetComplianceHistory).toHaveBeenCalledWith('employer-99', 4)
      })
    })
  })

  describe('En-tête', () => {
    beforeEach(() => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(emptyOverview)
    })

    it('affiche le titre "Conformité"', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /conformité/i })).toBeInTheDocument()
      })
    })

    it('affiche les boutons Aide et Actualiser', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /aide/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /actualiser/i })).toBeInTheDocument()
      })
    })

    it('affiche le libellé de la semaine', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('S. 16-22 fév.')).toBeInTheDocument()
      })
    })
  })

  describe('Stat cards (résumé)', () => {
    beforeEach(() => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(overviewWithData)
    })

    it('affiche le nombre total d\'auxiliaires', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Total auxiliaires')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    it('affiche le nombre de conformes', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Conformes')).toBeInTheDocument()
      })
    })

    it('affiche le nombre de critiques', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Critiques')).toBeInTheDocument()
      })
    })
  })

  describe('Tableau des employés', () => {
    beforeEach(() => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(overviewWithData)
    })

    it('affiche les noms des employés dans le tableau', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
        expect(screen.getByText('Jean Martin')).toBeInTheDocument()
      })
    })

    it('affiche le badge "Conforme" pour un employé ok', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Conforme')).toBeInTheDocument()
      })
    })

    it('affiche le badge "Critique" pour un employé critical', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Critique')).toBeInTheDocument()
      })
    })

    it('affiche les alertes des employés', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Dépasse 44h')).toBeInTheDocument()
      })
    })

    it('affiche les heures de la semaine', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('20h')).toBeInTheDocument()
      })
    })

    it('affiche les employés critiques en premier (tri)', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        const names = screen
          .getAllByText(/Marie Dupont|Jean Martin/)
          .map((el) => el.textContent)
        expect(names[0]).toBe('Jean Martin') // critique avant ok
      })
    })
  })

  describe('Aucun auxiliaire actif', () => {
    it('affiche le message "Aucun auxiliaire actif"', async () => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(emptyOverview)
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/aucun auxiliaire actif/i)).toBeInTheDocument()
      })
    })
  })

  describe('Historique', () => {
    it('affiche les libellés de semaines historiques', async () => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(overviewWithData)
      mockGetComplianceHistory.mockResolvedValue(mockHistory)
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Historique des 4 dernières semaines')).toBeInTheDocument()
        expect(screen.getByText('S1')).toBeInTheDocument()
        expect(screen.getByText('S2')).toBeInTheDocument()
      })
    })

    it("n'affiche pas la section historique si vide", async () => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(emptyOverview)
      mockGetComplianceHistory.mockResolvedValue([])
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(
          screen.queryByText(/historique des 4 dernières semaines/i)
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('Navigation semaine', () => {
    beforeEach(() => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(emptyOverview)
    })

    it('affiche les boutons de navigation', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/semaine précédente/i)).toBeInTheDocument()
        expect(screen.getByText(/semaine suivante/i)).toBeInTheDocument()
      })
    })

    it('recharge les données en cliquant sur "Semaine précédente"', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => screen.getByText(/semaine précédente/i))

      const initialCallCount = mockGetWeeklyComplianceOverview.mock.calls.length
      await user.click(screen.getByText(/semaine précédente/i))

      await waitFor(() => {
        expect(mockGetWeeklyComplianceOverview.mock.calls.length).toBeGreaterThan(
          initialCallCount
        )
      })
    })
  })

  describe('Bouton Aide', () => {
    beforeEach(() => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(emptyOverview)
    })

    it('affiche la vue d\'aide au clic sur "Aide"', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => screen.getByRole('button', { name: /aide/i }))

      await user.click(screen.getByRole('button', { name: /aide/i }))
      expect(screen.getByTestId('compliance-help')).toBeInTheDocument()
    })

    it('revient au dashboard en cliquant sur "Retour"', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => screen.getByRole('button', { name: /aide/i }))

      await user.click(screen.getByRole('button', { name: /aide/i }))
      expect(screen.getByTestId('compliance-help')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /retour au tableau de bord/i }))
      expect(screen.queryByTestId('compliance-help')).not.toBeInTheDocument()
    })
  })

  describe('Bouton Actualiser', () => {
    it('recharge les données', async () => {
      const user = userEvent.setup()
      mockGetWeeklyComplianceOverview.mockResolvedValue(emptyOverview)
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => screen.getByRole('button', { name: /actualiser/i }))

      const before = mockGetWeeklyComplianceOverview.mock.calls.length
      await user.click(screen.getByRole('button', { name: /actualiser/i }))

      await waitFor(() => {
        expect(mockGetWeeklyComplianceOverview.mock.calls.length).toBeGreaterThan(before)
      })
    })
  })
})
