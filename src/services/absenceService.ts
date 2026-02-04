import { supabase } from '@/lib/supabase/client'
import type { Absence } from '@/types'
import {
  getProfileName,
  createAbsenceRequestedNotification,
  createAbsenceResolvedNotification,
} from '@/services/notificationService'

// ============================================
// JUSTIFICATIF (arrêt de travail) UPLOAD
// ============================================

const JUSTIFICATIONS_BUCKET = 'justifications'
const MAX_JUSTIFICATION_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_JUSTIFICATION_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

export interface JustificationUploadResult {
  url: string
}

/**
 * Valide un fichier justificatif (arrêt de travail)
 */
export function validateJustificationFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_JUSTIFICATION_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Format non supporté. Utilisez PDF, JPG, PNG ou WebP.',
    }
  }

  if (file.size > MAX_JUSTIFICATION_SIZE) {
    return {
      valid: false,
      error: 'Le fichier est trop volumineux. Taille maximum : 5 Mo.',
    }
  }

  return { valid: true }
}

/**
 * Upload un justificatif et retourne l'URL publique
 */
export async function uploadJustification(
  employeeId: string,
  file: File
): Promise<JustificationUploadResult> {
  // Valider le fichier
  const validation = validateJustificationFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Générer un nom de fichier unique
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const fileName = `${employeeId}/${Date.now()}.${fileExt}`

  // Upload le fichier
  const { error: uploadError } = await supabase.storage
    .from(JUSTIFICATIONS_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Erreur upload justificatif:', uploadError)
    throw new Error('Erreur lors de l\'upload du justificatif.')
  }

  // Obtenir l'URL publique
  const { data: urlData } = supabase.storage
    .from(JUSTIFICATIONS_BUCKET)
    .getPublicUrl(fileName)

  return { url: urlData.publicUrl }
}

// ============================================
// GET ABSENCES FOR EMPLOYEE
// ============================================

export async function getAbsencesForEmployee(
  employeeId: string
): Promise<Absence[]> {
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur récupération absences:', error)
    return []
  }

  return (data || []).map(mapAbsenceFromDb)
}

// ============================================
// GET ABSENCES FOR EMPLOYER
// ============================================

export async function getAbsencesForEmployer(
  employerId: string
): Promise<Absence[]> {
  // Récupérer les employee_ids via les contrats actifs
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('employee_id')
    .eq('employer_id', employerId)
    .eq('status', 'active')

  if (contractsError || !contracts || contracts.length === 0) {
    return []
  }

  const employeeIds = contracts.map((c) => c.employee_id)

  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .in('employee_id', employeeIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur récupération absences employeur:', error)
    return []
  }

  return (data || []).map(mapAbsenceFromDb)
}

// ============================================
// GET PENDING ABSENCES FOR EMPLOYER
// ============================================

export async function getPendingAbsencesForEmployer(
  employerId: string
): Promise<Absence[]> {
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('employee_id')
    .eq('employer_id', employerId)
    .eq('status', 'active')

  if (contractsError || !contracts || contracts.length === 0) {
    return []
  }

  const employeeIds = contracts.map((c) => c.employee_id)

  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .in('employee_id', employeeIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur récupération absences en attente:', error)
    return []
  }

  return (data || []).map(mapAbsenceFromDb)
}

// ============================================
// CREATE ABSENCE
// ============================================

export async function createAbsence(
  employeeId: string,
  absenceData: {
    absenceType: Absence['absenceType']
    startDate: Date
    endDate: Date
    reason?: string
    justificationUrl?: string
  }
): Promise<Absence | null> {
  const { data, error } = await supabase
    .from('absences')
    .insert({
      employee_id: employeeId,
      absence_type: absenceData.absenceType,
      start_date: absenceData.startDate.toISOString().split('T')[0],
      end_date: absenceData.endDate.toISOString().split('T')[0],
      reason: absenceData.reason || null,
      justification_url: absenceData.justificationUrl || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Erreur création absence:', error)
    throw new Error(error.message)
  }

  // Notifier l'employeur via le contrat actif
  try {
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('employer_id')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (contractError) {
      console.error('Erreur récupération contrat pour notification absence:', contractError)
    } else if (contract) {
      const employeeName = await getProfileName(employeeId)
      await createAbsenceRequestedNotification(
        contract.employer_id,
        employeeName,
        absenceData.absenceType,
        absenceData.startDate,
        absenceData.endDate
      )
    }
  } catch (err) {
    console.error('Erreur notification demande absence:', err)
  }

  return mapAbsenceFromDb(data)
}

// ============================================
// UPDATE ABSENCE STATUS
// ============================================

export async function updateAbsenceStatus(
  absenceId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  // Récupérer l'absence pour la notification
  const { data: absence, error: fetchError } = await supabase
    .from('absences')
    .select('employee_id, start_date, end_date')
    .eq('id', absenceId)
    .single()

  if (fetchError || !absence) {
    throw new Error('Absence non trouvée')
  }

  const { error } = await supabase
    .from('absences')
    .update({ status })
    .eq('id', absenceId)

  if (error) {
    console.error('Erreur mise à jour absence:', error)
    throw new Error(error.message)
  }

  // Notifier l'employé
  try {
    await createAbsenceResolvedNotification(
      absence.employee_id,
      status,
      new Date(absence.start_date),
      new Date(absence.end_date)
    )
  } catch (err) {
    console.error('Erreur notification absence résolue:', err)
  }
}

// ============================================
// CANCEL ABSENCE (pour l'employé)
// ============================================

export async function cancelAbsence(
  absenceId: string,
  employeeId: string
): Promise<void> {
  // Vérifier que l'absence appartient à l'employé et est en pending
  const { data: absence, error: fetchError } = await supabase
    .from('absences')
    .select('employee_id, status')
    .eq('id', absenceId)
    .single()

  if (fetchError || !absence) {
    throw new Error('Absence non trouvée')
  }

  if (absence.employee_id !== employeeId) {
    throw new Error('Vous ne pouvez annuler que vos propres absences')
  }

  if (absence.status !== 'pending') {
    throw new Error('Seules les absences en attente peuvent être annulées')
  }

  const { error } = await supabase
    .from('absences')
    .delete()
    .eq('id', absenceId)

  if (error) {
    console.error('Erreur annulation absence:', error)
    throw new Error(error.message)
  }
}

// ============================================
// DELETE ABSENCE
// ============================================

export async function deleteAbsence(absenceId: string): Promise<void> {
  const { error } = await supabase
    .from('absences')
    .delete()
    .eq('id', absenceId)

  if (error) {
    console.error('Erreur suppression absence:', error)
    throw new Error(error.message)
  }
}

// ============================================
// HELPER: MAP FROM DB
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAbsenceFromDb(data: any): Absence {
  return {
    id: data.id,
    employeeId: data.employee_id,
    absenceType: data.absence_type,
    startDate: new Date(data.start_date),
    endDate: new Date(data.end_date),
    reason: data.reason || undefined,
    justificationUrl: data.justification_url || undefined,
    status: data.status,
    createdAt: new Date(data.created_at),
  }
}
