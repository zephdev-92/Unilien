/**
 * Validation de la période de congé principal
 * IDCC 3239 : le congé principal (≥12 jours ouvrables continus)
 * doit être pris entre mai et octobre
 *
 * Ce validator émet un avertissement (pas une erreur bloquante)
 */

import type { AbsenceRequest } from '../types'
import { countBusinessDays, isInMainLeavePeriod } from '../utils'

export function validateLeavePeriod(request: AbsenceRequest): string | null {
  if (request.absenceType !== 'vacation') return null

  const days = countBusinessDays(request.startDate, request.endDate)

  // Avertissement si congé long (≥12j) est pris hors période principale
  if (days >= 12) {
    const startInPeriod = isInMainLeavePeriod(request.startDate)
    const endInPeriod = isInMainLeavePeriod(request.endDate)

    if (!startInPeriod || !endInPeriod) {
      return 'Le congé principal (≥12 jours) devrait être pris entre mai et octobre. Des jours de fractionnement peuvent s\'appliquer.'
    }
  }

  return null
}
