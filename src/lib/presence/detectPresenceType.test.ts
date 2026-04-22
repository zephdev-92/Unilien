import { describe, it, expect } from 'vitest'
import { detectPresenceType, getPresenceMix } from './detectPresenceType'

describe('detectPresenceType', () => {
  it('retourne presence_day pour une plage 100% jour', () => {
    expect(detectPresenceType('09:00', '12:00')).toBe('presence_day')
  })

  it('retourne presence_night pour une plage 100% nuit', () => {
    expect(detectPresenceType('21:00', '06:00')).toBe('presence_night')
  })

  it('retourne presence_day quand majorité de jour (18h-23h)', () => {
    // 18h-23h = 5h total, 2h de nuit (21h-23h), 3h de jour → majorité jour
    expect(detectPresenceType('18:00', '23:00')).toBe('presence_day')
  })

  it('retourne presence_night quand majorité de nuit (19h-02h)', () => {
    // 19h-02h = 7h total, 5h de nuit (21h-02h), 2h de jour → majorité nuit
    expect(detectPresenceType('19:00', '02:00')).toBe('presence_night')
  })

  it('fallback presence_day si horaires invalides', () => {
    expect(detectPresenceType('', '12:00')).toBe('presence_day')
    expect(detectPresenceType('09:00', '')).toBe('presence_day')
  })
})

describe('getPresenceMix', () => {
  it('détecte un chevauchement jour+nuit (18h-23h)', () => {
    const mix = getPresenceMix('18:00', '23:00')
    expect(mix.isMixed).toBe(true)
    expect(mix.dayHours).toBeCloseTo(3, 1)
    expect(mix.nightHours).toBeCloseTo(2, 1)
    expect(mix.totalHours).toBeCloseTo(5, 1)
  })

  it('pas de chevauchement pour 100% jour', () => {
    const mix = getPresenceMix('09:00', '12:00')
    expect(mix.isMixed).toBe(false)
    expect(mix.nightHours).toBe(0)
  })

  it('pas de chevauchement pour 100% nuit', () => {
    const mix = getPresenceMix('22:00', '05:00')
    expect(mix.isMixed).toBe(false)
    expect(mix.dayHours).toBe(0)
  })

  it('horaires invalides → valeurs à zéro', () => {
    expect(getPresenceMix('', '12:00')).toEqual({
      totalHours: 0,
      dayHours: 0,
      nightHours: 0,
      isMixed: false,
    })
  })
})
