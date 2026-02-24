import type { ShiftType } from '@/types'

/** Seuil IDCC 3239 Art. 148 : requalification en travail effectif dès 4 interventions */
export const REQUALIFICATION_THRESHOLD = 4

interface UseShiftRequalificationParams {
  shiftType: ShiftType
  nightInterventionsCount: number
}

/**
 * Détermine si une présence de nuit doit être requalifiée en travail effectif.
 * Requalification = `presence_night` avec ≥ 4 interventions (Art. 148 IDCC 3239).
 * Mutualisé entre `NewShiftModal` et `ShiftDetailModal`.
 */
export function useShiftRequalification({ shiftType, nightInterventionsCount }: UseShiftRequalificationParams) {
  const isRequalified = shiftType === 'presence_night' && nightInterventionsCount >= REQUALIFICATION_THRESHOLD
  return { isRequalified }
}
