import { describe, it, expect } from 'vitest'
import {
  timeToMinutes,
  minutesToTime,
  calculateShiftDuration,
  calculateNightHours,
  getShiftEndDateTime,
} from './utils'

describe('timeToMinutes', () => {
  it('convertit HH:mm en minutes', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('06:00')).toBe(360)
    expect(timeToMinutes('12:30')).toBe(750)
    expect(timeToMinutes('23:59')).toBe(1439)
  })

  it('ignore les secondes si présentes (HH:mm:ss)', () => {
    expect(timeToMinutes('16:26:00')).toBe(986)
    expect(timeToMinutes('08:00:30')).toBe(480)
  })
})

describe('minutesToTime', () => {
  it('convertit des minutes en HH:mm', () => {
    expect(minutesToTime(0)).toBe('00:00')
    expect(minutesToTime(360)).toBe('06:00')
    expect(minutesToTime(750)).toBe('12:30')
    expect(minutesToTime(1439)).toBe('23:59')
  })
})

describe('calculateShiftDuration', () => {
  it('calcule la durée pour un shift normal', () => {
    expect(calculateShiftDuration('08:00', '17:00')).toBe(540) // 9h
    expect(calculateShiftDuration('09:00', '12:00')).toBe(180) // 3h
  })

  it('soustrait la pause', () => {
    expect(calculateShiftDuration('08:00', '17:00', 60)).toBe(480) // 9h - 1h = 8h
  })

  it('gère le passage à minuit', () => {
    expect(calculateShiftDuration('22:00', '06:00')).toBe(480) // 8h
    expect(calculateShiftDuration('23:30', '00:30')).toBe(60) // 1h
  })

  it('retourne 24h (1440 min) quand startTime === endTime', () => {
    expect(calculateShiftDuration('16:26', '16:26')).toBe(1440)
    expect(calculateShiftDuration('08:00', '08:00')).toBe(1440)
    expect(calculateShiftDuration('00:00', '00:00')).toBe(1440)
  })
})

describe('calculateNightHours', () => {
  const date = new Date('2026-02-10')

  it('retourne 0 pour un shift entièrement de jour', () => {
    expect(calculateNightHours(date, '08:00', '17:00')).toBe(0)
    expect(calculateNightHours(date, '06:00', '20:59')).toBe(0)
  })

  it('retourne 0 quand startTime === endTime (durée 0)', () => {
    expect(calculateNightHours(date, '16:26', '16:26')).toBe(0)
    expect(calculateNightHours(date, '23:00', '23:00')).toBe(0)
    expect(calculateNightHours(date, '03:00', '03:00')).toBe(0)
  })

  it('calcule les heures de nuit pour un shift traversant 21h', () => {
    // 20:00 → 23:00 = 2h de nuit (21:00→23:00)
    expect(calculateNightHours(date, '20:00', '23:00')).toBe(2)
  })

  it('calcule les heures de nuit pour un shift traversant minuit', () => {
    // 22:00 → 06:00 = 8h dont toutes sont de nuit (22:00→06:00 dans la plage 21h-6h)
    expect(calculateNightHours(date, '22:00', '06:00')).toBe(8)
  })

  it('calcule les heures de nuit pour un shift entièrement de nuit', () => {
    // 21:00 → 06:00 = 9h de nuit
    expect(calculateNightHours(date, '21:00', '06:00')).toBe(9)
  })

  it('calcule les heures de nuit pour un shift tôt le matin', () => {
    // 04:00 → 08:00 = 2h de nuit (04:00→06:00)
    expect(calculateNightHours(date, '04:00', '08:00')).toBe(2)
  })

  it('ne compte pas le seuil 06:00 comme nuit', () => {
    // 06:00 → 10:00 = 0h de nuit
    expect(calculateNightHours(date, '06:00', '10:00')).toBe(0)
  })
})

describe('getShiftEndDateTime', () => {
  const date = new Date('2026-02-10')

  it('retourne la même date pour un shift ne traversant pas minuit', () => {
    const end = getShiftEndDateTime(date, '08:00', '17:00')
    expect(end.getDate()).toBe(10)
    expect(end.getHours()).toBe(17)
  })

  it('retourne le lendemain pour un shift traversant minuit', () => {
    const end = getShiftEndDateTime(date, '22:00', '06:00')
    expect(end.getDate()).toBe(11)
    expect(end.getHours()).toBe(6)
  })

  it('retourne la même date quand startTime === endTime', () => {
    const end = getShiftEndDateTime(date, '16:26', '16:26')
    expect(end.getDate()).toBe(10)
    expect(end.getHours()).toBe(16)
    expect(end.getMinutes()).toBe(26)
  })
})
