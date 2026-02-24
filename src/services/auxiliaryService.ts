import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { Contract, Employee, Profile } from '@/types'
import type {
  ContractDbRow,
  ContractWithEmployeeDbRow,
  ProfileDbRow,
  EmployeeDbRow,
  ShiftDbRow,
} from '@/types/database'

// Re-export contract functions for backward compatibility
export {
  createContract,
  updateContract,
  terminateContract,
  suspendContract,
  resumeContract,
  searchEmployeeByEmail as searchAuxiliaryByEmail,
} from '@/services/contractService'

// Type complet pour un auxiliaire avec son profil et contrat
export interface AuxiliaryWithDetails {
  profile: Profile
  employee: Employee
  contract: Contract
  stats: {
    totalShifts: number
    upcomingShifts: number
    hoursThisMonth: number
  }
}

// Type simplifié pour la liste
export interface AuxiliarySummary {
  id: string
  firstName: string
  lastName: string
  phone?: string
  avatarUrl?: string
  qualifications: string[]
  contractType: 'CDI' | 'CDD'
  contractStatus: 'active' | 'terminated' | 'suspended'
  weeklyHours: number
  hourlyRate: number
  contractStartDate: Date
  contractEndDate?: Date
  contractId: string
}

/**
 * Récupère tous les auxiliaires (employés avec contrat) pour un employeur
 */
export async function getAuxiliariesForEmployer(
  employerId: string
): Promise<AuxiliarySummary[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_type,
      status,
      weekly_hours,
      hourly_rate,
      start_date,
      end_date,
      employee_id,
      employee_profile:employees!employee_id(
        profile_id,
        qualifications,
        profile:profiles!profile_id(
          id,
          first_name,
          last_name,
          phone,
          avatar_url
        )
      )
    `)
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Erreur récupération auxiliaires:', error)
    return []
  }

  return (data || []).map((row) => mapAuxiliaryFromDb(row as ContractWithEmployeeDbRow))
}

/**
 * Récupère les auxiliaires actifs uniquement
 */
export async function getActiveAuxiliariesForEmployer(
  employerId: string
): Promise<AuxiliarySummary[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_type,
      status,
      weekly_hours,
      hourly_rate,
      start_date,
      end_date,
      employee_id,
      employee_profile:employees!employee_id(
        profile_id,
        qualifications,
        profile:profiles!profile_id(
          id,
          first_name,
          last_name,
          phone,
          avatar_url
        )
      )
    `)
    .eq('employer_id', employerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Erreur récupération auxiliaires actifs:', error)
    return []
  }

  return (data || []).map((row) => mapAuxiliaryFromDb(row as ContractWithEmployeeDbRow))
}

/**
 * Récupère les détails complets d'un auxiliaire
 */
export async function getAuxiliaryDetails(
  contractId: string
): Promise<AuxiliaryWithDetails | null> {
  const { data: contractData, error: contractError } = await supabase
    .from('contracts')
    .select(`
      *,
      employee_profile:employees!employee_id(
        *,
        profile:profiles!profile_id(*)
      )
    `)
    .eq('id', contractId)
    .single()

  if (contractError || !contractData) {
    logger.error('Erreur récupération détails auxiliaire:', contractError)
    return null
  }

  // Compter les interventions
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const { data: shiftsData } = await supabase
    .from('shifts')
    .select('id, date, start_time, end_time, break_duration, status')
    .eq('contract_id', contractId)

  const shifts = (shiftsData || []) as ShiftDbRow[]
  const totalShifts = shifts.length
  const upcomingShifts = shifts.filter(
    (s) => new Date(s.date) >= now && s.status === 'planned'
  ).length

  // Calculer les heures du mois
  const hoursThisMonth = shifts
    .filter((s) => {
      const shiftDate = new Date(s.date)
      return (
        shiftDate >= startOfMonth &&
        shiftDate <= now &&
        s.status === 'completed'
      )
    })
    .reduce((total, s) => {
      const [startH, startM] = s.start_time.split(':').map(Number)
      const [endH, endM] = s.end_time.split(':').map(Number)
      const hours = endH - startH + (endM - startM) / 60 - (s.break_duration || 0) / 60
      return total + hours
    }, 0)

  const contractRow = contractData as ContractWithEmployeeDbRow
  return {
    profile: mapProfileFromDb(contractRow.employee_profile?.profile as ProfileDbRow),
    employee: mapEmployeeFromDb(contractRow.employee_profile as EmployeeDbRow),
    contract: mapContractFromDb(contractRow),
    stats: {
      totalShifts,
      upcomingShifts,
      hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    },
  }
}

// Fonctions de mapping

function mapAuxiliaryFromDb(data: ContractWithEmployeeDbRow): AuxiliarySummary {
  const profile = data.employee_profile?.profile
  return {
    id: profile?.id || data.employee_id || '',
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    phone: profile?.phone || undefined,
    avatarUrl: profile?.avatar_url || undefined,
    qualifications: data.employee_profile?.qualifications || [],
    contractType: data.contract_type,
    contractStatus: data.status,
    weeklyHours: data.weekly_hours,
    hourlyRate: data.hourly_rate,
    contractStartDate: new Date(data.start_date),
    contractEndDate: data.end_date ? new Date(data.end_date) : undefined,
    contractId: data.id,
  }
}

function mapContractFromDb(data: ContractDbRow): Contract {
  return {
    id: data.id,
    employerId: data.employer_id,
    employeeId: data.employee_id,
    contractType: data.contract_type,
    startDate: new Date(data.start_date),
    endDate: data.end_date ? new Date(data.end_date) : undefined,
    weeklyHours: data.weekly_hours,
    hourlyRate: data.hourly_rate,
    status: data.status,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

function mapProfileFromDb(data: ProfileDbRow | undefined): Profile {
  if (!data) {
    return {
      id: '',
      role: 'employee',
      firstName: '',
      lastName: '',
      email: '',
      phone: undefined,
      avatarUrl: undefined,
      accessibilitySettings: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReaderOptimized: false,
        voiceControlEnabled: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  return {
    id: data.id,
    role: data.role,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email || '',
    phone: data.phone || undefined,
    avatarUrl: data.avatar_url || undefined,
    accessibilitySettings: data.accessibility_settings || {
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      screenReaderOptimized: false,
      voiceControlEnabled: false,
    },
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

function mapEmployeeFromDb(data: EmployeeDbRow | undefined): Employee {
  if (!data) {
    return {
      profileId: '',
      qualifications: [],
      languages: [],
      maxDistanceKm: undefined,
      availabilityTemplate: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      },
    }
  }

  return {
    profileId: data.profile_id,
    qualifications: data.qualifications || [],
    languages: data.languages || [],
    maxDistanceKm: data.max_distance_km || undefined,
    availabilityTemplate: data.availability_template || {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    },
  }
}
