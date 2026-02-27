import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generatePlanningPdf } from './planningPdfGenerator'
import type { PlanningExportData, EmployeePlanningData, PlanningShiftEntry } from './types'

// ── Mock jsPDF ────────────────────────────────────────────────────────────────

const { mockDoc } = vi.hoisted(() => {
  const mockDoc = {
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    addPage: vi.fn(),
    setPage: vi.fn(),
    output: vi.fn().mockReturnValue('data:application/pdf;base64,MOCK_PDF'),
    internal: {
      getNumberOfPages: vi.fn().mockReturnValue(1),
      pageSize: {
        getWidth: vi.fn().mockReturnValue(210),
        getHeight: vi.fn().mockReturnValue(297),
      },
    },
  }
  return { mockDoc }
})

vi.mock('jspdf', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: vi.fn(function(this: any) { Object.assign(this, mockDoc) }),
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
  mockDoc.output.mockReturnValue('data:application/pdf;base64,MOCK_PDF')
  mockDoc.internal.getNumberOfPages.mockReturnValue(1)
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generatePlanningPdf', () => {
  it('retourne un résultat réussi', () => {
    const result = generatePlanningPdf(makeData())
    expect(result.success).toBe(true)
    expect(result.filename).toMatch(/\.pdf$/)
    expect(result.mimeType).toBe('application/pdf')
    expect(result.content).toBe('data:application/pdf;base64,MOCK_PDF')
  })

  it('appelle addPage pour chaque employé supplémentaire', () => {
    const data = makeData({
      employees: [makeEmployee(), makeEmployee({ employeeId: 'emp-2', firstName: 'Paul', lastName: 'Martin' })],
      totalEmployees: 2,
    })
    mockDoc.internal.getNumberOfPages.mockReturnValue(2)
    generatePlanningPdf(data)
    expect(mockDoc.addPage).toHaveBeenCalledTimes(1)
  })

  it(`le nom de fichier contient le nom de l'employé si un seul employé`, () => {
    const result = generatePlanningPdf(makeData())
    expect(result.filename).toContain('curie')
    expect(result.filename).toContain('2024')
    expect(result.filename).toContain('03')
  })

  it('le nom de fichier contient "complet" si plusieurs employés', () => {
    const data = makeData({
      employees: [makeEmployee(), makeEmployee({ employeeId: 'emp-2', firstName: 'Paul', lastName: 'Martin' })],
      totalEmployees: 2,
    })
    mockDoc.internal.getNumberOfPages.mockReturnValue(2)
    const result = generatePlanningPdf(data)
    expect(result.filename).toContain('complet')
  })

  it('gère les erreurs de génération', () => {
    mockDoc.output.mockImplementationOnce(() => {
      throw new Error('PDF error')
    })
    const result = generatePlanningPdf(makeData())
    expect(result.success).toBe(false)
    expect(result.error).toBe('PDF error')
  })

  it(`appelle doc.text pour l'en-tête`, () => {
    generatePlanningPdf(makeData())
    expect(mockDoc.text).toHaveBeenCalledWith('PLANNING', expect.any(Number), expect.any(Number), expect.objectContaining({ align: 'center' }))
  })

  it('gère les absences approuvées dans la grille', () => {
    const data = makeData({
      employees: [
        makeEmployee({
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
    const result = generatePlanningPdf(data)
    expect(result.success).toBe(true)
  })
})
