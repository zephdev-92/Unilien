import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateAcquiredDays,
  calculateAcquiredFromMonths,
  calculateDefaultMonthsWorked,
  calculateRemainingDays,
  countWorkingDays,
  getLeaveYearStartDate,
  getLeaveYearEndDate,
} from './balanceCalculator'

describe('calculateAcquiredFromMonths', () => {
  it('devrait retourner 0 pour 0 mois', () => {
    expect(calculateAcquiredFromMonths(0)).toBe(0)
  })

  it('devrait retourner 0 pour un nombre négatif', () => {
    expect(calculateAcquiredFromMonths(-1)).toBe(0)
  })

  it('devrait retourner 3 pour 1 mois (ceil(2.5))', () => {
    expect(calculateAcquiredFromMonths(1)).toBe(3)
  })

  it('devrait retourner 5 pour 2 mois (ceil(5))', () => {
    expect(calculateAcquiredFromMonths(2)).toBe(5)
  })

  it('devrait retourner 8 pour 3 mois (ceil(7.5))', () => {
    expect(calculateAcquiredFromMonths(3)).toBe(8)
  })

  it('devrait retourner 25 pour 10 mois', () => {
    expect(calculateAcquiredFromMonths(10)).toBe(25)
  })

  it('devrait retourner 30 pour 12 mois (plafond)', () => {
    expect(calculateAcquiredFromMonths(12)).toBe(30)
  })

  it('devrait plafonner à 30 pour > 12 mois', () => {
    expect(calculateAcquiredFromMonths(13)).toBe(30)
    expect(calculateAcquiredFromMonths(24)).toBe(30)
  })
})

describe('calculateDefaultMonthsWorked', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('devrait retourner 0 si la date est dans le futur', () => {
    vi.setSystemTime(new Date('2026-01-15'))
    expect(calculateDefaultMonthsWorked(new Date('2026-06-01'))).toBe(0)
  })

  it('devrait retourner 0 si la date est aujourd\'hui', () => {
    vi.setSystemTime(new Date('2026-01-15'))
    expect(calculateDefaultMonthsWorked(new Date('2026-01-15'))).toBe(0)
  })

  it('devrait calculer les mois depuis le début de l\'année de congés', () => {
    // Aujourd'hui = 15 janvier 2026 → année de congés 2025-2026 (1er juin 2025)
    // Contrat depuis 1er mars 2025 → mais borné à 1er juin 2025
    // Du 1er juin 2025 au 15 janvier 2026 ≈ 7+ mois
    vi.setSystemTime(new Date('2026-01-15'))
    const months = calculateDefaultMonthsWorked(new Date('2025-03-01'))
    expect(months).toBeGreaterThanOrEqual(7)
    expect(months).toBeLessThanOrEqual(8)
  })

  it('devrait utiliser la date du contrat si postérieure au début d\'année', () => {
    // Aujourd'hui = 15 janvier 2026, année de congés 2025-2026 (1er juin 2025)
    // Contrat depuis 1er septembre 2025 → utilise 1er sept (> 1er juin)
    // Du 1er sept au 15 janv ≈ 4+ mois
    vi.setSystemTime(new Date('2026-01-15'))
    const months = calculateDefaultMonthsWorked(new Date('2025-09-01'))
    expect(months).toBeGreaterThanOrEqual(4)
    expect(months).toBeLessThanOrEqual(5)
  })

  it('devrait plafonner à 12 mois', () => {
    // Même si le calcul donne plus, le max est 12
    vi.setSystemTime(new Date('2026-05-30'))
    const months = calculateDefaultMonthsWorked(new Date('2025-06-01'))
    expect(months).toBeLessThanOrEqual(12)
  })
})

describe('countWorkingDays', () => {
  it('devrait compter les jours ouvrables (lun-sam)', () => {
    // Lundi 13 janv → vendredi 17 janv 2025 = 5 jours ouvrables
    const count = countWorkingDays(new Date('2025-01-13'), new Date('2025-01-17'))
    expect(count).toBe(5)
  })

  it('devrait exclure les dimanches', () => {
    // Lundi 13 → dimanche 19 janv 2025 = 6 jours ouvrables (sam inclus)
    const count = countWorkingDays(new Date('2025-01-13'), new Date('2025-01-19'))
    expect(count).toBe(6)
  })

  it('devrait retourner 0 si start > end', () => {
    const count = countWorkingDays(new Date('2025-01-20'), new Date('2025-01-13'))
    expect(count).toBe(0)
  })

  it('devrait compter 1 jour si start === end (jour ouvrable)', () => {
    // Lundi
    const count = countWorkingDays(new Date('2025-01-13'), new Date('2025-01-13'))
    expect(count).toBe(1)
  })

  it('devrait compter 0 si start === end un dimanche', () => {
    const count = countWorkingDays(new Date('2025-01-12'), new Date('2025-01-12'))
    expect(count).toBe(0)
  })
})

describe('calculateAcquiredDays', () => {
  it('devrait calculer correctement pour un contrat de 6 mois', () => {
    // 1er juin 2025 → 30 nov 2025 ≈ 6 mois ≈ 144 jours ouvrables
    const contract = { startDate: new Date('2025-06-01'), weeklyHours: 20 }
    const leaveYearStart = new Date('2025-06-01')
    const asOfDate = new Date('2025-11-30')
    const days = calculateAcquiredDays(contract, leaveYearStart, asOfDate)
    expect(days).toBeGreaterThanOrEqual(13) // ~6 mois × 2.5 = 15, ceil
    expect(days).toBeLessThanOrEqual(16)
  })

  it('devrait retourner 0 si le contrat démarre après la date de calcul', () => {
    const contract = { startDate: new Date('2026-06-01'), weeklyHours: 20 }
    const leaveYearStart = new Date('2025-06-01')
    const asOfDate = new Date('2025-12-01')
    expect(calculateAcquiredDays(contract, leaveYearStart, asOfDate)).toBe(0)
  })
})

describe('calculateRemainingDays', () => {
  it('devrait calculer acquis + ajustement - pris', () => {
    expect(calculateRemainingDays({ acquiredDays: 15, takenDays: 5, adjustmentDays: 2 })).toBe(12)
  })

  it('devrait retourner négatif si dépassement', () => {
    expect(calculateRemainingDays({ acquiredDays: 10, takenDays: 15, adjustmentDays: 0 })).toBe(-5)
  })
})

describe('getLeaveYearStartDate / getLeaveYearEndDate', () => {
  it('devrait retourner le 1er juin pour le début', () => {
    const start = getLeaveYearStartDate('2025-2026')
    expect(start.getMonth()).toBe(5) // juin (0-indexed)
    expect(start.getDate()).toBe(1)
    expect(start.getFullYear()).toBe(2025)
  })

  it('devrait retourner le 31 mai pour la fin', () => {
    const end = getLeaveYearEndDate('2025-2026')
    expect(end.getMonth()).toBe(4) // mai (0-indexed)
    expect(end.getDate()).toBe(31)
    expect(end.getFullYear()).toBe(2026)
  })
})
