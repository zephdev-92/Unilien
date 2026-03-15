import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { ComplianceWidget } from './ComplianceWidget'
import type {
  WeeklyComplianceOverview,
  EmployeeComplianceStatus,
} from '@/services/complianceService'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetWeeklyComplianceOverview = vi.fn()

vi.mock('@/services/complianceService', () => ({
  getWeeklyComplianceOverview: (...args: unknown[]) =>
    mockGetWeeklyComplianceOverview(...args),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeEmployee(
  overrides: Partial<EmployeeComplianceStatus> = {}
): EmployeeComplianceStatus {
  return {
    employeeId: 'emp-1',
    employeeName: 'Marie Martin',
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
  weekLabel: 'Semaine du 16 au 22 fév. 2026',
  employees: [],
  summary: { totalEmployees: 0, compliant: 0, warnings: 0, critical: 0 },
}

const overviewWithEmployees: WeeklyComplianceOverview = {
  weekStart: new Date('2026-02-16'),
  weekEnd: new Date('2026-02-22'),
  weekLabel: 'Semaine du 16 au 22 fév. 2026',
  employees: [
    makeEmployee({ employeeId: 'emp-1', employeeName: 'Marie Martin', status: 'ok' }),
    makeEmployee({ employeeId: 'emp-2', employeeName: 'Pierre Dupont', status: 'warning', currentWeekHours: 40, alerts: [{ type: 'weekly_hours', severity: 'warning', message: 'Proche des 44h' }] }),
    makeEmployee({ employeeId: 'emp-3', employeeName: 'Sophie Leclerc', status: 'critical', currentWeekHours: 46, alerts: [{ type: 'weekly_hours', severity: 'critical', message: 'Dépasse 44h' }] }),
  ],
  summary: { totalEmployees: 3, compliant: 1, warnings: 1, critical: 1 },
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ComplianceWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('État loading', () => {
    it('affiche le titre "Alertes conformité" pendant le chargement', () => {
      mockGetWeeklyComplianceOverview.mockReturnValue(new Promise(() => {}))
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      expect(screen.getByText('Alertes conformité')).toBeInTheDocument()
    })

    it('appelle le service avec le bon employerId', async () => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(emptyOverview)
      renderWithProviders(<ComplianceWidget employerId="employer-42" />)
      await waitFor(() => {
        expect(mockGetWeeklyComplianceOverview).toHaveBeenCalledWith('employer-42')
      })
    })
  })

  describe('Aucun auxiliaire', () => {
    it('affiche "Aucun auxiliaire actif" si la liste est vide', async () => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(emptyOverview)
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/aucun auxiliaire actif/i)).toBeInTheDocument()
      })
    })
  })

  describe('Avec des employés', () => {
    beforeEach(() => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(overviewWithEmployees)
    })

    it('affiche le libellé de la semaine', async () => {
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Semaine du 16 au 22 fév. 2026')).toBeInTheDocument()
      })
    })

    it('affiche le lien vers /conformite', async () => {
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /voir toute la conformité/i })
        expect(link).toHaveAttribute('href', '/conformite')
      })
    })
  })

  describe('Liste d\'alertes résumé', () => {
    it('affiche "Convention respectee" quand aucune alerte', async () => {
      const allOk: WeeklyComplianceOverview = {
        ...overviewWithEmployees,
        employees: [
          makeEmployee({ employeeId: 'emp-1', employeeName: 'Marie Martin', status: 'ok', alerts: [] }),
        ],
        summary: { totalEmployees: 1, compliant: 1, warnings: 0, critical: 0 },
      }
      mockGetWeeklyComplianceOverview.mockResolvedValue(allOk)
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Convention respectee')).toBeInTheDocument()
        expect(screen.getByText('Planning de la semaine conforme.')).toBeInTheDocument()
      })
    })

    it('affiche les alertes critiques et warnings', async () => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(overviewWithEmployees)
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        expect(alerts.length).toBeGreaterThan(0)
      })
    })
  })
})
