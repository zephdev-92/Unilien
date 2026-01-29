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

export interface EmployeeDbRow {
  profile_id: string
  qualifications: string[] | null
  languages: string[] | null
  max_distance_km: number | null
  availability_template: Record<string, string[]> | null
  profile?: ProfileDbRow
}

// ============================================================
// EMPLOYER
// ============================================================

export interface EmployerDbRow {
  profile_id: string
  address: AddressDb | null
  cesu_number: string | null
  pajemploi_number: string | null
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
