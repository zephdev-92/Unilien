import { describe, it, expect } from 'vitest'
import {
  timeToMinutes,
  minutesToTime,
  calculateShiftDuration,
  calculateNightHours,
  getShiftEndDateTime,
  createDateTime,
  hoursBetween,
  groupShiftsByDay,
  getEffectiveHours,
  calculateTotalEffectiveHours,
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

describe('createDateTime', () => {
  it('crée un objet Date avec les heures définies', () => {
    const date = new Date('2026-03-10')
    const result = createDateTime(date, '09:30')
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(30)
    expect(result.getDate()).toBe(10)
  })

  it('crée minuit pour 00:00', () => {
    const date = new Date('2026-03-10')
    const result = createDateTime(date, '00:00')
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })
})

describe('hoursBetween', () => {
  it('retourne le nombre d\'heures entre deux dates', () => {
    const start = new Date('2026-03-10T09:00:00')
    const end = new Date('2026-03-10T17:00:00')
    expect(hoursBetween(start, end)).toBe(8)
  })

  it('retourne 0 pour deux dates identiques', () => {
    const d = new Date('2026-03-10T09:00:00')
    expect(hoursBetween(d, d)).toBe(0)
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

describe('groupShiftsByDay', () => {
  it('groupe les shifts par date', () => {
    const shifts = [
      { date: new Date('2026-03-10'), startTime: '09:00', endTime: '17:00', breakDuration: 60 },
      { date: new Date('2026-03-10'), startTime: '18:00', endTime: '20:00', breakDuration: 0 },
      { date: new Date('2026-03-11'), startTime: '09:00', endTime: '17:00', breakDuration: 60 },
    ]
    const grouped = groupShiftsByDay(shifts)
    expect(grouped.get('2026-03-10')).toHaveLength(2)
    expect(grouped.get('2026-03-11')).toHaveLength(1)
  })

  it('retourne un Map vide pour un tableau vide', () => {
    const grouped = groupShiftsByDay([])
    expect(grouped.size).toBe(0)
  })
})

describe('getEffectiveHours', () => {
  it('retourne 100% des heures pour type effective', () => {
    const hours = getEffectiveHours({ startTime: '09:00', endTime: '17:00', breakDuration: 60, shiftType: 'effective' })
    expect(hours).toBeCloseTo(7, 1) // 8h - 1h pause = 7h
  })

  it('retourne 0 pour presence_night', () => {
    const hours = getEffectiveHours({ startTime: '22:00', endTime: '08:00', breakDuration: 0, shiftType: 'presence_night' })
    expect(hours).toBe(0)
  })

  it('retourne 2/3 des heures pour presence_day', () => {
    const hours = getEffectiveHours({ startTime: '09:00', endTime: '12:00', breakDuration: 0, shiftType: 'presence_day' })
    expect(hours).toBeCloseTo(2, 1) // 3h * 2/3 = 2h
  })

  it('utilise le fallback pour guard_24h sans segments', () => {
    const hours = getEffectiveHours({ startTime: '09:00', endTime: '09:00', breakDuration: 0, shiftType: 'guard_24h' })
    expect(hours).toBe(1440 / 60) // 24h
  })

  it('calcule les segments pour guard_24h avec guardSegments', () => {
    const shift = {
      startTime: '09:00',
      endTime: '09:00',
      breakDuration: 0,
      shiftType: 'guard_24h',
      guardSegments: [
        { startTime: '09:00', type: 'effective', breakMinutes: 0 },
        { startTime: '13:00', type: 'presence_night', breakMinutes: 0 },
      ],
    }
    const hours = getEffectiveHours(shift)
    expect(hours).toBeGreaterThan(0)
  })

  it('utilise "effective" comme type par défaut', () => {
    const hours = getEffectiveHours({ startTime: '09:00', endTime: '12:00', breakDuration: 0 })
    expect(hours).toBeCloseTo(3, 1)
  })
})

describe('calculateTotalEffectiveHours', () => {
  it('calcule la somme des heures effectives de plusieurs shifts', () => {
    const shifts = [
      { startTime: '09:00', endTime: '12:00', breakDuration: 0, shiftType: 'effective' as const },
      { startTime: '14:00', endTime: '17:00', breakDuration: 0, shiftType: 'effective' as const },
    ]
    const total = calculateTotalEffectiveHours(shifts)
    expect(total).toBeCloseTo(6, 1)
  })

  it('retourne 0 pour un tableau vide', () => {
    expect(calculateTotalEffectiveHours([])).toBe(0)
  })
})
