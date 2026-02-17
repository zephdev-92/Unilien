/**
 * Validation du repos quotidien
 * Règle : Minimum 11h de repos entre 2 interventions
 * Article L3131-1 du Code du travail
 */

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ShiftForValidation, RuleValidationResult } from '../types'
import { COMPLIANCE_RULES, COMPLIANCE_MESSAGES } from '../types'
import {
  createDateTime,
  getShiftEndDateTime,
  hoursBetween,
  calculateMinStartTime,
} from '../utils'

const MINIMUM_DAILY_REST_HOURS = 11

/**
 * Vérifie si un type d'intervention est une présence responsable
 */
function isPresenceType(shift: ShiftForValidation): boolean {
  return shift.shiftType === 'presence_day' || shift.shiftType === 'presence_night'
}

/**
 * Valide que le repos quotidien de 11h est respecté entre la dernière
 * intervention et la nouvelle intervention proposée
 */
export function validateDailyRest(
  newShift: ShiftForValidation,
  previousShift: ShiftForValidation | null
): RuleValidationResult {
  // Pas de validation nécessaire s'il n'y a pas d'intervention précédente
  if (!previousShift) {
    return {
      valid: true,
      code: COMPLIANCE_RULES.DAILY_REST,
      rule: COMPLIANCE_MESSAGES.DAILY_REST.rule,
    }
  }

  // Exemption garde : enchaînement travail effectif ↔ présence responsable
  // La présence de nuit/jour n'est pas du travail effectif continu,
  // le repos de 11h ne s'applique pas entre les deux (Art. 137.1 / 148 IDCC 3239)
  if (isPresenceType(newShift) || isPresenceType(previousShift)) {
    return {
      valid: true,
      code: COMPLIANCE_RULES.DAILY_REST,
      rule: COMPLIANCE_MESSAGES.DAILY_REST.rule,
      details: { presenceExemption: true },
    }
  }

  // Calculer l'heure de fin de la dernière intervention
  const previousEnd = getShiftEndDateTime(
    previousShift.date,
    previousShift.startTime,
    previousShift.endTime
  )

  // Calculer l'heure de début de la nouvelle intervention
  const newStart = createDateTime(newShift.date, newShift.startTime)

  // Calculer le nombre d'heures entre les deux
  const restHours = hoursBetween(previousEnd, newStart)

  if (restHours < MINIMUM_DAILY_REST_HOURS) {
    // Calculer l'heure minimum de début autorisée
    const minStartTime = calculateMinStartTime(previousEnd)
    const minStartTimeStr = format(minStartTime, 'HH:mm', { locale: fr })
    const minStartDateStr = format(minStartTime, 'EEEE d MMMM à HH:mm', { locale: fr })

    return {
      valid: false,
      code: COMPLIANCE_RULES.DAILY_REST,
      rule: COMPLIANCE_MESSAGES.DAILY_REST.rule,
      message: COMPLIANCE_MESSAGES.DAILY_REST.error(restHours, minStartDateStr),
      details: {
        restHours: Math.round(restHours * 10) / 10,
        minimumRequired: MINIMUM_DAILY_REST_HOURS,
        previousShiftEnd: format(previousEnd, 'EEEE d MMMM à HH:mm', { locale: fr }),
        suggestedStartTime: minStartTimeStr,
        suggestedStartDate: minStartTime.toISOString(),
      },
    }
  }

  return {
    valid: true,
    code: COMPLIANCE_RULES.DAILY_REST,
    rule: COMPLIANCE_MESSAGES.DAILY_REST.rule,
    details: {
      restHours: Math.round(restHours * 10) / 10,
    },
  }
}

/**
 * Trouve l'intervention précédente la plus récente pour un employé
 */
export function findPreviousShift(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): ShiftForValidation | null {
  const newStart = createDateTime(newShift.date, newShift.startTime)

  // Filtrer les interventions avant la nouvelle et les trier par date décroissante
  const previousShifts = existingShifts
    .filter((shift) => {
      // Exclure l'intervention elle-même si elle a un ID
      if (newShift.id && shift.id === newShift.id) return false

      const shiftEnd = getShiftEndDateTime(shift.date, shift.startTime, shift.endTime)
      return shiftEnd <= newStart
    })
    .sort((a, b) => {
      const endA = getShiftEndDateTime(a.date, a.startTime, a.endTime)
      const endB = getShiftEndDateTime(b.date, b.startTime, b.endTime)
      return endB.getTime() - endA.getTime()
    })

  return previousShifts.length > 0 ? previousShifts[0] : null
}

/**
 * Trouve l'intervention suivante la plus proche pour un employé
 */
export function findNextShift(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): ShiftForValidation | null {
  const newEnd = getShiftEndDateTime(newShift.date, newShift.startTime, newShift.endTime)

  // Filtrer les interventions après la nouvelle et les trier par date croissante
  const nextShifts = existingShifts
    .filter((shift) => {
      // Exclure l'intervention elle-même si elle a un ID
      if (newShift.id && shift.id === newShift.id) return false

      const shiftStart = createDateTime(shift.date, shift.startTime)
      return shiftStart >= newEnd
    })
    .sort((a, b) => {
      const startA = createDateTime(a.date, a.startTime)
      const startB = createDateTime(b.date, b.startTime)
      return startA.getTime() - startB.getTime()
    })

  return nextShifts.length > 0 ? nextShifts[0] : null
}

/**
 * Valide le repos quotidien dans les deux sens (avant ET après)
 */
export function validateDailyRestBothWays(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): RuleValidationResult[] {
  const results: RuleValidationResult[] = []

  // Vérifier le repos après l'intervention précédente
  const previousShift = findPreviousShift(newShift, existingShifts)
  results.push(validateDailyRest(newShift, previousShift))

  // Vérifier le repos avant l'intervention suivante
  const nextShift = findNextShift(newShift, existingShifts)
  if (nextShift) {
    // Inverser la logique : la nouvelle intervention est "précédente" par rapport à la suivante
    const reverseResult = validateDailyRest(nextShift, newShift)
    if (!reverseResult.valid) {
      // Reformuler le message pour indiquer que c'est l'intervention suivante qui pose problème
      results.push({
        ...reverseResult,
        message: `Le repos avant l'intervention suivante (${format(nextShift.date, 'd MMMM', { locale: fr })} à ${nextShift.startTime}) serait insuffisant.`,
      })
    }
  }

  return results
}
