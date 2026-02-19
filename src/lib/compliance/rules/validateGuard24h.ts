/**
 * Validation des règles spécifiques à la Garde 24h (guard_24h)
 *
 * Modèle N segments libres : chaque segment a un type et une durée.
 * La fin du segment[n] = début du segment[n+1].
 * La fin du dernier segment = startTime du shift (+24h implicite).
 *
 * Contraintes légales :
 *   - Total heures effectives (hors pause) ≤ 12h — BLOQUANT (Art. L3121-18 Code du travail)
 *   - Tout segment presence_night > 12h — AVERTISSEMENT (pas bloquant)
 *
 * Référence : Art. L3121-18 Code du travail + IDCC 3239 Art. 148
 */

import type { ShiftForValidation, RuleValidationResult } from '../types'
import { COMPLIANCE_RULES, COMPLIANCE_MESSAGES } from '../types'
import { calculateShiftDuration } from '../utils'

const MAX_EFFECTIVE_HOURS = 12
const NIGHT_WARNING_HOURS = 12

export function validateGuard24h(
  newShift: ShiftForValidation
): RuleValidationResult {
  if ((newShift.shiftType || 'effective') !== 'guard_24h') {
    return {
      valid: true,
      code: COMPLIANCE_RULES.GUARD_24H_EFFECTIVE_MAX,
      rule: COMPLIANCE_MESSAGES.GUARD_24H_EFFECTIVE_MAX.rule,
    }
  }

  const segs = newShift.guardSegments

  if (!segs?.length) {
    return {
      valid: false,
      code: COMPLIANCE_RULES.GUARD_24H_EFFECTIVE_MAX,
      rule: COMPLIANCE_MESSAGES.GUARD_24H_EFFECTIVE_MAX.rule,
      message: COMPLIANCE_MESSAGES.GUARD_24H_EFFECTIVE_MAX.missingSegments,
    }
  }

  let totalEffectiveMins = 0
  let maxNightMins = 0

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]
    // La fin du segment = début du suivant ; pour le dernier → startTime du shift (+24h)
    const segEnd = segs[i + 1]?.startTime ?? segs[0].startTime
    const durMins = calculateShiftDuration(seg.startTime, segEnd, 0)

    if (seg.type === 'effective') {
      totalEffectiveMins += Math.max(0, durMins - (seg.breakMinutes ?? 0))
    } else if (seg.type === 'presence_night') {
      maxNightMins = Math.max(maxNightMins, durMins)
    }
  }

  // BLOQUANT : total heures effectives > 12h
  const totalEffectiveH = totalEffectiveMins / 60
  if (totalEffectiveH > MAX_EFFECTIVE_HOURS) {
    return {
      valid: false,
      code: COMPLIANCE_RULES.GUARD_24H_EFFECTIVE_MAX,
      rule: COMPLIANCE_MESSAGES.GUARD_24H_EFFECTIVE_MAX.rule,
      message: COMPLIANCE_MESSAGES.GUARD_24H_EFFECTIVE_MAX.error(totalEffectiveH),
      details: {
        totalEffectiveH: Math.round(totalEffectiveH * 10) / 10,
        maximumAllowed: MAX_EFFECTIVE_HOURS,
      },
    }
  }

  // AVERTISSEMENT (non bloquant) : un segment de nuit > 12h
  const maxNightH = maxNightMins / 60
  if (maxNightH > NIGHT_WARNING_HOURS) {
    return {
      valid: true,
      code: COMPLIANCE_RULES.GUARD_24H_EFFECTIVE_MAX,
      rule: COMPLIANCE_MESSAGES.GUARD_24H_EFFECTIVE_MAX.rule,
      message: COMPLIANCE_MESSAGES.GUARD_24H_EFFECTIVE_MAX.warningNight(maxNightH),
      details: {
        totalEffectiveH: Math.round(totalEffectiveH * 10) / 10,
        maxNightH: Math.round(maxNightH * 10) / 10,
        isWarning: true,
      },
    }
  }

  return {
    valid: true,
    code: COMPLIANCE_RULES.GUARD_24H_EFFECTIVE_MAX,
    rule: COMPLIANCE_MESSAGES.GUARD_24H_EFFECTIVE_MAX.rule,
    details: {
      totalEffectiveH: Math.round(totalEffectiveH * 10) / 10,
      segmentCount: segs.length,
    },
  }
}
