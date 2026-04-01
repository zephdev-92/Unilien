/**
 * Types pour les réponses de la base de données Supabase
 * Ces types représentent la structure des données telles qu'elles arrivent de la DB
 */

import type { Attachment, CaregiverPermissions, AccessibilitySettings, ComputedPay } from '@/types'

// ============================================================
// PROFILE
// ============================================================

export interface ProfileDbRow {
  id: string
  role: 'employer' | 'employee' | 'caregiver'
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  accessibility_settings: AccessibilitySettings | null
  created_at: string
  updated_at: string
}

// ============================================================
// EMPLOYEE
// ============================================================

export interface DriversLicenseDb {
  has_license: boolean
  license_type?: 'B' | 'A' | 'C' | 'D' | 'BE' | 'other'
  has_vehicle: boolean
}

export interface EmployeeDbRow {
  profile_id: string
  qualifications: string[] | null
  languages: string[] | null
  max_distance_km: number | null
  availability_template: Record<string, string[]> | null
  drivers_license: DriversLicenseDb | null
  address: AddressDb | null
  date_of_birth: string | null
  social_security_number: string | null
  iban: string | null
  emergency_contacts: Array<{ name: string; phone: string; relationship: string }> | null
  profile?: ProfileDbRow
}

// ============================================================
// EMPLOYER
// ============================================================

export interface EmployerDbRow {
  profile_id: string
  address: AddressDb | null
  cesu_number: string | null
  pch_beneficiary: boolean | null
  pch_monthly_amount: number | null
  pch_type: string | null
  pch_monthly_hours: number | null
  emergency_contacts: Array<{ name: string; phone: string; relationship: string }> | null
}

export interface EmployerHealthDataDbRow {
  profile_id: string
  handicap_type: string | null
  handicap_name: string | null
  specific_needs: string | null
  created_at: string
  updated_at: string
}

export interface UserConsentDbRow {
  id: string
  user_id: string
  consent_type: 'health_data' | 'cookie'
  granted_at: string
  revoked_at: string | null
  ip_address: string | null
  user_agent: string | null
}

export interface AuditLogDbRow {
  id: string
  user_id: string
  action: 'read' | 'create' | 'update' | 'delete' | 'grant_consent' | 'revoke_consent'
  resource: string
  resource_id: string | null
  fields_accessed: string[] | null
  created_at: string
}

export interface AddressDb {
  street?: string
  city?: string
  postalCode?: string
}

// ============================================================
// CONTRACT
// ============================================================

export type ContractCategory = 'employment' | 'caregiver_pch'
export type CaregiverContractStatus = 'active' | 'full_time' | 'voluntary'

export interface ContractDbRow {
  id: string
  employer_id: string
  employee_id: string | null
  caregiver_id: string | null
  contract_category: ContractCategory
  contract_type: 'CDI' | 'CDD'
  start_date: string
  end_date: string | null
  weekly_hours: number
  hourly_rate: number
  pas_rate: number
  pch_hourly_rate: number | null
  caregiver_status: CaregiverContractStatus | null
  status: 'active' | 'terminated' | 'suspended'
  created_at: string
  updated_at: string
}

export interface ContractWithEmployeeDbRow extends ContractDbRow {
  employee_profile?: {
    profile_id?: string
    qualifications?: string[]
    profile?: {
      id?: string
      first_name?: string
      last_name?: string
      phone?: string
      avatar_url?: string
    }
  }
}

export interface ContractWithCaregiverDbRow extends ContractDbRow {
  caregiver_profile?: {
    first_name?: string
    last_name?: string
  }
}

export interface ContractWithEmployerDbRow extends ContractDbRow {
  employer_profile?: {
    profile?: {
      first_name?: string
      last_name?: string
    }
  }
}

// ============================================================
// SHIFT
// ============================================================

export type ShiftType = 'effective' | 'presence_day' | 'presence_night' | 'guard_24h'

export interface GuardSegmentDb {
  startTime: string   // "HH:mm"
  type: 'effective' | 'presence_day' | 'presence_night'
  breakMinutes?: number
}

export interface ShiftDbRow {
  id: string
  contract_id: string
  date: string
  start_time: string
  end_time: string
  break_duration: number | null
  tasks: string[] | null
  notes: string | null
  has_night_action: boolean | null // true = acte de nuit (majoration 20%), null/false = présence seule
  shift_type: ShiftType // Type d'intervention (défaut: 'effective')
  night_interventions_count: number | null // Nombre d'interventions pendant présence nuit
  is_requalified: boolean // Requalifié en travail effectif si >= 4 interventions nuit
  effective_hours: number | null // Heures effectives après conversion (2/3 pour présence jour)
  guard_segments: GuardSegmentDb[] | null // Garde 24h : N segments libres [{startTime, type, breakMinutes?}]
  computed_pay: ComputedPay | null
  status: 'planned' | 'completed' | 'cancelled' | 'absent'
  validated_by_employer: boolean
  validated_by_employee: boolean
  late_entry: boolean | null
  created_at: string
  updated_at: string
}

