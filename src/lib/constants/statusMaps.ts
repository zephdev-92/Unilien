import type { Shift, Absence, CaregiverLegalStatus, CaregiverContractStatus } from '@/types'

// ─── Shift ───────────────────────────────────────────────────────────────────

export const SHIFT_STATUS_COLORS: Record<Shift['status'], string> = {
  planned: 'blue',
  completed: 'green',
  cancelled: 'gray',
  absent: 'red',
}

export const SHIFT_STATUS_VARIANTS: Record<Shift['status'], 'active' | 'pending' | 'off' | 'danger' | 'success'> = {
  planned: 'active',
  completed: 'success',
  cancelled: 'off',
  absent: 'danger',
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

export const ABSENCE_STATUS_VARIANTS: Record<Absence['status'], 'active' | 'pending' | 'off' | 'danger' | 'success'> = {
  pending: 'pending',
  approved: 'success',
  rejected: 'danger',
}

export const ABSENCE_STATUS_LABELS: Record<Absence['status'], string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
}

export const ABSENCE_TYPE_LABELS: Record<Absence['absenceType'], string> = {
  sick: 'Arrêt maladie',
  vacation: 'Congés payés',
  family_event: 'Événement familial',
  training: 'Congé formation',
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

// ─── Caregiver ───────────────────────────────────────────────────────────────

export const CAREGIVER_LEGAL_STATUS_LABELS: Record<CaregiverLegalStatus, string> = {
  none: 'Aucun statut particulier',
  tutor: 'Tuteur',
  curator: 'Curateur',
  safeguard_justice: 'Sauvegarde de justice',
  family_caregiver: 'Aidant familial reconnu',
}

export const CAREGIVER_LEGAL_STATUS_OPTIONS: { value: CaregiverLegalStatus; label: string }[] =
  (Object.entries(CAREGIVER_LEGAL_STATUS_LABELS) as [CaregiverLegalStatus, string][])
    .map(([value, label]) => ({ value, label }))

// Libellés conformes au vocabulaire IDCC 3239 (cf. Article 2 — situations PCH)
export const CAREGIVER_CONTRACT_STATUS_LABELS: Record<CaregiverContractStatus, string> = {
  active: 'PCH — Maintient une activité pro',
  full_time: 'PCH — A cessé son activité pro',
  voluntary: 'Bénévole',
}
