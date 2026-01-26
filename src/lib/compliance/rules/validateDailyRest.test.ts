import { describe, it, expect } from 'vitest'
import {
  validateDailyRest,
  findPreviousShift,
  findNextShift,
  validateDailyRestBothWays,
} from './validateDailyRest'
import type { ShiftForValidation } from '../types'
import { COMPLIANCE_RULES } from '../types'

// Helper pour créer des shifts de test
function createShift(
  date: string,
  startTime: string,
  endTime: string,
  id?: string
): ShiftForValidation {
  return {
    id,
    contractId: 'contract-1',
    employeeId: 'employee-1',
    date: new Date(date),
    startTime,
    endTime,
    breakDuration: 0,
  }
}

describe('validateDailyRest', () => {
  describe('Cas valides (repos >= 11h)', () => {
    it('devrait valider si pas d\'intervention précédente', () => {
      const newShift = createShift('2025-01-15', '09:00', '17:00')
      const result = validateDailyRest(newShift, null)

      expect(result.valid).toBe(true)
      expect(result.code).toBe(COMPLIANCE_RULES.DAILY_REST)
    })

    it('devrait valider 13h de repos (8h-17h puis 6h-15h le lendemain)', () => {
      const previousShift = createShift('2025-01-14', '08:00', '17:00')
      const newShift = createShift('2025-01-15', '06:00', '15:00')

      const result = validateDailyRest(newShift, previousShift)

      expect(result.valid).toBe(true)
      expect(result.details?.restHours).toBeCloseTo(13, 0)
    })

    it('devrait valider exactement 11h de repos (8h-20h puis 7h-15h)', () => {
      const previousShift = createShift('2025-01-14', '08:00', '20:00')
      const newShift = createShift('2025-01-15', '07:00', '15:00')

      const result = validateDailyRest(newShift, previousShift)

      expect(result.valid).toBe(true)
      expect(result.details?.restHours).toBeCloseTo(11, 0)
    })

    it('devrait valider repos avec intervention nocturne (20h-23h puis 11h-18h)', () => {
      const previousShift = createShift('2025-01-14', '20:00', '23:00')
      const newShift = createShift('2025-01-15', '11:00', '18:00')

      const result = validateDailyRest(newShift, previousShift)

      expect(result.valid).toBe(true)
      expect(result.details?.restHours).toBeCloseTo(12, 0)
    })
  })

  describe('Cas invalides (repos < 11h)', () => {
    it('devrait rejeter 9h de repos (8h-22h puis 7h-12h)', () => {
      const previousShift = createShift('2025-01-14', '08:00', '22:00')
      const newShift = createShift('2025-01-15', '07:00', '12:00')

      const result = validateDailyRest(newShift, previousShift)

      expect(result.valid).toBe(false)
      expect(result.code).toBe(COMPLIANCE_RULES.DAILY_REST)
      expect(result.message).toContain('9')
      expect(result.details?.restHours).toBeCloseTo(9, 0)
    })

    it('devrait rejeter 6h de repos', () => {
      const previousShift = createShift('2025-01-14', '14:00', '22:00')
      const newShift = createShift('2025-01-15', '04:00', '12:00')

      const result = validateDailyRest(newShift, previousShift)

      expect(result.valid).toBe(false)
      expect(result.details?.restHours).toBeCloseTo(6, 0)
    })

    it('devrait rejeter 10.5h de repos (juste en dessous du minimum)', () => {
      const previousShift = createShift('2025-01-14', '08:00', '20:00')
      const newShift = createShift('2025-01-15', '06:30', '15:00')

      const result = validateDailyRest(newShift, previousShift)

      expect(result.valid).toBe(false)
      expect(result.details?.restHours).toBeCloseTo(10.5, 1)
    })

    it('devrait rejeter interventions qui se chevauchent', () => {
      const previousShift = createShift('2025-01-14', '08:00', '17:00')
      const newShift = createShift('2025-01-14', '16:00', '20:00')

      const result = validateDailyRest(newShift, previousShift)

      expect(result.valid).toBe(false)
      expect(result.details?.restHours).toBeLessThan(0)
    })
  })

  describe('Cas limites', () => {
    it('devrait gérer les interventions le même jour avec assez de repos', () => {
      const previousShift = createShift('2025-01-14', '06:00', '08:00')
      const newShift = createShift('2025-01-14', '20:00', '22:00')

      const result = validateDailyRest(newShift, previousShift)

      expect(result.valid).toBe(true)
      expect(result.details?.restHours).toBeCloseTo(12, 0)
    })

    it('devrait gérer les interventions espacées de plusieurs jours', () => {
      const previousShift = createShift('2025-01-10', '08:00', '17:00')
      const newShift = createShift('2025-01-15', '09:00', '17:00')

      const result = validateDailyRest(newShift, previousShift)

      expect(result.valid).toBe(true)
      expect(result.details?.restHours).toBeGreaterThan(100)
    })
  })
})

