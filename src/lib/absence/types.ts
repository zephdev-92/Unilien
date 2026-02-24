/**
 * Types pour le module de gestion des absences
 * Convention Collective IDCC 3239 - Particuliers Employeurs
 */

import type { FamilyEventType } from '@/types'

// Résultat de validation d'une demande d'absence
export interface AbsenceValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// Demande d'absence pour validation
export interface AbsenceRequest {
  employeeId: string
  absenceType: string
  startDate: Date
  endDate: Date
  familyEventType?: FamilyEventType
}

// Absence existante (simplifiée pour comparaison)
export interface ExistingAbsence {
  id: string
  startDate: Date
  endDate: Date
  status: 'pending' | 'approved' | 'rejected'
}

// Solde de congés pour validation
export interface LeaveBalanceForValidation {
  acquiredDays: number
  takenDays: number
  adjustmentDays: number
}

// Jours accordés par événement familial (IDCC 3239 Art. 12)
export const FAMILY_EVENT_DAYS: Record<FamilyEventType, number> = {
  marriage: 4,
  pacs: 4,
  birth: 3,
  adoption: 3,
  death_spouse: 3,
  death_parent: 3,
  death_child: 5,
  death_sibling: 3,
  death_in_law: 3,
  child_marriage: 1,
  disability_announcement: 2,
}

// Labels français pour les événements familiaux
export const FAMILY_EVENT_LABELS: Record<FamilyEventType, string> = {
  marriage: 'Mariage',
  pacs: 'PACS',
  birth: 'Naissance',
  adoption: 'Adoption',
  death_spouse: 'Décès du conjoint',
  death_parent: 'Décès d\'un parent',
  death_child: 'Décès d\'un enfant',
  death_sibling: 'Décès d\'un frère/sœur',
  death_in_law: 'Décès d\'un beau-parent',
  child_marriage: 'Mariage d\'un enfant',
  disability_announcement: 'Annonce handicap d\'un enfant',
}
