/**
 * Module principal de validation de conformité
 * Combine toutes les règles de la Convention Collective IDCC 3239
 */

import type { ComplianceResult, ComplianceError, ComplianceWarning } from '@/types'
import type { ShiftForValidation, RuleValidationResult } from './types'
import { COMPLIANCE_RULES } from './types'
import { validateDailyRest, validateDailyRestBothWays, findPreviousShift } from './rules/validateDailyRest'
import { validateBreak, getRecommendedBreak } from './rules/validateBreak'
import { validateWeeklyHours, getRemainingWeeklyHours } from './rules/validateWeeklyHours'
import { validateDailyHours, getRemainingDailyHours } from './rules/validateDailyHours'
import { validateOverlap, findOverlappingShifts } from './rules/validateOverlap'
import { validateWeeklyRest, getWeeklyRestStatus } from './rules/validateWeeklyRest'
import { calculateShiftDuration } from './utils'

/**
 * Effectue une validation complète d'une intervention
 * Retourne les erreurs bloquantes et les avertissements
 */
export function validateShift(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): ComplianceResult {
  const errors: ComplianceError[] = []
  const warnings: ComplianceWarning[] = []

  // 1. Validation chevauchement (BLOQUANT)
  const overlapResult = validateOverlap(newShift, existingShifts)
  processResult(overlapResult, errors, warnings, true)

  // 2. Validation repos quotidien (BLOQUANT)
  const dailyRestResults = validateDailyRestBothWays(newShift, existingShifts)
  for (const result of dailyRestResults) {
    processResult(result, errors, warnings, true)
  }

  // 3. Validation durée quotidienne max (BLOQUANT)
  const dailyHoursResult = validateDailyHours(newShift, existingShifts)
  processResult(dailyHoursResult, errors, warnings, true)

  // 4. Validation durée hebdomadaire max (BLOQUANT si > 48h, AVERTISSEMENT si > 44h)
  const weeklyHoursResult = validateWeeklyHours(newShift, existingShifts)
  if (!weeklyHoursResult.valid) {
    processResult(weeklyHoursResult, errors, warnings, true)
  } else if (weeklyHoursResult.details?.isWarning) {
    processResult(weeklyHoursResult, errors, warnings, false)
  }

  // 5. Validation repos hebdomadaire (BLOQUANT)
  const weeklyRestResult = validateWeeklyRest(newShift, existingShifts)
  processResult(weeklyRestResult, errors, warnings, true)

  // 6. Validation pause obligatoire (AVERTISSEMENT)
  const breakResult = validateBreak(newShift)
  processResult(breakResult, errors, warnings, false)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Traite un résultat de validation et l'ajoute aux listes appropriées
 */
function processResult(
  result: RuleValidationResult,
  errors: ComplianceError[],
  warnings: ComplianceWarning[],
  isBlocking: boolean
): void {
  if (!result.valid && result.message) {
    if (isBlocking) {
      errors.push({
        code: result.code,
        message: result.message,
        rule: result.rule,
        blocking: true,
      })
    } else {
      warnings.push({
        code: result.code,
        message: result.message,
        rule: result.rule,
      })
    }
  } else if (result.valid && result.message && result.details?.isWarning) {
    warnings.push({
      code: result.code,
      message: result.message,
      rule: result.rule,
    })
  }
}

/**
 * Validation rapide pour l'UI (avant création)
 * Retourne uniquement les erreurs bloquantes majeures
 */
export function quickValidate(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): {
  canCreate: boolean
  blockingErrors: string[]
} {
  const blockingErrors: string[] = []

  // Chevauchement
  const overlapResult = validateOverlap(newShift, existingShifts)
  if (!overlapResult.valid && overlapResult.message) {
    blockingErrors.push(overlapResult.message)
  }

  // Repos quotidien
  const previousShift = findPreviousShift(newShift, existingShifts)
  const dailyRestResult = validateDailyRest(newShift, previousShift)
  if (!dailyRestResult.valid && dailyRestResult.message) {
    blockingErrors.push(dailyRestResult.message)
  }

  // Durée max quotidienne
  const dailyHoursResult = validateDailyHours(newShift, existingShifts)
  if (!dailyHoursResult.valid && dailyHoursResult.message) {
    blockingErrors.push(dailyHoursResult.message)
  }

  // Durée max hebdomadaire
  const weeklyHoursResult = validateWeeklyHours(newShift, existingShifts)
  if (!weeklyHoursResult.valid && weeklyHoursResult.message) {
    blockingErrors.push(weeklyHoursResult.message)
  }

  return {
    canCreate: blockingErrors.length === 0,
    blockingErrors,
  }
}

/**
 * Obtient un résumé de conformité pour un employé sur une période
 */
export function getComplianceSummary(
  employeeId: string,
  date: Date,
  existingShifts: ShiftForValidation[]
): {
  remainingDailyHours: number
  remainingWeeklyHours: number
  weeklyRestStatus: ReturnType<typeof getWeeklyRestStatus>
  recommendations: string[]
} {
  const remainingDailyHours = getRemainingDailyHours(date, employeeId, existingShifts)
  const remainingWeeklyHours = getRemainingWeeklyHours(date, employeeId, existingShifts)
  const weeklyRestStatus = getWeeklyRestStatus(date, employeeId, existingShifts)

  const recommendations: string[] = []

  if (remainingDailyHours <= 2) {
    recommendations.push(
      `Attention : seulement ${remainingDailyHours.toFixed(1)}h disponibles aujourd'hui.`
    )
  }

  if (remainingWeeklyHours <= 8) {
    recommendations.push(
      `Attention : seulement ${remainingWeeklyHours.toFixed(1)}h disponibles cette semaine.`
    )
  }

  if (!weeklyRestStatus.isCompliant) {
    recommendations.push(
      `Repos hebdomadaire insuffisant : ${weeklyRestStatus.longestRest.toFixed(1)}h (minimum 35h).`
    )
  }

  return {
    remainingDailyHours,
    remainingWeeklyHours,
    weeklyRestStatus,
    recommendations,
  }
}

/**
 * Suggère des créneaux alternatifs si l'intervention proposée est invalide
 */
export function suggestAlternatives(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[],
  result: ComplianceResult
): Array<{
  date: Date
  startTime: string
  endTime: string
  reason: string
}> {
  const suggestions: Array<{
    date: Date
    startTime: string
    endTime: string
    reason: string
  }> = []

  const duration = calculateShiftDuration(newShift.startTime, newShift.endTime, 0)

  // Analyser les erreurs pour proposer des alternatives
  for (const error of result.errors) {
    if (error.code === COMPLIANCE_RULES.DAILY_REST) {
      // Suggérer de décaler l'intervention
      const previousShift = findPreviousShift(newShift, existingShifts)
      if (previousShift) {
        // Calculer l'heure de début minimum
        const [prevEndH, prevEndM] = previousShift.endTime.split(':').map(Number)
        let minStartH = prevEndH + 11
        const minStartM = prevEndM

        // Ajuster la date si nécessaire
        let suggestionDate = new Date(previousShift.date)
        if (minStartH >= 24) {
          minStartH -= 24
          suggestionDate.setDate(suggestionDate.getDate() + 1)
        }

        const suggestedStart = `${minStartH.toString().padStart(2, '0')}:${minStartM.toString().padStart(2, '0')}`
        const suggestedEndM = minStartH * 60 + minStartM + duration
        const suggestedEndH = Math.floor(suggestedEndM / 60) % 24
        const suggestedEnd = `${suggestedEndH.toString().padStart(2, '0')}:${(suggestedEndM % 60).toString().padStart(2, '0')}`

        suggestions.push({
          date: suggestionDate,
          startTime: suggestedStart,
          endTime: suggestedEnd,
          reason: 'Respecte le repos quotidien de 11h',
        })
      }
    }

    if (error.code === COMPLIANCE_RULES.SHIFT_OVERLAP) {
      // Suggérer de décaler après l'intervention en conflit
      const overlapping = findOverlappingShifts(
        newShift.date,
        newShift.startTime,
        newShift.endTime,
        newShift.employeeId,
        existingShifts,
        newShift.id
      )

      for (const overlap of overlapping) {
        const suggestedStart = overlap.endTime
        const [endH, endM] = overlap.endTime.split(':').map(Number)
        const suggestedEndM = endH * 60 + endM + duration
        const suggestedEndH = Math.floor(suggestedEndM / 60) % 24
        const suggestedEnd = `${suggestedEndH.toString().padStart(2, '0')}:${(suggestedEndM % 60).toString().padStart(2, '0')}`

        suggestions.push({
          date: overlap.date,
          startTime: suggestedStart,
          endTime: suggestedEnd,
          reason: 'Après l\'intervention existante',
        })
      }
    }
  }

  return suggestions.slice(0, 3) // Maximum 3 suggestions
}

// Ré-exporter les fonctions utiles
export {
  validateDailyRest,
  validateBreak,
  validateWeeklyHours,
  validateDailyHours,
  validateOverlap,
  validateWeeklyRest,
  getRecommendedBreak,
  getRemainingWeeklyHours,
  getRemainingDailyHours,
  getWeeklyRestStatus,
}
