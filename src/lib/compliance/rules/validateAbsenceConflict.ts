/**
 * Validation de conflit avec une absence approuvée
 * Règle : Pas d'intervention si l'auxiliaire a une absence approuvée ce jour-là
 */

import { format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ShiftForValidation, RuleValidationResult } from '../types'
import { COMPLIANCE_RULES, COMPLIANCE_MESSAGES } from '../types'

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  sick: 'arrêt maladie',
  vacation: 'congé',
  training: 'formation',
  unavailable: 'indisponibilité',
  emergency: 'absence d\'urgence',
  family_event: 'événement familial',
}

export interface AbsenceForValidation {
  id: string
  employeeId: string
  absenceType: string
  startDate: Date
  endDate: Date
  status: string
}

/**
 * Vérifie qu'aucune absence approuvée ne couvre la date de l'intervention
 */
export function validateAbsenceConflict(
  newShift: ShiftForValidation,
  approvedAbsences: AbsenceForValidation[]
): RuleValidationResult {
  const shiftDate = new Date(newShift.date)
  shiftDate.setHours(0, 0, 0, 0)

  const conflicting = approvedAbsences.find((absence) => {
    if (absence.employeeId !== newShift.employeeId) return false
    if (absence.status !== 'approved') return false

    const start = new Date(absence.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(absence.endDate)
    end.setHours(23, 59, 59, 999)

    return shiftDate >= start && shiftDate <= end
  })

  if (conflicting) {
    const label = ABSENCE_TYPE_LABELS[conflicting.absenceType] || conflicting.absenceType
    const sameDay = isSameDay(conflicting.startDate, conflicting.endDate)
    const dateRange = sameDay
      ? `le ${format(conflicting.startDate, 'd MMM yyyy', { locale: fr })}`
      : `du ${format(conflicting.startDate, 'd MMM', { locale: fr })} au ${format(conflicting.endDate, 'd MMM yyyy', { locale: fr })}`

    return {
      valid: false,
      code: COMPLIANCE_RULES.ABSENCE_CONFLICT,
      rule: COMPLIANCE_MESSAGES.ABSENCE_CONFLICT.rule,
      message: COMPLIANCE_MESSAGES.ABSENCE_CONFLICT.error(label, dateRange),
      details: {
        conflictingAbsenceId: conflicting.id,
        absenceType: conflicting.absenceType,
        absenceStartDate: conflicting.startDate,
        absenceEndDate: conflicting.endDate,
      },
    }
  }

  return {
    valid: true,
    code: COMPLIANCE_RULES.ABSENCE_CONFLICT,
    rule: COMPLIANCE_MESSAGES.ABSENCE_CONFLICT.rule,
  }
}
