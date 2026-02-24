/**
 * Tests des 5 validators d'absence
 * validateBalance, validateFamilyEvent, validateLeavePeriod, validateOverlap, validateSickLeave
 */
import { describe, it, expect } from 'vitest'
import { validateBalance } from './validateBalance'
import { validateFamilyEvent } from './validateFamilyEvent'
import { validateLeavePeriod } from './validateLeavePeriod'
import { validateOverlap } from './validateOverlap'
import { validateSickLeave } from './validateSickLeave'
import type { AbsenceRequest, ExistingAbsence, LeaveBalanceForValidation } from '../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<AbsenceRequest> = {}): AbsenceRequest {
  return {
    employeeId: 'emp-1',
    absenceType: 'vacation',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-05'),
    ...overrides,
  }
}

function makeBalance(overrides: Partial<LeaveBalanceForValidation> = {}): LeaveBalanceForValidation {
  return {
    acquiredDays: 25,
    takenDays: 5,
    adjustmentDays: 0,
    ...overrides,
  }
}

function makeExistingAbsence(overrides: Partial<ExistingAbsence> = {}): ExistingAbsence {
  return {
    id: 'absence-1',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-10'),
    status: 'approved',
    ...overrides,
  }
}

// ── validateBalance ────────────────────────────────────────────────────────────

describe('validateBalance', () => {
  it('retourne null pour un type non-vacation', () => {
    const result = validateBalance(makeRequest({ absenceType: 'sick' }), makeBalance())
    expect(result).toBeNull()
  })

  it('retourne une erreur si le solde est null', () => {
    const result = validateBalance(makeRequest({ absenceType: 'vacation' }), null)
    expect(result).toBeTruthy()
    expect(result).toContain('solde de congés')
  })

  it('retourne null si le solde est suffisant', () => {
    // 5 jours demandés (1-5 juillet 2026 = 5 jours ouvrables env.), 20 jours restants
    const request = makeRequest({
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'), // 3 jours ouvrables
    })
    const result = validateBalance(request, makeBalance({ acquiredDays: 25, takenDays: 5 }))
    expect(result).toBeNull()
  })

  it('retourne une erreur si le solde est insuffisant', () => {
    // Beaucoup de jours demandés mais peu de solde
    const request = makeRequest({
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-31'), // ~27 jours ouvrables
    })
    const result = validateBalance(request, makeBalance({ acquiredDays: 5, takenDays: 4 }))
    expect(result).toBeTruthy()
    expect(result).toContain('insuffisant')
  })

  it('inclut le nombre de jours demandés dans le message', () => {
    const request = makeRequest({
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-31'),
    })
    const result = validateBalance(request, makeBalance({ acquiredDays: 2, takenDays: 0 }))
    expect(result).toContain('demandé(s)')
    expect(result).toContain('disponible(s)')
  })
})

// ── validateFamilyEvent ────────────────────────────────────────────────────────

describe('validateFamilyEvent', () => {
  it('retourne null pour un type non-family_event', () => {
    const result = validateFamilyEvent(makeRequest({ absenceType: 'sick' }))
    expect(result).toBeNull()
  })

  it('retourne une erreur si familyEventType absent', () => {
    const result = validateFamilyEvent(makeRequest({ absenceType: 'family_event', familyEventType: undefined }))
    expect(result).toBeTruthy()
    expect(result).toContain('événement familial')
  })

  it('retourne null si jours demandés ≤ max autorisé (mariage = 4j)', () => {
    const request = makeRequest({
      absenceType: 'family_event',
      familyEventType: 'marriage',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-04'), // ~4 jours ouvrables
    })
    const result = validateFamilyEvent(request)
    expect(result).toBeNull()
  })

  it('retourne une erreur si jours dépassent le max (mariage = 4j max)', () => {
    const request = makeRequest({
      absenceType: 'family_event',
      familyEventType: 'marriage',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-15'), // bien > 4j
    })
    const result = validateFamilyEvent(request)
    expect(result).toBeTruthy()
    expect(result).toContain('Mariage')
  })

  it('utilise le bon max pour naissance (3j)', () => {
    const request = makeRequest({
      absenceType: 'family_event',
      familyEventType: 'birth',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-15'), // > 3j
    })
    const result = validateFamilyEvent(request)
    expect(result).toContain('Naissance')
  })

  it('utilise le bon max pour décès enfant (5j)', () => {
    const request = makeRequest({
      absenceType: 'family_event',
      familyEventType: 'death_child',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'), // > 5j
    })
    const result = validateFamilyEvent(request)
    expect(result).toContain('Décès d\'un enfant')
  })
})

