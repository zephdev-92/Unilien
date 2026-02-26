import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { Contract } from '@/types'
import type {
  ContractDbRow,
  ContractWithEmployeeDbRow,
  ContractWithEmployerDbRow,
} from '@/types/database'
import {
  createContractCreatedNotification,
  createContractTerminatedNotification,
} from '@/services/notificationService'
import { getProfileName } from '@/services/profileService'
import { calculateAcquiredFromMonths, getLeaveYear } from '@/lib/absence'
import { initializeLeaveBalanceWithOverride } from '@/services/leaveBalanceService'

export interface ContractWithEmployee extends Contract {
  employee?: {
    firstName: string
    lastName: string
  }
}

interface ContractCreateData {
  contractType: 'CDI' | 'CDD'
  startDate: Date
  endDate?: Date
  weeklyHours: number
  hourlyRate: number
  // Reprise historique congés (contrat antérieur)
  initialMonthsWorked?: number
  initialTakenDays?: number
}

interface ContractUpdateData {
  weeklyHours?: number
  hourlyRate?: number
  status?: 'active' | 'terminated' | 'suspended'
  endDate?: Date
}

// ============================================================
// READ OPERATIONS
// ============================================================

export async function getContractById(contractId: string): Promise<Contract | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single()

  if (error) {
    logger.error('Erreur récupération contrat:', error)
    return null
  }

  return mapContractFromDb(data as ContractDbRow)
}

