import type { ShiftType } from '@/types'

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  effective: 'Travail effectif',
  presence_day: 'Présence responsable (jour)',
  presence_night: 'Présence responsable (nuit)',
  guard_24h: 'Garde 24h',
}
