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
