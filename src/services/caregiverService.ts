import { supabase } from '@/lib/supabase/client'
import type { Caregiver, CaregiverPermissions, Shift } from '@/types'
import {
  getProfileName,
  createTeamMemberAddedNotification,
  createTeamMemberRemovedNotification,
} from '@/services/notificationService'

// ============================================
// CAREGIVER (profil aidant)
// ============================================

/**
 * Récupère le profil aidant d'un utilisateur
 */
export async function getCaregiver(profileId: string): Promise<Caregiver | null> {
  const { data, error } = await supabase
    .from('caregivers')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    console.error('Erreur récupération aidant:', error)
    return null
  }

  if (!data) return null

  return mapCaregiverFromDb(data)
}

/**
 * Récupère l'employeur associé à un aidant
 */
export async function getCaregiverEmployerId(profileId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('caregivers')
    .select('employer_id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error || !data) {
    console.error('Erreur récupération employeur de l\'aidant:', error)
    return null
  }

  return data.employer_id
}

/**
 * Récupère les permissions d'un aidant
 */
export async function getCaregiverPermissions(
  profileId: string
): Promise<CaregiverPermissions | null> {
  const caregiver = await getCaregiver(profileId)
  return caregiver?.permissions || null
}

/**
 * Récupère les shifts visibles par un aidant (basé sur l'employeur associé)
 */
export async function getShiftsForCaregiver(
  profileId: string,
  startDate: Date,
  endDate: Date
): Promise<Shift[]> {
  // D'abord récupérer l'employerId de l'aidant
  const employerId = await getCaregiverEmployerId(profileId)

  if (!employerId) {
    console.warn('Aucun employeur associé à cet aidant')
    return []
  }

  // Vérifier que l'aidant a la permission de voir le planning
  const permissions = await getCaregiverPermissions(profileId)
  if (!permissions?.canViewPlanning) {
    console.warn('Aidant sans permission de voir le planning')
    return []
  }

  // Récupérer les shifts de l'employeur
  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      contract:contracts!inner(
        id,
        employer_id,
        employee_id
      )
    `)
    .eq('contract.employer_id', employerId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Erreur récupération shifts pour aidant:', error)
    return []
  }

  return (data || []).map(mapShiftFromDb)
}

/**
 * Récupère les prochains shifts pour un aidant (7 prochains jours)
 */
export async function getUpcomingShiftsForCaregiver(
  profileId: string,
  limit: number = 5
): Promise<Shift[]> {
  const today = new Date()
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  const shifts = await getShiftsForCaregiver(profileId, today, nextWeek)

  // Filtrer les shifts futurs et limiter
  const now = new Date()
  return shifts
    .filter((shift) => {
      const shiftDate = new Date(shift.date)
      shiftDate.setHours(
        parseInt(shift.startTime.split(':')[0]),
        parseInt(shift.startTime.split(':')[1])
      )
      return shiftDate >= now
    })
    .slice(0, limit)
}

/**
 * Créer ou mettre à jour un profil aidant
 */
export async function upsertCaregiver(
  profileId: string,
  data: {
    employerId: string
    permissions: CaregiverPermissions
    relationship?: string
  }
): Promise<void> {
  const payload = {
    profile_id: profileId,
    employer_id: data.employerId,
    permissions: data.permissions,
    relationship: data.relationship || null,
  }

  const { error } = await supabase
    .from('caregivers')
    .upsert(payload, { onConflict: 'profile_id' })

  if (error) {
    console.error('Erreur création/mise à jour aidant:', error)
    throw new Error(error.message)
  }
}

/**
 * Met à jour les permissions d'un aidant
 */
export async function updateCaregiverPermissions(
  profileId: string,
  permissions: Partial<CaregiverPermissions>
): Promise<void> {
  // Récupérer les permissions actuelles
  const current = await getCaregiverPermissions(profileId)
  if (!current) {
    throw new Error('Aidant non trouvé')
  }

  const updatedPermissions = { ...current, ...permissions }

  const { error } = await supabase
    .from('caregivers')
    .update({ permissions: updatedPermissions })
    .eq('profile_id', profileId)

  if (error) {
    console.error('Erreur mise à jour permissions:', error)
    throw new Error(error.message)
  }
}

// ============================================
// EMPLOYER-SIDE CAREGIVER MANAGEMENT
// ============================================

/**
 * Type pour un aidant avec ses infos de profil
 */
export interface CaregiverWithProfile {
  profileId: string
  employerId: string
  permissions: CaregiverPermissions
  relationship?: string
  createdAt: Date
  profile: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    avatarUrl?: string
  }
}

/**
 * Récupère tous les aidants liés à un employeur
 */
export async function getCaregiversForEmployer(
  employerId: string
): Promise<CaregiverWithProfile[]> {
  const { data, error } = await supabase
    .from('caregivers')
    .select(`
      *,
      profile:profiles!profile_id(
        first_name,
        last_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur récupération aidants:', error)
    return []
  }

  return (data || []).map(mapCaregiverWithProfileFromDb)
}

/**
 * Recherche un utilisateur par email pour l'ajouter comme aidant
 */
