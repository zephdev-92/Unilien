import { describe, it, expect } from 'vitest'
import {
  newShiftSchema,
  shiftDetailSchema,
  MANDATORY_BREAK_MINIMUM_MINUTES,
} from './shiftSchemas'

const baseNewShift = {
  date: '2026-05-10',
  startTime: '09:00',
  endTime: '12:00',
  breakDuration: 0,
  contractId: 'contract-1',
  shiftType: 'effective' as const,
}

const baseShiftDetail = {
  date: '2026-05-10',
  startTime: '09:00',
  endTime: '12:00',
  breakDuration: 0,
  status: 'planned' as const,
}

describe('shiftSchemas — règle pause L3121-16', () => {
  describe('newShiftSchema', () => {
    it('accepte une intervention ≤ 6h avec pause 0', () => {
      const result = newShiftSchema.safeParse({
        ...baseNewShift,
        startTime: '09:00',
        endTime: '15:00', // 6h pile
        breakDuration: 0,
      })
      expect(result.success).toBe(true)
    })

    it('rejette une intervention > 6h avec pause < 20 min', () => {
      const result = newShiftSchema.safeParse({
        ...baseNewShift,
        startTime: '09:00',
        endTime: '17:00', // 8h
        breakDuration: 15,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('breakDuration')
        expect(result.error.issues[0].message).toMatch(/L3121-16/)
      }
    })

    it('accepte une intervention > 6h avec pause ≥ 20 min', () => {
      const result = newShiftSchema.safeParse({
        ...baseNewShift,
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: MANDATORY_BREAK_MINIMUM_MINUTES,
      })
      expect(result.success).toBe(true)
    })

    it('ignore la règle pour shiftType = guard_24h', () => {
      const result = newShiftSchema.safeParse({
        ...baseNewShift,
        shiftType: 'guard_24h',
        startTime: '09:00',
        endTime: '09:00', // garde = 24h = début = fin
        breakDuration: 0,
      })
      expect(result.success).toBe(true)
    })

    it('gère correctement les shifts qui passent minuit', () => {
      // 22:00 → 06:00 = 8h, pas de pause → refus
      const result = newShiftSchema.safeParse({
        ...baseNewShift,
        startTime: '22:00',
        endTime: '06:00',
        breakDuration: 0,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('shiftDetailSchema', () => {
    it('applique la règle pause sur l\'édition d\'un shift', () => {
      const result = shiftDetailSchema.safeParse({
        ...baseShiftDetail,
        startTime: '08:00',
        endTime: '18:00', // 10h
        breakDuration: 10,
      })
      expect(result.success).toBe(false)
    })

    it('laisse passer une édition avec pause suffisante', () => {
      const result = shiftDetailSchema.safeParse({
        ...baseShiftDetail,
        startTime: '08:00',
        endTime: '18:00',
        breakDuration: 30,
      })
      expect(result.success).toBe(true)
    })
  })
})
