import type { GuardSegment, ShiftType } from '@/types'
import { applyMinBreaks } from '@/hooks/useGuardSegments'
import { detectPresenceType } from './detectPresenceType'

const DAY = 24 * 60
const NIGHT_START = 21 * 60 // plage nuit IDCC 3239 : 21h–6h
const NIGHT_END = 6 * 60
/** En dessous, une plage de nuit reste du travail effectif (majoré) plutôt qu'une présence. */
export const NIGHT_PRESENCE_MIN_MINUTES = 3 * 60
/** Au-delà de 10h effectives (max quotidien, cf. validateDailyHours), l'excédent passe en présence */
export const MAX_EFFECTIVE_MINUTES = 10 * 60

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const toTime = (min: number) => {
  const m = ((min % DAY) + DAY) % DAY
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
const isNight = (min: number) => {
  const m = min % DAY
  return m >= NIGHT_START || m < NIGHT_END
}

type Chunk = { start: number; end: number; type: GuardSegment['type'] }

function merge(chunks: Chunk[]): Chunk[] {
  return chunks.reduce<Chunk[]>((acc, c) => {
    const last = acc[acc.length - 1]
    if (last && last.type === c.type) last.end = c.end
    else acc.push({ ...c })
    return acc
  }, [])
}

/**
 * Découpage suggéré d'une intervention à partir de ses seules bornes :
 * - heures de jour (6h–21h) → travail effectif
 * - plage de nuit (21h–6h) ≥ 3h → présence responsable de nuit, sinon effectif
 * - au-delà de 10h effectives, l'excédent (en fin d'intervention) passe en
 *   présence responsable (jour ou nuit selon la plage)
 * - 24h (fin = début) → garde 24h (cf. collapseSegments)
 */
export function suggestSegments(startTime: string, endTime: string): GuardSegment[] {
  const start = toMin(startTime)
  let end = toMin(endTime)
  if (end <= start) end += DAY

  const cuts = [start]
  for (const b of [NIGHT_END, NIGHT_START, NIGHT_END + DAY, NIGHT_START + DAY]) {
    if (b > start && b < end) cuts.push(b)
  }
  cuts.sort((a, b) => a - b).push(end)

  let chunks: Chunk[] = merge(
    cuts.slice(0, -1).map((s, i) => {
      const e = cuts[i + 1]
      const night = isNight(s) && e - s >= NIGHT_PRESENCE_MIN_MINUTES
      return { start: s, end: e, type: night ? 'presence_night' : 'effective' }
    }),
  )

  // Plafond effectif : l'excédent (pris en fin d'intervention) devient présence responsable
  let excess = chunks.reduce((sum, c) => sum + (c.type === 'effective' ? c.end - c.start : 0), 0)
    - MAX_EFFECTIVE_MINUTES
  if (excess > 0) {
    for (let i = chunks.length - 1; i >= 0 && excess > 0; i--) {
      const c = chunks[i]
      if (c.type !== 'effective') continue
      const cut = Math.max(c.start, c.end - excess)
      excess -= c.end - cut
      const presence: Chunk = {
        start: cut,
        end: c.end,
        type: detectPresenceType(toTime(cut), toTime(c.end)),
      }
      chunks.splice(i, 1, ...(cut > c.start ? [{ ...c, end: cut }, presence] : [presence]))
    }
    chunks = merge(chunks)
  }

  return applyMinBreaks(
    chunks.map((c) => ({
      startTime: toTime(c.start),
      type: c.type,
      ...(c.type === 'effective' ? { breakMinutes: 0 } : {}),
    })),
    endTime,
  )
}

/**
 * Traduit un découpage en ce qui est stocké :
 * - 24h → garde 24h segmentée
 * - uniquement de la présence → presence_day/night (split jour/nuit géré par la paie)
 * - uniquement de l'effectif → effective simple
 * - mixte → effective découpée (guard_segments)
 */
export function collapseSegments(
  segments: GuardSegment[],
  startTime: string,
  endTime: string,
): { shiftType: ShiftType; guardSegments?: GuardSegment[] } {
  if (startTime === endTime) return { shiftType: 'guard_24h', guardSegments: segments }
  const hasEffective = segments.some((s) => s.type === 'effective')
  if (!hasEffective) return { shiftType: detectPresenceType(startTime, endTime) }
  if (segments.every((s) => s.type === 'effective')) return { shiftType: 'effective' }
  return { shiftType: 'effective', guardSegments: segments }
}
