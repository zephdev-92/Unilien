/**
 * Validation des arrêts maladie
 * IDCC 3239 : justificatif sous 48h
 */

import type { AbsenceRequest } from '../types'

export function validateSickLeave(request: AbsenceRequest): string | null {
  if (request.absenceType !== 'sick') return null

  // Vérifier que la date de début n'est pas trop loin dans le futur
  // Un arrêt maladie ne se programme pas à l'avance (sauf hospitalisation planifiée)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const startDate = new Date(request.startDate)
  startDate.setHours(0, 0, 0, 0)

  const daysInFuture = Math.floor((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysInFuture > 30) {
    return 'Un arrêt maladie ne peut pas être déclaré plus de 30 jours à l\'avance.'
  }

  return null
}
