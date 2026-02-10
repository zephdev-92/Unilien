import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type {
  Caregiver,
  CaregiverPermissions,
  CaregiverRelationship,
  CaregiverLegalStatus,
  Address,
  Shift,
} from '@/types'
import type { CaregiverDbRow, ShiftDbRow } from '@/types/database'
import {
  getProfileName,
  createTeamMemberAddedNotification,
  createTeamMemberRemovedNotification,
  createPermissionsUpdatedNotification,
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
    logger.error('Erreur récupération aidant:', error)
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
    logger.error('Erreur récupération employeur de l\'aidant:', error)
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
    logger.warn('Aucun employeur associé à cet aidant')
    return []
  }

  // Vérifier que l'aidant a la permission de voir le planning
  const permissions = await getCaregiverPermissions(profileId)
  if (!permissions?.canViewPlanning) {
    logger.warn('Aidant sans permission de voir le planning')
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
    logger.error('Erreur récupération shifts pour aidant:', error)
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
    logger.error('Erreur création/mise à jour aidant:', error)
    throw new Error(error.message)
  }
}

/**
 * Met à jour le profil aidant (informations personnelles de l'aidant)
 */
export async function updateCaregiverProfile(
  profileId: string,
  data: {
    relationship?: CaregiverRelationship
    relationshipDetails?: string
    legalStatus?: CaregiverLegalStatus
    address?: Address
    emergencyPhone?: string
    availabilityHours?: string
    canReplaceEmployer?: boolean
  }
): Promise<void> {
  const updateData = {
    relationship: data.relationship || null,
    relationship_details: data.relationshipDetails ? sanitizeText(data.relationshipDetails) : null,
    legal_status: data.legalStatus || null,
    address: data.address || null,
    emergency_phone: data.emergencyPhone || null,
    availability_hours: data.availabilityHours ? sanitizeText(data.availabilityHours) : null,
    can_replace_employer: data.canReplaceEmployer ?? false,
  }

  const { data: result, error, count } = await supabase
    .from('caregivers')
    .update(updateData)
    .eq('profile_id', profileId)
    .select()

  logger.debug('updateCaregiverProfile - profileId:', profileId)
  logger.debug('updateCaregiverProfile - updateData:', updateData)
  logger.debug('updateCaregiverProfile - result:', result)
  logger.debug('updateCaregiverProfile - count:', count)
  logger.debug('updateCaregiverProfile - error:', error)

  if (error) {
    logger.error('Erreur mise à jour profil aidant:', error)
    throw new Error(error.message)
  }

  // Vérifier si des lignes ont été mises à jour
  if (!result || result.length === 0) {
    throw new Error('Aucune donnée mise à jour. Vérifiez que vous avez les permissions nécessaires.')
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

  // Récupérer l'employeur pour la notification
  const { data: caregiver } = await supabase
    .from('caregivers')
    .select('employer_id')
    .eq('profile_id', profileId)
    .single()

  const { error } = await supabase
    .from('caregivers')
    .update({ permissions: updatedPermissions })
    .eq('profile_id', profileId)

  if (error) {
    logger.error('Erreur mise à jour permissions:', error)
    throw new Error(error.message)
  }

  // Notifier l'aidant
  if (caregiver) {
    try {
      const employerName = await getProfileName(caregiver.employer_id)
      await createPermissionsUpdatedNotification(profileId, employerName)
    } catch (err) {
      logger.error('Erreur notification permissions modifiées:', err)
    }
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
  permissionsLocked?: boolean
  legalStatus?: CaregiverLegalStatus
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
    logger.error('Erreur récupération aidants:', error)
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
    logger.error('Erreur recherche aidant:', error)
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
    permissions: CaregiverPermissions
    legalStatus?: CaregiverLegalStatus
    permissionsLocked?: boolean
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
      permissions: data.permissions,
      legal_status: data.legalStatus || null,
      permissions_locked: data.permissionsLocked || false,
    })

  if (error) {
    logger.error('Erreur ajout aidant:', error)
    throw new Error('Erreur lors de l\'ajout de l\'aidant.')
  }

  // Notifier l'aidant ajouté
  try {
    const employerName = await getProfileName(employerId)
    await createTeamMemberAddedNotification(caregiverProfileId, employerName)
  } catch (err) {
    logger.error('Erreur notification ajout aidant:', err)
  }
}

/**
 * Met à jour les permissions d'un aidant
 * Note: Si permissionsLocked est true ou legalStatus est tutor/curator, les permissions ne peuvent pas être modifiées
 */
export async function updateCaregiver(
  caregiverProfileId: string,
  employerId: string,
  data: {
    permissions: CaregiverPermissions
  }
): Promise<void> {
  // Vérifier si les permissions sont verrouillées (par flag OU par statut juridique)
  const { data: existingCaregiver } = await supabase
    .from('caregivers')
    .select('permissions_locked, legal_status')
    .eq('profile_id', caregiverProfileId)
    .eq('employer_id', employerId)
    .single()

  const isLegalGuardian = existingCaregiver?.legal_status === 'tutor' || existingCaregiver?.legal_status === 'curator'
  if (existingCaregiver?.permissions_locked || isLegalGuardian) {
    throw new Error('Les permissions de cet aidant sont verrouillées (tuteur/curateur) et ne peuvent pas être modifiées.')
  }

  const { error } = await supabase
    .from('caregivers')
    .update({
      permissions: data.permissions,
    })
    .eq('profile_id', caregiverProfileId)
    .eq('employer_id', employerId)

  if (error) {
    logger.error('Erreur mise à jour aidant:', error)
    throw new Error('Erreur lors de la mise à jour de l\'aidant.')
  }

  // Notifier l'aidant que ses permissions ont été modifiées
  try {
    const employerName = await getProfileName(employerId)
    await createPermissionsUpdatedNotification(caregiverProfileId, employerName)
  } catch (err) {
    logger.error('Erreur notification permissions modifiées:', err)
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
    logger.error('Erreur suppression aidant:', error)
    throw new Error('Erreur lors de la suppression de l\'aidant.')
  }

  // Notifier l'aidant retiré
  try {
    await createTeamMemberRemovedNotification(caregiverProfileId, employerName)
  } catch (err) {
    logger.error('Erreur notification retrait aidant:', err)
  }
}

// ============================================
// Mappers
// ============================================

function mapCaregiverWithProfileFromDb(data: CaregiverDbRow): CaregiverWithProfile {
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
    permissionsLocked: data.permissions_locked || false,
    legalStatus: data.legal_status || undefined,
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

function mapCaregiverFromDb(data: CaregiverDbRow): Caregiver {
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
    permissionsLocked: data.permissions_locked || false,
    relationship: data.relationship || undefined,
    relationshipDetails: data.relationship_details || undefined,
    legalStatus: data.legal_status || undefined,
    address: data.address || undefined,
    emergencyPhone: data.emergency_phone || undefined,
    availabilityHours: data.availability_hours || undefined,
    canReplaceEmployer: data.can_replace_employer ?? false,
    createdAt: new Date(data.created_at),
  }
}

function mapShiftFromDb(data: ShiftDbRow): Shift {
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
