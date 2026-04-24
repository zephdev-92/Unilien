import { supabase } from '@/lib/supabase/client'
import { resolveAvatarUrl } from '@/lib/supabase/avatars'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type { Shift, ShiftType, GuardSegment, UserRole } from '@/types'
import type { ShiftDbRow } from '@/types/database'
import {
  createShiftCreatedNotification,
  createShiftCancelledNotification,
  createShiftModifiedNotification,
} from '@/services/notificationService'
import { getProfileName } from '@/services/profileService'

export async function getShifts(
  profileId: string,
  role: UserRole,
  startDate: Date,
  endDate: Date
): Promise<Shift[]> {
  // Construire la requête selon le rôle
  // Pour les employeurs, on JOIN aussi le profil de l'employé/aidant pour afficher son nom
  let selectClause: string
  if (role === 'employer') {
    selectClause = `
      *,
      contract:contracts!inner(
        id,
        employer_id,
        employee_id,
        caregiver_id,
        contract_category,
        employee:employees!employee_id(
          profile:profiles!profile_id(
            first_name,
            last_name,
            avatar_url
          )
        ),
        caregiver_profile:profiles!caregiver_id(
          first_name,
          last_name,
          avatar_url
        )
      )
    `
  } else if (role === 'caregiver') {
    selectClause = `
      *,
      contract:contracts!inner(
        id,
        employer_id,
        caregiver_id
      )
    `
  } else {
    selectClause = `
      *,
      contract:contracts!inner(
        id,
        employer_id,
        employee_id
      )
    `
  }

  let query = supabase
    .from('shifts')
    .select(selectClause)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  // Filtrer selon le rôle
  if (role === 'employer') {
    query = query.eq('contract.employer_id', profileId)
  } else if (role === 'employee') {
    query = query.eq('contract.employee_id', profileId)
  } else if (role === 'caregiver') {
    query = query.eq('contract.caregiver_id', profileId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Erreur récupération shifts:', error)
    return []
  }

  return (data || []).map((row) => {
    const shift = mapShiftFromDb(row as ShiftDbRow)
    // Extraire l'employeeId et employeeName du JOIN contract
    const contractJoin = (row as Record<string, unknown>).contract as {
      employee_id?: string | null
      caregiver_id?: string | null
      contract_category?: string
      employee?: { profile?: { first_name?: string; last_name?: string; avatar_url?: string } | null } | null
      caregiver_profile?: { first_name?: string; last_name?: string; avatar_url?: string } | null
    } | null
    if (contractJoin?.employee_id) {
      shift.employeeId = contractJoin.employee_id
    }
    if (contractJoin?.employee?.profile) {
      const p = contractJoin.employee.profile
      shift.employeeName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || undefined
      shift.employeeAvatarUrl = resolveAvatarUrl(p.avatar_url)
    }
    // Pour les contrats aidants PCH, récupérer le nom depuis caregiver_profile
    if (contractJoin?.caregiver_id && contractJoin?.caregiver_profile) {
      const p = contractJoin.caregiver_profile
      if (!shift.employeeId) shift.employeeId = contractJoin.caregiver_id
      if (!shift.employeeName) {
        shift.employeeName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || undefined
        shift.employeeAvatarUrl = resolveAvatarUrl(p.avatar_url)
      }
    }
    return shift
  })
}

export async function getShiftById(shiftId: string): Promise<Shift | null> {
  const { data, error } = await supabase
    .from('shifts')
    .select('id, contract_id, date, start_time, end_time, break_duration, tasks, notes, has_night_action, shift_type, night_interventions_count, is_requalified, effective_hours, guard_segments, computed_pay, status, validated_by_employer, validated_by_employee, late_entry, created_at, updated_at')
    .eq('id', shiftId)
    .single()

  if (error) {
    logger.error('Erreur récupération shift:', error)
    return null
  }

  return mapShiftFromDb(data)
}

export async function createShift(
  contractId: string,
  shiftData: {
    date: Date
    startTime: string
    endTime: string
    breakDuration?: number
    tasks?: string[]
    notes?: string
    hasNightAction?: boolean
    shiftType?: ShiftType
    nightInterventionsCount?: number
    isRequalified?: boolean
    effectiveHours?: number
    guardSegments?: GuardSegment[]
  }
): Promise<Shift | null> {
  // Pour guard_24h : breakDuration = somme des breakMinutes des segments effectifs
  const breakDuration = shiftData.shiftType === 'guard_24h' && shiftData.guardSegments
    ? shiftData.guardSegments.reduce((sum, seg) =>
        seg.type === 'effective' ? sum + (seg.breakMinutes ?? 0) : sum, 0)
    : (shiftData.breakDuration || 0)

  const { data, error } = await supabase
    .from('shifts')
    .insert({
      contract_id: contractId,
      date: shiftData.date.toISOString().split('T')[0],
      start_time: shiftData.startTime,
      end_time: shiftData.endTime,
      break_duration: breakDuration,
      tasks: (shiftData.tasks || []).map(sanitizeText),
      notes: shiftData.notes ? sanitizeText(shiftData.notes) : null,
      has_night_action: shiftData.hasNightAction ?? null,
      shift_type: shiftData.shiftType || 'effective',
      night_interventions_count: shiftData.nightInterventionsCount ?? null,
      is_requalified: shiftData.isRequalified ?? false,
      effective_hours: shiftData.effectiveHours ?? null,
      guard_segments: shiftData.guardSegments ?? null,
      status: 'planned',
      computed_pay: {},
      validated_by_employer: false,
      validated_by_employee: false,
    })
    .select()
    .single()

  if (error) {
    logger.error('Erreur création shift:', error)
    throw new Error(error.message)
  }

  // Notifier l'auxiliaire de la nouvelle intervention
  try {
    const { data: contract } = await supabase
      .from('contracts')
      .select('employee_id, employer_id')
      .eq('id', contractId)
      .single()
    if (contract) {
      const employerName = await getProfileName(contract.employer_id)
      await createShiftCreatedNotification(
        contract.employee_id,
        shiftData.date,
        shiftData.startTime,
        employerName
      )
    }
  } catch (err) {
    logger.error('Erreur notification shift créé:', err)
  }

  return mapShiftFromDb(data)
}

export async function updateShift(
  shiftId: string,
  updates: Partial<{
    date: Date
    startTime: string
    endTime: string
    breakDuration: number
    tasks: string[]
    notes: string
    hasNightAction: boolean
    shiftType: ShiftType
    nightInterventionsCount: number
    isRequalified: boolean
    effectiveHours: number
    guardSegments: GuardSegment[]
    status: Shift['status']
    lateEntry: boolean
  }>
): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.date) payload.date = updates.date.toISOString().split('T')[0]
  if (updates.startTime) payload.start_time = updates.startTime
  if (updates.endTime) payload.end_time = updates.endTime
  if (updates.breakDuration !== undefined) payload.break_duration = updates.breakDuration
  if (updates.tasks) payload.tasks = updates.tasks.map(sanitizeText)
  if (updates.notes !== undefined) payload.notes = updates.notes ? sanitizeText(updates.notes) : null
  if (updates.hasNightAction !== undefined) payload.has_night_action = updates.hasNightAction
  if (updates.shiftType) payload.shift_type = updates.shiftType
  if (updates.nightInterventionsCount !== undefined) payload.night_interventions_count = updates.nightInterventionsCount
  if (updates.isRequalified !== undefined) payload.is_requalified = updates.isRequalified
  if (updates.effectiveHours !== undefined) payload.effective_hours = updates.effectiveHours
  if (updates.guardSegments !== undefined) {
    payload.guard_segments = updates.guardSegments
    // Recalculer break_duration à partir des segments effectifs
    payload.break_duration = updates.guardSegments.reduce((sum, seg) =>
      seg.type === 'effective' ? sum + (seg.breakMinutes ?? 0) : sum, 0)
  }
  if (updates.status) payload.status = updates.status
  if (updates.lateEntry !== undefined) payload.late_entry = updates.lateEntry

  const { error } = await supabase
    .from('shifts')
    .update(payload)
    .eq('id', shiftId)

  if (error) {
    logger.error('Erreur mise à jour shift:', error)
    throw new Error(error.message)
  }

  // Notifier l'auxiliaire si l'horaire/date a changé (pas un simple changement de status)
  const scheduleChanged = updates.date || updates.startTime || updates.endTime
  if (scheduleChanged && updates.status !== 'cancelled') {
    try {
      const { data: shift } = await supabase
        .from('shifts')
        .select('date, start_time, contract_id')
        .eq('id', shiftId)
        .single()
      if (shift) {
        const { data: contract } = await supabase
          .from('contracts')
          .select('employee_id')
          .eq('id', shift.contract_id)
          .single()
        if (contract) {
          await createShiftModifiedNotification(
            contract.employee_id,
            new Date(shift.date),
            shift.start_time
          )
        }
      }
    } catch (err) {
      logger.error('Erreur notification shift modifié:', err)
    }
  }

  // Notifier l'auxiliaire si l'intervention est annulée
  if (updates.status === 'cancelled') {
    try {
      const { data: shift } = await supabase
        .from('shifts')
        .select('date, start_time, contract_id')
        .eq('id', shiftId)
        .single()
      if (shift) {
        const { data: contract } = await supabase
          .from('contracts')
          .select('employee_id')
          .eq('id', shift.contract_id)
          .single()
        if (contract) {
          await createShiftCancelledNotification(
            contract.employee_id,
            new Date(shift.date),
            shift.start_time
          )
        }
      }
    } catch (err) {
      logger.error('Erreur notification shift annulé:', err)
    }
  }
}

