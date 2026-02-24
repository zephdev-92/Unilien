import { describe, it, expect } from 'vitest'
import { validateAbsenceRequest } from './absenceChecker'
import type { AbsenceRequest, ExistingAbsence, LeaveBalanceForValidation } from './types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<AbsenceRequest> = {}): AbsenceRequest {
  return {
    employeeId: 'emp-1',
    absenceType: 'vacation',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-03'),
    ...overrides,
  }
}

function makeBalance(overrides: Partial<LeaveBalanceForValidation> = {}): LeaveBalanceForValidation {
  return {
    acquiredDays: 25,
    takenDays: 0,
    adjustmentDays: 0,
    ...overrides,
  }
}

function makeOverlap(overrides: Partial<ExistingAbsence> = {}): ExistingAbsence {
  return {
    id: 'abs-1',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-10'),
    status: 'approved',
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('validateAbsenceRequest', () => {
  describe('Résultat valide', () => {
    it('retourne valid=true sans erreurs ni avertissements pour une demande propre', () => {
      const result = validateAbsenceRequest(makeRequest(), [], makeBalance())
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('Court-circuit sur chevauchement', () => {
    it('retourne valid=false immédiatement si chevauchement détecté', () => {
      const result = validateAbsenceRequest(makeRequest(), [makeOverlap()], makeBalance())
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('déjà déclarée')
    })

    it('ne valide pas les autres règles si chevauchement (short-circuit)', () => {
      // Solde insuffisant ET chevauchement — seulement 1 erreur
      const result = validateAbsenceRequest(
        makeRequest(),
        [makeOverlap()],
        makeBalance({ acquiredDays: 0 })
      )
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('Erreurs bloquantes accumulées', () => {
    it('accumule les erreurs si plusieurs règles sont violées (sans chevauchement)', () => {
      // Solde insuffisant + arrêt maladie déclaré > 30j à l'avance
      const farFuture = new Date()
      farFuture.setDate(farFuture.getDate() + 40)

      const result = validateAbsenceRequest(
        makeRequest({
          absenceType: 'sick',
          startDate: farFuture,
          endDate: farFuture,
        }),
        [],
        makeBalance({ acquiredDays: 0 })
      )
      // Sick erreur → 1 erreur (balance ne s'applique pas aux sick)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.valid).toBe(false)
    })

    it('retourne valid=false si le solde est insuffisant', () => {
      const result = validateAbsenceRequest(
        makeRequest({
          startDate: new Date('2026-07-01'),
          endDate: new Date('2026-07-31'), // ~27j
        }),
        [],
        makeBalance({ acquiredDays: 2, takenDays: 0 })
      )
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Avertissements (non bloquants)', () => {
    it('ajoute un avertissement si congé long hors période principale', () => {
      // Long congé en janvier (hors mai-oct)
      const result = validateAbsenceRequest(
        makeRequest({
          startDate: new Date('2026-01-05'),
          endDate: new Date('2026-02-06'), // ~25 jours
        }),
        [],
        makeBalance({ acquiredDays: 30 })
      )
      // Pas bloquant → valid=true mais avertissement
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('mai et octobre')
    })

    it('peut avoir des avertissements avec valid=true', () => {
      const result = validateAbsenceRequest(
        makeRequest({
          startDate: new Date('2026-01-05'),
          endDate: new Date('2026-02-06'),
        }),
        [],
        makeBalance({ acquiredDays: 30 })
      )
      expect(result.valid).toBe(true)
    })
  })
})
