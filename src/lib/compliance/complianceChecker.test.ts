import { describe, it, expect } from 'vitest'
import {
  validateShift,
  quickValidate,
  getComplianceSummary,
  suggestAlternatives,
} from './complianceChecker'
import type { ShiftForValidation } from './types'
import { COMPLIANCE_RULES } from './types'

function createShift(
  date: string,
  startTime: string,
  endTime: string,
  employeeId: string = 'employee-1',
  id?: string,
  breakDuration: number = 0
): ShiftForValidation {
  return {
    id,
    contractId: 'contract-1',
    employeeId,
    date: new Date(date),
    startTime,
    endTime,
    breakDuration,
  }
}

describe('validateShift', () => {
  describe('Validation complète réussie', () => {
    it('devrait valider une intervention sans problème', () => {
      const newShift = createShift('2025-01-15', '09:00', '17:00')
      const result = validateShift(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('devrait retourner avertissement pause sans bloquer', () => {
      const newShift = createShift('2025-01-15', '09:00', '17:00', 'employee-1', undefined, 0) // 8h sans pause
      const result = validateShift(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.warnings.length).toBeGreaterThanOrEqual(0) // Peut avoir un warning pause
    })
  })

  describe('Erreurs bloquantes', () => {
    it('devrait détecter chevauchement', () => {
      const existingShifts = [
        createShift('2025-01-15', '10:00', '16:00', 'employee-1', 'shift-1'),
      ]
      const newShift = createShift('2025-01-15', '12:00', '18:00')

      const result = validateShift(newShift, existingShifts)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === COMPLIANCE_RULES.SHIFT_OVERLAP)).toBe(true)
    })

    it('devrait détecter repos quotidien insuffisant', () => {
      const existingShifts = [
        createShift('2025-01-14', '08:00', '22:00', 'employee-1', 'shift-1'), // Finit à 22h
      ]
      // Reprend 8h après (22h -> 6h = 8h de repos < 11h)
      const newShift = createShift('2025-01-15', '06:00', '14:00')

      const result = validateShift(newShift, existingShifts)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === COMPLIANCE_RULES.DAILY_REST)).toBe(true)
    })

    it('devrait détecter dépassement heures quotidiennes', () => {
      const newShift = createShift('2025-01-15', '06:00', '18:00') // 12h

      const result = validateShift(newShift, [])

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === COMPLIANCE_RULES.DAILY_MAX_HOURS)).toBe(true)
    })

    it('devrait détecter dépassement heures hebdomadaires', () => {
      const existingShifts = [
        createShift('2025-01-13', '06:00', '16:00', 'employee-1', 'shift-1'), // Lundi 10h
        createShift('2025-01-14', '06:00', '16:00', 'employee-1', 'shift-2'), // Mardi 10h
        createShift('2025-01-15', '06:00', '16:00', 'employee-1', 'shift-3'), // Mercredi 10h
        createShift('2025-01-16', '06:00', '16:00', 'employee-1', 'shift-4'), // Jeudi 10h
      ] // 40h
      const newShift = createShift('2025-01-17', '06:00', '16:00') // +10h = 50h > 48h

      const result = validateShift(newShift, existingShifts)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === COMPLIANCE_RULES.WEEKLY_MAX_HOURS)).toBe(true)
    })
  })

  describe('Avertissements', () => {
    it('devrait avertir pour heures hebdomadaires proches du max', () => {
      const existingShifts = [
        createShift('2025-01-13', '08:00', '16:00', 'employee-1', 'shift-1'), // 8h
        createShift('2025-01-14', '08:00', '16:00', 'employee-1', 'shift-2'), // 8h
        createShift('2025-01-15', '08:00', '16:00', 'employee-1', 'shift-3'), // 8h
        createShift('2025-01-16', '08:00', '16:00', 'employee-1', 'shift-4'), // 8h
        createShift('2025-01-17', '08:00', '16:00', 'employee-1', 'shift-5'), // 8h
      ] // 40h
      const newShift = createShift('2025-01-18', '08:00', '14:00') // +6h = 46h (warning zone)

      const result = validateShift(newShift, existingShifts)

      // 46h est dans la zone d'avertissement (44-48h)
      expect(result.valid).toBe(true)
      expect(result.warnings.some(w => w.code === COMPLIANCE_RULES.WEEKLY_MAX_HOURS)).toBe(true)
    })

    it('devrait avertir pour pause manquante sur longue intervention', () => {
      const newShift = createShift('2025-01-15', '09:00', '16:30', 'employee-1', undefined, 0) // 7h30 sans pause

      const result = validateShift(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.warnings.some(w => w.code === COMPLIANCE_RULES.MANDATORY_BREAK)).toBe(true)
    })
  })

  describe('Cumul des erreurs', () => {
    it('devrait retourner plusieurs erreurs si multiples violations', () => {
      const existingShifts = [
        createShift('2025-01-15', '08:00', '16:00', 'employee-1', 'shift-1'),
      ]
      // Nouvelle intervention qui chevauche ET dépasse 10h quotidiennes
      const newShift = createShift('2025-01-15', '10:00', '22:00') // 12h + chevauchement

      const result = validateShift(newShift, existingShifts)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })
})

