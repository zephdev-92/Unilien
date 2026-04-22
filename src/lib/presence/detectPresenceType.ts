import { calculateShiftDuration, calculateNightHours } from '@/lib/compliance/utils'
import type { ShiftType } from '@/types'

/**
 * Détermine `presence_day` ou `presence_night` selon les horaires.
 * Règle : si plus de la moitié des heures tombent sur la plage nuit (21h–6h),
 * on considère la présence responsable comme "nuit".
 */
export function detectPresenceType(
  startTime: string,
  endTime: string,
): Extract<ShiftType, 'presence_day' | 'presence_night'> {
  if (!startTime || !endTime) return 'presence_day'
  const totalHours = calculateShiftDuration(startTime, endTime, 0) / 60
  if (totalHours <= 0) return 'presence_day'
  const nightHours = calculateNightHours(new Date(), startTime, endTime)
  return nightHours > totalHours / 2 ? 'presence_night' : 'presence_day'
}

/**
 * Détaille la répartition jour/nuit d'une plage horaire.
 * Utile pour avertir quand une présence responsable chevauche les deux
 * régimes (calculs de paie différents : ×2/3 jour vs ×1/4 nuit).
 */
export function getPresenceMix(
  startTime: string,
  endTime: string,
): { totalHours: number; dayHours: number; nightHours: number; isMixed: boolean } {
  if (!startTime || !endTime) {
    return { totalHours: 0, dayHours: 0, nightHours: 0, isMixed: false }
  }
  const totalHours = calculateShiftDuration(startTime, endTime, 0) / 60
  if (totalHours <= 0) {
    return { totalHours: 0, dayHours: 0, nightHours: 0, isMixed: false }
  }
  const nightHours = calculateNightHours(new Date(), startTime, endTime)
  const dayHours = Math.max(0, totalHours - nightHours)
  return {
    totalHours,
    dayHours,
    nightHours,
    isMixed: dayHours > 0 && nightHours > 0,
  }
}
