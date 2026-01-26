/**
 * Service de conformité - Récupération des données pour le tableau de bord
 */

import { supabase } from '@/lib/supabase/client'
import type { ShiftForValidation } from '@/lib/compliance/types'
import {
  getWeekStart,
  getWeekEnd,
  calculateTotalHours,
  getRemainingWeeklyHours,
  getRemainingDailyHours,
  getWeeklyRestStatus,
} from '@/lib/compliance'
import { addDays, subDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface EmployeeComplianceStatus {
  employeeId: string
  employeeName: string
  avatarUrl?: string
  contractId: string
  weeklyHours: number // Heures contractuelles
  currentWeekHours: number // Heures travaillées cette semaine
  remainingWeeklyHours: number // Heures restantes (max 48)
  remainingDailyHours: number // Heures restantes aujourd'hui
  weeklyRestStatus: {
    longestRest: number
    isCompliant: boolean
  }
  alerts: ComplianceAlert[]
  status: 'ok' | 'warning' | 'critical'
}

export interface ComplianceAlert {
  type: 'weekly_hours' | 'daily_hours' | 'weekly_rest' | 'daily_rest'
  severity: 'warning' | 'critical'
  message: string
}

export interface WeeklyComplianceOverview {
  weekStart: Date
  weekEnd: Date
  weekLabel: string
  employees: EmployeeComplianceStatus[]
  summary: {
    totalEmployees: number
    compliant: number
    warnings: number
    critical: number
  }
}

/**
 * Récupère toutes les interventions d'un employeur sur une période
 */
async function getShiftsForPeriod(
  employerId: string,
  startDate: Date,
  endDate: Date
): Promise<ShiftForValidation[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select(`
      id,
      contract_id,
      date,
      start_time,
      end_time,
      break_duration,
      status,
      contract:contracts!contract_id(
        employee_id,
        employer_id
      )
    `)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .in('status', ['planned', 'completed'])

  if (error) {
    console.error('Erreur récupération interventions:', error)
    return []
  }

  // Filtrer par employeur et mapper
  type ShiftRow = {
    id: string
    contract_id: string
    date: string
    start_time: string
    end_time: string
    break_duration: number | null
    status: string
    contract: { employee_id: string; employer_id: string } | null
  }
  return (data as ShiftRow[] || [])
    .filter((s) => s.contract?.employer_id === employerId)
    .map((s): ShiftForValidation => ({
      id: s.id,
      contractId: s.contract_id,
      employeeId: s.contract?.employee_id || '',
      date: new Date(s.date),
      startTime: s.start_time,
      endTime: s.end_time,
      breakDuration: s.break_duration || 0,
    }))
}

/**
 * Récupère les auxiliaires actifs d'un employeur
 */
async function getActiveEmployees(employerId: string): Promise<
  Array<{
    employeeId: string
    employeeName: string
    avatarUrl?: string
    contractId: string
    weeklyHours: number
  }>
> {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      id,
      employee_id,
      weekly_hours,
      employee:profiles!employee_id(
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('employer_id', employerId)
    .eq('status', 'active')

  if (error) {
    console.error('Erreur récupération employés:', error)
    return []
  }

  type ContractRow = {
    id: string
    employee_id: string
    weekly_hours: number
    employee: { first_name: string | null; last_name: string | null; avatar_url: string | null } | null
  }
  return (data as ContractRow[] || []).map((c) => ({
    employeeId: c.employee_id,
    employeeName: `${c.employee?.first_name || ''} ${c.employee?.last_name || ''}`.trim(),
    avatarUrl: c.employee?.avatar_url ?? undefined,
    contractId: c.id,
    weeklyHours: c.weekly_hours,
  }))
}

/**
 * Calcule le statut de conformité pour un employé sur une semaine
 */
function calculateEmployeeStatus(
  employee: {
    employeeId: string
    employeeName: string
    avatarUrl?: string
    contractId: string
    weeklyHours: number
  },
  shifts: ShiftForValidation[],
  referenceDate: Date
): EmployeeComplianceStatus {
  const employeeShifts = shifts.filter((s) => s.employeeId === employee.employeeId)
  const today = new Date()

  // Heures travaillées cette semaine
  const weekStart = getWeekStart(referenceDate)
  const weekEnd = getWeekEnd(referenceDate)
  const weekShifts = employeeShifts.filter(
    (s) => s.date >= weekStart && s.date <= weekEnd
  )
  const currentWeekHours = calculateTotalHours(weekShifts)

  // Heures restantes
  const remainingWeeklyHours = getRemainingWeeklyHours(
    referenceDate,
    employee.employeeId,
    shifts
  )
  const remainingDailyHours = getRemainingDailyHours(today, employee.employeeId, shifts)

  // Repos hebdomadaire
  const weeklyRestStatus = getWeeklyRestStatus(referenceDate, employee.employeeId, shifts)

  // Générer les alertes
  const alerts: ComplianceAlert[] = []

  // Alerte heures hebdomadaires
  if (currentWeekHours > 48) {
    alerts.push({
      type: 'weekly_hours',
      severity: 'critical',
      message: `Dépassement: ${currentWeekHours.toFixed(1)}h cette semaine (max 48h)`,
    })
  } else if (currentWeekHours > 44) {
    alerts.push({
      type: 'weekly_hours',
      severity: 'warning',
      message: `Attention: ${currentWeekHours.toFixed(1)}h cette semaine (seuil 44h)`,
    })
  }

  // Alerte repos hebdomadaire
  if (!weeklyRestStatus.isCompliant) {
    alerts.push({
      type: 'weekly_rest',
      severity: 'critical',
      message: `Repos insuffisant: ${weeklyRestStatus.longestRest.toFixed(1)}h (min 35h)`,
    })
  }

  // Alerte heures restantes aujourd'hui
  if (remainingDailyHours <= 0 && today >= weekStart && today <= weekEnd) {
    alerts.push({
      type: 'daily_hours',
      severity: 'critical',
      message: `Maximum quotidien atteint aujourd'hui`,
    })
  } else if (remainingDailyHours <= 2 && today >= weekStart && today <= weekEnd) {
    alerts.push({
      type: 'daily_hours',
      severity: 'warning',
      message: `Seulement ${remainingDailyHours.toFixed(1)}h disponibles aujourd'hui`,
    })
  }

  // Déterminer le statut global
  let status: 'ok' | 'warning' | 'critical' = 'ok'
  if (alerts.some((a) => a.severity === 'critical')) {
    status = 'critical'
  } else if (alerts.some((a) => a.severity === 'warning')) {
    status = 'warning'
  }

  return {
    employeeId: employee.employeeId,
    employeeName: employee.employeeName,
    avatarUrl: employee.avatarUrl,
    contractId: employee.contractId,
    weeklyHours: employee.weeklyHours,
    currentWeekHours: Math.round(currentWeekHours * 10) / 10,
    remainingWeeklyHours: Math.round(remainingWeeklyHours * 10) / 10,
    remainingDailyHours: Math.round(remainingDailyHours * 10) / 10,
    weeklyRestStatus: {
      longestRest: Math.round(weeklyRestStatus.longestRest * 10) / 10,
      isCompliant: weeklyRestStatus.isCompliant,
    },
    alerts,
    status,
  }
}

/**
 * Récupère la vue d'ensemble de conformité pour une semaine donnée
 */
export async function getWeeklyComplianceOverview(
  employerId: string,
  referenceDate: Date = new Date()
): Promise<WeeklyComplianceOverview> {
  const weekStart = getWeekStart(referenceDate)
  const weekEnd = getWeekEnd(referenceDate)

  // Étendre la période pour inclure les données nécessaires au calcul du repos
  const extendedStart = subDays(weekStart, 7)
  const extendedEnd = addDays(weekEnd, 1)

  // Récupérer les données en parallèle
  const [employees, shifts] = await Promise.all([
    getActiveEmployees(employerId),
    getShiftsForPeriod(employerId, extendedStart, extendedEnd),
  ])

  // Calculer le statut de chaque employé
  const employeeStatuses = employees.map((emp) =>
    calculateEmployeeStatus(emp, shifts, referenceDate)
  )

  // Calculer le résumé
  const summary = {
    totalEmployees: employeeStatuses.length,
    compliant: employeeStatuses.filter((e) => e.status === 'ok').length,
    warnings: employeeStatuses.filter((e) => e.status === 'warning').length,
    critical: employeeStatuses.filter((e) => e.status === 'critical').length,
  }

  return {
    weekStart,
    weekEnd,
    weekLabel: `Semaine du ${format(weekStart, 'd MMMM', { locale: fr })} au ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`,
    employees: employeeStatuses,
    summary,
  }
}

/**
 * Récupère l'historique de conformité sur plusieurs semaines
 */
export async function getComplianceHistory(
  employerId: string,
  weeksBack: number = 4
): Promise<
  Array<{
    weekStart: Date
    weekLabel: string
    compliant: number
    warnings: number
    critical: number
  }>
> {
  const history: Array<{
    weekStart: Date
    weekLabel: string
    compliant: number
    warnings: number
    critical: number
  }> = []

  const today = new Date()

  for (let i = 0; i < weeksBack; i++) {
    const refDate = subDays(today, i * 7)
    const overview = await getWeeklyComplianceOverview(employerId, refDate)

    history.push({
      weekStart: overview.weekStart,
      weekLabel: format(overview.weekStart, "'S'w", { locale: fr }),
      compliant: overview.summary.compliant,
      warnings: overview.summary.warnings,
      critical: overview.summary.critical,
    })
  }

  return history.reverse()
}

/**
 * Récupère les alertes critiques actives
 */
export async function getCriticalAlerts(
  employerId: string
): Promise<ComplianceAlert[]> {
  const overview = await getWeeklyComplianceOverview(employerId)

  return overview.employees
    .flatMap((e) =>
      e.alerts
        .filter((a) => a.severity === 'critical')
        .map((a) => ({
          ...a,
          message: `${e.employeeName}: ${a.message}`,
        }))
    )
}
