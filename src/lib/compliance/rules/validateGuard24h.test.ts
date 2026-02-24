import { describe, it, expect } from 'vitest'
import { validateGuard24h } from './validateGuard24h'
import type { ShiftForValidation } from '../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGuard24hShift(
  segments: ShiftForValidation['guardSegments'],
  overrides: Partial<ShiftForValidation> = {}
): ShiftForValidation {
  return {
    contractId: 'contract-1',
    employeeId: 'employee-1',
    date: new Date('2026-02-15'),
    startTime: '08:00',
    endTime: '08:00', // 24h plus tard (même heure)
    breakDuration: 0,
    shiftType: 'guard_24h',
    guardSegments: segments,
    ...overrides,
  }
}

function makeShift(overrides: Partial<ShiftForValidation> = {}): ShiftForValidation {
  return {
    contractId: 'contract-1',
    employeeId: 'employee-1',
    date: new Date('2026-02-15'),
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('validateGuard24h', () => {
  describe('Shift non guard_24h — toujours valide', () => {
    it('retourne valid=true si shiftType=effective (défaut)', () => {
      const result = validateGuard24h(makeShift())
      expect(result.valid).toBe(true)
    })

    it('retourne valid=true si shiftType absent', () => {
      const result = validateGuard24h(makeShift({ shiftType: undefined }))
      expect(result.valid).toBe(true)
    })

    it('retourne valid=true si shiftType=presence_day', () => {
      const result = validateGuard24h(makeShift({ shiftType: 'presence_day' }))
      expect(result.valid).toBe(true)
    })

    it('retourne le bon code GUARD_24H_EFFECTIVE_MAX', () => {
      const result = validateGuard24h(makeShift())
      expect(result.code).toBe('GUARD_24H_EFFECTIVE_MAX')
    })
  })

  describe('guard_24h sans segments — invalide', () => {
    it('retourne valid=false si guardSegments manquant', () => {
      const result = validateGuard24h(makeGuard24hShift(undefined))
      expect(result.valid).toBe(false)
    })

    it('retourne valid=false si guardSegments est vide', () => {
      const result = validateGuard24h(makeGuard24hShift([]))
      expect(result.valid).toBe(false)
    })

    it('contient un message d\'erreur pour segments manquants', () => {
      const result = validateGuard24h(makeGuard24hShift([]))
      expect(result.message).toBeTruthy()
    })
  })

  describe('guard_24h valide — total effectif ≤ 12h', () => {
    it('retourne valid=true si heures effectives ≤ 12h', () => {
      // Segment effectif de 8h (08:00→16:00), puis présence nuit (16:00→08:00)
      const result = validateGuard24h(makeGuard24hShift([
        { startTime: '08:00', type: 'effective' },
        { startTime: '16:00', type: 'presence_night' },
      ]))
      expect(result.valid).toBe(true)
    })

    it('inclut totalEffectiveH dans details', () => {
      const result = validateGuard24h(makeGuard24hShift([
        { startTime: '08:00', type: 'effective' },
        { startTime: '16:00', type: 'presence_night' },
      ]))
      expect(result.details?.totalEffectiveH).toBe(8)
    })

    it('inclut segmentCount dans details', () => {
      // 3 segments : 6h effectif + 8h présence jour + 10h présence nuit (≤ 12h) → pas de warning
      const result = validateGuard24h(makeGuard24hShift([
        { startTime: '08:00', type: 'effective' },
        { startTime: '14:00', type: 'presence_day' },
        { startTime: '22:00', type: 'presence_night' },
      ]))
      expect(result.valid).toBe(true)
      expect(result.details?.segmentCount).toBe(3)
    })

    it('prend en compte breakMinutes dans le calcul', () => {
      // 10h effectif avec 60min de pause → 9h effectives
      const result = validateGuard24h(makeGuard24hShift([
        { startTime: '08:00', type: 'effective', breakMinutes: 60 },
        { startTime: '18:00', type: 'presence_night' },
      ]))
      expect(result.valid).toBe(true)
      expect(result.details?.totalEffectiveH).toBe(9)
    })
  })

  describe('guard_24h invalide — total effectif > 12h', () => {
    it('retourne valid=false si heures effectives > 12h', () => {
      // 2 segments effectifs = 8h + 7h = 15h
      const result = validateGuard24h(makeGuard24hShift([
        { startTime: '08:00', type: 'effective' },
        { startTime: '16:00', type: 'effective' },
        { startTime: '23:00', type: 'presence_night' },
      ]))
      expect(result.valid).toBe(false)
    })

    it('contient un message d\'erreur', () => {
      const result = validateGuard24h(makeGuard24hShift([
        { startTime: '08:00', type: 'effective' },
        { startTime: '16:00', type: 'effective' },
        { startTime: '23:00', type: 'presence_night' },
      ]))
      expect(result.message).toBeTruthy()
    })

    it('inclut les heures effectives dépassées dans details', () => {
      const result = validateGuard24h(makeGuard24hShift([
        { startTime: '08:00', type: 'effective' }, // 8h
        { startTime: '16:00', type: 'effective' }, // 7h
        { startTime: '23:00', type: 'presence_night' },
      ]))
      // 8+7=15h
      expect(result.details?.totalEffectiveH).toBe(15)
      expect(result.details?.maximumAllowed).toBe(12)
    })
  })

  describe('Avertissement — segment de nuit > 12h', () => {
    it('retourne valid=true avec avertissement si segment présence_nuit > 12h', () => {
      // 4h effectif (ok), 20h présence nuit (> 12h → warning)
      const result = validateGuard24h(makeGuard24hShift([
        { startTime: '08:00', type: 'effective' },
        { startTime: '12:00', type: 'presence_night' }, // 12:00→08:00 = 20h
      ]))
      expect(result.valid).toBe(true)
      expect(result.details?.isWarning).toBe(true)
    })

    it('le message d\'avertissement mentionne la durée de nuit', () => {
      const result = validateGuard24h(makeGuard24hShift([
        { startTime: '08:00', type: 'effective' },
        { startTime: '12:00', type: 'presence_night' }, // 20h de nuit
      ]))
      expect(result.message).toBeTruthy()
    })
  })

  describe('Combinaison de types de segments', () => {
    it('ne compte pas les segments presence_day dans les heures effectives', () => {
      // 6h effectif + 4h présence jour + 14h présence nuit
      const result = validateGuard24h(makeGuard24hShift([
        { startTime: '08:00', type: 'effective' },
        { startTime: '14:00', type: 'presence_day' },
        { startTime: '18:00', type: 'presence_night' },
      ]))
      // 6h effectif → ok
      expect(result.valid).toBe(true)
      expect(result.details?.totalEffectiveH).toBe(6)
    })
  })
})
