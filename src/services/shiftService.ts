import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type { Shift, ShiftType, GuardSegment, UserRole } from '@/types'
import type { ShiftDbRow } from '@/types/database'
import {
  getProfileName,
  createShiftCreatedNotification,
  createShiftCancelledNotification,
  createShiftModifiedNotification,
} from '@/services/notificationService'

export async function getShifts(
  profileId: string,
  role: UserRole,
  startDate: Date,
  endDate: Date
): Promise<Shift[]> {
  // Construire la requête selon le rôle
  let query = supabase
    .from('shifts')
    .select(`
      *,
      contract:contracts!inner(
        id,
        employer_id,
        employee_id
      )
    `)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  // Filtrer selon le rôle
  if (role === 'employer') {
    query = query.eq('contract.employer_id', profileId)
  } else if (role === 'employee') {
    query = query.eq('contract.employee_id', profileId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Erreur récupération shifts:', error)
    return []
  }

  return (data || []).map(mapShiftFromDb)
}

export async function getShiftById(shiftId: string): Promise<Shift | null> {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
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
  role: 'employer' | 'employee'
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
