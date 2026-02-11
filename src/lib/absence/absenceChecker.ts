/**
 * Module principal de validation des absences
 * Combine toutes les règles de la Convention Collective IDCC 3239
 */

import type {
  AbsenceValidationResult,
  AbsenceRequest,
  ExistingAbsence,
  LeaveBalanceForValidation,
} from './types'
import { validateOverlap } from './validators/validateOverlap'
import { validateBalance } from './validators/validateBalance'
import { validateSickLeave } from './validators/validateSickLeave'
import { validateFamilyEvent } from './validators/validateFamilyEvent'
import { validateLeavePeriod } from './validators/validateLeavePeriod'

/**
 * Valide une demande d'absence selon toutes les règles métier
 */
export function validateAbsenceRequest(
  request: AbsenceRequest,
  existingAbsences: ExistingAbsence[],
  leaveBalance: LeaveBalanceForValidation | null
): AbsenceValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Chevauchement (BLOQUANT)
  const overlapError = validateOverlap(request, existingAbsences)
  if (overlapError) errors.push(overlapError)

  // 2. Solde de congés (BLOQUANT pour vacation)
  const balanceError = validateBalance(request, leaveBalance)
  if (balanceError) errors.push(balanceError)

  // 3. Arrêt maladie (BLOQUANT)
  const sickError = validateSickLeave(request)
  if (sickError) errors.push(sickError)

  // 4. Événement familial (BLOQUANT)
  const familyError = validateFamilyEvent(request)
  if (familyError) errors.push(familyError)

  // 5. Période de congé principal (AVERTISSEMENT)
  const periodWarning = validateLeavePeriod(request)
  if (periodWarning) warnings.push(periodWarning)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
