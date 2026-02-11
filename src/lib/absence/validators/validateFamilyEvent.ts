/**
 * Validation des événements familiaux
 * IDCC 3239 Art. 12 : jours pour événements familiaux
 */

import type { AbsenceRequest } from '../types'
import { FAMILY_EVENT_DAYS, FAMILY_EVENT_LABELS } from '../types'
import { countBusinessDays } from '../utils'

export function validateFamilyEvent(request: AbsenceRequest): string | null {
  if (request.absenceType !== 'family_event') return null

  if (!request.familyEventType) {
    return 'Veuillez sélectionner le type d\'événement familial.'
  }

  const maxDays = FAMILY_EVENT_DAYS[request.familyEventType]
  if (maxDays === undefined) {
    return 'Type d\'événement familial non reconnu.'
  }

  const requestedDays = countBusinessDays(request.startDate, request.endDate)
  const eventLabel = FAMILY_EVENT_LABELS[request.familyEventType]

  if (requestedDays > maxDays) {
    return `${eventLabel} : ${maxDays} jour(s) accordé(s) maximum, ${requestedDays} jour(s) demandé(s).`
  }

  return null
}
