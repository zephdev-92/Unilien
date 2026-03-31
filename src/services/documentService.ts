/**
 * Service de gestion des documents (justificatifs, absences, etc.)
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { Absence } from '@/types'
import type { AbsenceDbRow, ContractWithEmployeeDbRow } from '@/types/database'

// ============================================
// TYPES
// ============================================

export interface DocumentWithEmployee {
  absence: Absence
  employee: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface DocumentStats {
  totalAbsences: number
  pendingAbsences: number
  approvedAbsences: number
  rejectedAbsences: number
  withJustification: number
}

// ============================================
// GET DOCUMENTS FOR EMPLOYER
// ============================================

/**
 * Récupère tous les documents (absences avec justificatifs) pour un employeur
 */
export async function getDocumentsForEmployer(
  employerId: string
): Promise<DocumentWithEmployee[]> {
  // Récupérer tous les contrats actifs (employés + aidants)
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select(`
      employee_id,
      caregiver_id,
      contract_category,
      employee_profile:employees!employee_id(
        profile:profiles!profile_id(
          id,
          first_name,
          last_name
        )
      ),
      caregiver_profile:profiles!caregiver_id(
        id,
        first_name,
        last_name
      )
    `)
    .eq('employer_id', employerId)
    .eq('status', 'active')

  if (contractsError || !contracts || contracts.length === 0) {
    return []
  }

  // Map personId -> infos profil (employés + aidants)
  const personMap = new Map<string, { id: string; firstName: string; lastName: string }>()
  const personIds: string[] = []

  for (const contract of contracts) {
    if (contract.employee_id) {
      const profile = (contract as ContractWithEmployeeDbRow).employee_profile?.profile
      if (profile) {
        personMap.set(contract.employee_id, {
          id: profile.id,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
        })
      }
      personIds.push(contract.employee_id)
    }
    if (contract.caregiver_id) {
      const cgProfile = (contract as { caregiver_profile?: { id?: string; first_name?: string; last_name?: string } }).caregiver_profile
      if (cgProfile) {
        personMap.set(contract.caregiver_id, {
          id: cgProfile.id || contract.caregiver_id,
          firstName: cgProfile.first_name || '',
          lastName: cgProfile.last_name || '',
        })
      }
      personIds.push(contract.caregiver_id)
    }
  }

  if (personIds.length === 0) {
    return []
  }

  // Récupérer les absences de tous (employés + aidants)
  const { data: absences, error } = await supabase
    .from('absences')
    .select('id, employee_id, absence_type, start_date, end_date, reason, justification_url, status, business_days_count, justification_due_date, family_event_type, leave_year, created_at')
    .in('employee_id', personIds)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Erreur récupération documents:', error)
    return []
  }

  return (absences || []).map((row) => ({
    absence: mapAbsenceFromDb(row),
    employee: personMap.get(row.employee_id) || {
      id: row.employee_id,
      firstName: 'Inconnu',
      lastName: '',
    },
  }))
}

/**
 * Récupère les statistiques des documents pour un employeur
 */
export async function getDocumentStatsForEmployer(
  employerId: string
): Promise<DocumentStats> {
  const documents = await getDocumentsForEmployer(employerId)

  const stats: DocumentStats = {
    totalAbsences: documents.length,
    pendingAbsences: 0,
    approvedAbsences: 0,
    rejectedAbsences: 0,
    withJustification: 0,
  }

  for (const doc of documents) {
    switch (doc.absence.status) {
      case 'pending':
        stats.pendingAbsences++
        break
      case 'approved':
        stats.approvedAbsences++
        break
      case 'rejected':
        stats.rejectedAbsences++
        break
    }
    if (doc.absence.justificationUrl) {
      stats.withJustification++
    }
  }

  return stats
}

/**
 * Récupère les documents avec justificatifs uniquement
 */
export async function getDocumentsWithJustification(
  employerId: string
): Promise<DocumentWithEmployee[]> {
  const documents = await getDocumentsForEmployer(employerId)
  return documents.filter((doc) => doc.absence.justificationUrl)
}

/**
 * Récupère les absences en attente pour un employeur
 */
export async function getPendingDocuments(
  employerId: string
): Promise<DocumentWithEmployee[]> {
  const documents = await getDocumentsForEmployer(employerId)
  return documents.filter((doc) => doc.absence.status === 'pending')
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
    createdAt: new Date(data.created_at),
  }
}
