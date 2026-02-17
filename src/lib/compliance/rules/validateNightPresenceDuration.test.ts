import { describe, it, expect } from 'vitest'
import { validateNightPresenceDuration } from './validateNightPresenceDuration'
import type { ShiftForValidation } from '../types'
import { COMPLIANCE_RULES } from '../types'

function createShift(
  startTime: string,
  endTime: string,
  shiftType: 'effective' | 'presence_day' | 'presence_night' = 'presence_night',
  breakDuration: number = 0
): ShiftForValidation {
  return {
    contractId: 'contract-1',
    employeeId: 'employee-1',
    date: new Date('2025-03-10'),
    startTime,
    endTime,
    breakDuration,
    shiftType,
  }
}

describe('validateNightPresenceDuration', () => {
  describe('Non applicable (autres types)', () => {
    it('devrait ignorer les interventions de type effective', () => {
      const shift = createShift('20:00', '08:00', 'effective')
      const result = validateNightPresenceDuration(shift)

      expect(result.valid).toBe(true)
      expect(result.code).toBe(COMPLIANCE_RULES.NIGHT_PRESENCE_MAX_DURATION)
    })

    it('devrait ignorer les interventions de type presence_day', () => {
      const shift = createShift('08:00', '22:00', 'presence_day')
      const result = validateNightPresenceDuration(shift)

      expect(result.valid).toBe(true)
    })

    it('devrait ignorer si shiftType non défini (défaut effective)', () => {
      const shift: ShiftForValidation = {
        contractId: 'contract-1',
        employeeId: 'employee-1',
        date: new Date('2025-03-10'),
        startTime: '20:00',
        endTime: '10:00',
        breakDuration: 0,
      }
      const result = validateNightPresenceDuration(shift)

      expect(result.valid).toBe(true)
    })
  })

  describe('Sous le maximum (<= 12h)', () => {
    it('devrait valider une présence de nuit de 8h', () => {
      const shift = createShift('22:00', '06:00') // 8h
      const result = validateNightPresenceDuration(shift)

      expect(result.valid).toBe(true)
      expect(result.code).toBe(COMPLIANCE_RULES.NIGHT_PRESENCE_MAX_DURATION)
      expect(result.details?.durationHours).toBe(8)
      expect(result.details?.remainingHours).toBe(4)
    })

    it('devrait valider exactement 12h', () => {
      const shift = createShift('20:00', '08:00') // 12h
      const result = validateNightPresenceDuration(shift)

      expect(result.valid).toBe(true)
      expect(result.details?.durationHours).toBe(12)
      expect(result.details?.remainingHours).toBe(0)
    })

    it('devrait valider une courte présence de nuit', () => {
      const shift = createShift('23:00', '02:00') // 3h
      const result = validateNightPresenceDuration(shift)

      expect(result.valid).toBe(true)
      expect(result.details?.durationHours).toBe(3)
    })

    it('devrait déduire les pauses de la durée', () => {
      const shift = createShift('19:00', '08:00', 'presence_night', 60) // 13h - 1h pause = 12h
      const result = validateNightPresenceDuration(shift)

      expect(result.valid).toBe(true)
      expect(result.details?.durationHours).toBe(12)
    })
  })

  describe('Dépassement du maximum (> 12h)', () => {
    it('devrait rejeter une présence de nuit de 13h', () => {
      const shift = createShift('19:00', '08:00') // 13h
      const result = validateNightPresenceDuration(shift)

      expect(result.valid).toBe(false)
      expect(result.code).toBe(COMPLIANCE_RULES.NIGHT_PRESENCE_MAX_DURATION)
      expect(result.message).toContain('13')
      expect(result.message).toContain('12h')
      expect(result.details?.durationHours).toBe(13)
      expect(result.details?.maximumAllowed).toBe(12)
      expect(result.details?.excessHours).toBe(1)
    })

    it('devrait rejeter 12h01 (juste au-dessus du maximum)', () => {
      const shift = createShift('19:59', '08:00') // 12h01
      const result = validateNightPresenceDuration(shift)

      expect(result.valid).toBe(false)
    })

    it('devrait rejeter une très longue présence de nuit', () => {
      const shift = createShift('18:00', '08:00') // 14h
      const result = validateNightPresenceDuration(shift)

      expect(result.valid).toBe(false)
      expect(result.details?.durationHours).toBe(14)
      expect(result.details?.excessHours).toBe(2)
    })
  })
})
