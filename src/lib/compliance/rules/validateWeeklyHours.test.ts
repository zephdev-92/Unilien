import { describe, it, expect } from 'vitest'
import { validateWeeklyHours, getRemainingWeeklyHours } from './validateWeeklyHours'
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

describe('validateWeeklyHours', () => {
  describe('Sous le maximum (< 44h)', () => {
    it('devrait valider première intervention de la semaine', () => {
      const newShift = createShift('2025-01-15', '09:00', '17:00') // 8h
      const result = validateWeeklyHours(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(8)
      expect(result.details?.remainingHours).toBe(40)
    })

    it('devrait valider total de 40h dans la semaine', () => {
      const existingShifts = [
        createShift('2025-01-13', '09:00', '17:00'), // Lundi 8h
        createShift('2025-01-14', '09:00', '17:00'), // Mardi 8h
        createShift('2025-01-15', '09:00', '17:00'), // Mercredi 8h
        createShift('2025-01-16', '09:00', '17:00'), // Jeudi 8h
      ]
      const newShift = createShift('2025-01-17', '09:00', '17:00') // Vendredi 8h

      const result = validateWeeklyHours(newShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(40)
    })
  })

  describe('Zone d\'avertissement (44h-48h)', () => {
    it('devrait avertir à 45h', () => {
      // 5 jours x 8h = 40h existantes
      const existingShifts = [
        createShift('2025-01-13', '08:00', '16:00'),
        createShift('2025-01-14', '08:00', '16:00'),
        createShift('2025-01-15', '08:00', '16:00'),
        createShift('2025-01-16', '08:00', '16:00'),
        createShift('2025-01-17', '08:00', '16:00'),
      ]
      // +5h le samedi = 45h total
      const newShift = createShift('2025-01-18', '09:00', '14:00')

      const result = validateWeeklyHours(newShift, existingShifts)

      expect(result.valid).toBe(true) // Valide mais avec avertissement
      expect(result.message).toContain('45')
      expect(result.details?.isWarning).toBe(true)
    })

    it('devrait avertir à 47h', () => {
      const existingShifts = [
        createShift('2025-01-13', '06:00', '16:00'), // 10h
        createShift('2025-01-14', '06:00', '16:00'), // 10h
        createShift('2025-01-15', '06:00', '16:00'), // 10h
        createShift('2025-01-16', '06:00', '16:00'), // 10h
      ] // = 40h
      const newShift = createShift('2025-01-17', '08:00', '15:00') // +7h = 47h

      const result = validateWeeklyHours(newShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.isWarning).toBe(true)
      expect(result.details?.remainingHours).toBe(1)
    })
  })

  describe('Dépassement du maximum (> 48h)', () => {
    it('devrait rejeter à 49h', () => {
      const existingShifts = [
        createShift('2025-01-13', '06:00', '16:00'), // 10h
        createShift('2025-01-14', '06:00', '16:00'), // 10h
        createShift('2025-01-15', '06:00', '16:00'), // 10h
        createShift('2025-01-16', '06:00', '16:00'), // 10h
      ] // = 40h
      const newShift = createShift('2025-01-17', '06:00', '15:00') // +9h = 49h

      const result = validateWeeklyHours(newShift, existingShifts)

      expect(result.valid).toBe(false)
      expect(result.code).toBe(COMPLIANCE_RULES.WEEKLY_MAX_HOURS)
      expect(result.message).toContain('49')
      expect(result.details?.isBlocking).toBe(true)
    })

    it('devrait rejeter exactement à 48h01', () => {
      const existingShifts = [
        createShift('2025-01-13', '00:00', '12:00'), // 12h
        createShift('2025-01-14', '00:00', '12:00'), // 12h
        createShift('2025-01-15', '00:00', '12:00'), // 12h
        createShift('2025-01-16', '00:00', '12:00'), // 12h
      ] // = 48h
      const newShift = createShift('2025-01-17', '09:00', '09:02') // +0.03h = 48.03h

      const result = validateWeeklyHours(newShift, existingShifts)

      expect(result.valid).toBe(false)
    })
  })

  describe('Isolation par semaine', () => {
    it('devrait ignorer les interventions de la semaine précédente', () => {
      const existingShifts = [
        // Semaine précédente
        createShift('2025-01-06', '06:00', '18:00'), // 12h
        createShift('2025-01-07', '06:00', '18:00'), // 12h
        createShift('2025-01-08', '06:00', '18:00'), // 12h
        createShift('2025-01-09', '06:00', '18:00'), // 12h
      ]
      // Nouvelle semaine - devrait être indépendante
      const newShift = createShift('2025-01-15', '09:00', '17:00') // 8h

      const result = validateWeeklyHours(newShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(8) // Seulement cette intervention
    })
  })

  describe('Isolation par employé', () => {
    it('devrait ignorer les interventions d\'autres employés', () => {
      const existingShifts = [
        createShift('2025-01-13', '06:00', '18:00', 'other-employee'),
        createShift('2025-01-14', '06:00', '18:00', 'other-employee'),
        createShift('2025-01-15', '06:00', '18:00', 'other-employee'),
      ]
      const newShift = createShift('2025-01-15', '09:00', '17:00', 'employee-1')

      const result = validateWeeklyHours(newShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(8)
    })
  })

  describe('Modification d\'intervention', () => {
    it('devrait exclure l\'intervention en cours de modification', () => {
      const existingShifts = [
        createShift('2025-01-13', '06:00', '18:00', 'employee-1', 'shift-1'), // 12h
        createShift('2025-01-14', '06:00', '18:00', 'employee-1', 'shift-2'), // 12h
        createShift('2025-01-15', '06:00', '18:00', 'employee-1', 'shift-3'), // 12h à modifier
      ]
      // On modifie shift-3 pour le raccourcir
      const modifiedShift = createShift('2025-01-15', '09:00', '12:00', 'employee-1', 'shift-3') // 3h

      const result = validateWeeklyHours(modifiedShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(27) // 12 + 12 + 3
    })
  })
})

describe('getRemainingWeeklyHours', () => {
  it('devrait retourner 48 si pas d\'intervention', () => {
    const remaining = getRemainingWeeklyHours(
      new Date('2025-01-15'),
      'employee-1',
      []
    )
    expect(remaining).toBe(48)
  })

  it('devrait calculer les heures restantes correctement', () => {
    const existingShifts = [
      createShift('2025-01-13', '09:00', '17:00'), // 8h
      createShift('2025-01-14', '09:00', '17:00'), // 8h
    ]
    const remaining = getRemainingWeeklyHours(
      new Date('2025-01-15'),
      'employee-1',
      existingShifts
    )
    expect(remaining).toBe(32) // 48 - 16
  })

  it('devrait retourner 0 si déjà au maximum', () => {
    const existingShifts = [
      createShift('2025-01-13', '00:00', '12:00'), // 12h
      createShift('2025-01-14', '00:00', '12:00'), // 12h
      createShift('2025-01-15', '00:00', '12:00'), // 12h
      createShift('2025-01-16', '00:00', '12:00'), // 12h
    ]
    const remaining = getRemainingWeeklyHours(
      new Date('2025-01-15'),
      'employee-1',
      existingShifts
    )
    expect(remaining).toBe(0)
  })
})
