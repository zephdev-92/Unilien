/**
 * Validation du nombre maximum de nuits consécutives de présence responsable
 * Règle : Maximum 5 nuits consécutives
 * Article 148 — Convention Collective IDCC 3239
 */

import { format, addDays, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ShiftForValidation, RuleValidationResult } from '../types'
import { COMPLIANCE_RULES, COMPLIANCE_MESSAGES } from '../types'

const MAX_CONSECUTIVE_NIGHTS = 5

/**
 * Valide que l'employé ne dépasse pas 5 nuits consécutives de présence responsable.
 * Ne s'applique qu'aux interventions de type 'presence_night'.
 */
export function validateConsecutiveNights(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): RuleValidationResult {
  const shiftType = newShift.shiftType || 'effective'

  // Règle applicable uniquement aux présences de nuit
  if (shiftType !== 'presence_night') {
    return {
      valid: true,
      code: COMPLIANCE_RULES.CONSECUTIVE_NIGHTS_MAX,
      rule: COMPLIANCE_MESSAGES.CONSECUTIVE_NIGHTS_MAX.rule,
    }
  }

  const consecutiveCount = countConsecutiveNights(newShift, existingShifts)

  if (consecutiveCount > MAX_CONSECUTIVE_NIGHTS) {
    return {
      valid: false,
      code: COMPLIANCE_RULES.CONSECUTIVE_NIGHTS_MAX,
      rule: COMPLIANCE_MESSAGES.CONSECUTIVE_NIGHTS_MAX.rule,
      message: COMPLIANCE_MESSAGES.CONSECUTIVE_NIGHTS_MAX.error(consecutiveCount),
      details: {
        consecutiveNights: consecutiveCount,
        maximumAllowed: MAX_CONSECUTIVE_NIGHTS,
        newShiftDate: format(newShift.date, 'd MMMM yyyy', { locale: fr }),
      },
    }
  }

  return {
    valid: true,
    code: COMPLIANCE_RULES.CONSECUTIVE_NIGHTS_MAX,
    rule: COMPLIANCE_MESSAGES.CONSECUTIVE_NIGHTS_MAX.rule,
    details: {
      consecutiveNights: consecutiveCount,
      remainingNights: MAX_CONSECUTIVE_NIGHTS - consecutiveCount,
    },
  }
}

/**
 * Compte le nombre de nuits consécutives de présence responsable
 * incluant la nouvelle intervention proposée.
 *
 * Recherche en arrière et en avant à partir de la date du nouveau shift
 * pour trouver la chaîne complète de nuits consécutives.
 */
export function countConsecutiveNights(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): number {
  // Construire l'ensemble des dates avec présence de nuit pour cet employé
  const nightDates = new Set<string>()

  for (const shift of existingShifts) {
    if (newShift.id && shift.id === newShift.id) continue
    if (shift.employeeId !== newShift.employeeId) continue
    if ((shift.shiftType || 'effective') !== 'presence_night') continue

    nightDates.add(dateKey(shift.date))
  }

  // Ajouter la date du nouveau shift
  const newDateKey = dateKey(newShift.date)
  nightDates.add(newDateKey)

  // Compter les nuits consécutives en partant de la date du nouveau shift
  let count = 1

  // Chercher en arrière (jours précédents)
  let checkDate = subDays(newShift.date, 1)
  while (nightDates.has(dateKey(checkDate))) {
    count++
    checkDate = subDays(checkDate, 1)
  }

  // Chercher en avant (jours suivants)
  checkDate = addDays(newShift.date, 1)
  while (nightDates.has(dateKey(checkDate))) {
    count++
    checkDate = addDays(checkDate, 1)
  }

  return count
}

/** Clé normalisée pour comparer les dates (YYYY-MM-DD) */
function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
