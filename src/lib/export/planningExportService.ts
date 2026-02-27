/**
 * Service de génération des données de planning pour export
 * Agrège shifts + absences par mois pour un employeur (ou un employé)
 */

import { supabase } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { calculateShiftDuration } from '@/lib/compliance/utils'
import { isPublicHoliday, isSunday } from '@/lib/compliance/types'
import { MAJORATION_RATES } from '@/lib/compliance/calculatePay'
import { logger } from '@/lib/logger'
import type { ShiftDbRow, AbsenceDbRow } from '@/types/database'
import type {
  PlanningExportData,
  EmployeePlanningData,
  PlanningShiftEntry,
  PlanningAbsenceEntry,
  PlanningExportOptions,
} from './types'
import { getMonthLabel } from './types'

// ─── Types internes DB ────────────────────────────────────────────────────────

interface ContractForPlanningDb {
  id: string
  employee_id: string
  contract_type: 'CDI' | 'CDD'
  hourly_rate: number
  weekly_hours: number
  employee_profile?: {
    profile?: {
      id?: string
      first_name?: string
      last_name?: string
    }
  }
}

// ─── Point d'entrée public (vue employeur) ────────────────────────────────────

/**
 * Récupère les données de planning pour tous les employés d'un employeur
 * (ou un seul si options.employeeId est renseigné).
 */
export async function getPlanningExportData(
  employerId: string,
  options: PlanningExportOptions
): Promise<PlanningExportData | null> {
  const { year, month, employeeId } = options

  const startDate = startOfMonth(new Date(year, month - 1))
  const endDate = endOfMonth(new Date(year, month - 1))

  // ── Profil employeur ──────────────────────────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', employerId)
    .single()

  if (profileError || !profile) {
    logger.error('Employeur introuvable pour export planning:', profileError)
    return null
  }

  // ── Contrats actifs ───────────────────────────────────────────────────────
  const contracts = await getActiveContracts(employerId, employeeId)
  if (contracts.length === 0) {
    logger.error('Aucun contrat actif pour export planning')
    return null
  }

  // ── Données par employé ───────────────────────────────────────────────────
  const employees: EmployeePlanningData[] = []

  for (const contract of contracts) {
    const [shifts, absences] = await Promise.all([
      getShiftsForPeriod(contract.id, startDate, endDate),
      getAbsencesForPeriod(contract.employee_id, startDate, endDate),
    ])

    const employeeData = buildEmployeeData(contract, shifts, absences)
    employees.push(employeeData)
  }

  const totalShifts = employees.reduce((s, e) => s + e.totalShifts, 0)
  const totalHours = employees.reduce((s, e) => s + e.totalHours, 0)

  return {
    year,
    month,
    periodLabel: getMonthLabel(year, month),
    employerId,
    employerFirstName: profile.first_name,
    employerLastName: profile.last_name,
    employees,
    totalEmployees: employees.length,
    totalShifts,
    totalHours: Math.round(totalHours * 100) / 100,
    generatedAt: new Date(),
  }
}

/**
 * Récupère les données de planning pour un employé (vue employé).
 * Résout l'employerId via le contrat actif.
 */
export async function getPlanningExportDataForEmployee(
  employeeId: string,
  options: PlanningExportOptions
): Promise<PlanningExportData | null> {
  // Résoudre l'employerId depuis le contrat actif de l'employé
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('employer_id')
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !contract) {
    logger.error('Contrat actif introuvable pour employé:', employeeId)
    return null
  }

  return getPlanningExportData(contract.employer_id, { ...options, employeeId })
}

// ─── Helpers privés ───────────────────────────────────────────────────────────

async function getActiveContracts(
  employerId: string,
  employeeId?: string
): Promise<ContractForPlanningDb[]> {
  let query = supabase
    .from('contracts')
    .select(`
      id,
      employee_id,
      contract_type,
      hourly_rate,
      weekly_hours,
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

  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }

  const { data, error } = await query
  if (error) {
    logger.error('Erreur récupération contrats planning:', error)
    return []
  }
  return (data || []) as ContractForPlanningDb[]
}

async function getShiftsForPeriod(
  contractId: string,
  startDate: Date,
  endDate: Date
): Promise<ShiftDbRow[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('contract_id', contractId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'))
    .order('date', { ascending: true })

  if (error) {
    logger.error('Erreur récupération shifts planning:', error)
    return []
  }
  return (data || []) as ShiftDbRow[]
}

async function getAbsencesForPeriod(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<AbsenceDbRow[]> {
  // Toutes les absences qui se chevauchent avec la période
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .eq('employee_id', employeeId)
    .lte('start_date', format(endDate, 'yyyy-MM-dd'))
    .gte('end_date', format(startDate, 'yyyy-MM-dd'))
    .order('start_date', { ascending: true })

  if (error) {
    logger.error('Erreur récupération absences planning:', error)
    return []
  }
  return (data || []) as AbsenceDbRow[]
}

function buildEmployeeData(
  contract: ContractForPlanningDb,
  shifts: ShiftDbRow[],
  absences: AbsenceDbRow[]
): EmployeePlanningData {
  const hourlyRate = contract.hourly_rate

  const planningShifts: PlanningShiftEntry[] = shifts.map((s) => {
    const shiftDate = parseISO(s.date)
    const effectiveMinutes = calculateShiftDuration(
      s.start_time,
      s.end_time,
      s.break_duration || 0
    )
    const effectiveHours = effectiveMinutes / 60
    const isSundayShift = isSunday(shiftDate)
    const isHolidayShift = isPublicHoliday(shiftDate)

    let totalPay = effectiveHours * hourlyRate
    if (isSundayShift) totalPay += totalPay * MAJORATION_RATES.SUNDAY
    if (isHolidayShift) totalPay += effectiveHours * hourlyRate * MAJORATION_RATES.PUBLIC_HOLIDAY_WORKED

    return {
      id: s.id,
      date: shiftDate,
      startTime: s.start_time,
      endTime: s.end_time,
      breakDuration: s.break_duration || 0,
      shiftType: s.shift_type,
      status: s.status,
      effectiveHours: Math.round(effectiveHours * 100) / 100,
      isSunday: isSundayShift,
      isHoliday: isHolidayShift,
      totalPay: Math.round(totalPay * 100) / 100,
    }
  })

  const planningAbsences: PlanningAbsenceEntry[] = absences.map((a) => ({
    id: a.id,
    startDate: parseISO(a.start_date),
    endDate: parseISO(a.end_date),
    absenceType: a.absence_type,
    status: a.status,
  }))

  const totalShifts = planningShifts.filter(
    (s) => s.status !== 'cancelled'
  ).length
  const totalHours = planningShifts.reduce((sum, s) => sum + s.effectiveHours, 0)
  const totalPay = planningShifts.reduce((sum, s) => sum + s.totalPay, 0)

  return {
    employeeId: contract.employee_id,
    firstName: contract.employee_profile?.profile?.first_name || '',
    lastName: contract.employee_profile?.profile?.last_name || '',
    contractId: contract.id,
    contractType: contract.contract_type,
    weeklyHours: contract.weekly_hours || 0,
    hourlyRate,
    shifts: planningShifts,
    absences: planningAbsences,
    totalShifts,
    totalHours: Math.round(totalHours * 100) / 100,
    totalPay: Math.round(totalPay * 100) / 100,
  }
}
