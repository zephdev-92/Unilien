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

describe('Garde 24h (guard_24h) avec segments', () => {
  function createGuard(segments: ShiftForValidation['guardSegments']): ShiftForValidation {
    return {
      contractId: 'contract-1',
      employeeId: 'employee-1',
      date: new Date('2025-01-15'),
      startTime: '08:00',
      endTime: '08:00',
      breakDuration: 0,
      shiftType: 'guard_24h',
      guardSegments: segments,
    }
  }

  it('devrait valider si travail effectif ≤ 6h sans pause', () => {
    // 4h effectif (08:00-12:00), présence nuit (12:00-08:00)
    const shift = createGuard([
      { startTime: '08:00', type: 'effective' },
      { startTime: '12:00', type: 'presence_night' },
    ])
    expect(validateBreak(shift).valid).toBe(true)
  })

  it('devrait rejeter si travail effectif > 6h sans pause', () => {
    // 9.5h effectif sans pause
    const shift = createGuard([
      { startTime: '08:00', type: 'effective' },           // 08:00-17:30 = 9.5h
      { startTime: '17:30', type: 'presence_night' },
    ])
    const result = validateBreak(shift)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('20 min')
    // Le message doit afficher ~9.5h, pas 24h
    expect(result.message).toContain('9.5')
    expect(result.message).not.toContain('24.0')
  })

  it('devrait valider si travail effectif > 6h avec pause suffisante', () => {
    // 9h effectif + 30min pause
    const shift = createGuard([
      { startTime: '08:00', type: 'effective', breakMinutes: 30 },  // 9h brut - 30min = 8.5h net
      { startTime: '17:30', type: 'presence_night' },
    ])
    expect(validateBreak(shift).valid).toBe(true)
  })

  it('devrait valider plusieurs segments effectifs < 6h séparés par une présence', () => {
    // Cas utilisateur : 3h + 3.5h + 3h effectif, chaque bloc < 6h, séparés par présences
    const shift = createGuard([
      { startTime: '10:00', type: 'effective' },       // 10:00-13:00 = 3h
      { startTime: '13:00', type: 'presence_day' },
      { startTime: '18:30', type: 'effective' },       // 18:30-22:00 = 3.5h
      { startTime: '22:00', type: 'presence_night' },
      { startTime: '07:00', type: 'effective' },       // 07:00-10:00 = 3h
    ])
    // Aucun segment individuel > 6h → pas d'avertissement
    expect(validateBreak(shift).valid).toBe(true)
  })

  it('devrait rejeter si un segment effectif unique > 6h sans pause suffisante', () => {
    // Un seul bloc de 8h effectif sans pause
    const shift = createGuard([
      { startTime: '08:00', type: 'effective', breakMinutes: 5 }, // 8h brut - 5min = 7h55 net
      { startTime: '16:00', type: 'presence_night' },
    ])
    const result = validateBreak(shift)
    expect(result.valid).toBe(false)
    expect(result.details?.breakDuration).toBe(5)
  })

  it('devrait rejeter si un segment effectif de la garde > 6h sans pause (autres ok)', () => {
    // Segment 1 : 7h continu sans pause ; segment 2 : 2h
    const shift = createGuard([
      { startTime: '08:00', type: 'effective' },       // 08:00-15:00 = 7h, 0 pause → FAIL
      { startTime: '15:00', type: 'presence_day' },
      { startTime: '18:00', type: 'effective' },       // 18:00-20:00 = 2h, ok
      { startTime: '20:00', type: 'presence_night' },
    ])
    const result = validateBreak(shift)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('7.0')
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
