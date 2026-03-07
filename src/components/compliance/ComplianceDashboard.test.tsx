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
const mockCheckSmicCompliance = vi.fn()

vi.mock('@/services/complianceService', () => ({
  getWeeklyComplianceOverview: (...args: unknown[]) =>
    mockGetWeeklyComplianceOverview(...args),
  checkSmicCompliance: (...args: unknown[]) => mockCheckSmicCompliance(...args),
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ComplianceDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckSmicCompliance.mockResolvedValue(true)
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
        expect(mockGetWeeklyComplianceOverview).toHaveBeenCalledWith('employer-99')
        expect(mockCheckSmicCompliance).toHaveBeenCalledWith('employer-99')
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

  })

  describe('Score card', () => {
    beforeEach(() => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(overviewWithData)
    })

    it('affiche le score de conformité', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Score de conformité')).toBeInTheDocument()
      })
    })

    it('affiche le nombre de points conformes', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Points conformes')).toBeInTheDocument()
      })
    })

    it('affiche le nombre d\'alertes actives', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        // "Alertes actives" apparaît dans le stat box et dans le titre de section
        expect(screen.getAllByText('Alertes actives').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('affiche le nombre d\'avertissements', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Avertissements')).toBeInTheDocument()
      })
    })

    it('affiche le SVG ring avec aria-label', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        const ring = screen.getByLabelText(/score de conformité : \d+%/i)
        expect(ring).toBeInTheDocument()
      })
    })
  })

  describe('Alertes actives', () => {
    beforeEach(() => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(overviewWithData)
    })

    it('affiche la section alertes avec la légende', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        // "Critique" apparaît dans la légende et dans le badge StatusBadge
        expect(screen.getAllByText('Critique').length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('À surveiller')).toBeInTheDocument()
      })
    })

    it('affiche les cartes d\'alerte enrichies', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Dépassement heures hebdomadaires')).toBeInTheDocument()
        expect(screen.getByText(/Jean Martin — Dépasse 44h/)).toBeInTheDocument()
      })
    })

    it('affiche les tags (employé et ref légale) sur les alertes', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Art. L3121-20')).toBeInTheDocument()
      })
    })

    it('affiche les boutons Corriger et Ignorer', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /corriger/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /ignorer/i })).toBeInTheDocument()
      })
    })

    it('affiche la toolbar de recherche et filtres', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/rechercher une alerte/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/filtrer par sévérité/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/filtrer par employé/i)).toBeInTheDocument()
      })
    })

    it('masque une alerte quand on clique sur Ignorer', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => screen.getByText('Dépassement heures hebdomadaires'))

      await user.click(screen.getByRole('button', { name: /ignorer/i }))
      expect(screen.queryByText('Dépassement heures hebdomadaires')).not.toBeInTheDocument()
      expect(screen.getByText(/aucune alerte active/i)).toBeInTheDocument()
    })

    it('affiche message vide quand aucune alerte', async () => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(emptyOverview)
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/aucune alerte active/i)).toBeInTheDocument()
      })
    })
  })

  describe('Contrôles par catégorie', () => {
    beforeEach(() => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(overviewWithData)
    })

    it('affiche le titre "Contrôles IDCC 3239"', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Contrôles IDCC 3239')).toBeInTheDocument()
      })
    })

    it('affiche les 3 groupes de contrôles', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Temps de travail')).toBeInTheDocument()
        expect(screen.getByText('Paie et rémunération')).toBeInTheDocument()
        expect(screen.getByText('Contrats et congés')).toBeInTheDocument()
      })
    })

    it('affiche les items de contrôle "Temps de travail"', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/durée maximale journalière/i)).toBeInTheDocument()
        expect(screen.getByText(/pause 20 min/i)).toBeInTheDocument()
        expect(screen.getByText(/amplitude maximale hebdomadaire/i)).toBeInTheDocument()
        expect(screen.getByText(/repos quotidien minimum/i)).toBeInTheDocument()
      })
    })

    it('affiche les items de contrôle "Paie et rémunération"', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/taux horaire au-dessus du smic/i)).toBeInTheDocument()
        expect(screen.getByText(/majorations dimanche/i)).toBeInTheDocument()
        expect(screen.getByText(/heures supplémentaires majorées/i)).toBeInTheDocument()
        expect(screen.getByText(/bulletins de paie/i)).toBeInTheDocument()
      })
    })

    it('affiche les items de contrôle "Contrats et congés"', async () => {
      renderWithProviders(<ComplianceDashboard employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/repos hebdomadaire/i)).toBeInTheDocument()
        expect(screen.getByText(/solde de congés payés/i)).toBeInTheDocument()
        expect(screen.getByText(/déclarations cesu/i)).toBeInTheDocument()
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
