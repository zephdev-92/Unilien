import { describe, it, expect } from 'vitest'
import { validateConsecutiveNights, countConsecutiveNights } from './validateConsecutiveNights'
import type { ShiftForValidation } from '../types'
import { COMPLIANCE_RULES } from '../types'

function createNightShift(
  date: string,
  employeeId: string = 'employee-1',
  id?: string
): ShiftForValidation {
  return {
    id,
    contractId: 'contract-1',
    employeeId,
    date: new Date(date),
    startTime: '21:00',
    endTime: '07:00',
    breakDuration: 0,
    shiftType: 'presence_night',
  }
}

function createEffectiveShift(
  date: string,
  employeeId: string = 'employee-1',
  id?: string
): ShiftForValidation {
  return {
    id,
    contractId: 'contract-1',
    employeeId,
    date: new Date(date),
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 0,
    shiftType: 'effective',
  }
}

describe('validateConsecutiveNights', () => {
  describe('Non applicable (autres types)', () => {
    it('devrait ignorer les interventions de type effective', () => {
      const shift: ShiftForValidation = {
        contractId: 'contract-1',
        employeeId: 'employee-1',
        date: new Date('2025-03-10'),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 0,
        shiftType: 'effective',
      }
      const result = validateConsecutiveNights(shift, [])

      expect(result.valid).toBe(true)
      expect(result.code).toBe(COMPLIANCE_RULES.CONSECUTIVE_NIGHTS_MAX)
    })

    it('devrait ignorer les interventions de type presence_day', () => {
      const shift: ShiftForValidation = {
        contractId: 'contract-1',
        employeeId: 'employee-1',
        date: new Date('2025-03-10'),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 0,
        shiftType: 'presence_day',
      }
      const result = validateConsecutiveNights(shift, [])

      expect(result.valid).toBe(true)
    })

    it('devrait ignorer si shiftType non défini (défaut effective)', () => {
      const shift: ShiftForValidation = {
        contractId: 'contract-1',
        employeeId: 'employee-1',
        date: new Date('2025-03-10'),
        startTime: '21:00',
        endTime: '07:00',
        breakDuration: 0,
      }
      const result = validateConsecutiveNights(shift, [])

      expect(result.valid).toBe(true)
    })
  })

  describe('Sous le maximum (<= 5 nuits)', () => {
    it('devrait valider la première nuit (aucune existante)', () => {
      const newShift = createNightShift('2025-03-10')
      const result = validateConsecutiveNights(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.details?.consecutiveNights).toBe(1)
      expect(result.details?.remainingNights).toBe(4)
    })

    it('devrait valider 2 nuits consécutives', () => {
      const existing = [
        createNightShift('2025-03-09', 'employee-1', 'shift-1'),
      ]
      const newShift = createNightShift('2025-03-10')
      const result = validateConsecutiveNights(newShift, existing)

      expect(result.valid).toBe(true)
      expect(result.details?.consecutiveNights).toBe(2)
      expect(result.details?.remainingNights).toBe(3)
    })

    it('devrait valider exactement 5 nuits consécutives', () => {
      const existing = [
        createNightShift('2025-03-06', 'employee-1', 'shift-1'),
        createNightShift('2025-03-07', 'employee-1', 'shift-2'),
        createNightShift('2025-03-08', 'employee-1', 'shift-3'),
        createNightShift('2025-03-09', 'employee-1', 'shift-4'),
      ]
      const newShift = createNightShift('2025-03-10')
      const result = validateConsecutiveNights(newShift, existing)

      expect(result.valid).toBe(true)
      expect(result.details?.consecutiveNights).toBe(5)
      expect(result.details?.remainingNights).toBe(0)
    })

    it('devrait ne pas compter les nuits non consécutives', () => {
      const existing = [
        createNightShift('2025-03-07', 'employee-1', 'shift-1'), // écart d'un jour
        createNightShift('2025-03-09', 'employee-1', 'shift-2'),
      ]
      const newShift = createNightShift('2025-03-10')
      const result = validateConsecutiveNights(newShift, existing)

      expect(result.valid).toBe(true)
      expect(result.details?.consecutiveNights).toBe(2) // 9 + 10 seulement
    })
  })

  describe('Dépassement du maximum (> 5 nuits)', () => {
    it('devrait rejeter la 6e nuit consécutive', () => {
      const existing = [
        createNightShift('2025-03-05', 'employee-1', 'shift-1'),
        createNightShift('2025-03-06', 'employee-1', 'shift-2'),
        createNightShift('2025-03-07', 'employee-1', 'shift-3'),
        createNightShift('2025-03-08', 'employee-1', 'shift-4'),
        createNightShift('2025-03-09', 'employee-1', 'shift-5'),
      ]
      const newShift = createNightShift('2025-03-10')
      const result = validateConsecutiveNights(newShift, existing)

      expect(result.valid).toBe(false)
      expect(result.code).toBe(COMPLIANCE_RULES.CONSECUTIVE_NIGHTS_MAX)
      expect(result.message).toContain('6')
      expect(result.message).toContain('5')
      expect(result.details?.consecutiveNights).toBe(6)
      expect(result.details?.maximumAllowed).toBe(5)
    })

    it('devrait rejeter la 7e nuit consécutive', () => {
      const existing = [
        createNightShift('2025-03-04', 'employee-1', 'shift-1'),
        createNightShift('2025-03-05', 'employee-1', 'shift-2'),
        createNightShift('2025-03-06', 'employee-1', 'shift-3'),
        createNightShift('2025-03-07', 'employee-1', 'shift-4'),
        createNightShift('2025-03-08', 'employee-1', 'shift-5'),
        createNightShift('2025-03-09', 'employee-1', 'shift-6'),
      ]
      const newShift = createNightShift('2025-03-10')
      const result = validateConsecutiveNights(newShift, existing)

      expect(result.valid).toBe(false)
      expect(result.details?.consecutiveNights).toBe(7)
    })

    it('devrait détecter insertion au milieu d\'une chaîne', () => {
      // Nuits les 5, 6, 7 et 9, 10 — on ajoute le 8 pour créer une chaîne de 6
      const existing = [
        createNightShift('2025-03-05', 'employee-1', 'shift-1'),
        createNightShift('2025-03-06', 'employee-1', 'shift-2'),
        createNightShift('2025-03-07', 'employee-1', 'shift-3'),
        createNightShift('2025-03-09', 'employee-1', 'shift-4'),
        createNightShift('2025-03-10', 'employee-1', 'shift-5'),
      ]
      const newShift = createNightShift('2025-03-08') // comble le trou
      const result = validateConsecutiveNights(newShift, existing)

      expect(result.valid).toBe(false)
      expect(result.details?.consecutiveNights).toBe(6)
    })
  })

  describe('Isolation par employé', () => {
    it('devrait ignorer les nuits d\'autres employés', () => {
      const existing = [
        createNightShift('2025-03-06', 'other-employee', 'shift-1'),
        createNightShift('2025-03-07', 'other-employee', 'shift-2'),
        createNightShift('2025-03-08', 'other-employee', 'shift-3'),
        createNightShift('2025-03-09', 'other-employee', 'shift-4'),
        createNightShift('2025-03-10', 'other-employee', 'shift-5'),
      ]
      const newShift = createNightShift('2025-03-11', 'employee-1')
      const result = validateConsecutiveNights(newShift, existing)

      expect(result.valid).toBe(true)
      expect(result.details?.consecutiveNights).toBe(1)
    })
  })

  describe('Isolation par type d\'intervention', () => {
    it('devrait ignorer les interventions effective entre les nuits', () => {
      const existing = [
        createNightShift('2025-03-08', 'employee-1', 'shift-1'),
        createNightShift('2025-03-09', 'employee-1', 'shift-2'),
        createEffectiveShift('2025-03-10', 'employee-1', 'shift-3'), // travail effectif, pas une nuit
      ]
      const newShift = createNightShift('2025-03-11')
      const result = validateConsecutiveNights(newShift, existing)

      expect(result.valid).toBe(true)
      expect(result.details?.consecutiveNights).toBe(1) // seul le 11 compte
    })
  })

  describe('Modification d\'intervention', () => {
    it('devrait exclure l\'intervention en cours de modification', () => {
      const existing = [
        createNightShift('2025-03-06', 'employee-1', 'shift-1'),
        createNightShift('2025-03-07', 'employee-1', 'shift-2'),
        createNightShift('2025-03-08', 'employee-1', 'shift-3'),
        createNightShift('2025-03-09', 'employee-1', 'shift-4'),
        createNightShift('2025-03-10', 'employee-1', 'shift-5'),
      ]
      // On modifie shift-5 (même ID) → ne doit pas se compter deux fois
      const modifiedShift = createNightShift('2025-03-10', 'employee-1', 'shift-5')
      const result = validateConsecutiveNights(modifiedShift, existing)

      expect(result.valid).toBe(true)
      expect(result.details?.consecutiveNights).toBe(5)
    })
  })
})

describe('countConsecutiveNights', () => {
  it('devrait retourner 1 pour une nuit isolée', () => {
    const shift = createNightShift('2025-03-10')
    const count = countConsecutiveNights(shift, [])
    expect(count).toBe(1)
  })

  it('devrait compter dans les deux directions', () => {
    // Chaîne : 8, 9, [10], 11, 12
    const existing = [
      createNightShift('2025-03-08', 'employee-1', 'shift-1'),
      createNightShift('2025-03-09', 'employee-1', 'shift-2'),
      createNightShift('2025-03-11', 'employee-1', 'shift-3'),
      createNightShift('2025-03-12', 'employee-1', 'shift-4'),
    ]
    const newShift = createNightShift('2025-03-10')
    const count = countConsecutiveNights(newShift, existing)

    expect(count).toBe(5)
  })
})
