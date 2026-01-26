/**
 * Validation des chevauchements d'interventions
 * Règle : Un auxiliaire ne peut pas avoir deux interventions simultanées
 */

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ShiftForValidation, RuleValidationResult } from '../types'
import { COMPLIANCE_RULES, COMPLIANCE_MESSAGES } from '../types'
import { shiftsOverlap, formatTimeRange } from '../utils'

/**
 * Valide qu'il n'y a pas de chevauchement avec les interventions existantes
 */
export function validateOverlap(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): RuleValidationResult {
  // Filtrer les interventions du même employé
  const employeeShifts = existingShifts.filter((shift) => {
    // Exclure l'intervention elle-même si elle a un ID
    if (newShift.id && shift.id === newShift.id) return false

    // Même employé
    return shift.employeeId === newShift.employeeId
  })

  // Chercher un chevauchement
  for (const existingShift of employeeShifts) {
    if (shiftsOverlap(newShift, existingShift)) {
      const existingShiftDesc = `${format(existingShift.date, 'EEEE d MMMM', { locale: fr })} de ${formatTimeRange(existingShift.startTime, existingShift.endTime)}`

      return {
        valid: false,
        code: COMPLIANCE_RULES.SHIFT_OVERLAP,
        rule: COMPLIANCE_MESSAGES.SHIFT_OVERLAP.rule,
        message: COMPLIANCE_MESSAGES.SHIFT_OVERLAP.error(existingShiftDesc),
        details: {
          conflictingShiftId: existingShift.id,
          conflictingShiftDate: format(existingShift.date, 'yyyy-MM-dd'),
          conflictingShiftStart: existingShift.startTime,
          conflictingShiftEnd: existingShift.endTime,
          isBlocking: true,
        },
      }
    }
  }

  return {
    valid: true,
    code: COMPLIANCE_RULES.SHIFT_OVERLAP,
    rule: COMPLIANCE_MESSAGES.SHIFT_OVERLAP.rule,
  }
}

/**
 * Trouve toutes les interventions qui chevaucheraient une plage horaire donnée
 */
export function findOverlappingShifts(
  date: Date,
  startTime: string,
  endTime: string,
  employeeId: string,
  existingShifts: ShiftForValidation[],
  excludeShiftId?: string
): ShiftForValidation[] {
  const testShift: ShiftForValidation = {
    contractId: '',
    employeeId,
    date,
    startTime,
    endTime,
    breakDuration: 0,
  }

  return existingShifts.filter((shift) => {
    if (excludeShiftId && shift.id === excludeShiftId) return false
    if (shift.employeeId !== employeeId) return false
    return shiftsOverlap(testShift, shift)
  })
}
