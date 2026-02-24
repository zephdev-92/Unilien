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
  let durationMinutes: number
  let breakDuration: number

  if (shift.shiftType === 'guard_24h' && shift.guardSegments?.length) {
    // Modèle N-segments : la règle s'applique segment par segment.
    // Les périodes de présence (jour/nuit) entre les segments effectifs
    // constituent des pauses naturelles — seul un segment effectif > 6h
    // d'un seul tenant déclenche l'obligation de pause.
    const segs = shift.guardSegments
    let maxSegNetMins = 0
    let breakForMaxSeg = 0
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      if (seg.type !== 'effective') continue
      const segEnd = segs[i + 1]?.startTime ?? segs[0].startTime
      const durMins = calculateShiftDuration(seg.startTime, segEnd, 0)
      const netMins = Math.max(0, durMins - (seg.breakMinutes ?? 0))
      if (netMins > maxSegNetMins) {
        maxSegNetMins = netMins
        breakForMaxSeg = seg.breakMinutes ?? 0
      }
    }
    durationMinutes = maxSegNetMins
    breakDuration = breakForMaxSeg
  } else {
    durationMinutes = calculateShiftDuration(shift.startTime, shift.endTime, 0)
    breakDuration = shift.breakDuration
  }

  // Si le travail effectif dure plus de 6h, une pause de 20 min est obligatoire
  if (durationMinutes > MAX_WORK_WITHOUT_BREAK_MINUTES) {
    if (breakDuration < MINIMUM_BREAK_MINUTES) {
      return {
        valid: false,
        code: COMPLIANCE_RULES.MANDATORY_BREAK,
        rule: COMPLIANCE_MESSAGES.MANDATORY_BREAK.rule,
        message: COMPLIANCE_MESSAGES.MANDATORY_BREAK.warning(
          durationMinutes,
          breakDuration
        ),
        details: {
          shiftDurationMinutes: durationMinutes,
          shiftDurationHours: Math.round((durationMinutes / 60) * 10) / 10,
          breakDuration,
          minimumBreakRequired: MINIMUM_BREAK_MINUTES,
          isBlocking: false,
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
      breakDuration,
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
