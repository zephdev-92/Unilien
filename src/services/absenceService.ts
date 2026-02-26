import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type { Absence, FamilyEventType } from '@/types'
import type { AbsenceDbRow } from '@/types/database'
import {
  createAbsenceRequestedNotification,
  createAbsenceResolvedNotification,
} from '@/services/notificationService'
import { getProfileName } from '@/services/profileService'
import {
  validateAbsenceRequest,
  countBusinessDays,
  getLeaveYear,
  calculateJustificationDueDate,
} from '@/lib/absence'
import { addTakenDays, restoreTakenDays, getLeaveBalance, initializeLeaveBalance } from '@/services/leaveBalanceService'

// Re-export du module justificatif pour compatibilité des imports existants
export type { JustificationUploadResult, JustificationUploadOptions } from './absenceJustificationService'
export { validateJustificationFile, uploadJustification } from './absenceJustificationService'

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
    if (error.message.includes('absences_no_overlap')) {
      throw new Error('Une absence est déjà déclarée sur cette période.')
    }
    throw new Error(error.message)
  }

  // Notifier l'employeur
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

    // Annuler les shifts en conflit
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

  // Si approuvée et vacation : restaurer les jours
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
