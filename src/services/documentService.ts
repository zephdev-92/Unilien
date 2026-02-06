/**
 * Service de gestion des documents (justificatifs, absences, etc.)
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { Absence } from '@/types'

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
  // Récupérer les employee_ids via les contrats actifs avec les infos profil
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select(`
      employee_id,
      employee_profile:employees!employee_id(
        profile:profiles!profile_id(
          id,
          first_name,
          last_name
        )
      )
    `)
    .eq('employer_id', employerId)
    .eq('status', 'active')

  if (contractsError || !contracts || contracts.length === 0) {
    return []
  }

  // Créer un map employeeId -> employeeInfo
  const employeeMap = new Map<string, { id: string; firstName: string; lastName: string }>()
  for (const contract of contracts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = (contract as any).employee_profile?.profile
    if (profile) {
      employeeMap.set(contract.employee_id, {
        id: profile.id,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
      })
    }
  }

  const employeeIds = contracts.map((c) => c.employee_id)

  // Récupérer les absences
  const { data: absences, error } = await supabase
    .from('absences')
    .select('*')
    .in('employee_id', employeeIds)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Erreur récupération documents:', error)
    return []
  }

  return (absences || []).map((row) => ({
    absence: mapAbsenceFromDb(row),
    employee: employeeMap.get(row.employee_id) || {
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
