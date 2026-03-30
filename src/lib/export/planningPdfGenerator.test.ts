import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generatePlanningPdf } from './planningPdfGenerator'
import type { PlanningExportData, EmployeePlanningData, PlanningShiftEntry } from './types'

// ── Mock react-pdf renderer ────────────────────────────────────────────────

vi.mock('./pdfReactRenderer', () => ({
  renderReactPdf: vi.fn(async () => 'data:application/pdf;base64,MOCK_PDF'),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeShift(overrides: Partial<PlanningShiftEntry> = {}): PlanningShiftEntry {
  return {
    id: 'shift-1',
    date: new Date('2024-03-15'),
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    shiftType: 'effective',
    status: 'completed',
    effectiveHours: 7,
    isSunday: false,
    isHoliday: false,
    totalPay: 87.5,
    ...overrides,
  }
}

function makeEmployee(overrides: Partial<EmployeePlanningData> = {}): EmployeePlanningData {
  return {
    employeeId: 'emp-1',
    firstName: 'Marie',
    lastName: 'Curie',
    contractId: 'contract-1',
    contractType: 'CDI',
    weeklyHours: 35,
    hourlyRate: 12.5,
    shifts: [makeShift()],
    absences: [],
    totalShifts: 1,
    totalHours: 7,
    totalPay: 87.5,
    ...overrides,
  }
}

function makeData(overrides: Partial<PlanningExportData> = {}): PlanningExportData {
  return {
    year: 2024,
    month: 3,
    periodLabel: 'Mars 2024',
    employerId: 'employer-1',
    employerFirstName: 'Pierre',
    employerLastName: 'Dupont',
    employees: [makeEmployee()],
    totalEmployees: 1,
    totalShifts: 1,
    totalHours: 7,
    generatedAt: new Date('2024-03-31T10:00:00Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generatePlanningPdf', () => {
  it('retourne un résultat réussi', async () => {
    const result = await generatePlanningPdf(makeData())
    expect(result.success).toBe(true)
    expect(result.filename).toMatch(/\.pdf$/)
    expect(result.mimeType).toBe('application/pdf')
    expect(result.content).toBe('data:application/pdf;base64,MOCK_PDF')
  })

  it('le nom de fichier contient le nom de l\'employé si un seul employé', async () => {
    const result = await generatePlanningPdf(makeData())
    expect(result.filename).toContain('curie')
    expect(result.filename).toContain('2024')
    expect(result.filename).toContain('03')
  })

  it('le nom de fichier contient "complet" si plusieurs employés', async () => {
    const data = makeData({
      employees: [makeEmployee(), makeEmployee({ employeeId: 'emp-2', firstName: 'Paul', lastName: 'Martin' })],
      totalEmployees: 2,
    })
    const result = await generatePlanningPdf(data)
    expect(result.filename).toContain('complet')
  })

  it('gère les absences approuvées', async () => {
    const data = makeData({
      employees: [
        makeEmployee({
          shifts: [],
          absences: [
            {
              id: 'abs-1',
              startDate: new Date('2024-03-15'),
              endDate: new Date('2024-03-15'),
              absenceType: 'vacation',
              status: 'approved',
            },
          ],
        }),
      ],
    })
    const result = await generatePlanningPdf(data)
    expect(result.success).toBe(true)
  })

  it('gère les erreurs de génération', async () => {
    const { renderReactPdf } = await import('./pdfReactRenderer')
    vi.mocked(renderReactPdf).mockRejectedValueOnce(new Error('PDF error'))

    const result = await generatePlanningPdf(makeData())
    expect(result.success).toBe(false)
    expect(result.error).toBe('PDF error')
  })

  it('gère plusieurs types de shifts', async () => {
    const data = makeData({
      employees: [
        makeEmployee({
          shifts: [
            makeShift({ shiftType: 'effective' }),
            makeShift({ id: 'shift-2', shiftType: 'presence_day' }),
            makeShift({ id: 'shift-3', shiftType: 'presence_night' }),
            makeShift({ id: 'shift-4', shiftType: 'guard_24h' }),
          ],
          totalShifts: 4,
        }),
      ],
    })
    const result = await generatePlanningPdf(data)
    expect(result.success).toBe(true)
  })

  it('gère les shifts annulés (filtrés)', async () => {
    const data = makeData({
      employees: [
        makeEmployee({
          shifts: [
            makeShift({ status: 'cancelled' }),
            makeShift({ id: 'shift-2', status: 'completed' }),
          ],
        }),
      ],
    })
    const result = await generatePlanningPdf(data)
    expect(result.success).toBe(true)
  })
})