// ── validateLeavePeriod ────────────────────────────────────────────────────────

describe('validateLeavePeriod', () => {
  it('retourne null pour un type non-vacation', () => {
    const result = validateLeavePeriod(makeRequest({ absenceType: 'sick' }))
    expect(result).toBeNull()
  })

  it('retourne null pour un congé court (< 12 jours ouvrables)', () => {
    // 3 jours en hiver → pas de warning car < 12j
    const result = validateLeavePeriod(makeRequest({
      startDate: new Date('2026-01-05'),
      endDate: new Date('2026-01-07'),
    }))
    expect(result).toBeNull()
  })

  it('retourne null pour un long congé EN période principale (mai-oct)', () => {
    // 15 jours en juillet = période principale → ok
    const result = validateLeavePeriod(makeRequest({
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-24'),
    }))
    expect(result).toBeNull()
  })

  it('retourne un avertissement pour un long congé HORS période principale', () => {
    // Long congé en janvier (hors période mai-oct)
    const result = validateLeavePeriod(makeRequest({
      startDate: new Date('2026-01-05'),
      endDate: new Date('2026-02-06'), // ~25 jours ouvrables
    }))
    expect(result).toBeTruthy()
    expect(result).toContain('mai et octobre')
  })
})

// ── validateOverlap ────────────────────────────────────────────────────────────

describe('validateOverlap', () => {
  it('retourne null si aucune absence existante', () => {
    const result = validateOverlap(makeRequest(), [])
    expect(result).toBeNull()
  })

  it('retourne null si les absences existantes sont rejected', () => {
    const rejected = makeExistingAbsence({ status: 'rejected' })
    const result = validateOverlap(makeRequest(), [rejected])
    expect(result).toBeNull()
  })

  it('retourne null si les périodes ne se chevauchent pas', () => {
    const farAbsence = makeExistingAbsence({
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-10'),
      status: 'approved',
    })
    const result = validateOverlap(makeRequest({
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-05'),
    }), [farAbsence])
    expect(result).toBeNull()
  })

  it('retourne une erreur si les périodes se chevauchent (approved)', () => {
    const overlapping = makeExistingAbsence({
      startDate: new Date('2026-07-03'),
      endDate: new Date('2026-07-08'),
      status: 'approved',
    })
    const result = validateOverlap(makeRequest({
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-05'),
    }), [overlapping])
    expect(result).toBeTruthy()
    expect(result).toContain('déjà déclarée')
  })

  it('retourne une erreur si les périodes se chevauchent (pending)', () => {
    const overlapping = makeExistingAbsence({
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-10'),
      status: 'pending',
    })
    const result = validateOverlap(makeRequest(), [overlapping])
    expect(result).toBeTruthy()
  })
})

// ── validateSickLeave ──────────────────────────────────────────────────────────

describe('validateSickLeave', () => {
  it('retourne null pour un type non-sick', () => {
    const result = validateSickLeave(makeRequest({ absenceType: 'vacation' }))
    expect(result).toBeNull()
  })

  it('retourne null pour un arrêt maladie dans les 30 jours', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const result = validateSickLeave(makeRequest({
      absenceType: 'sick',
      startDate: tomorrow,
      endDate: tomorrow,
    }))
    expect(result).toBeNull()
  })

  it('retourne null pour un arrêt maladie aujourd\'hui', () => {
    const today = new Date()
    const result = validateSickLeave(makeRequest({
      absenceType: 'sick',
      startDate: today,
      endDate: today,
    }))
    expect(result).toBeNull()
  })

  it('retourne une erreur si la date est > 30 jours dans le futur', () => {
    const farFuture = new Date()
    farFuture.setDate(farFuture.getDate() + 40)
    const result = validateSickLeave(makeRequest({
      absenceType: 'sick',
      startDate: farFuture,
      endDate: farFuture,
    }))
    expect(result).toBeTruthy()
    expect(result).toContain('30 jours à l\'avance')
  })

  it('retourne null pour un arrêt exactement dans 30 jours', () => {
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    const result = validateSickLeave(makeRequest({
      absenceType: 'sick',
      startDate: in30Days,
      endDate: in30Days,
    }))
    expect(result).toBeNull()
  })
})
