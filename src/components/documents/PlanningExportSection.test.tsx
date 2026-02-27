import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { PlanningExportSection } from './PlanningExportSection'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/services/contractService', () => ({
  getContractsForEmployer: vi.fn().mockResolvedValue([
    {
      id: 'contract-1',
      employeeId: 'emp-1',
      contractType: 'CDI',
      pasRate: 0,
      employee: { firstName: 'Marie', lastName: 'Curie' },
    },
  ]),
}))

const { mockPlanningData, mockGetPlanningExportData, mockGetPlanningExportDataForEmployee, mockDownloadExport } =
  vi.hoisted(() => {
    const mockPlanningData = {
      year: 2024,
      month: 3,
      periodLabel: 'Mars 2024',
      employerId: 'employer-1',
      employerFirstName: 'Pierre',
      employerLastName: 'Dupont',
      employees: [
        {
          employeeId: 'emp-1',
          firstName: 'Marie',
          lastName: 'Curie',
          contractId: 'contract-1',
          contractType: 'CDI',
          weeklyHours: 35,
          hourlyRate: 12.5,
          shifts: [],
          absences: [],
          totalShifts: 0,
          totalHours: 0,
          totalPay: 0,
        },
      ],
      totalEmployees: 1,
      totalShifts: 0,
      totalHours: 0,
      generatedAt: new Date(),
    }
    return {
      mockPlanningData,
      mockGetPlanningExportData: vi.fn().mockResolvedValue(mockPlanningData),
      mockGetPlanningExportDataForEmployee: vi.fn().mockResolvedValue(mockPlanningData),
      mockDownloadExport: vi.fn(),
    }
  })

vi.mock('@/lib/export', () => ({
  getPlanningExportData: mockGetPlanningExportData,
  getPlanningExportDataForEmployee: mockGetPlanningExportDataForEmployee,
  generatePlanningPdf: vi.fn().mockReturnValue({
    success: true,
    filename: 'planning.pdf',
    content: 'data:application/pdf;base64,TEST',
    mimeType: 'application/pdf',
  }),
  generatePlanningExcel: vi.fn().mockReturnValue({
    success: true,
    filename: 'planning.xlsx',
    content: 'BASE64',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }),
  generatePlanningIcal: vi.fn().mockReturnValue({
    success: true,
    filename: 'planning.ics',
    content: 'BEGIN:VCALENDAR',
    mimeType: 'text/calendar',
  }),
  downloadExport: mockDownloadExport,
}))

vi.mock('@/lib/export/types', () => ({
  MONTHS_FR: [
    'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
  ],
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PlanningExportSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPlanningExportData.mockResolvedValue(mockPlanningData)
    mockGetPlanningExportDataForEmployee.mockResolvedValue(mockPlanningData)
  })

  const defaultProps = {
    employerId: 'employer-1',
    profileRole: 'employer' as const,
    profileId: 'employer-1',
  }

  it('affiche les selecteurs de periode et le bouton de generation', async () => {
    renderWithProviders(<PlanningExportSection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Exporter le planning')).toBeInTheDocument()
    })
    expect(screen.getByText('Générer et télécharger')).toBeInTheDocument()
  })

  it('affiche la selection employe pour un employeur', async () => {
    renderWithProviders(<PlanningExportSection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Tous les employés')).toBeInTheDocument()
      expect(screen.getByText('Marie Curie')).toBeInTheDocument()
    })
  })

  it('naffiche pas la selection employe pour un employe', async () => {
    renderWithProviders(
      <PlanningExportSection
        employerId=""
        profileRole="employee"
        profileId="emp-1"
      />
    )
    await waitFor(() => {
      expect(screen.queryByText('Tous les employés')).not.toBeInTheDocument()
    })
  })

  it('affiche les boutons de format PDF Excel iCal', async () => {
    renderWithProviders(<PlanningExportSection {...defaultProps} />)
    await waitFor(() => {
      // Ces textes apparaissent aussi dans l'alerte info (strong) → getAllByText
      expect(screen.getAllByText('PDF').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Excel').length).toBeGreaterThan(0)
      expect(screen.getAllByText('iCal').length).toBeGreaterThan(0)
    })
  })

  it('genere et telecharge en PDF au clic sur Generer', async () => {
    renderWithProviders(<PlanningExportSection {...defaultProps} />)

    await waitFor(() => screen.getByText('Générer et télécharger'))
    await userEvent.click(screen.getByText('Générer et télécharger'))

    await waitFor(() => {
      expect(mockGetPlanningExportData).toHaveBeenCalled()
      expect(mockDownloadExport).toHaveBeenCalled()
    })
  })

  it('affiche une erreur si aucune donnee disponible', async () => {
    mockGetPlanningExportData.mockResolvedValueOnce(null)

    renderWithProviders(<PlanningExportSection {...defaultProps} />)
    await waitFor(() => screen.getByText('Générer et télécharger'))
    await userEvent.click(screen.getByText('Générer et télécharger'))

    await waitFor(() => {
      expect(screen.getByText('Aucune donnée disponible pour cette période')).toBeInTheDocument()
    })
  })

  it('appelle getPlanningExportDataForEmployee pour un employe', async () => {
    renderWithProviders(
      <PlanningExportSection
        employerId=""
        profileRole="employee"
        profileId="emp-1"
      />
    )

    await waitFor(() => screen.getByText('Générer et télécharger'))
    await userEvent.click(screen.getByText('Générer et télécharger'))

    await waitFor(() => {
      expect(mockGetPlanningExportDataForEmployee).toHaveBeenCalledWith('emp-1', expect.any(Object))
    })
  })

  it('affiche lalerte info sur les formats', async () => {
    renderWithProviders(<PlanningExportSection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('À propos des formats')).toBeInTheDocument()
    })
  })
})
