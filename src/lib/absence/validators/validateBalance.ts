/**
 * Validation du solde de congés payés
 * Vérifie que l'employé dispose de suffisamment de jours
 */

import type { AbsenceRequest, LeaveBalanceForValidation } from '../types'
import { countBusinessDays } from '../utils'
import { calculateRemainingDays } from '../balanceCalculator'

export function validateBalance(
  request: AbsenceRequest,
  balance: LeaveBalanceForValidation | null
): string | null {
  // Seuls les congés payés sont décomptés du solde
  if (request.absenceType !== 'vacation') return null

  if (!balance) {
    return 'Le solde de congés n\'a pas encore été initialisé. Veuillez réessayer ou contacter votre employeur si le problème persiste.'
  }

  const daysRequested = countBusinessDays(request.startDate, request.endDate)
  const remaining = calculateRemainingDays(balance)

  if (daysRequested > remaining) {
    return `Solde de congés insuffisant : ${daysRequested} jour(s) demandé(s), ${remaining.toFixed(1)} jour(s) disponible(s).`
  }

  return null
}
