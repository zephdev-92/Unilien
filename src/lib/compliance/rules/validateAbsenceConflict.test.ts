import { describe, it, expect } from 'vitest'
import { validateAbsenceConflict } from './validateAbsenceConflict'
import type { AbsenceForValidation } from './validateAbsenceConflict'
import type { ShiftForValidation } from '../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function makeAbsence(overrides: Partial<AbsenceForValidation> = {}): AbsenceForValidation {
  return {
    id: 'absence-1',
    employeeId: 'employee-1',
    absenceType: 'sick',
    startDate: new Date('2026-02-15'),
    endDate: new Date('2026-02-15'),
    status: 'approved',
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('validateAbsenceConflict', () => {
  describe('Aucune absence — résultat valide', () => {
    it('retourne valid=true si aucune absence', () => {
      const result = validateAbsenceConflict(makeShift(), [])
      expect(result.valid).toBe(true)
    })

    it('retourne le bon code ABSENCE_CONFLICT', () => {
      const result = validateAbsenceConflict(makeShift(), [])
      expect(result.code).toBe('ABSENCE_CONFLICT')
    })
  })

  describe('Absence d\'un autre employé — pas de conflit', () => {
    it('ignore les absences d\'un autre employé', () => {
      const otherAbsence = makeAbsence({ employeeId: 'other-employee' })
      const result = validateAbsenceConflict(makeShift(), [otherAbsence])
      expect(result.valid).toBe(true)
    })
  })

  describe('Absence non approuvée — pas de conflit', () => {
    it('ignore les absences pending', () => {
      const pendingAbsence = makeAbsence({ status: 'pending' })
      const result = validateAbsenceConflict(makeShift(), [pendingAbsence])
      expect(result.valid).toBe(true)
    })

    it('ignore les absences rejected', () => {
      const rejectedAbsence = makeAbsence({ status: 'rejected' })
      const result = validateAbsenceConflict(makeShift(), [rejectedAbsence])
      expect(result.valid).toBe(true)
    })
  })

  describe('Conflit avec absence approuvée', () => {
    it('retourne valid=false si l\'absence couvre exactement le même jour', () => {
      const absence = makeAbsence({ status: 'approved' })
      const result = validateAbsenceConflict(makeShift(), [absence])
      expect(result.valid).toBe(false)
    })

    it('retourne le code ABSENCE_CONFLICT', () => {
      const result = validateAbsenceConflict(makeShift(), [makeAbsence()])
      expect(result.code).toBe('ABSENCE_CONFLICT')
    })

    it('contient un message d\'erreur', () => {
      const result = validateAbsenceConflict(makeShift(), [makeAbsence()])
      expect(result.message).toBeTruthy()
    })

    it('inclut le type d\'absence dans le message (arrêt maladie)', () => {
      const result = validateAbsenceConflict(makeShift(), [makeAbsence({ absenceType: 'sick' })])
      expect(result.message).toContain('arrêt maladie')
    })

    it('inclut "congé" pour une absence de type vacation', () => {
      const result = validateAbsenceConflict(makeShift(), [makeAbsence({ absenceType: 'vacation' })])
      expect(result.message).toContain('congé')
    })

    it('inclut "formation" pour une absence de type training', () => {
      const result = validateAbsenceConflict(makeShift(), [makeAbsence({ absenceType: 'training' })])
      expect(result.message).toContain('formation')
    })

    it('retourne l\'id de l\'absence en conflit dans details', () => {
      const absence = makeAbsence({ id: 'abs-999' })
      const result = validateAbsenceConflict(makeShift(), [absence])
      expect(result.details?.conflictingAbsenceId).toBe('abs-999')
    })
  })

  describe('Plages de dates', () => {
    it('détecte un conflit quand la date est dans une absence multi-jours', () => {
      const multiDayAbsence = makeAbsence({
        startDate: new Date('2026-02-10'),
        endDate: new Date('2026-02-20'),
      })
      const shift = makeShift({ date: new Date('2026-02-15') })
      const result = validateAbsenceConflict(shift, [multiDayAbsence])
      expect(result.valid).toBe(false)
    })

    it('ne détecte pas de conflit si la date est avant l\'absence', () => {
      const futureAbsence = makeAbsence({
        startDate: new Date('2026-02-20'),
        endDate: new Date('2026-02-25'),
      })
      const shift = makeShift({ date: new Date('2026-02-15') })
      const result = validateAbsenceConflict(shift, [futureAbsence])
      expect(result.valid).toBe(true)
    })

    it('ne détecte pas de conflit si la date est après l\'absence', () => {
      const pastAbsence = makeAbsence({
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-10'),
      })
      const shift = makeShift({ date: new Date('2026-02-15') })
      const result = validateAbsenceConflict(shift, [pastAbsence])
      expect(result.valid).toBe(true)
    })

    it('affiche la date seule pour une absence 1 jour', () => {
      const singleDayAbsence = makeAbsence({
        startDate: new Date('2026-02-15'),
        endDate: new Date('2026-02-15'),
      })
      const result = validateAbsenceConflict(makeShift(), [singleDayAbsence])
      // Message sans "du...au" → contient "le"
      expect(result.message).toContain('le')
    })

    it('affiche une plage "du...au" pour une absence multi-jours', () => {
      const multiAbsence = makeAbsence({
        startDate: new Date('2026-02-10'),
        endDate: new Date('2026-02-20'),
      })
      const result = validateAbsenceConflict(makeShift(), [multiAbsence])
      expect(result.message).toMatch(/du .+ au/)
    })
  })

  describe('Type d\'absence inconnu', () => {
    it('utilise le type brut comme label si inconnu', () => {
      const unknownAbsence = makeAbsence({ absenceType: 'custom_type' })
      const result = validateAbsenceConflict(makeShift(), [unknownAbsence])
      expect(result.message).toContain('custom_type')
    })
  })
})
