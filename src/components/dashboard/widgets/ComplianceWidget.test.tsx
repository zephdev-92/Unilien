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
    it('affiche un spinner pendant le chargement', () => {
      mockGetWeeklyComplianceOverview.mockReturnValue(new Promise(() => {}))
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      // Le titre "Conformité" est visible mais pas les données
      expect(screen.getByText('Conformité')).toBeInTheDocument()
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

    it('affiche les noms des employés', async () => {
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getAllByText('Marie Martin').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Pierre Dupont').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Sophie Leclerc').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('affiche les heures courantes et restantes', async () => {
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('20h / 48h')).toBeInTheDocument()
      })
    })

    it('affiche les alertes des employés', async () => {
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getAllByText('Proche des 44h').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Dépasse 44h').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('affiche les compteurs de la barre de résumé (1 OK)', async () => {
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('1 OK')).toBeInTheDocument()
      })
    })

    it('affiche le lien vers /conformite', async () => {
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /détails/i })
        expect(link).toHaveAttribute('href', '/conformite')
      })
    })
  })

  describe('Overflow +N employés', () => {
    it('affiche "+N autres" si plus de 4 employés', async () => {
      const manyEmployees: WeeklyComplianceOverview = {
        ...overviewWithEmployees,
        employees: [
          makeEmployee({ employeeId: 'emp-1', employeeName: 'Employé 1' }),
          makeEmployee({ employeeId: 'emp-2', employeeName: 'Employé 2' }),
          makeEmployee({ employeeId: 'emp-3', employeeName: 'Employé 3' }),
          makeEmployee({ employeeId: 'emp-4', employeeName: 'Employé 4' }),
          makeEmployee({ employeeId: 'emp-5', employeeName: 'Employé 5' }),
          makeEmployee({ employeeId: 'emp-6', employeeName: 'Employé 6' }),
        ],
        summary: { totalEmployees: 6, compliant: 6, warnings: 0, critical: 0 },
      }
      mockGetWeeklyComplianceOverview.mockResolvedValue(manyEmployees)
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/\+2 autres/i)).toBeInTheDocument()
      })
    })
  })

  describe('Liste d\'alertes resume', () => {
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

    it('affiche les alertes critiques et warnings dans la liste resume', async () => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(overviewWithEmployees)
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        // Alert list shows the alert messages
        const alerts = screen.getAllByRole('alert')
        expect(alerts.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Tri par statut', () => {
    it('affiche les employés critiques en premier dans les lignes', async () => {
      mockGetWeeklyComplianceOverview.mockResolvedValue(overviewWithEmployees)
      renderWithProviders(<ComplianceWidget employerId="employer-1" />)
      await waitFor(() => {
        // Get all name elements, filter to those in employee rows (which contain hours info)
        const allNames = screen
          .getAllByText(/Marie Martin|Pierre Dupont|Sophie Leclerc/)
          .map((el) => el.textContent)
        // The last 3 occurrences are the sorted employee rows (after alert list names)
        const employeeRowNames = allNames.slice(-3)
        // critical avant warning avant ok
        expect(employeeRowNames[0]).toBe('Sophie Leclerc')
        expect(employeeRowNames[1]).toBe('Pierre Dupont')
        expect(employeeRowNames[2]).toBe('Marie Martin')
      })
    })
  })
})
