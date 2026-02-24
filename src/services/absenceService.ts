import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type { Absence, FamilyEventType } from '@/types'
import type { AbsenceDbRow } from '@/types/database'
import {
  getProfileName,
  createAbsenceRequestedNotification,
  createAbsenceResolvedNotification,
} from '@/services/notificationService'
import {
  validateAbsenceRequest,
  countBusinessDays,
  getLeaveYear,
  calculateJustificationDueDate,
} from '@/lib/absence'
import { addTakenDays, restoreTakenDays, getLeaveBalance, initializeLeaveBalance } from '@/services/leaveBalanceService'

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

export interface JustificationUploadOptions {
  /** Type d'absence pour personnaliser le nom du fichier */
  absenceType?: Absence['absenceType']
  /** Date de début de l'absence (utilisée pour le nom du fichier) */
  startDate?: Date
}

/**
 * Génère un nom de fichier significatif pour le justificatif
 * Pour les arrêts maladie : arret_YYYY_MM_DD.ext
 * Pour les autres types : justificatif_YYYY_MM_DD.ext
 */
function generateJustificationFileName(
  employeeId: string,
  fileExt: string,
  options?: JustificationUploadOptions
): string {
  const date = options?.startDate || new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}_${month}_${day}`

  // Nom du fichier selon le type d'absence
  let baseName: string
  if (options?.absenceType === 'sick') {
    baseName = `arret_${dateStr}`
  } else {
    baseName = `justificatif_${dateStr}`
  }

  // Ajout d'un timestamp pour éviter les collisions
  const timestamp = Date.now()

  return `${employeeId}/${baseName}_${timestamp}.${fileExt}`
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
 * @param employeeId - ID de l'employé
 * @param file - Fichier à uploader
 * @param options - Options pour personnaliser le nom du fichier
 */
export async function uploadJustification(
  employeeId: string,
  file: File,
  options?: JustificationUploadOptions
): Promise<JustificationUploadResult> {
  // Valider le fichier
  const validation = validateJustificationFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Générer un nom de fichier significatif
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const fileName = generateJustificationFileName(employeeId, fileExt, options)

  // Upload le fichier
  const { error: uploadError } = await supabase.storage
    .from(JUSTIFICATIONS_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    logger.error('Erreur upload justificatif:', uploadError)
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
    logger.error('Erreur récupération absences:', error)
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
    logger.error('Erreur récupération absences employeur:', error)
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
    logger.error('Erreur récupération absences en attente:', error)
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
    familyEventType?: FamilyEventType
  }
): Promise<Absence | null> {
  // Récupérer les absences existantes pour validation
  const { data: existingRaw } = await supabase
    .from('absences')
    .select('id, start_date, end_date, status')
    .eq('employee_id', employeeId)
    .in('status', ['pending', 'approved'])

  const existingAbsences = (existingRaw || []).map((a) => ({
    id: a.id,
    startDate: new Date(a.start_date),
    endDate: new Date(a.end_date),
    status: a.status as 'pending' | 'approved',
  }))

  // Récupérer le solde de congés si c'est un congé payé
  let leaveBalance = null
  if (absenceData.absenceType === 'vacation') {
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, employer_id, start_date, weekly_hours')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (contract) {
      const leaveYear = getLeaveYear(absenceData.startDate)
      let balance = await getLeaveBalance(contract.id, leaveYear)

      // Auto-initialiser le solde s'il n'existe pas encore
      if (!balance) {
        balance = await initializeLeaveBalance(
          contract.id,
          employeeId,
          contract.employer_id,
          leaveYear,
          { startDate: new Date(contract.start_date), weeklyHours: contract.weekly_hours }
        )
      }

      if (balance) {
        leaveBalance = {
          acquiredDays: balance.acquiredDays,
          takenDays: balance.takenDays,
          adjustmentDays: balance.adjustmentDays,
        }
      }
    }
  }

  // Valider la demande
  const validation = validateAbsenceRequest(
    {
      employeeId,
      absenceType: absenceData.absenceType,
      startDate: absenceData.startDate,
      endDate: absenceData.endDate,
      familyEventType: absenceData.familyEventType,
    },
    existingAbsences,
    leaveBalance
  )

  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'))
  }

  // Calculs automatiques
  const businessDaysCount = countBusinessDays(absenceData.startDate, absenceData.endDate)
  const justificationDueDate = absenceData.absenceType === 'sick'
    ? calculateJustificationDueDate(absenceData.startDate)
    : null
  const leaveYear = absenceData.absenceType === 'vacation'
    ? getLeaveYear(absenceData.startDate)
    : null

  const { data, error } = await supabase
    .from('absences')
    .insert({
      employee_id: employeeId,
      absence_type: absenceData.absenceType,
      start_date: absenceData.startDate.toISOString().split('T')[0],
      end_date: absenceData.endDate.toISOString().split('T')[0],
      reason: absenceData.reason ? sanitizeText(absenceData.reason) : null,
      justification_url: absenceData.justificationUrl || null,
      status: 'pending',
      business_days_count: businessDaysCount,
      justification_due_date: justificationDueDate
        ? justificationDueDate.toISOString().split('T')[0]
        : null,
      family_event_type: absenceData.familyEventType || null,
      leave_year: leaveYear,
    })
    .select()
    .single()

  if (error) {
    logger.error('Erreur création absence:', error)
    // Message plus clair si c'est la contrainte de chevauchement DB
    if (error.message.includes('absences_no_overlap')) {
      throw new Error('Une absence est déjà déclarée sur cette période.')
    }
    throw new Error(error.message)
  }

  // Notifier l'employeur via le contrat actif
  try {
    const { data: contractData, error: contractError } = await supabase
      .from('contracts')
      .select('employer_id')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (contractError) {
      logger.error('Erreur récupération contrat pour notification absence:', contractError)
    } else if (contractData) {
      const employeeName = await getProfileName(employeeId)
      await createAbsenceRequestedNotification(
        contractData.employer_id,
        employeeName,
        absenceData.absenceType,
        absenceData.startDate,
        absenceData.endDate
      )
    }
  } catch (err) {
    logger.error('Erreur notification demande absence:', err)
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
  // Récupérer l'absence complète
  const { data: absence, error: fetchError } = await supabase
    .from('absences')
    .select('employee_id, start_date, end_date, absence_type, business_days_count, leave_year')
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
    logger.error('Erreur mise à jour absence:', error)
    throw new Error(error.message)
  }

  // Si approuvé : décompter les CP et annuler les shifts en conflit
  if (status === 'approved') {
    // Décompter les jours de congé du solde
    if (absence.absence_type === 'vacation' && absence.business_days_count && absence.leave_year) {
      try {
        const { data: contract } = await supabase
          .from('contracts')
          .select('id')
          .eq('employee_id', absence.employee_id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        if (contract) {
          await addTakenDays(contract.id, absence.leave_year, absence.business_days_count)
        }
      } catch (err) {
        logger.error('Erreur décompte jours congés:', err)
      }
    }

    // Annuler les shifts en conflit sur la période d'absence
    try {
      await cancelShiftsForAbsence(
        absence.employee_id,
        new Date(absence.start_date),
        new Date(absence.end_date)
      )
    } catch (err) {
      logger.error('Erreur annulation shifts pour absence:', err)
    }
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
    logger.error('Erreur notification absence résolue:', err)
  }
}

// ============================================
// CANCEL ABSENCE (pour l'employé)
// ============================================

export async function cancelAbsence(
  absenceId: string,
  employeeId: string
): Promise<void> {
  // Vérifier que l'absence appartient à l'employé
  const { data: absence, error: fetchError } = await supabase
    .from('absences')
    .select('employee_id, status, absence_type, business_days_count, leave_year')
    .eq('id', absenceId)
    .single()

  if (fetchError || !absence) {
    throw new Error('Absence non trouvée')
  }

  if (absence.employee_id !== employeeId) {
    throw new Error('Vous ne pouvez annuler que vos propres absences')
  }

  if (absence.status !== 'pending' && absence.status !== 'approved') {
    throw new Error('Cette absence ne peut plus être annulée')
  }

  // Si l'absence était approuvée et de type vacation : restaurer les jours
  if (absence.status === 'approved' && absence.absence_type === 'vacation'
    && absence.business_days_count && absence.leave_year) {
    try {
      const { data: contract } = await supabase
        .from('contracts')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (contract) {
        await restoreTakenDays(contract.id, absence.leave_year, absence.business_days_count)
      }
    } catch (err) {
      logger.error('Erreur restauration jours congés:', err)
    }
  }

  const { error } = await supabase
    .from('absences')
    .delete()
    .eq('id', absenceId)

  if (error) {
    logger.error('Erreur annulation absence:', error)
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
    logger.error('Erreur suppression absence:', error)
    throw new Error(error.message)
  }
}

// ============================================
// HELPER: CANCEL SHIFTS FOR ABSENCE PERIOD
// ============================================

async function cancelShiftsForAbsence(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  // Trouver les shifts plannifiés de l'employé sur la période
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('status', 'active')

  if (!contracts || contracts.length === 0) return

  const contractIds = contracts.map((c) => c.id)

  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('id')
    .in('contract_id', contractIds)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .eq('status', 'planned')

  if (error || !shifts || shifts.length === 0) return

  const shiftIds = shifts.map((s) => s.id)

  const { error: updateError } = await supabase
    .from('shifts')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .in('id', shiftIds)

  if (updateError) {
    logger.error('Erreur annulation shifts pour absence:', updateError)
  } else {
    logger.info(`${shiftIds.length} shift(s) annulé(s) pour absence employé ${employeeId}`)
  }
}

// ============================================
// HELPER: MAP FROM DB
// ============================================

function mapAbsenceFromDb(data: AbsenceDbRow): Absence {
  return {
    id: data.id,
    employeeId: data.employee_id,
    absenceType: data.absence_type,
    startDate: new Date(data.start_date),
    endDate: new Date(data.end_date),
    reason: data.reason || undefined,
    justificationUrl: data.justification_url || undefined,
    status: data.status,
    businessDaysCount: data.business_days_count || undefined,
    justificationDueDate: data.justification_due_date
      ? new Date(data.justification_due_date)
      : undefined,
    familyEventType: (data.family_event_type as FamilyEventType) || undefined,
    leaveYear: data.leave_year || undefined,
    createdAt: new Date(data.created_at),
  }
}
