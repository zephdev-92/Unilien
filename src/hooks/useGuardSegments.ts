import { useState, useCallback } from 'react'
import { calculateShiftDuration } from '@/lib/compliance'
import type { GuardSegment } from '@/types'

/**
 * Pause minimale légale pour un segment effectif d'une garde 24h.
 *
 * Art. L3121-16 : pause de 20 min dès que le travail effectif CONTINU atteint 6h.
 * Dans une garde 24h, les segments de présence responsable (jour/nuit) séparent
 * les plages effectives et constituent eux-mêmes des temps de repos bien supérieurs
 * à 20 min — la règle du cumul journalier ne s'applique donc pas.
 * Seul un segment individuel > 6h continus déclenche l'obligation.
 */
export function getMinBreakForSegment(index: number, segments: GuardSegment[]): number {
  const seg = segments[index]
  if (seg.type !== 'effective') return 0

  const segEnd = segments[index + 1]?.startTime ?? segments[0].startTime
  const durMins = calculateShiftDuration(seg.startTime, segEnd, 0)

  // Segment effectif continu > 6h → 20 min minimum (Art. L3121-16)
  if (durMins > 360) return 20

  return 0
}

/**
 * Recalcule la pause minimale légale pour chaque segment effectif.
 * Remet toujours à jour la pause (à la hausse ET à la baisse) en fonction
 * de la durée réelle du segment — ex. segment raccourci sous 6h → pause à 0.
 */
export function applyMinBreaks(segments: GuardSegment[]): GuardSegment[] {
  return segments.map((seg, i) => {
    if (seg.type !== 'effective') return seg
    const minBreak = getMinBreakForSegment(i, segments)
    return { ...seg, breakMinutes: minBreak }
  })
}

const DEFAULT_SEGMENTS: GuardSegment[] = [
  { startTime: '09:00', type: 'effective', breakMinutes: 0 },
  { startTime: '21:00', type: 'presence_night' },
]

/**
 * Gère les segments de garde 24h : état, ajout, suppression et modification.
 */
export function useGuardSegments() {
  const [guardSegments, setGuardSegments] = useState<GuardSegment[]>(() =>
    applyMinBreaks(DEFAULT_SEGMENTS)
  )

  const resetToDefaults = useCallback(() => {
    setGuardSegments(applyMinBreaks(DEFAULT_SEGMENTS))
  }, [])

  const addGuardSegment = useCallback((afterIndex: number) => {
    setGuardSegments(prev => {
      const next = [...prev]
      const segStart = next[afterIndex].startTime
      const segEnd = next[afterIndex + 1]?.startTime ?? next[0].startTime
      const [sh, sm] = segStart.split(':').map(Number)
      const [eh, em] = segEnd.split(':').map(Number)
      let endTotal = eh * 60 + em
      const startTotal = sh * 60 + sm
      if (endTotal <= startTotal) endTotal += 1440
      const midTotal = Math.floor((startTotal + endTotal) / 2) % 1440
      const midTime = `${Math.floor(midTotal / 60).toString().padStart(2, '0')}:${(midTotal % 60).toString().padStart(2, '0')}`
      next.splice(afterIndex + 1, 0, { startTime: midTime, type: 'effective', breakMinutes: 0 })
      return applyMinBreaks(next)
    })
  }, [])

  const removeGuardSegment = useCallback((index: number) => {
    setGuardSegments(prev => {
      if (prev.length <= 2) return prev
      return applyMinBreaks(prev.filter((_, i) => i !== index))
    })
  }, [])

  const updateGuardSegmentEnd = useCallback((index: number, newEndTime: string) => {
    setGuardSegments(prev => {
      const next = [...prev]
      if (index + 1 < next.length) {
        next[index + 1] = { ...next[index + 1], startTime: newEndTime }
      }
      return applyMinBreaks(next)
    })
  }, [])

  const updateGuardSegmentType = useCallback((index: number, type: GuardSegment['type']) => {
    setGuardSegments(prev => {
      const next = [...prev]
      next[index] = { ...next[index], type, breakMinutes: type === 'effective' ? (next[index].breakMinutes ?? 0) : undefined }
      return applyMinBreaks(next)
    })
  }, [])

  const updateGuardSegmentBreak = useCallback((index: number, breakMinutes: number) => {
    setGuardSegments(prev => {
      const next = [...prev]
      const minBreak = getMinBreakForSegment(index, next)
      next[index] = { ...next[index], breakMinutes: Math.max(minBreak, breakMinutes) }
      return next
    })
  }, [])

  return {
    guardSegments,
    setGuardSegments,
    resetToDefaults,
    addGuardSegment,
    removeGuardSegment,
    updateGuardSegmentEnd,
    updateGuardSegmentType,
    updateGuardSegmentBreak,
  }
}
