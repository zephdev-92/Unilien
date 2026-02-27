import { useMemo } from 'react'
import { calculateShiftDuration } from '@/lib/compliance'
import type { ShiftType, GuardSegment } from '@/types'

interface UseShiftEffectiveHoursParams {
  startTime: string | undefined
  endTime: string | undefined
  breakDuration: number
  shiftType: ShiftType
  isRequalified: boolean
  /** Segments d'une garde 24h — propre à NewShiftModal */
  guardSegments?: GuardSegment[]
}

/**
 * Calcule les heures effectives pondérées selon le type de shift (IDCC 3239) :
 * - `presence_day`    → ×2/3 (Art. 137.1)
 * - `presence_night` requalifiée → 100%
 * - `guard_24h`      → somme des segments effectifs (si `guardSegments` fournis)
 * - `effective`      → null (pas de conversion, paie au brut)
 * - `presence_night` non requalifiée → null (indemnité forfaitaire, pas d'heures eff.)
 *
 * Mutualisé entre `NewShiftModal` et `ShiftDetailModal`.
 *
 * @returns `{ effectiveHoursComputed }` — null si aucune conversion applicable
 */
export function useShiftEffectiveHours({
  startTime,
  endTime,
  breakDuration,
  shiftType,
  isRequalified,
  guardSegments,
}: UseShiftEffectiveHoursParams) {
  const effectiveHoursComputed = useMemo(() => {
    if (!startTime || !endTime) return null

    try {
      const durationMinutes = calculateShiftDuration(startTime, endTime, breakDuration)
      const durationHours = durationMinutes / 60

      if (shiftType === 'presence_day') {
        return Math.round(durationHours * (2 / 3) * 100) / 100
      }

      if (shiftType === 'presence_night' && isRequalified) {
        return durationHours
      }

      if (shiftType === 'guard_24h' && guardSegments && guardSegments.length > 0) {
        const total = guardSegments.reduce((sum, seg, i) => {
          const end = guardSegments[i + 1]?.startTime ?? startTime
          const mins = calculateShiftDuration(seg.startTime, end, 0)
          return seg.type === 'effective'
            ? sum + Math.max(0, mins - (seg.breakMinutes ?? 0)) / 60
            : sum
        }, 0)
        return Math.round(total * 100) / 100
      }

      return null
    } catch {
      return null
    }
  }, [startTime, endTime, breakDuration, shiftType, isRequalified, guardSegments])

  return { effectiveHoursComputed }
}
