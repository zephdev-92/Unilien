import { useMemo } from 'react'
import { calculateNightHours } from '@/lib/compliance'

interface UseShiftNightHoursParams {
  startTime: string | undefined
  endTime: string | undefined
  date: string | undefined
}

/**
 * Calcule le nombre d'heures de nuit (21h–6h) d'un shift.
 * Mutualisé entre `NewShiftModal` et `ShiftDetailModal`.
 *
 * @returns
 * - `nightHoursCount` — nombre d'heures de nuit (0 si données manquantes)
 * - `hasNightHours`   — true si nightHoursCount > 0
 */
export function useShiftNightHours({ startTime, endTime, date }: UseShiftNightHoursParams) {
  const nightHoursCount = useMemo(() => {
    if (!startTime || !endTime || !date) return 0
    try {
      return calculateNightHours(new Date(date), startTime, endTime)
    } catch {
      return 0
    }
  }, [startTime, endTime, date])

  return { nightHoursCount, hasNightHours: nightHoursCount > 0 }
}
