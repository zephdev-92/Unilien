import { describe, it, expect } from 'vitest'
import { validateBreak, getRecommendedBreak } from './validateBreak'
import type { ShiftForValidation } from '../types'
import { COMPLIANCE_RULES } from '../types'

function createShift(
  startTime: string,
  endTime: string,
  breakDuration: number
): ShiftForValidation {
  return {
    contractId: 'contract-1',
    employeeId: 'employee-1',
    date: new Date('2025-01-15'),
    startTime,
    endTime,
    breakDuration,
  }
}

describe('validateBreak', () => {
  describe('Interventions courtes (< 6h)', () => {
    it('devrait valider 3h sans pause', () => {
      const shift = createShift('09:00', '12:00', 0)
      const result = validateBreak(shift)

      expect(result.valid).toBe(true)
      expect(result.code).toBe(COMPLIANCE_RULES.MANDATORY_BREAK)
    })

    it('devrait valider 5h59 sans pause', () => {
      const shift = createShift('09:00', '14:59', 0)
      const result = validateBreak(shift)

      expect(result.valid).toBe(true)
    })

    it('devrait valider exactement 6h sans pause', () => {
      const shift = createShift('09:00', '15:00', 0)
      const result = validateBreak(shift)

      expect(result.valid).toBe(true)
    })
  })

  describe('Interventions longues (> 6h)', () => {
    it('devrait rejeter 7h sans pause', () => {
      const shift = createShift('09:00', '16:00', 0)
      const result = validateBreak(shift)

      expect(result.valid).toBe(false)
      expect(result.message).toContain('20 min')
      expect(result.details?.shiftDurationHours).toBeCloseTo(7, 0)
    })

    it('devrait rejeter 8h avec seulement 15 min de pause', () => {
      const shift = createShift('08:00', '16:00', 15)
      const result = validateBreak(shift)

      expect(result.valid).toBe(false)
      expect(result.details?.breakDuration).toBe(15)
      expect(result.details?.minimumBreakRequired).toBe(20)
    })

    it('devrait valider 8h avec 20 min de pause', () => {
      const shift = createShift('08:00', '16:00', 20)
      const result = validateBreak(shift)

      expect(result.valid).toBe(true)
      expect(result.details?.breakRequired).toBe(true)
    })

    it('devrait valider 10h avec 30 min de pause', () => {
      const shift = createShift('07:00', '17:00', 30)
      const result = validateBreak(shift)

      expect(result.valid).toBe(true)
    })

    it('devrait valider 6h01 avec 20 min de pause', () => {
      const shift = createShift('09:00', '15:01', 20)
      const result = validateBreak(shift)

      expect(result.valid).toBe(true)
    })
  })

  describe('Cas limites', () => {
    it('devrait gérer pause de 0 pour courte intervention', () => {
      const shift = createShift('14:00', '16:00', 0)
      const result = validateBreak(shift)

      expect(result.valid).toBe(true)
      expect(result.details?.breakRequired).toBe(false)
    })

    it('devrait rejeter 6h01 avec seulement 19 min de pause', () => {
      const shift = createShift('09:00', '15:01', 19)
      const result = validateBreak(shift)

      expect(result.valid).toBe(false)
    })
  })
})

describe('getRecommendedBreak', () => {
  it('devrait recommander 0 pour moins de 4h', () => {
    expect(getRecommendedBreak(3 * 60)).toBe(0)
    expect(getRecommendedBreak(2 * 60)).toBe(0)
  })

  it('devrait recommander 15 pour 4h01-6h', () => {
    // 4h exactement est dans la catégorie "pas de pause"
    expect(getRecommendedBreak(4 * 60)).toBe(0)
    // Au-delà de 4h, conseillé 15 min
    expect(getRecommendedBreak(4 * 60 + 1)).toBe(15)
    expect(getRecommendedBreak(5 * 60)).toBe(15)
    expect(getRecommendedBreak(6 * 60)).toBe(15)
  })

  it('devrait recommander 20 pour 6-8h', () => {
    expect(getRecommendedBreak(6.5 * 60)).toBe(20)
    expect(getRecommendedBreak(7 * 60)).toBe(20)
  })

  it('devrait recommander 30 pour 8-10h', () => {
    expect(getRecommendedBreak(9 * 60)).toBe(30)
  })

  it('devrait recommander 45 pour plus de 10h', () => {
    expect(getRecommendedBreak(11 * 60)).toBe(45)
  })
})