/**
 * Crée plusieurs interventions en séquence.
 * Retourne les interventions créées et les dates en échec.
 */
export async function createShifts(
  contractId: string,
  occurrences: Array<{
    date: Date
    startTime: string
    endTime: string
    breakDuration?: number
    tasks?: string[]
    notes?: string
    hasNightAction?: boolean
    shiftType?: ShiftType
    nightInterventionsCount?: number
    isRequalified?: boolean
    effectiveHours?: number
    guardSegments?: GuardSegment[]
  }>
): Promise<{ created: Shift[]; failed: Date[] }> {
  const created: Shift[] = []
  const failed: Date[] = []

  for (const occurrence of occurrences) {
    try {
      const shift = await createShift(contractId, occurrence)
      if (shift) created.push(shift)
      else failed.push(occurrence.date)
    } catch {
      failed.push(occurrence.date)
    }
  }

  return { created, failed }
}

export async function deleteShift(shiftId: string): Promise<void> {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', shiftId)

  if (error) {
    logger.error('Erreur suppression shift:', error)
    throw new Error(error.message)
  }
}

export async function validateShift(
  shiftId: string,
  role: 'employer' | 'employee' | 'caregiver'
): Promise<void> {
  const field = role === 'employer' ? 'validated_by_employer' : 'validated_by_employee'

  const { error } = await supabase
    .from('shifts')
    .update({
      [field]: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', shiftId)

  if (error) {
    logger.error('Erreur validation shift:', error)
    throw new Error(error.message)
  }
}

// ============================================
// SHIFT REMINDERS QUERY
// ============================================

type UpcomingShiftRow = {
  id: string
  date: string
  start_time: string
  contract_id: string
  contract: { employer_id: string; employee_id: string } | null
}

/**
 * Récupère les shifts planifiés d'un employé dans une plage de dates.
 * Utilisé par useShiftReminders pour éviter les imports directs Supabase.
 */
export async function getUpcomingShiftsForEmployee(
  employeeId: string,
  fromDate: string,
  toDate: string
): Promise<UpcomingShiftRow[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select(`
      id,
      date,
      start_time,
      contract_id,
      contract:contracts!inner(
        employer_id,
        employee_id
      )
    `)
    .eq('contract.employee_id', employeeId)
    .eq('status', 'planned')
    .gte('date', fromDate)
    .lte('date', toDate)

  if (error) {
    logger.error('Erreur récupération shifts à venir:', error)
    return []
  }

  return (data || []) as UpcomingShiftRow[]
}

// Mapper les données DB vers le type Shift
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
    hasNightAction: data.has_night_action ?? undefined,
    shiftType: data.shift_type || 'effective',
    nightInterventionsCount: data.night_interventions_count ?? undefined,
    isRequalified: data.is_requalified ?? false,
    effectiveHours: data.effective_hours ?? undefined,
    guardSegments: data.guard_segments ?? undefined,
    status: data.status,
    lateEntry: data.late_entry ?? false,
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
