import { describe, it, expect } from 'vitest'
import { validateWeeklyRest, getWeeklyRestStatus } from './validateWeeklyRest'
import type { ShiftForValidation } from '../types'
import { COMPLIANCE_RULES } from '../types'

function createShift(
  date: string,
  startTime: string,
  endTime: string,
  employeeId: string = 'employee-1',
  id?: string
): ShiftForValidation {
  return {
    id,
    contractId: 'contract-1',
    employeeId,
    date: new Date(date),
    startTime,
    endTime,
    breakDuration: 0,
  }
}

describe('validateWeeklyRest', () => {
  describe('Repos suffisant (>= 35h consécutives)', () => {
    it('devrait valider si pas d\'intervention dans la semaine', () => {
      const newShift = createShift('2025-01-15', '09:00', '17:00')
      const result = validateWeeklyRest(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.code).toBe(COMPLIANCE_RULES.WEEKLY_REST)
      expect(result.details?.longestRestHours).toBeGreaterThan(35)
    })

    it('devrait valider avec 35h de repos le week-end', () => {
      // Interventions du lundi au vendredi, repos samedi-dimanche
      const existingShifts = [
        createShift('2025-01-13', '09:00', '17:00', 'employee-1', 'shift-1'), // Lundi
        createShift('2025-01-14', '09:00', '17:00', 'employee-1', 'shift-2'), // Mardi
        createShift('2025-01-15', '09:00', '17:00', 'employee-1', 'shift-3'), // Mercredi
        createShift('2025-01-16', '09:00', '17:00', 'employee-1', 'shift-4'), // Jeudi
      ]
      // Vendredi finit à 17h, repos jusqu'à lundi = >60h de repos
      const newShift = createShift('2025-01-17', '09:00', '17:00')

      const result = validateWeeklyRest(newShift, existingShifts)

      expect(result.valid).toBe(true)
    })

    it('devrait valider avec un jour complet de repos en milieu de semaine', () => {
      const existingShifts = [
        createShift('2025-01-13', '08:00', '16:00', 'employee-1', 'shift-1'), // Lundi
        createShift('2025-01-14', '08:00', '16:00', 'employee-1', 'shift-2'), // Mardi
        // Mercredi repos
        // Jeudi repos = 40h de repos consécutives
        createShift('2025-01-17', '08:00', '16:00', 'employee-1', 'shift-3'), // Vendredi
      ]
      const newShift = createShift('2025-01-18', '08:00', '12:00') // Samedi

      const result = validateWeeklyRest(newShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.longestRestHours).toBeGreaterThanOrEqual(35)
    })
  })

  describe('Repos insuffisant (< 35h consécutives)', () => {
    it('devrait rejeter si travail tous les jours sans 35h de repos', () => {
      // Interventions étalées sur toute la semaine
      const existingShifts = [
        createShift('2025-01-13', '08:00', '20:00', 'employee-1', 'shift-1'), // Lundi 12h
        createShift('2025-01-14', '08:00', '20:00', 'employee-1', 'shift-2'), // Mardi 12h
        createShift('2025-01-15', '08:00', '20:00', 'employee-1', 'shift-3'), // Mercredi 12h
        createShift('2025-01-16', '08:00', '20:00', 'employee-1', 'shift-4'), // Jeudi 12h
        createShift('2025-01-17', '08:00', '20:00', 'employee-1', 'shift-5'), // Vendredi 12h
        createShift('2025-01-18', '08:00', '20:00', 'employee-1', 'shift-6'), // Samedi 12h
      ]
      // Dimanche aussi = jamais 35h de repos
      const newShift = createShift('2025-01-19', '08:00', '20:00')

      const result = validateWeeklyRest(newShift, existingShifts)

      expect(result.valid).toBe(false)
      expect(result.code).toBe(COMPLIANCE_RULES.WEEKLY_REST)
      expect(result.details?.isBlocking).toBe(true)
    })

    it('devrait rejeter avec seulement 8h de repos entre interventions longues', () => {
      // Interventions longues tous les jours avec peu de repos
      // Chaque jour 06:00-22:00 = 16h travail, 8h repos seulement
      const existingShifts = [
        createShift('2025-01-13', '06:00', '22:00', 'employee-1', 'shift-1'), // Lundi
        createShift('2025-01-14', '06:00', '22:00', 'employee-1', 'shift-2'), // Mardi
        createShift('2025-01-15', '06:00', '22:00', 'employee-1', 'shift-3'), // Mercredi
        createShift('2025-01-16', '06:00', '22:00', 'employee-1', 'shift-4'), // Jeudi
        createShift('2025-01-17', '06:00', '22:00', 'employee-1', 'shift-5'), // Vendredi
        createShift('2025-01-18', '06:00', '22:00', 'employee-1', 'shift-6'), // Samedi
      ]
      // Dimanche aussi = pas 35h de repos consécutives
      const newShift = createShift('2025-01-19', '06:00', '22:00')

      const result = validateWeeklyRest(newShift, existingShifts)

      // Max repos = 8h entre chaque jour (22h -> 06h)
      expect(result.valid).toBe(false)
      expect(result.details?.longestRestHours).toBeLessThan(35)
    })
  })

  describe('Isolation par employé', () => {
    it('devrait ignorer les interventions d\'autres employés', () => {
      // Autre employé travaille tous les jours
      const existingShifts = [
        createShift('2025-01-13', '06:00', '22:00', 'other-employee', 'shift-1'),
        createShift('2025-01-14', '06:00', '22:00', 'other-employee', 'shift-2'),
        createShift('2025-01-15', '06:00', '22:00', 'other-employee', 'shift-3'),
        createShift('2025-01-16', '06:00', '22:00', 'other-employee', 'shift-4'),
        createShift('2025-01-17', '06:00', '22:00', 'other-employee', 'shift-5'),
        createShift('2025-01-18', '06:00', '22:00', 'other-employee', 'shift-6'),
        createShift('2025-01-19', '06:00', '22:00', 'other-employee', 'shift-7'),
      ]
      const newShift = createShift('2025-01-15', '09:00', '17:00', 'employee-1')

      const result = validateWeeklyRest(newShift, existingShifts)

      expect(result.valid).toBe(true)
    })
  })

  describe('Modification d\'intervention', () => {
    it('devrait exclure l\'intervention en cours de modification', () => {
      const existingShifts = [
        createShift('2025-01-13', '08:00', '18:00', 'employee-1', 'shift-1'),
        createShift('2025-01-14', '08:00', '18:00', 'employee-1', 'shift-2'),
        createShift('2025-01-15', '08:00', '18:00', 'employee-1', 'shift-3'), // À modifier
      ]
      // On décale shift-3 pour libérer du repos
      const modifiedShift = createShift('2025-01-13', '09:00', '12:00', 'employee-1', 'shift-3')

      const result = validateWeeklyRest(modifiedShift, existingShifts)

      expect(result.valid).toBe(true)
    })
  })
})

