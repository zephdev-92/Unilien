import { supabase } from '@/lib/supabase/client'
import type { Profile, Employer, Employee } from '@/types'

// ============================================
// PROFILE (informations personnelles)
// ============================================

export async function updateProfile(
  profileId: string,
  data: Partial<Pick<Profile, 'firstName' | 'lastName' | 'phone'>>
) {
  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)

  if (error) {
    console.error('Erreur mise à jour profil:', error)
    throw new Error(error.message)
  }
}

// ============================================
// AVATAR
// ============================================

const AVATAR_BUCKET = 'avatars'
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export interface AvatarUploadResult {
  url: string
}

/**
 * Valide un fichier avatar
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Format non supporté. Utilisez JPG, PNG, GIF ou WebP.',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'Le fichier est trop volumineux. Taille maximum : 2 Mo.',
    }
  }

  return { valid: true }
}

/**
 * Upload un avatar et retourne l'URL publique
 */
export async function uploadAvatar(
  profileId: string,
  file: File
): Promise<AvatarUploadResult> {
  // Valider le fichier
  const validation = validateAvatarFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Générer un nom de fichier unique
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${profileId}/${Date.now()}.${fileExt}`

  // Supprimer l'ancien avatar s'il existe
  try {
    const { data: existingFiles } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(profileId)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${profileId}/${f.name}`)
      await supabase.storage.from(AVATAR_BUCKET).remove(filesToDelete)
    }
  } catch (err) {
    // Continuer même si la suppression échoue
    console.warn('Avertissement suppression ancien avatar:', err)
  }

  // Upload le nouveau fichier
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    console.error('Erreur upload avatar:', uploadError)
    throw new Error('Erreur lors de l\'upload de l\'image.')
  }

  // Obtenir l'URL publique
  const { data: urlData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(fileName)

  const avatarUrl = urlData.publicUrl

  // Mettre à jour le profil avec la nouvelle URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)

  if (updateError) {
    console.error('Erreur mise à jour avatar_url:', updateError)
    throw new Error('Erreur lors de la mise à jour du profil.')
  }

  return { url: avatarUrl }
}

/**
 * Supprime l'avatar d'un profil
 */
export async function deleteAvatar(profileId: string): Promise<void> {
  // Supprimer les fichiers du storage
  try {
    const { data: existingFiles } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(profileId)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${profileId}/${f.name}`)
      await supabase.storage.from(AVATAR_BUCKET).remove(filesToDelete)
    }
  } catch (err) {
    console.warn('Avertissement suppression fichiers avatar:', err)
  }

  // Mettre à jour le profil
  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)

  if (error) {
    console.error('Erreur suppression avatar:', error)
    throw new Error('Erreur lors de la suppression de l\'avatar.')
  }
}

// ============================================
// EMPLOYER (profil employeur)
// ============================================

export async function getEmployer(profileId: string): Promise<Employer | null> {
  const { data, error } = await supabase
    .from('employers')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    console.error('Erreur récupération employeur:', error)
    return null
  }

  if (!data) return null

  return {
    profileId: data.profile_id,
    address: data.address as Employer['address'],
    handicapType: data.handicap_type || undefined,
    handicapName: data.handicap_name || undefined,
    specificNeeds: data.specific_needs || undefined,
    cesuNumber: data.cesu_number || undefined,
    pchBeneficiary: data.pch_beneficiary,
    pchMonthlyAmount: data.pch_monthly_amount || undefined,
    emergencyContacts: (data.emergency_contacts || []) as Employer['emergencyContacts'],
  }
}

export async function upsertEmployer(profileId: string, data: Partial<Employer>) {
  const payload = {
    profile_id: profileId,
    address: data.address || {},
    handicap_type: data.handicapType || null,
    handicap_name: data.handicapName || null,
    specific_needs: data.specificNeeds || null,
    cesu_number: data.cesuNumber || null,
    pch_beneficiary: data.pchBeneficiary ?? false,
    pch_monthly_amount: data.pchMonthlyAmount || null,
    emergency_contacts: data.emergencyContacts || [],
  }

  const { error } = await supabase
    .from('employers')
    .upsert(payload, { onConflict: 'profile_id' })

  if (error) {
    console.error('Erreur mise à jour employeur:', error)
    throw new Error(error.message)
  }
}

// ============================================
// EMPLOYEE (profil auxiliaire)
// ============================================

export async function getEmployee(profileId: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    console.error('Erreur récupération employé:', error)
    return null
  }

  if (!data) return null

  return {
    profileId: data.profile_id,
    qualifications: data.qualifications || [],
    languages: data.languages || [],
    maxDistanceKm: data.max_distance_km || undefined,
    availabilityTemplate: data.availability_template as Employee['availabilityTemplate'],
  }
}

export async function upsertEmployee(profileId: string, data: Partial<Employee>) {
  const payload = {
    profile_id: profileId,
    qualifications: data.qualifications || [],
    languages: data.languages || [],
    max_distance_km: data.maxDistanceKm || null,
    availability_template: data.availabilityTemplate || {},
  }

  const { error } = await supabase
    .from('employees')
    .upsert(payload, { onConflict: 'profile_id' })

  if (error) {
    console.error('Erreur mise à jour employé:', error)
    throw new Error(error.message)
  }
}