export async function searchCaregiverByEmail(
  email: string
): Promise<{ profileId: string; firstName: string; lastName: string; email: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role')
    .eq('email', email.toLowerCase().trim())
    .eq('role', 'caregiver')
    .maybeSingle()

  if (error) {
    console.error('Erreur recherche aidant:', error)
    return null
  }

  if (!data) return null

  return {
    profileId: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
  }
}

/**
 * Ajoute un aidant à un employeur
 */
export async function addCaregiverToEmployer(
  employerId: string,
  caregiverProfileId: string,
  data: {
    relationship?: string
    permissions: CaregiverPermissions
  }
): Promise<void> {
  // Vérifier que l'aidant n'est pas déjà lié à cet employeur
  const existing = await supabase
    .from('caregivers')
    .select('profile_id')
    .eq('profile_id', caregiverProfileId)
    .eq('employer_id', employerId)
    .maybeSingle()

  if (existing.data) {
    throw new Error('Cet aidant est déjà lié à votre compte.')
  }

  // Vérifier que l'utilisateur est bien un aidant
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', caregiverProfileId)
    .single()

  if (profileError || !profile) {
    throw new Error('Profil utilisateur non trouvé.')
  }

  if (profile.role !== 'caregiver') {
    throw new Error('Cet utilisateur n\'est pas enregistré comme aidant.')
  }

  // Créer le lien aidant-employeur
  const { error } = await supabase
    .from('caregivers')
    .insert({
      profile_id: caregiverProfileId,
      employer_id: employerId,
      relationship: data.relationship || null,
      permissions: data.permissions,
    })

  if (error) {
    console.error('Erreur ajout aidant:', error)
    throw new Error('Erreur lors de l\'ajout de l\'aidant.')
  }

  // Notifier l'aidant ajouté
  try {
    const employerName = await getProfileName(employerId)
    await createTeamMemberAddedNotification(caregiverProfileId, employerName)
  } catch (err) {
    console.error('Erreur notification ajout aidant:', err)
  }
}

/**
 * Met à jour un aidant (permissions et relation)
 */
export async function updateCaregiver(
  caregiverProfileId: string,
  employerId: string,
  data: {
    relationship?: string
    permissions: CaregiverPermissions
  }
): Promise<void> {
  const { error } = await supabase
    .from('caregivers')
    .update({
      relationship: data.relationship || null,
      permissions: data.permissions,
    })
    .eq('profile_id', caregiverProfileId)
    .eq('employer_id', employerId)

  if (error) {
    console.error('Erreur mise à jour aidant:', error)
    throw new Error('Erreur lors de la mise à jour de l\'aidant.')
  }
}

/**
 * Supprime le lien entre un aidant et un employeur
 */
export async function removeCaregiverFromEmployer(
  caregiverProfileId: string,
  employerId: string
): Promise<void> {
  // Récupérer le nom de l'employeur avant suppression
  let employerName = 'Utilisateur'
  try {
    employerName = await getProfileName(employerId)
  } catch {
    // Fallback silencieux
  }

  const { error } = await supabase
    .from('caregivers')
    .delete()
    .eq('profile_id', caregiverProfileId)
    .eq('employer_id', employerId)

  if (error) {
    console.error('Erreur suppression aidant:', error)
    throw new Error('Erreur lors de la suppression de l\'aidant.')
  }

  // Notifier l'aidant retiré
  try {
    await createTeamMemberRemovedNotification(caregiverProfileId, employerName)
  } catch (err) {
    console.error('Erreur notification retrait aidant:', err)
  }
}

// ============================================
// Mappers
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCaregiverWithProfileFromDb(data: any): CaregiverWithProfile {
  return {
    profileId: data.profile_id,
    employerId: data.employer_id,
    permissions: data.permissions || {
      canViewPlanning: false,
      canEditPlanning: false,
      canViewLiaison: false,
      canWriteLiaison: false,
      canManageTeam: false,
      canExportData: false,
    },
    relationship: data.relationship || undefined,
    createdAt: new Date(data.created_at),
    profile: {
      firstName: data.profile?.first_name || '',
      lastName: data.profile?.last_name || '',
      email: data.profile?.email || '',
      phone: data.profile?.phone || undefined,
      avatarUrl: data.profile?.avatar_url || undefined,
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCaregiverFromDb(data: any): Caregiver {
  return {
    profileId: data.profile_id,
    employerId: data.employer_id,
    permissions: data.permissions || {
      canViewPlanning: false,
      canEditPlanning: false,
      canViewLiaison: false,
      canWriteLiaison: false,
      canManageTeam: false,
      canExportData: false,
    },
    relationship: data.relationship || undefined,
    createdAt: new Date(data.created_at),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapShiftFromDb(data: any): Shift {
  return {
    id: data.id,
    contractId: data.contract_id,
    date: new Date(data.date),
    startTime: data.start_time,
    endTime: data.end_time,
    breakDuration: data.break_duration || 0,
    tasks: data.tasks || [],
    notes: data.notes || undefined,
    status: data.status,
    computedPay: data.computed_pay || {
      basePay: 0,
      sundayMajoration: 0,
      holidayMajoration: 0,
      nightMajoration: 0,
      overtimeMajoration: 0,
      totalPay: 0,
    },
    validatedByEmployer: data.validated_by_employer,
    validatedByEmployee: data.validated_by_employee,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}