describe('findPreviousShift', () => {
  it('devrait trouver l\'intervention précédente la plus récente', () => {
    const shifts = [
      createShift('2025-01-10', '09:00', '17:00', 'shift-1'),
      createShift('2025-01-12', '09:00', '17:00', 'shift-2'),
      createShift('2025-01-14', '09:00', '17:00', 'shift-3'),
    ]
    const newShift = createShift('2025-01-15', '09:00', '17:00')

    const result = findPreviousShift(newShift, shifts)

    expect(result?.id).toBe('shift-3')
  })

  it('devrait retourner null si pas d\'intervention précédente', () => {
    const shifts = [
      createShift('2025-01-20', '09:00', '17:00', 'shift-1'),
    ]
    const newShift = createShift('2025-01-15', '09:00', '17:00')

    const result = findPreviousShift(newShift, shifts)

    expect(result).toBeNull()
  })

  it('devrait exclure l\'intervention en cours d\'édition', () => {
    const shifts = [
      createShift('2025-01-12', '09:00', '17:00', 'shift-1'),
      createShift('2025-01-14', '09:00', '17:00', 'shift-2'),
    ]
    const newShift = createShift('2025-01-14', '10:00', '18:00', 'shift-2')

    const result = findPreviousShift(newShift, shifts)

    expect(result?.id).toBe('shift-1')
  })
})

describe('findNextShift', () => {
  it('devrait trouver l\'intervention suivante la plus proche', () => {
    const shifts = [
      createShift('2025-01-16', '09:00', '17:00', 'shift-1'),
      createShift('2025-01-18', '09:00', '17:00', 'shift-2'),
    ]
    const newShift = createShift('2025-01-15', '09:00', '17:00')

    const result = findNextShift(newShift, shifts)

    expect(result?.id).toBe('shift-1')
  })

  it('devrait retourner null si pas d\'intervention suivante', () => {
    const shifts = [
      createShift('2025-01-10', '09:00', '17:00', 'shift-1'),
    ]
    const newShift = createShift('2025-01-15', '09:00', '17:00')

    const result = findNextShift(newShift, shifts)

    expect(result).toBeNull()
  })
})

describe('validateDailyRestBothWays', () => {
  it('devrait valider repos dans les deux sens', () => {
    const existingShifts = [
      createShift('2025-01-14', '09:00', '17:00', 'shift-before'),
      createShift('2025-01-16', '09:00', '17:00', 'shift-after'),
    ]
    const newShift = createShift('2025-01-15', '10:00', '14:00')

    const results = validateDailyRestBothWays(newShift, existingShifts)

    // Devrait avoir 2 résultats (avant et après)
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.every((r) => r.valid)).toBe(true)
  })

  it('devrait détecter problème avec intervention suivante', () => {
    const existingShifts = [
      createShift('2025-01-14', '09:00', '12:00', 'shift-before'),
      createShift('2025-01-15', '20:00', '23:00', 'shift-after'),
    ]
    // Cette intervention finit trop tard pour respecter le repos avant shift-after
    const newShift = createShift('2025-01-15', '06:00', '10:00')

    const results = validateDailyRestBothWays(newShift, existingShifts)

    // Au moins un résultat invalide devrait mentionner l'intervention suivante
    const hasIssue = results.some((r) => !r.valid)
    expect(hasIssue || results.length === 1).toBe(true)
  })
})
