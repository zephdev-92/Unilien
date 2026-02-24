/**
 * Validation de la durée maximale de présence responsable de nuit
 * Règle : Maximum 12h consécutives de présence de nuit
 * Article 148 — Convention Collective IDCC 3239
 */

import type { ShiftForValidation, RuleValidationResult } from '../types'
import { COMPLIANCE_RULES, COMPLIANCE_MESSAGES } from '../types'
import { calculateShiftDuration } from '../utils'

const MAX_NIGHT_PRESENCE_HOURS = 12

/**
 * Valide que la durée d'une présence responsable de nuit ne dépasse pas 12h consécutives.
 * Ne s'applique qu'aux interventions de type 'presence_night'.
 */
export function validateNightPresenceDuration(
  newShift: ShiftForValidation
): RuleValidationResult {
  const shiftType = newShift.shiftType || 'effective'

  // Règle applicable uniquement aux présences de nuit
  if (shiftType !== 'presence_night') {
    return {
      valid: true,
      code: COMPLIANCE_RULES.NIGHT_PRESENCE_MAX_DURATION,
      rule: COMPLIANCE_MESSAGES.NIGHT_PRESENCE_MAX_DURATION.rule,
    }
  }

  const durationMinutes = calculateShiftDuration(
    newShift.startTime,
    newShift.endTime,
    newShift.breakDuration
  )
  const durationHours = durationMinutes / 60

  if (durationHours > MAX_NIGHT_PRESENCE_HOURS) {
    return {
      valid: false,
      code: COMPLIANCE_RULES.NIGHT_PRESENCE_MAX_DURATION,
      rule: COMPLIANCE_MESSAGES.NIGHT_PRESENCE_MAX_DURATION.rule,
      message: COMPLIANCE_MESSAGES.NIGHT_PRESENCE_MAX_DURATION.error(durationHours),
      details: {
        durationHours: Math.round(durationHours * 10) / 10,
        maximumAllowed: MAX_NIGHT_PRESENCE_HOURS,
        excessHours: Math.round((durationHours - MAX_NIGHT_PRESENCE_HOURS) * 10) / 10,
      },
    }
  }

  return {
    valid: true,
    code: COMPLIANCE_RULES.NIGHT_PRESENCE_MAX_DURATION,
    rule: COMPLIANCE_MESSAGES.NIGHT_PRESENCE_MAX_DURATION.rule,
    details: {
      durationHours: Math.round(durationHours * 10) / 10,
      remainingHours: Math.round((MAX_NIGHT_PRESENCE_HOURS - durationHours) * 10) / 10,
    },
  }
}
