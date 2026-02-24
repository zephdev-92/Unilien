/**
 * Validation du chevauchement d'absences
 * Un employé ne peut pas avoir deux absences (pending/approved) sur la même période
 */

import type { AbsenceRequest, ExistingAbsence } from '../types'
import { dateRangesOverlap } from '../utils'

export function validateOverlap(
  request: AbsenceRequest,
  existingAbsences: ExistingAbsence[]
): string | null {
  const activeAbsences = existingAbsences.filter(
    (a) => a.status === 'pending' || a.status === 'approved'
  )

  for (const absence of activeAbsences) {
    if (dateRangesOverlap(request.startDate, request.endDate, absence.startDate, absence.endDate)) {
      return 'Une absence est déjà déclarée sur cette période. Veuillez choisir des dates différentes.'
    }
  }

  return null
}