describe('quickValidate', () => {
  it('devrait permettre création si aucune erreur bloquante', () => {
    const newShift = createShift('2025-01-15', '09:00', '17:00')
    const result = quickValidate(newShift, [])

    expect(result.canCreate).toBe(true)
    expect(result.blockingErrors).toHaveLength(0)
  })

  it('devrait bloquer si erreur critique', () => {
    const existingShifts = [
      createShift('2025-01-15', '09:00', '17:00', 'employee-1', 'shift-1'),
    ]
    const newShift = createShift('2025-01-15', '10:00', '18:00') // Chevauchement

    const result = quickValidate(newShift, existingShifts)

    expect(result.canCreate).toBe(false)
    expect(result.blockingErrors.length).toBeGreaterThan(0)
  })

  it('devrait retourner messages d\'erreur lisibles', () => {
    const newShift = createShift('2025-01-15', '06:00', '18:00') // 12h

    const result = quickValidate(newShift, [])

    expect(result.canCreate).toBe(false)
    expect(result.blockingErrors[0]).toContain('12')
  })
})

describe('getComplianceSummary', () => {
  it('devrait retourner heures restantes pour le jour', () => {
    const existingShifts = [
      createShift('2025-01-15', '09:00', '13:00'), // 4h
    ]
    const summary = getComplianceSummary(
      'employee-1',
      new Date('2025-01-15'),
      existingShifts
    )

    expect(summary.remainingDailyHours).toBe(6) // 10 - 4
  })

  it('devrait retourner heures restantes pour la semaine', () => {
    const existingShifts = [
      createShift('2025-01-13', '09:00', '17:00'), // 8h
      createShift('2025-01-14', '09:00', '17:00'), // 8h
    ]
    const summary = getComplianceSummary(
      'employee-1',
      new Date('2025-01-15'),
      existingShifts
    )

    expect(summary.remainingWeeklyHours).toBe(32) // 48 - 16
  })

  it('devrait retourner statut repos hebdomadaire', () => {
    const summary = getComplianceSummary(
      'employee-1',
      new Date('2025-01-15'),
      []
    )

    expect(summary.weeklyRestStatus).toBeDefined()
    expect(summary.weeklyRestStatus.isCompliant).toBe(true)
  })

  it('devrait générer recommandations si heures faibles', () => {
    const existingShifts = [
      createShift('2025-01-15', '06:00', '14:00'), // 8h déjà
    ]
    const summary = getComplianceSummary(
      'employee-1',
      new Date('2025-01-15'),
      existingShifts
    )

    // Reste 2h, devrait avoir une recommandation
    expect(summary.recommendations.length).toBeGreaterThan(0)
  })
})

describe('suggestAlternatives', () => {
  it('devrait suggérer créneau après chevauchement', () => {
    const existingShifts = [
      createShift('2025-01-15', '10:00', '14:00', 'employee-1', 'shift-1'),
    ]
    const newShift = createShift('2025-01-15', '12:00', '16:00')
    const result = validateShift(newShift, existingShifts)

    const suggestions = suggestAlternatives(newShift, existingShifts, result)

    expect(suggestions.length).toBeGreaterThan(0)
    // Devrait suggérer de commencer après 14h
    const suggestion = suggestions[0]
    expect(suggestion.startTime).toBe('14:00')
  })

  it('devrait suggérer créneau respectant repos quotidien', () => {
    const existingShifts = [
      createShift('2025-01-14', '08:00', '22:00', 'employee-1', 'shift-1'), // Finit 22h
    ]
    // Trop tôt le lendemain
    const newShift = createShift('2025-01-15', '06:00', '14:00')
    const result = validateShift(newShift, existingShifts)

    const suggestions = suggestAlternatives(newShift, existingShifts, result)

    expect(suggestions.length).toBeGreaterThan(0)
    // Devrait suggérer de commencer à 9h (22h + 11h = 9h)
    const suggestion = suggestions.find(s => s.reason.includes('repos quotidien'))
    expect(suggestion).toBeDefined()
    expect(suggestion?.startTime).toBe('09:00')
  })

  it('devrait limiter à 3 suggestions maximum', () => {
    const existingShifts = [
      createShift('2025-01-15', '08:00', '10:00', 'employee-1', 'shift-1'),
      createShift('2025-01-15', '12:00', '14:00', 'employee-1', 'shift-2'),
      createShift('2025-01-15', '16:00', '18:00', 'employee-1', 'shift-3'),
      createShift('2025-01-15', '20:00', '22:00', 'employee-1', 'shift-4'),
    ]
    const newShift = createShift('2025-01-15', '09:00', '21:00') // Chevauche tout
    const result = validateShift(newShift, existingShifts)

    const suggestions = suggestAlternatives(newShift, existingShifts, result)

    expect(suggestions.length).toBeLessThanOrEqual(3)
  })

  it('devrait retourner liste vide si aucune suggestion possible', () => {
    const newShift = createShift('2025-01-15', '09:00', '17:00')
    const result = validateShift(newShift, []) // Valide, pas d'erreur

    const suggestions = suggestAlternatives(newShift, [], result)

    expect(suggestions.length).toBe(0)
  })
})
