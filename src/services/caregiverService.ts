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
import { createPermissionsUpdatedNotification } from '@/services/notificationService'
import { getProfileName } from '@/services/profileService'

// Re-export du module gestion d'équipe pour compatibilité des imports existants
export type { CaregiverWithProfile } from './caregiverTeamService'
export {
  getCaregiversForEmployer,
  searchCaregiverByEmail,
  addCaregiverToEmployer,
  updateCaregiver,
  removeCaregiverFromEmployer,
} from './caregiverTeamService'

// ============================================
// CAREGIVER — self-service aidant
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
    logger.error("Erreur récupération employeur de l'aidant:", error)
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
  const employerId = await getCaregiverEmployerId(profileId)

  if (!employerId) {
    logger.warn('Aucun employeur associé à cet aidant')
    return []
  }

  const permissions = await getCaregiverPermissions(profileId)
  if (!permissions?.canViewPlanning) {
    logger.warn('Aidant sans permission de voir le planning')
    return []
  }

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
    relationship: data.relationship ? sanitizeText(data.relationship) : null,
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
 * Met à jour le profil aidant (informations personnelles)
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
  const sanitizedAddress = data.address
    ? {
        street: data.address.street ? sanitizeText(data.address.street) : '',
        city: data.address.city ? sanitizeText(data.address.city) : '',
        postalCode: data.address.postalCode ? sanitizeText(data.address.postalCode) : '',
        country: data.address.country || 'France',
      }
    : null

  const updateData = {
    relationship: data.relationship || null,
    relationship_details: data.relationshipDetails ? sanitizeText(data.relationshipDetails) : null,
    legal_status: data.legalStatus || null,
    address: sanitizedAddress,
    emergency_phone: data.emergencyPhone ? sanitizeText(data.emergencyPhone) : null,
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

  if (!result || result.length === 0) {
    throw new Error('Aucune donnée mise à jour. Vérifiez que vous avez les permissions nécessaires.')
  }
}

/**
 * Met à jour les permissions d'un aidant (côté aidant lui-même)
 */
export async function updateCaregiverPermissions(
  profileId: string,
  permissions: Partial<CaregiverPermissions>
): Promise<void> {
  const current = await getCaregiverPermissions(profileId)
  if (!current) {
    throw new Error('Aidant non trouvé')
  }

  const updatedPermissions = { ...current, ...permissions }

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
// MAPPERS
// ============================================

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
    shiftType: data.shift_type || 'effective',
    nightInterventionsCount: data.night_interventions_count ?? undefined,
    isRequalified: data.is_requalified ?? false,
    effectiveHours: data.effective_hours ?? undefined,
    computedPay: data.computed_pay || {
      basePay: 0,
      sundayMajoration: 0,
      holidayMajoration: 0,
      nightMajoration: 0,
      overtimeMajoration: 0,
      presenceResponsiblePay: 0,
      nightPresenceAllowance: 0,
      totalPay: 0,
    },
    validatedByEmployer: data.validated_by_employer,
    validatedByEmployee: data.validated_by_employee,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}
