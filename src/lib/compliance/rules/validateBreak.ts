/**
 * Validation de la pause obligatoire
 * Règle : 20 minutes de pause minimum si intervention > 6h
 * Article L3121-16 du Code du travail
 */

import type { ShiftForValidation, RuleValidationResult } from '../types'
import { COMPLIANCE_RULES, COMPLIANCE_MESSAGES } from '../types'
import { calculateShiftDuration } from '../utils'

const MAX_WORK_WITHOUT_BREAK_MINUTES = 6 * 60 // 6 heures
const MINIMUM_BREAK_MINUTES = 20

/**
 * Valide que la pause est suffisante pour la durée de l'intervention
 */
export function validateBreak(shift: ShiftForValidation): RuleValidationResult {
  const durationMinutes = calculateShiftDuration(
    shift.startTime,
    shift.endTime,
    0 // Ne pas soustraire la pause ici, on vérifie justement si elle est suffisante
  )

  // Si l'intervention dure plus de 6h, une pause de 20 min est obligatoire
  if (durationMinutes > MAX_WORK_WITHOUT_BREAK_MINUTES) {
    if (shift.breakDuration < MINIMUM_BREAK_MINUTES) {
      return {
        valid: false,
        code: COMPLIANCE_RULES.MANDATORY_BREAK,
        rule: COMPLIANCE_MESSAGES.MANDATORY_BREAK.rule,
        message: COMPLIANCE_MESSAGES.MANDATORY_BREAK.warning(
          durationMinutes,
          shift.breakDuration
        ),
        details: {
          shiftDurationMinutes: durationMinutes,
          shiftDurationHours: Math.round((durationMinutes / 60) * 10) / 10,
          breakDuration: shift.breakDuration,
          minimumBreakRequired: MINIMUM_BREAK_MINUTES,
          isBlocking: false, // C'est un avertissement, pas un blocage
        },
      }
    }
  }

  return {
    valid: true,
    code: COMPLIANCE_RULES.MANDATORY_BREAK,
    rule: COMPLIANCE_MESSAGES.MANDATORY_BREAK.rule,
    details: {
      shiftDurationMinutes: durationMinutes,
      breakDuration: shift.breakDuration,
      breakRequired: durationMinutes > MAX_WORK_WITHOUT_BREAK_MINUTES,
    },
  }
}

/**
 * Calcule la pause recommandée en fonction de la durée
 */
export function getRecommendedBreak(durationMinutes: number): number {
  if (durationMinutes <= 4 * 60) {
    return 0 // Pas de pause obligatoire
  } else if (durationMinutes <= 6 * 60) {
    return 15 // Pause conseillée mais pas obligatoire
  } else if (durationMinutes <= 8 * 60) {
    return 20 // Pause minimale obligatoire
  } else if (durationMinutes <= 10 * 60) {
    return 30 // Pause recommandée pour longue journée
  } else {
    return 45 // Pause recommandée pour très longue journée
  }
}
