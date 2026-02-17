import { describe, it, expect } from 'vitest'
import { validateGuardAmplitude } from './validateGuardAmplitude'
import type { ShiftForValidation } from '../types'
import { COMPLIANCE_RULES } from '../types'

function createShift(
  date: string,
  startTime: string,
  endTime: string,
  options: {
    id?: string
    employeeId?: string
    shiftType?: 'effective' | 'presence_day' | 'presence_night'
  } = {}
): ShiftForValidation {
  return {
    id: options.id,
    contractId: 'contract-1',
    employeeId: options.employeeId || 'employee-1',
    date: new Date(date),
    startTime,
    endTime,
    breakDuration: 0,
    shiftType: options.shiftType || 'effective',
  }
}

describe('validateGuardAmplitude', () => {
  describe('Gardes valides (≤ 24h)', () => {
    it('devrait valider une intervention seule', () => {
      const newShift = createShift('2025-01-15', '08:00', '16:00')
      const result = validateGuardAmplitude(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.code).toBe(COMPLIANCE_RULES.GUARD_MAX_AMPLITUDE)
    })

    it('devrait valider effectif 12h + présence nuit 12h = 24h', () => {
      const existing = [
        createShift('2025-01-15', '08:00', '20:00', { id: 'shift-1' }),
      ]
      const newShift = createShift('2025-01-15', '20:00', '08:00', {
        shiftType: 'presence_night',
      })

      const result = validateGuardAmplitude(newShift, existing)

      expect(result.valid).toBe(true)
    })

    it('devrait valider effectif 3h + présence nuit 9h = 12h', () => {
      const existing = [
        createShift('2025-01-15', '19:00', '22:00', { id: 'shift-1' }),
      ]
      const newShift = createShift('2025-01-15', '22:00', '07:00', {
        shiftType: 'presence_night',
      })

      const result = validateGuardAmplitude(newShift, existing)

      expect(result.valid).toBe(true)
    })

    it('devrait valider présence nuit suivie de travail effectif ≤ 24h', () => {
      const existing = [
        createShift('2025-01-15', '20:00', '06:00', {
          id: 'shift-1',
          shiftType: 'presence_night',
        }),
      ]
      const newShift = createShift('2025-01-16', '07:00', '15:00')

      const result = validateGuardAmplitude(newShift, existing)

      expect(result.valid).toBe(true) // 20:00-15:00 = 19h
    })

    it('devrait valider deux interventions effectives non liées à une présence', () => {
      const existing = [
        createShift('2025-01-15', '08:00', '12:00', { id: 'shift-1' }),
      ]
      const newShift = createShift('2025-01-15', '14:00', '18:00')

      const result = validateGuardAmplitude(newShift, existing)

      // Pas de présence impliquée → pas de chaîne de garde → valide
      expect(result.valid).toBe(true)
    })
  })

  describe('Gardes invalides (> 24h)', () => {
    it('devrait rejeter effectif + présence nuit > 24h', () => {
      const existing = [
        createShift('2025-01-15', '06:00', '18:00', { id: 'shift-1' }),
      ]
      // 18:00 → 07:00 = 13h de présence nuit, amplitude totale 06:00-07:00 = 25h
      const newShift = createShift('2025-01-15', '18:00', '07:00', {
        shiftType: 'presence_night',
      })

      const result = validateGuardAmplitude(newShift, existing)

      expect(result.valid).toBe(false)
      expect(result.code).toBe(COMPLIANCE_RULES.GUARD_MAX_AMPLITUDE)
      expect(result.details?.amplitude).toBe(25)
    })

    it('devrait rejeter chaîne effectif + présence jour + effectif + présence nuit > 24h', () => {
      const existing = [
        createShift('2025-01-15', '06:00', '10:00', {
          id: 'shift-1',
          shiftType: 'effective',
        }),
        createShift('2025-01-15', '10:00', '14:00', {
          id: 'shift-2',
          shiftType: 'presence_day',
        }),
        createShift('2025-01-15', '14:00', '20:00', {
          id: 'shift-3',
          shiftType: 'effective',
        }),
      ]
      // Ajout présence nuit 20:00-08:00 → amplitude 06:00-08:00 = 26h
      const newShift = createShift('2025-01-15', '20:00', '08:00', {
        shiftType: 'presence_night',
      })

      const result = validateGuardAmplitude(newShift, existing)

      expect(result.valid).toBe(false)
      expect(result.details?.amplitude).toBe(26)
    })

    it('devrait rejeter présence nuit trop longue suivie d\'effectif', () => {
      const existing = [
        createShift('2025-01-15', '18:00', '08:00', {
          id: 'shift-1',
          shiftType: 'presence_night',
        }),
      ]
      // Ajout effectif 08:00-20:00 → amplitude 18:00-20:00 = 26h
      const newShift = createShift('2025-01-16', '08:00', '20:00')

      const result = validateGuardAmplitude(newShift, existing)

      expect(result.valid).toBe(false)
      expect(result.details?.amplitude).toBe(26)
    })
  })

  describe('Isolation par employé', () => {
    it('devrait ignorer les interventions d\'autres employés', () => {
      const existing = [
        createShift('2025-01-15', '06:00', '18:00', {
          id: 'shift-1',
          employeeId: 'other-employee',
        }),
      ]
      const newShift = createShift('2025-01-15', '18:00', '07:00', {
        shiftType: 'presence_night',
      })

      const result = validateGuardAmplitude(newShift, existing)

      expect(result.valid).toBe(true)
    })
  })

  describe('Exclusion intervention en cours d\'édition', () => {
    it('devrait exclure l\'intervention en modification', () => {
      const existing = [
        createShift('2025-01-15', '08:00', '20:00', { id: 'shift-1' }),
        createShift('2025-01-15', '20:00', '08:00', {
          id: 'shift-2',
          shiftType: 'presence_night',
        }),
      ]
      // On modifie shift-2 pour la raccourcir
      const modifiedShift = createShift('2025-01-15', '20:00', '06:00', {
        id: 'shift-2',
        shiftType: 'presence_night',
      })

      const result = validateGuardAmplitude(modifiedShift, existing)

      expect(result.valid).toBe(true) // 08:00-06:00 = 22h
    })
  })

  describe('Cas limites', () => {
    it('devrait valider exactement 24h', () => {
      const existing = [
        createShift('2025-01-15', '08:00', '20:00', { id: 'shift-1' }),
      ]
      const newShift = createShift('2025-01-15', '20:00', '08:00', {
        shiftType: 'presence_night',
      })

      const result = validateGuardAmplitude(newShift, existing)

      expect(result.valid).toBe(true) // exactement 24h = OK
    })

    it('devrait ne pas chaîner si gap > 2h entre interventions avec présence', () => {
      const existing = [
        createShift('2025-01-15', '08:00', '16:00', { id: 'shift-1' }),
      ]
      // Gap de 6h avant la présence nuit → pas la même garde
      const newShift = createShift('2025-01-15', '22:00', '10:00', {
        shiftType: 'presence_night',
      })

      const result = validateGuardAmplitude(newShift, existing)

      expect(result.valid).toBe(true) // Deux gardes distinctes
    })
  })
})
