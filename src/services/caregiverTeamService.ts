import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type {
  CaregiverPermissions,
  CaregiverLegalStatus,
} from '@/types'
import type { CaregiverDbRow } from '@/types/database'
import {
  createTeamMemberAddedNotification,
  createTeamMemberRemovedNotification,
  createPermissionsUpdatedNotification,
} from '@/services/notificationService'
import { getProfileName } from '@/services/profileService'

// ============================================
// TYPES
// ============================================

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

// ============================================
// READ
// ============================================

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

// ============================================
// WRITE
// ============================================

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
  const existing = await supabase
    .from('caregivers')
    .select('profile_id')
    .eq('profile_id', caregiverProfileId)
    .eq('employer_id', employerId)
    .maybeSingle()

  if (existing.data) {
    throw new Error('Cet aidant est déjà lié à votre compte.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', caregiverProfileId)
    .single()

  if (profileError || !profile) {
    throw new Error('Profil utilisateur non trouvé.')
  }

  if (profile.role !== 'caregiver') {
    throw new Error("Cet utilisateur n'est pas enregistré comme aidant.")
  }

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
    throw new Error("Erreur lors de l'ajout de l'aidant.")
  }

  try {
    const employerName = await getProfileName(employerId)
    await createTeamMemberAddedNotification(caregiverProfileId, employerName)
  } catch (err) {
    logger.error('Erreur notification ajout aidant:', err)
  }
}

/**
 * Met à jour les permissions d'un aidant (côté employeur).
 * Bloqué si permissionsLocked ou statut tuteur/curateur.
 */
export async function updateCaregiver(
  caregiverProfileId: string,
  employerId: string,
  data: {
    permissions: CaregiverPermissions
  }
): Promise<void> {
  const { data: existingCaregiver } = await supabase
    .from('caregivers')
    .select('permissions_locked, legal_status')
    .eq('profile_id', caregiverProfileId)
    .eq('employer_id', employerId)
    .single()

  const isLegalGuardian =
    existingCaregiver?.legal_status === 'tutor' ||
    existingCaregiver?.legal_status === 'curator'

  if (existingCaregiver?.permissions_locked || isLegalGuardian) {
    throw new Error(
      'Les permissions de cet aidant sont verrouillées (tuteur/curateur) et ne peuvent pas être modifiées.'
    )
  }

  const { error } = await supabase
    .from('caregivers')
    .update({ permissions: data.permissions })
    .eq('profile_id', caregiverProfileId)
    .eq('employer_id', employerId)

  if (error) {
    logger.error('Erreur mise à jour aidant:', error)
    throw new Error("Erreur lors de la mise à jour de l'aidant.")
  }

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
    throw new Error("Erreur lors de la suppression de l'aidant.")
  }

  try {
    await createTeamMemberRemovedNotification(caregiverProfileId, employerName)
  } catch (err) {
    logger.error('Erreur notification retrait aidant:', err)
  }
}

// ============================================
// MAPPER
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
