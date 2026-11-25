import { describe, it, expect } from 'vitest'
import { suggestSegments, collapseSegments } from './suggestBreakdown'

const shape = (segs: ReturnType<typeof suggestSegments>) => segs.map((s) => `${s.startTime} ${s.type}`)

describe('suggestSegments', () => {
  it('journée simple → un seul segment effectif', () => {
    expect(shape(suggestSegments('09:00', '12:00'))).toEqual(['09:00 effective'])
  })

  it('soirée avec moins de 3h de nuit → effectif uniquement', () => {
    expect(shape(suggestSegments('18:00', '23:00'))).toEqual(['18:00 effective'])
  })

  it('18h → 8h : effectif / présence nuit / effectif', () => {
    expect(shape(suggestSegments('18:00', '08:00'))).toEqual([
      '18:00 effective',
      '21:00 presence_night',
      '06:00 effective',
    ])
  })

  it('nuit pleine → présence de nuit seule', () => {
    expect(shape(suggestSegments('21:00', '06:00'))).toEqual(['21:00 presence_night'])
  })

  it('pose la pause légale sur un segment effectif > 6h', () => {
    const segs = suggestSegments('08:00', '16:00')
    expect(segs[0].breakMinutes).toBe(20)
  })

  it('plus de 10h effectives en journée → excédent en présence responsable de jour', () => {
    // 07-19 (12h) → 07-17 effectif (10h) | 17-19 présence jour
    expect(shape(suggestSegments('07:00', '19:00'))).toEqual(['07:00 effective', '17:00 presence_day'])
  })

  it('10h pile → reste en travail effectif', () => {
    expect(shape(suggestSegments('08:00', '18:00'))).toEqual(['08:00 effective'])
  })

  it('18h → 8h (5h effectives) : pas de conversion', () => {
    expect(shape(suggestSegments('18:00', '08:00'))).toHaveLength(3)
  })

  it('garde 24h depuis 9h : effectif plafonné à 10h, surplus en présence en fin de garde', () => {
    // 09-21 (12h) + 06-09 (3h) = 15h → 5h d'excédent : 06-09 puis 19-21
    expect(shape(suggestSegments('09:00', '09:00'))).toEqual([
      '09:00 effective',
      '19:00 presence_day',
      '21:00 presence_night',
      '06:00 presence_day',
    ])
  })

  it('garde 24h depuis 7h : coupe le segment effectif pour rester à 10h', () => {
    // 07-21 (14h) + 06-07 (1h) = 15h → 5h d'excédent : 06-07 puis 17-21
    expect(shape(suggestSegments('07:00', '07:00'))).toEqual([
      '07:00 effective',
      '17:00 presence_day',
      '21:00 presence_night',
      '06:00 presence_day',
    ])
  })
})

describe('collapseSegments', () => {
  it('24h → garde segmentée', () => {
    const segs = suggestSegments('09:00', '09:00')
    expect(collapseSegments(segs, '09:00', '09:00')).toEqual({ shiftType: 'guard_24h', guardSegments: segs })
  })

  it('effectif seul → effective simple', () => {
    expect(collapseSegments(suggestSegments('09:00', '12:00'), '09:00', '12:00')).toEqual({ shiftType: 'effective' })
  })

  it('présence seule → presence_night sans segments', () => {
    expect(collapseSegments(suggestSegments('21:00', '06:00'), '21:00', '06:00')).toEqual({ shiftType: 'presence_night' })
  })

  it('mixte → effective découpée', () => {
    const segs = suggestSegments('18:00', '08:00')
    expect(collapseSegments(segs, '18:00', '08:00')).toEqual({ shiftType: 'effective', guardSegments: segs })
  })
})
