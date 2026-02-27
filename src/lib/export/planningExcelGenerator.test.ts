import { describe, it, expect, vi } from 'vitest'
import { generatePlanningExcel } from './planningExcelGenerator'
import type { PlanningExportData, EmployeePlanningData, PlanningShiftEntry } from './types'

// Mock xlsx
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    aoa_to_sheet: vi.fn(() => ({ '!cols': [] })),
  },
  write: vi.fn(() => 'MOCK_BASE64_XLSX'),
}))

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

describe('generatePlanningExcel', () => {
  it('retourne un résultat réussi', () => {
    const result = generatePlanningExcel(makeData())
    expect(result.success).toBe(true)
    expect(result.filename).toMatch(/\.xlsx$/)
    expect(result.mimeType).toContain('spreadsheetml')
  })

  it('le contenu est la valeur retournée par XLSX.write', () => {
    const result = generatePlanningExcel(makeData())
    expect(result.content).toBe('MOCK_BASE64_XLSX')
  })

  it(`le nom de fichier contient le nom de l'employé si un seul employé`, () => {
    const result = generatePlanningExcel(makeData())
    expect(result.filename).toContain('curie')
    expect(result.filename).toContain('2024')
    expect(result.filename).toContain('03')
  })

  it('le nom de fichier est générique si plusieurs employés', () => {
    const data = makeData({
      employees: [makeEmployee(), makeEmployee({ employeeId: 'emp-2', firstName: 'Paul', lastName: 'Martin' })],
      totalEmployees: 2,
    })
    const result = generatePlanningExcel(data)
    expect(result.filename).toMatch(/planning_.*\.xlsx/)
  })

  it('gère les erreurs XLSX.write', async () => {
    const XLSX = await import('xlsx')
    vi.mocked(XLSX.write).mockImplementationOnce(() => {
      throw new Error('XLSX error')
    })
    const result = generatePlanningExcel(makeData())
    expect(result.success).toBe(false)
    expect(result.error).toBe('XLSX error')
  })
})
