import { describe, it, expect } from 'vitest'
import { validateOverlap, findOverlappingShifts } from './validateOverlap'
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

describe('validateOverlap', () => {
  describe('Pas de chevauchement', () => {
    it('devrait valider si pas d\'autres interventions', () => {
      const newShift = createShift('2025-01-15', '09:00', '17:00')
      const result = validateOverlap(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.code).toBe(COMPLIANCE_RULES.SHIFT_OVERLAP)
    })

    it('devrait valider interventions consécutives sans chevauchement', () => {
      const existingShifts = [
        createShift('2025-01-15', '09:00', '12:00', 'employee-1', 'shift-1'),
      ]
      const newShift = createShift('2025-01-15', '14:00', '18:00')

      const result = validateOverlap(newShift, existingShifts)

      expect(result.valid).toBe(true)
    })

    it('devrait valider interventions bout à bout (12:00-12:00)', () => {
      const existingShifts = [
        createShift('2025-01-15', '09:00', '12:00', 'employee-1', 'shift-1'),
      ]
      const newShift = createShift('2025-01-15', '12:00', '18:00')

      const result = validateOverlap(newShift, existingShifts)

      expect(result.valid).toBe(true)
    })

    it('devrait valider interventions sur jours différents', () => {
      const existingShifts = [
        createShift('2025-01-14', '09:00', '23:00', 'employee-1', 'shift-1'),
      ]
      const newShift = createShift('2025-01-15', '09:00', '17:00')

      const result = validateOverlap(newShift, existingShifts)

      expect(result.valid).toBe(true)
    })
  })

  describe('Chevauchement détecté', () => {
    it('devrait rejeter chevauchement complet', () => {
      const existingShifts = [
        createShift('2025-01-15', '09:00', '17:00', 'employee-1', 'shift-1'),
      ]
      const newShift = createShift('2025-01-15', '10:00', '16:00')

      const result = validateOverlap(newShift, existingShifts)

      expect(result.valid).toBe(false)
      expect(result.code).toBe(COMPLIANCE_RULES.SHIFT_OVERLAP)
      expect(result.message).toContain('Chevauchement')
    })

    it('devrait rejeter chevauchement partiel début', () => {
      const existingShifts = [
        createShift('2025-01-15', '12:00', '18:00', 'employee-1', 'shift-1'),
      ]
      const newShift = createShift('2025-01-15', '09:00', '14:00')

      const result = validateOverlap(newShift, existingShifts)

      expect(result.valid).toBe(false)
    })

    it('devrait rejeter chevauchement partiel fin', () => {
      const existingShifts = [
        createShift('2025-01-15', '09:00', '14:00', 'employee-1', 'shift-1'),
      ]
      const newShift = createShift('2025-01-15', '12:00', '18:00')

      const result = validateOverlap(newShift, existingShifts)

      expect(result.valid).toBe(false)
    })

    it('devrait rejeter nouvelle intervention englobante', () => {
      const existingShifts = [
        createShift('2025-01-15', '11:00', '15:00', 'employee-1', 'shift-1'),
      ]
      const newShift = createShift('2025-01-15', '09:00', '18:00')

      const result = validateOverlap(newShift, existingShifts)

      expect(result.valid).toBe(false)
    })
  })

  describe('Isolation par employé', () => {
    it('devrait ignorer chevauchement avec autre employé', () => {
      const existingShifts = [
        createShift('2025-01-15', '09:00', '17:00', 'other-employee', 'shift-1'),
      ]
      const newShift = createShift('2025-01-15', '09:00', '17:00', 'employee-1')

      const result = validateOverlap(newShift, existingShifts)

      expect(result.valid).toBe(true)
    })
  })

  describe('Modification d\'intervention', () => {
    it('devrait exclure l\'intervention en cours de modification', () => {
      const existingShifts = [
        createShift('2025-01-15', '09:00', '17:00', 'employee-1', 'shift-1'),
      ]
      // On modifie shift-1 pour changer les horaires
      const modifiedShift = createShift('2025-01-15', '10:00', '18:00', 'employee-1', 'shift-1')

      const result = validateOverlap(modifiedShift, existingShifts)

      expect(result.valid).toBe(true) // Pas de conflit avec soi-même
    })
  })
})

describe('findOverlappingShifts', () => {
  it('devrait trouver les interventions qui chevauchent', () => {
    const existingShifts = [
      createShift('2025-01-15', '09:00', '12:00', 'employee-1', 'shift-1'),
      createShift('2025-01-15', '14:00', '17:00', 'employee-1', 'shift-2'),
      createShift('2025-01-15', '10:00', '15:00', 'employee-1', 'shift-3'),
    ]

    const overlapping = findOverlappingShifts(
      new Date('2025-01-15'),
      '11:00',
      '16:00',
      'employee-1',
      existingShifts
    )

    // Devrait trouver shift-1 (finit après 11h), shift-2 (commence avant 16h) et shift-3
    expect(overlapping.length).toBeGreaterThanOrEqual(2)
  })

  it('devrait retourner liste vide si pas de chevauchement', () => {
    const existingShifts = [
      createShift('2025-01-15', '09:00', '12:00', 'employee-1', 'shift-1'),
    ]

    const overlapping = findOverlappingShifts(
      new Date('2025-01-15'),
      '14:00',
      '18:00',
      'employee-1',
      existingShifts
    )

    expect(overlapping.length).toBe(0)
  })

  it('devrait exclure l\'intervention spécifiée', () => {
    const existingShifts = [
      createShift('2025-01-15', '09:00', '17:00', 'employee-1', 'shift-1'),
    ]

    const overlapping = findOverlappingShifts(
      new Date('2025-01-15'),
      '09:00',
      '17:00',
      'employee-1',
      existingShifts,
      'shift-1' // Exclure
    )

    expect(overlapping.length).toBe(0)
  })
})
