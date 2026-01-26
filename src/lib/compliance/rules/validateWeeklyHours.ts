/**
 * Validation de la durée maximale hebdomadaire
 * Règle : Maximum 48h par semaine, alerte à 44h
 * Article L3121-20 du Code du travail
 */

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ShiftForValidation, RuleValidationResult } from '../types'
import { COMPLIANCE_RULES, COMPLIANCE_MESSAGES } from '../types'
import { calculateShiftDuration, getWeekStart, getWeekEnd, calculateTotalHours } from '../utils'

const MAXIMUM_WEEKLY_HOURS = 48
const WARNING_WEEKLY_HOURS = 44

/**
 * Valide que la durée hebdomadaire ne dépasse pas 48h
 */
export function validateWeeklyHours(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): RuleValidationResult {
  const weekStart = getWeekStart(newShift.date)
  const weekEnd = getWeekEnd(newShift.date)

  // Filtrer les interventions de la même semaine pour le même employé
  const weekShifts = existingShifts.filter((shift) => {
    // Exclure l'intervention elle-même si elle a un ID (cas de modification)
    if (newShift.id && shift.id === newShift.id) return false

    // Même employé
    if (shift.employeeId !== newShift.employeeId) return false

    // Dans la même semaine
    return shift.date >= weekStart && shift.date <= weekEnd
  })

  // Calculer le total des heures existantes
  const existingHours = calculateTotalHours(weekShifts)

  // Calculer la durée de la nouvelle intervention
  const newShiftHours =
    calculateShiftDuration(newShift.startTime, newShift.endTime, newShift.breakDuration) / 60

  const totalHours = existingHours + newShiftHours

  // Vérifier le dépassement
  if (totalHours > MAXIMUM_WEEKLY_HOURS) {
    return {
      valid: false,
      code: COMPLIANCE_RULES.WEEKLY_MAX_HOURS,
      rule: COMPLIANCE_MESSAGES.WEEKLY_MAX_HOURS.rule,
      message: COMPLIANCE_MESSAGES.WEEKLY_MAX_HOURS.error(totalHours),
      details: {
        totalHours: Math.round(totalHours * 10) / 10,
        existingHours: Math.round(existingHours * 10) / 10,
        newShiftHours: Math.round(newShiftHours * 10) / 10,
        maximumAllowed: MAXIMUM_WEEKLY_HOURS,
        weekStart: format(weekStart, 'dd/MM/yyyy', { locale: fr }),
        weekEnd: format(weekEnd, 'dd/MM/yyyy', { locale: fr }),
        isBlocking: true,
      },
    }
  }

  // Avertissement si proche du maximum
  if (totalHours > WARNING_WEEKLY_HOURS) {
    return {
      valid: true, // Valide mais avec avertissement
      code: COMPLIANCE_RULES.WEEKLY_MAX_HOURS,
      rule: COMPLIANCE_MESSAGES.WEEKLY_MAX_HOURS.rule,
      message: COMPLIANCE_MESSAGES.WEEKLY_MAX_HOURS.warning(totalHours),
      details: {
        totalHours: Math.round(totalHours * 10) / 10,
        existingHours: Math.round(existingHours * 10) / 10,
        newShiftHours: Math.round(newShiftHours * 10) / 10,
        warningThreshold: WARNING_WEEKLY_HOURS,
        maximumAllowed: MAXIMUM_WEEKLY_HOURS,
        remainingHours: Math.round((MAXIMUM_WEEKLY_HOURS - totalHours) * 10) / 10,
        isWarning: true,
      },
    }
  }

  return {
    valid: true,
    code: COMPLIANCE_RULES.WEEKLY_MAX_HOURS,
    rule: COMPLIANCE_MESSAGES.WEEKLY_MAX_HOURS.rule,
    details: {
      totalHours: Math.round(totalHours * 10) / 10,
      remainingHours: Math.round((MAXIMUM_WEEKLY_HOURS - totalHours) * 10) / 10,
    },
  }
}

/**
 * Calcule le nombre d'heures restantes pour la semaine
 */
export function getRemainingWeeklyHours(
  date: Date,
  employeeId: string,
  existingShifts: ShiftForValidation[]
): number {
  const weekStart = getWeekStart(date)
  const weekEnd = getWeekEnd(date)

  const weekShifts = existingShifts.filter((shift) => {
    if (shift.employeeId !== employeeId) return false
    return shift.date >= weekStart && shift.date <= weekEnd
  })

  const usedHours = calculateTotalHours(weekShifts)
  return Math.max(0, MAXIMUM_WEEKLY_HOURS - usedHours)
}
