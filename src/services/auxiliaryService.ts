import { supabase } from '@/lib/supabase/client'
import type { Contract, Employee, Profile } from '@/types'

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
      employee:profiles!employee_id(
        id,
        first_name,
        last_name,
        phone,
        avatar_url
      ),
      employee_profile:employees!employee_id(
        qualifications
      )
    `)
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur récupération auxiliaires:', error)
    return []
  }

  return (data || []).map(mapAuxiliaryFromDb)
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
      employee:profiles!employee_id(
        id,
        first_name,
        last_name,
        phone,
        avatar_url
      ),
      employee_profile:employees!employee_id(
        qualifications
      )
    `)
    .eq('employer_id', employerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur récupération auxiliaires actifs:', error)
    return []
  }

  return (data || []).map(mapAuxiliaryFromDb)
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
      employee:profiles!employee_id(*),
      employee_profile:employees!employee_id(*)
    `)
    .eq('id', contractId)
    .single()

  if (contractError || !contractData) {
    console.error('Erreur récupération détails auxiliaire:', contractError)
    return null
  }

  // Compter les interventions
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const { data: shiftsData } = await supabase
    .from('shifts')
    .select('id, date, start_time, end_time, break_duration, status')
    .eq('contract_id', contractId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shifts = (shiftsData || []) as any[]
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contractAny = contractData as any
  return {
    profile: mapProfileFromDb(contractAny.employee),
    employee: mapEmployeeFromDb(contractAny.employee_profile),
    contract: mapContractFromDb(contractAny),
    stats: {
      totalShifts,
      upcomingShifts,
      hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    },
  }
}

/**
 * Crée un nouveau contrat avec un auxiliaire
 */
export async function createContract(
  employerId: string,
  employeeId: string,
  contractData: {
    contractType: 'CDI' | 'CDD'
    startDate: Date
    endDate?: Date
    weeklyHours: number
    hourlyRate: number
  }
): Promise<Contract | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contracts')
    .insert({
      employer_id: employerId,
      employee_id: employeeId,
      contract_type: contractData.contractType,
      start_date: contractData.startDate.toISOString().split('T')[0],
      end_date: contractData.endDate?.toISOString().split('T')[0] || null,
      weekly_hours: contractData.weeklyHours,
      hourly_rate: contractData.hourlyRate,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('Erreur création contrat:', error)
    throw new Error(
      error.code === '23505'
        ? 'Un contrat actif existe déjà avec cet auxiliaire'
        : 'Erreur lors de la création du contrat'
    )
  }

  return mapContractFromDb(data)
}

/**
 * Met à jour un contrat existant
 */
export async function updateContract(
  contractId: string,
  updates: Partial<{
    weeklyHours: number
    hourlyRate: number
    status: 'active' | 'terminated' | 'suspended'
    endDate: Date
  }>
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {}

  if (updates.weeklyHours !== undefined) {
    dbUpdates.weekly_hours = updates.weeklyHours
  }
  if (updates.hourlyRate !== undefined) {
    dbUpdates.hourly_rate = updates.hourlyRate
  }
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status
  }
  if (updates.endDate !== undefined) {
    dbUpdates.end_date = updates.endDate.toISOString().split('T')[0]
  }

  dbUpdates.updated_at = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('contracts')
    .update(dbUpdates)
    .eq('id', contractId)

  if (error) {
    console.error('Erreur mise à jour contrat:', error)
    throw new Error('Erreur lors de la mise à jour du contrat')
  }
}

/**
 * Termine un contrat (soft delete)
 */
export async function terminateContract(
  contractId: string,
  endDate: Date = new Date()
): Promise<void> {
  await updateContract(contractId, {
    status: 'terminated',
    endDate,
  })
}

/**
 * Recherche un auxiliaire par email pour l'ajouter
 */
export async function searchAuxiliaryByEmail(
  email: string
): Promise<{ id: string; firstName: string; lastName: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('email', email.toLowerCase().trim())
    .eq('role', 'employee')
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
  }
}

// Fonctions de mapping

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAuxiliaryFromDb(data: any): AuxiliarySummary {
  return {
    id: data.employee?.id || '',
    firstName: data.employee?.first_name || '',
    lastName: data.employee?.last_name || '',
    phone: data.employee?.phone || undefined,
    avatarUrl: data.employee?.avatar_url || undefined,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContractFromDb(data: any): Contract {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfileFromDb(data: any): Profile {
  return {
    id: data.id,
    role: data.role,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    avatarUrl: data.avatar_url,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEmployeeFromDb(data: any): Employee {
  return {
    profileId: data.profile_id,
    qualifications: data.qualifications || [],
    languages: data.languages || [],
    maxDistanceKm: data.max_distance_km,
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