export async function getContractsForEmployer(
  employerId: string
): Promise<ContractWithEmployee[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      employee_profile:employees!employee_id(
        profile:profiles!profile_id(
          first_name,
          last_name
        )
      )
    `)
    .eq('employer_id', employerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Erreur récupération contrats:', error)
    return []
  }

  return (data || []).map((row) => mapContractWithEmployeeFromDb(row as ContractWithEmployeeDbRow))
}

export async function getContractsForEmployee(
  employeeId: string
): Promise<ContractWithEmployee[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      employer_profile:employers!employer_id(
        profile:profiles!profile_id(
          first_name,
          last_name
        )
      )
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Erreur récupération contrats employé:', error)
    return []
  }

  return (data || []).map((row) => {
    const contract = row as ContractWithEmployerDbRow
    const mapped = mapContractFromDb(contract)
    const employerProfile = contract.employer_profile?.profile
    return {
      ...mapped,
      employee: employerProfile
        ? {
            firstName: employerProfile.first_name || '',
            lastName: employerProfile.last_name || '',
          }
        : undefined,
    }
  })
}

export async function getActiveContractsCount(employerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('employer_id', employerId)
    .eq('status', 'active')

  if (error) {
    logger.error('Erreur comptage contrats:', error)
    return 0
  }

  return count || 0
}

// ============================================================
// CREATE OPERATIONS
// ============================================================

export async function createContract(
  employerId: string,
  employeeId: string,
  contractData: ContractCreateData
): Promise<Contract> {
  const { data, error } = await supabase
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
    logger.error('Erreur création contrat:', error)
    if (error.code === '23505') {
      throw new Error('Un contrat actif existe déjà avec cet auxiliaire')
    }
    if (error.code === '23503') {
      throw new Error(
        'L\'auxiliaire n\'a pas encore complété son profil. ' +
        'Demandez-lui de se connecter et de remplir ses informations dans la page Profil.'
      )
    }
    throw new Error('Erreur lors de la création du contrat')
  }

  // Initialiser le solde de congés si reprise historique fournie
  if (contractData.initialMonthsWorked !== undefined && contractData.initialMonthsWorked > 0) {
    try {
      const leaveYear = getLeaveYear(new Date())
      const acquiredDays = calculateAcquiredFromMonths(contractData.initialMonthsWorked)
      await initializeLeaveBalanceWithOverride(
        data.id,
        employeeId,
        employerId,
        leaveYear,
        acquiredDays,
        contractData.initialTakenDays || 0
      )
    } catch (err) {
      logger.error('Erreur initialisation reprise congés:', err)
      // Non-bloquant : le contrat est créé même si la reprise échoue
    }
  }

  // Notifier l'auxiliaire du nouveau contrat
  try {
    const employerName = await getProfileName(employerId)
    await createContractCreatedNotification(
      employeeId,
      employerName,
      contractData.contractType
    )
  } catch (err) {
    logger.error('Erreur notification nouveau contrat:', err)
  }

  return mapContractFromDb(data as ContractDbRow)
}

// ============================================================
// UPDATE OPERATIONS
// ============================================================

export async function updateContract(
  contractId: string,
  updates: ContractUpdateData
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

  const { error } = await supabase
    .from('contracts')
    .update(dbUpdates)
    .eq('id', contractId)

  if (error) {
    logger.error('Erreur mise à jour contrat:', error)
    throw new Error('Erreur lors de la mise à jour du contrat')
  }
}

// ============================================================
// STATUS MANAGEMENT
// ============================================================

/**
 * Termine un contrat (soft delete)
 */
export async function terminateContract(
  contractId: string,
  endDate: Date = new Date()
): Promise<void> {
  // Récupérer les infos du contrat avant terminaison pour la notification
  let employeeId: string | null = null
  let employerName = 'Utilisateur'

  try {
    const { data: contract } = await supabase
      .from('contracts')
      .select('employee_id, employer_id')
      .eq('id', contractId)
      .single()

    if (contract) {
      employeeId = contract.employee_id
      employerName = await getProfileName(contract.employer_id)
    }
  } catch {
    // Fallback silencieux
  }

  await updateContract(contractId, {
    status: 'terminated',
    endDate,
  })

  // Notifier l'auxiliaire de la fin de contrat
  if (employeeId) {
    try {
      await createContractTerminatedNotification(employeeId, employerName)
    } catch (err) {
      logger.error('Erreur notification fin contrat:', err)
    }
  }
}

/**
 * Suspend un contrat temporairement
 */
export async function suspendContract(contractId: string): Promise<void> {
  const { data: contract } = await supabase
    .from('contracts')
    .select('status')
    .eq('id', contractId)
    .single()

  if (contract?.status !== 'active') {
    throw new Error('Seul un contrat actif peut être suspendu')
  }

  await updateContract(contractId, { status: 'suspended' })
}

/**
 * Réactive un contrat suspendu
 */
export async function resumeContract(contractId: string): Promise<void> {
  const { data: contract } = await supabase
    .from('contracts')
    .select('status')
    .eq('id', contractId)
    .single()

  if (contract?.status !== 'suspended') {
    throw new Error('Seul un contrat suspendu peut être réactivé')
  }

  await updateContract(contractId, { status: 'active' })
}

// ============================================================
// SEARCH
// ============================================================

/**
 * Recherche un auxiliaire par email pour l'ajouter
 */
export async function searchEmployeeByEmail(
  email: string
): Promise<{ id: string; firstName: string; lastName: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('email', email.toLowerCase().trim())
    .eq('role', 'employee')
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
  }
}

/**
 * Vérifie si un contrat actif existe entre un employeur et un employé
 */
/**
 * Retourne l'id de l'employeur associé à un employé via son contrat actif.
 * Utilisé par `useEmployerResolution` pour les utilisateurs de rôle `employee`.
 *
 * @returns L'`employer_id` du contrat actif, ou `null` si aucun contrat trouvé.
 */
export async function getActiveEmployerIdForEmployee(
  employeeId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('employer_id')
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('Erreur résolution employeur (contrat actif):', error)
    return null
  }

  return data?.employer_id ?? null
}

export async function hasActiveContract(
  employerId: string,
  employeeId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('employer_id', employerId)
    .eq('employee_id', employeeId)
    .eq('status', 'active')

  if (error) {
    logger.error('Erreur vérification contrat:', error)
    return false
  }

  return (count || 0) > 0
}

// ============================================================
// MAPPING FUNCTIONS
// ============================================================

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
    pasRate: data.pas_rate ?? 0,
    status: data.status,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

function mapContractWithEmployeeFromDb(data: ContractWithEmployeeDbRow): ContractWithEmployee {
  return {
    ...mapContractFromDb(data),
    employee: data.employee_profile?.profile
      ? {
          firstName: data.employee_profile.profile.first_name || '',
          lastName: data.employee_profile.profile.last_name || '',
        }
      : undefined,
  }
}
