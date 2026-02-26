import type { Shift, Absence } from '@/types'

// ─── Shift ───────────────────────────────────────────────────────────────────

export const SHIFT_STATUS_COLORS: Record<Shift['status'], string> = {
  planned: 'blue',
  completed: 'green',
  cancelled: 'gray',
  absent: 'red',
}

export const SHIFT_STATUS_LABELS: Record<Shift['status'], string> = {
  planned: 'Planifié',
  completed: 'Terminé',
  cancelled: 'Annulé',
  absent: 'Absent',
}

export const SHIFT_TYPE_LABELS: Record<Shift['shiftType'], string> = {
  effective: 'Travail effectif',
  presence_day: 'Présence responsable (jour)',
  presence_night: 'Présence responsable (nuit)',
  guard_24h: 'Garde 24h',
}

// ─── Absence ─────────────────────────────────────────────────────────────────

export const ABSENCE_STATUS_COLORS: Record<Absence['status'], string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
}

export const ABSENCE_STATUS_LABELS: Record<Absence['status'], string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
}

export const ABSENCE_TYPE_LABELS: Record<Absence['absenceType'], string> = {
  sick: 'Maladie',
  vacation: 'Congé payé',
  family_event: 'Événement familial',
  training: 'Formation',
  unavailable: 'Indisponibilité',
  emergency: 'Urgence personnelle',
}

export const ABSENCE_TYPE_COLORS: Record<Absence['absenceType'], string> = {
  sick: 'red',
  vacation: 'blue',
  family_event: 'teal',
  training: 'purple',
  unavailable: 'gray',
  emergency: 'orange',
}
