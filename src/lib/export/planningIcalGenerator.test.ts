import { describe, it, expect } from 'vitest'
import { generatePlanningIcal } from './planningIcalGenerator'
import type { PlanningExportData, EmployeePlanningData, PlanningShiftEntry, PlanningAbsenceEntry } from './types'

function makeShift(overrides: Partial<PlanningShiftEntry> = {}): PlanningShiftEntry {
  return {
    id: 'shift-1',
    date: new Date('2024-03-15'), // vendredi
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

function makeAbsence(overrides: Partial<PlanningAbsenceEntry> = {}): PlanningAbsenceEntry {
  return {
    id: 'absence-1',
    startDate: new Date('2024-03-20'),
    endDate: new Date('2024-03-22'),
    absenceType: 'vacation',
    status: 'approved',
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

describe('generatePlanningIcal', () => {
  it('retourne un résultat réussi avec une donnée valide', () => {
    const result = generatePlanningIcal(makeData())
    expect(result.success).toBe(true)
    expect(result.filename).toMatch(/\.ics$/)
    expect(result.mimeType).toBe('text/calendar')
  })

  it('contient les balises VCALENDAR obligatoires', () => {
    const result = generatePlanningIcal(makeData())
    expect(result.content).toContain('BEGIN:VCALENDAR')
    expect(result.content).toContain('END:VCALENDAR')
    expect(result.content).toContain('VERSION:2.0')
  })

  it('génère un VEVENT pour chaque shift', () => {
    const result = generatePlanningIcal(makeData())
    expect(result.content).toContain('BEGIN:VEVENT')
    expect(result.content).toContain('unilien-shift-shift-1@unilien.app')
    expect(result.content).toContain('DTSTART;TZID=Europe/Paris:')
  })

  it('utilise STATUS:CANCELLED pour un shift annulé', () => {
    const data = makeData({
      employees: [makeEmployee({ shifts: [makeShift({ status: 'cancelled' })] })],
    })
    const result = generatePlanningIcal(data)
    expect(result.content).toContain('STATUS:CANCELLED')
  })

  it('génère un VEVENT all-day pour une absence approuvée', () => {
    const data = makeData({
      employees: [makeEmployee({ absences: [makeAbsence()] })],
    })
    const result = generatePlanningIcal(data)
    expect(result.content).toContain('unilien-absence-absence-1@unilien.app')
    expect(result.content).toContain('DTSTART;VALUE=DATE:')
  })

  it("n'inclut pas les absences non approuvées", () => {
    const data = makeData({
      employees: [makeEmployee({ absences: [makeAbsence({ status: 'pending' })] })],
    })
    const result = generatePlanningIcal(data)
    expect(result.content).not.toContain('unilien-absence-absence-1@unilien.app')
  })

  it('replie les lignes longues selon RFC 5545', () => {
    const longName = 'A'.repeat(80)
    const data = makeData({
      employees: [
        makeEmployee({
          firstName: longName,
          lastName: 'B',
        }),
      ],
    })
    const result = generatePlanningIcal(data)
    // Aucune ligne ne doit dépasser 75 caractères (74 + \r\n)
    const lines = result.content.split('\r\n')
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(74 + 1) // 1 espace de continuation possible
    }
  })

  it(`le nom de fichier contient le nom de l'employé si un seul employé`, () => {
    const result = generatePlanningIcal(makeData())
    expect(result.filename).toContain('curie')
    expect(result.filename).toContain('2024')
    expect(result.filename).toContain('03')
  })

  it('le nom de fichier est générique si plusieurs employés', () => {
    const data = makeData({
      employees: [makeEmployee(), makeEmployee({ employeeId: 'emp-2', firstName: 'Paul', lastName: 'Martin' })],
      totalEmployees: 2,
    })
    const result = generatePlanningIcal(data)
    expect(result.filename).toMatch(/planning_.*\.ics/)
  })

  it('gère les données sans shift ni absence', () => {
    const data = makeData({
      employees: [makeEmployee({ shifts: [], absences: [] })],
    })
    const result = generatePlanningIcal(data)
    expect(result.success).toBe(true)
    expect(result.content).not.toContain('BEGIN:VEVENT')
  })
})
