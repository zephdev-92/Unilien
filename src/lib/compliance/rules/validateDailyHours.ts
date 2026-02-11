/**
 * Validation de la durée maximale quotidienne
 * Règle : Maximum 10h de travail par jour
 * Article L3121-18 du Code du travail
 */

import { format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ShiftForValidation, RuleValidationResult } from '../types'
import { COMPLIANCE_RULES, COMPLIANCE_MESSAGES } from '../types'
import { calculateShiftDuration, calculateTotalHours } from '../utils'

const MAXIMUM_DAILY_HOURS = 10

/**
 * Valide que la durée quotidienne ne dépasse pas 10h
 */
export function validateDailyHours(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): RuleValidationResult {
  // Filtrer les interventions du même jour pour le même employé
  const dayShifts = existingShifts.filter((shift) => {
    // Exclure l'intervention elle-même si elle a un ID
    if (newShift.id && shift.id === newShift.id) return false

    // Même employé
    if (shift.employeeId !== newShift.employeeId) return false

    // Même jour
    return isSameDay(shift.date, newShift.date)
  })

  // Calculer le total des heures existantes ce jour
  const existingHours = calculateTotalHours(dayShifts)

  // Calculer la durée de la nouvelle intervention
  const newShiftHours =
    calculateShiftDuration(newShift.startTime, newShift.endTime, newShift.breakDuration) / 60

  const totalHours = existingHours + newShiftHours

  if (totalHours > MAXIMUM_DAILY_HOURS) {
    const restHours = 24 - totalHours
    const restInfo = restHours < 11
      ? ` Attention : il ne restera que ${restHours.toFixed(1)}h de repos (minimum légal : 11h consécutives).`
      : ''

    return {
      valid: false,
      code: COMPLIANCE_RULES.DAILY_MAX_HOURS,
      rule: COMPLIANCE_MESSAGES.DAILY_MAX_HOURS.rule,
      message: COMPLIANCE_MESSAGES.DAILY_MAX_HOURS.error(totalHours)
        + restInfo
        + '\n\nObligations de repos (IDCC 3239) :'
        + '\n• Repos quotidien : 11h consécutives minimum (Art. L3131-1)'
        + '\n• Repos hebdomadaire : 35h consécutives minimum (Art. L3132-2)'
        + '\n• Pause : 20 min obligatoire après 6h de travail (Art. L3121-16)',
      details: {
        date: format(newShift.date, 'EEEE d MMMM yyyy', { locale: fr }),
        totalHours: Math.round(totalHours * 10) / 10,
        existingHours: Math.round(existingHours * 10) / 10,
        newShiftHours: Math.round(newShiftHours * 10) / 10,
        maximumAllowed: MAXIMUM_DAILY_HOURS,
        excessHours: Math.round((totalHours - MAXIMUM_DAILY_HOURS) * 10) / 10,
        isWarning: true,
      },
    }
  }

  return {
    valid: true,
    code: COMPLIANCE_RULES.DAILY_MAX_HOURS,
    rule: COMPLIANCE_MESSAGES.DAILY_MAX_HOURS.rule,
    details: {
      totalHours: Math.round(totalHours * 10) / 10,
      remainingHours: Math.round((MAXIMUM_DAILY_HOURS - totalHours) * 10) / 10,
    },
  }
}

/**
 * Calcule le nombre d'heures restantes pour un jour donné
 */
export function getRemainingDailyHours(
  date: Date,
  employeeId: string,
  existingShifts: ShiftForValidation[]
): number {
  const dayShifts = existingShifts.filter((shift) => {
    if (shift.employeeId !== employeeId) return false
    return isSameDay(shift.date, date)
  })

  const usedHours = calculateTotalHours(dayShifts)
  return Math.max(0, MAXIMUM_DAILY_HOURS - usedHours)
}