// ============================================================
// ABSENCE
// ============================================================

export interface AbsenceDbRow {
  id: string
  employee_id: string
  absence_type: 'sick' | 'vacation' | 'family_event' | 'training' | 'unavailable' | 'emergency'
  start_date: string
  end_date: string
  reason: string | null
  justification_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  business_days_count: number | null
  justification_due_date: string | null
  family_event_type: string | null
  leave_year: string | null
  created_at: string
}

// ============================================================
// LEAVE BALANCE
// ============================================================

export interface LeaveBalanceDbRow {
  id: string
  employee_id: string
  employer_id: string
  contract_id: string
  leave_year: string
  acquired_days: number
  taken_days: number
  adjustment_days: number
  is_manual_init: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// LIAISON MESSAGE
// ============================================================

export interface ConversationDbRow {
  id: string
  employer_id: string
  type: 'team' | 'private'
  participant_ids: string[]
  created_at: string
  updated_at: string
}

export interface LiaisonMessageDbRow {
  id: string
  employer_id: string
  conversation_id: string | null
  sender_id: string
  sender_role: 'employer' | 'employee' | 'caregiver'
  content: string
  audio_url: string | null
  attachments: Attachment[] | null
  is_edited: boolean
  read_by: string[] | null
  created_at: string
  updated_at: string
  sender?: {
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

// ============================================================
// LOG ENTRY
// ============================================================

export interface LogEntryDbRow {
  id: string
  employer_id: string
  author_id: string
  author_role: 'employer' | 'employee' | 'caregiver'
  type: string
  importance: string
  content: string
  audio_url: string | null
  attachments: Attachment[] | null
  recipient_id: string | null
  read_by: string[] | null
  created_at: string
  updated_at: string
  author?: {
    first_name: string
    last_name: string
  }
}

// ============================================================
// NOTIFICATION
// ============================================================

/** Champs possibles dans le payload JSON `data` d'une notification */
export interface NotificationData {
  shiftId?: string
  shiftDate?: string
  startTime?: string
  employerName?: string
  employeeName?: string
  contractType?: string
  senderName?: string
  messagePreview?: string
  authorName?: string
  contentPreview?: string
  absenceType?: string
  startDate?: string
  endDate?: string
  status?: string
}

export interface NotificationDbRow {
  id: string
  user_id: string
  type: string
  priority: string | null
  title: string
  message: string
  data: NotificationData | null
  action_url: string | null
  is_read: boolean
  is_dismissed: boolean
  created_at: string
  read_at: string | null
  expires_at: string | null
}

// ============================================================
// CAREGIVER
// ============================================================

export interface CaregiverDbRow {
  profile_id: string
  employer_id: string
  permissions: CaregiverPermissions | null
  permissions_locked: boolean
  relationship: string | null
  relationship_details: string | null
  legal_status: string | null
  address: AddressDb | null
  emergency_phone: string | null
  availability_hours: string | null
  can_replace_employer: boolean
  created_at: string
  profile?: {
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    avatar_url: string | null
  }
}

// ============================================================
// PAYSLIP
// ============================================================

export interface PayslipDbRow {
  id: string
  employer_id: string
  employee_id: string
  contract_id: string
  year: number
  month: number
  period_label: string
  gross_pay: number
  net_pay: number
  total_hours: number
  pas_rate: number
  is_exempt_patronal_ss: boolean
  storage_path: string | null
  storage_url: string | null
  generated_at: string
  created_at: string
}

// ============================================================
// CESU DECLARATION
// ============================================================

export interface CesuDeclarationDbRow {
  id: string
  employer_id: string
  year: number
  month: number
  period_label: string
  total_employees: number
  total_hours: number
  total_gross_pay: number
  declaration_data: Record<string, unknown>
  storage_path: string | null
  generated_at: string
  created_at: string
}

// ============================================================
// INTERVENTION SETTINGS
// ============================================================

export interface ShoppingItemDb {
  name: string
  brand: string
  quantity: number
  note: string
}

export interface InterventionSettingsDbRow {
  profile_id: string
  default_tasks: string[]
  custom_tasks: string[]
  shopping_list: ShoppingItemDb[]
  created_at: string
  updated_at: string
}

export interface ShoppingArticleHistoryDbRow {
  id: string
  profile_id: string
  name: string
  brand: string
  use_count: number
  last_used_at: string
}

// ============================================================
// CONVENTION SETTINGS
// ============================================================

export interface ConventionSettingsDbRow {
  profile_id: string
  rule_break: boolean
  rule_daily_max: boolean
  rule_overtime: boolean
  rule_night: boolean
  maj_dimanche: number
  maj_ferie: number
  maj_nuit: number
  maj_supp: number
  created_at: string
  updated_at: string
}