/**
 * Types pour les réponses de la base de données Supabase
 * Ces types représentent la structure des données telles qu'elles arrivent de la DB
 */

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
  accessibility_settings: Record<string, boolean> | null
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
  profile?: ProfileDbRow
}

// ============================================================
// EMPLOYER
// ============================================================

export interface EmployerDbRow {
  profile_id: string
  address: AddressDb | null
  cesu_number: string | null
}

export interface AddressDb {
  street?: string
  city?: string
  postalCode?: string
}

// ============================================================
// CONTRACT
// ============================================================

export interface ContractDbRow {
  id: string
  employer_id: string
  employee_id: string
  contract_type: 'CDI' | 'CDD'
  start_date: string
  end_date: string | null
  weekly_hours: number
  hourly_rate: number
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
  status: 'planned' | 'completed' | 'cancelled' | 'absent'
  created_at: string
  updated_at: string
}

// ============================================================
// ABSENCE
// ============================================================

export interface AbsenceDbRow {
  id: string
  employee_id: string
  absence_type: 'sick' | 'vacation' | 'training' | 'unavailable' | 'emergency'
  start_date: string
  end_date: string
  reason: string | null
  justification_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

// ============================================================
// LIAISON MESSAGE
// ============================================================

export interface LiaisonMessageDbRow {
  id: string
  employer_id: string
  sender_id: string
  sender_role: 'employer' | 'employee' | 'caregiver'
  content: string
  audio_url: string | null
  attachments: unknown[] | null
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
  attachments: unknown[] | null
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

export interface NotificationDbRow {
  id: string
  user_id: string
  type: string
  priority: string | null
  title: string
  message: string
  data: Record<string, unknown> | null
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
  permissions: Record<string, boolean> | null
  permissions_locked: boolean
  relationship: string | null
  relationship_details: string | null
  legal_status: string | null
  address: Record<string, unknown> | null
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