describe('getWeeklyRestStatus', () => {
  it('devrait retourner repos complet si pas d\'intervention', () => {
    const status = getWeeklyRestStatus(
      new Date('2025-01-15'),
      'employee-1',
      []
    )

    expect(status.isCompliant).toBe(true)
    expect(status.longestRest).toBeGreaterThan(100)
    expect(status.restPeriods.length).toBe(1)
  })

  it('devrait identifier les périodes de repos', () => {
    const existingShifts = [
      createShift('2025-01-13', '09:00', '17:00'), // Lundi
      createShift('2025-01-15', '09:00', '17:00'), // Mercredi
    ]
    const status = getWeeklyRestStatus(
      new Date('2025-01-15'),
      'employee-1',
      existingShifts
    )

    expect(status.restPeriods.length).toBeGreaterThan(0)
    // Repos entre lundi 17h et mercredi 9h = 40h
    const restBetween = status.restPeriods.find(p => p.hours >= 35)
    expect(restBetween).toBeDefined()
  })

  it('devrait indiquer non-conforme si repos max < 35h', () => {
    // La fonction étend la période d'analyse (weekStart -1j, weekEnd +1j)
    // Pour avoir un vrai test, on doit aussi couvrir la période étendue
    const existingShifts = [
      createShift('2025-01-12', '06:00', '22:00', 'employee-1', 'shift-0'), // Dimanche précédent
      createShift('2025-01-13', '06:00', '22:00', 'employee-1', 'shift-1'), // Lundi
      createShift('2025-01-14', '06:00', '22:00', 'employee-1', 'shift-2'), // Mardi
      createShift('2025-01-15', '06:00', '22:00', 'employee-1', 'shift-3'), // Mercredi
      createShift('2025-01-16', '06:00', '22:00', 'employee-1', 'shift-4'), // Jeudi
      createShift('2025-01-17', '06:00', '22:00', 'employee-1', 'shift-5'), // Vendredi
      createShift('2025-01-18', '06:00', '22:00', 'employee-1', 'shift-6'), // Samedi
      createShift('2025-01-19', '06:00', '22:00', 'employee-1', 'shift-7'), // Dimanche
      createShift('2025-01-20', '06:00', '22:00', 'employee-1', 'shift-8'), // Lundi suivant
    ]
    const status = getWeeklyRestStatus(
      new Date('2025-01-15'),
      'employee-1',
      existingShifts
    )

    // Avec 8h de repos max entre chaque jour (22h -> 6h = 8h), c'est < 35h
    expect(status.longestRest).toBeLessThan(35)
    expect(status.isCompliant).toBe(false)
  })
})
