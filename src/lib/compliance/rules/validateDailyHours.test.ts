import { describe, it, expect } from 'vitest'
import { validateDailyHours, getRemainingDailyHours } from './validateDailyHours'
import type { ShiftForValidation } from '../types'
import { COMPLIANCE_RULES } from '../types'

function createShift(
  date: string,
  startTime: string,
  endTime: string,
  employeeId: string = 'employee-1',
  id?: string
): ShiftForValidation {
  return {
    id,
    contractId: 'contract-1',
    employeeId,
    date: new Date(date),
    startTime,
    endTime,
    breakDuration: 0,
  }
}

describe('validateDailyHours', () => {
  describe('Sous le maximum (< 10h)', () => {
    it('devrait valider première intervention du jour', () => {
      const newShift = createShift('2025-01-15', '09:00', '17:00') // 8h
      const result = validateDailyHours(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.code).toBe(COMPLIANCE_RULES.DAILY_MAX_HOURS)
      expect(result.details?.totalHours).toBe(8)
    })

    it('devrait valider exactement 10h', () => {
      const newShift = createShift('2025-01-15', '06:00', '16:00') // 10h
      const result = validateDailyHours(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(10)
      expect(result.details?.remainingHours).toBe(0)
    })

    it('devrait valider plusieurs interventions courtes < 10h total', () => {
      const existingShifts = [
        createShift('2025-01-15', '07:00', '10:00', 'employee-1', 'shift-1'), // 3h
        createShift('2025-01-15', '14:00', '17:00', 'employee-1', 'shift-2'), // 3h
      ]
      const newShift = createShift('2025-01-15', '18:00', '21:00') // +3h = 9h

      const result = validateDailyHours(newShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(9)
    })
  })

  describe('Dépassement du maximum (> 10h)', () => {
    it('devrait rejeter 11h en une seule intervention', () => {
      const newShift = createShift('2025-01-15', '06:00', '17:00') // 11h

      const result = validateDailyHours(newShift, [])

      expect(result.valid).toBe(false)
      expect(result.code).toBe(COMPLIANCE_RULES.DAILY_MAX_HOURS)
      expect(result.message).toContain('11')
      expect(result.details?.isWarning).toBe(true)
    })

    it('devrait rejeter 10h01 (juste au-dessus du maximum)', () => {
      const newShift = createShift('2025-01-15', '06:00', '16:01') // 10h01

      const result = validateDailyHours(newShift, [])

      expect(result.valid).toBe(false)
    })

    it('devrait rejeter cumul > 10h avec existantes', () => {
      const existingShifts = [
        createShift('2025-01-15', '06:00', '12:00', 'employee-1', 'shift-1'), // 6h
      ]
      const newShift = createShift('2025-01-15', '14:00', '19:00') // +5h = 11h

      const result = validateDailyHours(newShift, existingShifts)

      expect(result.valid).toBe(false)
      expect(result.details?.totalHours).toBe(11)
      expect(result.details?.existingHours).toBe(6)
      expect(result.details?.newShiftHours).toBe(5)
      expect(result.details?.excessHours).toBe(1)
    })
  })

  describe('Isolation par jour', () => {
    it('devrait ignorer les interventions d\'autres jours', () => {
      const existingShifts = [
        createShift('2025-01-14', '06:00', '18:00', 'employee-1', 'shift-1'), // 12h hier
      ]
      const newShift = createShift('2025-01-15', '06:00', '16:00') // 10h aujourd'hui

      const result = validateDailyHours(newShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(10)
    })
  })

  describe('Isolation par employé', () => {
    it('devrait ignorer les interventions d\'autres employés', () => {
      const existingShifts = [
        createShift('2025-01-15', '06:00', '16:00', 'other-employee', 'shift-1'), // 10h autre employé
      ]
      const newShift = createShift('2025-01-15', '06:00', '16:00', 'employee-1') // 10h

      const result = validateDailyHours(newShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(10)
    })
  })

  describe('Modification d\'intervention', () => {
    it('devrait exclure l\'intervention en cours de modification', () => {
      const existingShifts = [
        createShift('2025-01-15', '06:00', '16:00', 'employee-1', 'shift-1'), // 10h
      ]
      // On modifie shift-1 pour la raccourcir
      const modifiedShift = createShift('2025-01-15', '08:00', '14:00', 'employee-1', 'shift-1') // 6h

      const result = validateDailyHours(modifiedShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(6)
    })

    it('devrait rejeter modification qui dépasse 10h avec autres interventions', () => {
      const existingShifts = [
        createShift('2025-01-15', '06:00', '10:00', 'employee-1', 'shift-1'), // 4h
        createShift('2025-01-15', '12:00', '16:00', 'employee-1', 'shift-2'), // 4h
      ]
      // On rallonge shift-2
      const modifiedShift = createShift('2025-01-15', '12:00', '20:00', 'employee-1', 'shift-2') // 8h

      const result = validateDailyHours(modifiedShift, existingShifts)

      expect(result.valid).toBe(false)
      expect(result.details?.totalHours).toBe(12) // 4 + 8
    })
  })

  describe('Présence responsable : heures effectives réduites', () => {
    it('devrait ne pas compter les heures de présence nuit', () => {
      const newShift: ShiftForValidation = {
        contractId: 'contract-1',
        employeeId: 'employee-1',
        date: new Date('2025-01-15'),
        startTime: '22:00',
        endTime: '07:00', // 9h présence nuit
        breakDuration: 0,
        shiftType: 'presence_night',
      }

      const result = validateDailyHours(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(0) // pas de travail effectif
    })

    it('devrait compter les heures de présence jour à 2/3', () => {
      const newShift: ShiftForValidation = {
        contractId: 'contract-1',
        employeeId: 'employee-1',
        date: new Date('2025-01-15'),
        startTime: '09:00',
        endTime: '18:00', // 9h
        breakDuration: 0,
        shiftType: 'presence_day',
      }

      const result = validateDailyHours(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(6) // 9 × 2/3 = 6
    })

    it('devrait valider effectif 3h + présence nuit 9h (garde)', () => {
      const existingShifts: ShiftForValidation[] = [
        {
          id: 'shift-1',
          contractId: 'contract-1',
          employeeId: 'employee-1',
          date: new Date('2025-01-15'),
          startTime: '19:00',
          endTime: '22:00', // 3h effectif
          breakDuration: 0,
          shiftType: 'effective',
        },
      ]
      const newShift: ShiftForValidation = {
        contractId: 'contract-1',
        employeeId: 'employee-1',
        date: new Date('2025-01-15'),
        startTime: '22:00',
        endTime: '07:00', // 9h présence nuit
        breakDuration: 0,
        shiftType: 'presence_night',
      }

      const result = validateDailyHours(newShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(3) // seul l'effectif compte
    })

    it('devrait valider effectif 8h + présence jour 3h (cumul < 10h)', () => {
      const existingShifts: ShiftForValidation[] = [
        {
          id: 'shift-1',
          contractId: 'contract-1',
          employeeId: 'employee-1',
          date: new Date('2025-01-15'),
          startTime: '08:00',
          endTime: '16:00', // 8h effectif
          breakDuration: 0,
          shiftType: 'effective',
        },
      ]
      const newShift: ShiftForValidation = {
        contractId: 'contract-1',
        employeeId: 'employee-1',
        date: new Date('2025-01-15'),
        startTime: '17:00',
        endTime: '20:00', // 3h présence jour = 2h effectives
        breakDuration: 0,
        shiftType: 'presence_day',
      }

      const result = validateDailyHours(newShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(10) // 8 + 3×2/3 = 10
    })

    it('devrait ignorer le type presence_night dans existingShifts', () => {
      const existingShifts: ShiftForValidation[] = [
        {
          id: 'shift-1',
          contractId: 'contract-1',
          employeeId: 'employee-1',
          date: new Date('2025-01-15'),
          startTime: '22:00',
          endTime: '07:00', // 9h présence nuit
          breakDuration: 0,
          shiftType: 'presence_night',
        },
      ]
      const newShift: ShiftForValidation = {
        contractId: 'contract-1',
        employeeId: 'employee-1',
        date: new Date('2025-01-15'),
        startTime: '08:00',
        endTime: '16:00', // 8h effectif
        breakDuration: 0,
      }

      const result = validateDailyHours(newShift, existingShifts)

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(8) // seul l'effectif
    })
  })

  describe('Prise en compte des pauses', () => {
    it('devrait déduire les pauses de la durée effective', () => {
      const newShift: ShiftForValidation = {
        contractId: 'contract-1',
        employeeId: 'employee-1',
        date: new Date('2025-01-15'),
        startTime: '06:00',
        endTime: '17:00', // 11h
        breakDuration: 60, // 1h de pause = 10h effectives
      }

      const result = validateDailyHours(newShift, [])

      expect(result.valid).toBe(true)
      expect(result.details?.totalHours).toBe(10)
    })
  })
})

describe('getRemainingDailyHours', () => {
  it('devrait retourner 10 si pas d\'intervention', () => {
    const remaining = getRemainingDailyHours(
      new Date('2025-01-15'),
      'employee-1',
      []
    )
    expect(remaining).toBe(10)
  })

  it('devrait calculer les heures restantes correctement', () => {
    const existingShifts = [
      createShift('2025-01-15', '09:00', '12:00'), // 3h
      createShift('2025-01-15', '14:00', '17:00'), // 3h
    ]
    const remaining = getRemainingDailyHours(
      new Date('2025-01-15'),
      'employee-1',
      existingShifts
    )
    expect(remaining).toBe(4) // 10 - 6
  })

  it('devrait retourner 0 si déjà au maximum', () => {
    const existingShifts = [
      createShift('2025-01-15', '06:00', '16:00'), // 10h
    ]
    const remaining = getRemainingDailyHours(
      new Date('2025-01-15'),
      'employee-1',
      existingShifts
    )
    expect(remaining).toBe(0)
  })

  it('devrait retourner 0 si dépassement (pas de valeur négative)', () => {
    const existingShifts = [
      createShift('2025-01-15', '06:00', '18:00'), // 12h (déjà en dépassement)
    ]
    const remaining = getRemainingDailyHours(
      new Date('2025-01-15'),
      'employee-1',
      existingShifts
    )
    expect(remaining).toBe(0)
  })
})
