/**
 * Service de statistiques pour le dashboard
 * Agrège les données depuis Supabase pour les différents rôles
 */

import { supabase } from '@/lib/supabase/client'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { calculateShiftDuration } from '@/lib/compliance/utils'

// Types pour les statistiques
export interface EmployerStats {
  hoursThisMonth: number
  hoursLastMonth: number
  hoursDiff: number
  monthlyCost: number
  shiftsThisMonth: number
  activeAuxiliaries: number
  upcomingShifts: number
}

export interface EmployeeStats {
  hoursThisMonth: number
  hoursLastMonth: number
  hoursDiff: number
  estimatedRevenue: number
  activeEmployers: number
  shiftsThisMonth: number
  upcomingShifts: number
}

export interface CaregiverStats {
  shiftsThisMonth: number
  logEntriesThisWeek: number
  upcomingShifts: number
  unreadLogs: number
}

/**
 * Récupère les statistiques pour un employeur
 */
export async function getEmployerStats(employerId: string): Promise<EmployerStats> {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  // Récupérer les contrats actifs
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, hourly_rate')
    .eq('employer_id', employerId)
    .eq('status', 'active')

  const contractIds = (contracts || []).map(c => c.id)
  const activeAuxiliaries = contracts?.length || 0

  if (contractIds.length === 0) {
    return {
      hoursThisMonth: 0,
      hoursLastMonth: 0,
      hoursDiff: 0,
      monthlyCost: 0,
      shiftsThisMonth: 0,
      activeAuxiliaries: 0,
      upcomingShifts: 0,
    }
  }

  // Récupérer les shifts de ce mois
  const { data: shiftsThisMonth } = await supabase
    .from('shifts')
    .select('start_time, end_time, break_duration, status, date, contract_id')
    .in('contract_id', contractIds)
    .gte('date', format(thisMonthStart, 'yyyy-MM-dd'))
    .lte('date', format(thisMonthEnd, 'yyyy-MM-dd'))
    .in('status', ['completed', 'planned'])

  // Récupérer les shifts du mois dernier
  const { data: shiftsLastMonth } = await supabase
    .from('shifts')
    .select('start_time, end_time, break_duration, status')
    .in('contract_id', contractIds)
    .gte('date', format(lastMonthStart, 'yyyy-MM-dd'))
    .lte('date', format(lastMonthEnd, 'yyyy-MM-dd'))
    .eq('status', 'completed')

  // Récupérer les shifts à venir
  const { data: upcomingShiftsData } = await supabase
    .from('shifts')
    .select('id')
    .in('contract_id', contractIds)
    .gte('date', format(now, 'yyyy-MM-dd'))
    .eq('status', 'planned')

  // Calculer les heures
  const hoursThisMonth = calculateTotalHours(shiftsThisMonth || [])
  const hoursLastMonth = calculateTotalHours(shiftsLastMonth || [])
  const hoursDiff = hoursThisMonth - hoursLastMonth

  // Calculer le coût mensuel estimé (avec taux horaire moyen)
  const avgHourlyRate = contracts && contracts.length > 0
    ? contracts.reduce((sum, c) => sum + (c.hourly_rate || 0), 0) / contracts.length
    : 0
  const monthlyCost = hoursThisMonth * avgHourlyRate * 1.42 // Avec charges patronales (~42%)

  return {
    hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    hoursLastMonth: Math.round(hoursLastMonth * 10) / 10,
    hoursDiff: Math.round(hoursDiff * 10) / 10,
    monthlyCost: Math.round(monthlyCost),
    shiftsThisMonth: shiftsThisMonth?.length || 0,
    activeAuxiliaries,
    upcomingShifts: upcomingShiftsData?.length || 0,
  }
}

/**
 * Récupère les statistiques pour un employé (auxiliaire)
 */
export async function getEmployeeStats(employeeId: string): Promise<EmployeeStats> {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  // Récupérer les contrats actifs de l'employé
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, hourly_rate, employer_id')
    .eq('employee_id', employeeId)
    .eq('status', 'active')

  const contractIds = (contracts || []).map(c => c.id)
  const activeEmployers = new Set((contracts || []).map(c => c.employer_id)).size

  if (contractIds.length === 0) {
    return {
      hoursThisMonth: 0,
      hoursLastMonth: 0,
      hoursDiff: 0,
      estimatedRevenue: 0,
      activeEmployers: 0,
      shiftsThisMonth: 0,
      upcomingShifts: 0,
    }
  }

  // Récupérer les shifts de ce mois
  const { data: shiftsThisMonth } = await supabase
    .from('shifts')
    .select('start_time, end_time, break_duration, status, contract_id')
    .in('contract_id', contractIds)
    .gte('date', format(thisMonthStart, 'yyyy-MM-dd'))
    .lte('date', format(thisMonthEnd, 'yyyy-MM-dd'))
    .in('status', ['completed', 'planned'])

  // Récupérer les shifts du mois dernier
  const { data: shiftsLastMonth } = await supabase
    .from('shifts')
    .select('start_time, end_time, break_duration, status')
    .in('contract_id', contractIds)
    .gte('date', format(lastMonthStart, 'yyyy-MM-dd'))
    .lte('date', format(lastMonthEnd, 'yyyy-MM-dd'))
    .eq('status', 'completed')

  // Récupérer les shifts à venir
  const { data: upcomingShiftsData } = await supabase
    .from('shifts')
    .select('id')
    .in('contract_id', contractIds)
    .gte('date', format(now, 'yyyy-MM-dd'))
    .eq('status', 'planned')

  // Calculer les heures
  const hoursThisMonth = calculateTotalHours(shiftsThisMonth || [])
  const hoursLastMonth = calculateTotalHours(shiftsLastMonth || [])
  const hoursDiff = hoursThisMonth - hoursLastMonth

  // Calculer les revenus estimés (brut)
  // On utilise le taux horaire de chaque contrat pour plus de précision
  let estimatedRevenue = 0
  for (const shift of (shiftsThisMonth || [])) {
    const contract = contracts?.find(c => c.id === shift.contract_id)
    if (contract) {
      const hours = calculateShiftDuration(shift.start_time, shift.end_time, shift.break_duration || 0) / 60
      estimatedRevenue += hours * (contract.hourly_rate || 0)
    }
  }

  return {
    hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    hoursLastMonth: Math.round(hoursLastMonth * 10) / 10,
    hoursDiff: Math.round(hoursDiff * 10) / 10,
    estimatedRevenue: Math.round(estimatedRevenue),
    activeEmployers,
    shiftsThisMonth: shiftsThisMonth?.length || 0,
    upcomingShifts: upcomingShiftsData?.length || 0,
  }
}

/**
 * Récupère les statistiques pour un aidant (caregiver)
 */
export async function getCaregiverStats(caregiverId: string): Promise<CaregiverStats> {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)

  // Récupérer l'employeur associé à l'aidant
  const { data: caregiver } = await supabase
    .from('caregivers')
    .select('employer_id')
    .eq('profile_id', caregiverId)
    .single()

  if (!caregiver?.employer_id) {
    return {
      shiftsThisMonth: 0,
      logEntriesThisWeek: 0,
      upcomingShifts: 0,
      unreadLogs: 0,
    }
  }

  const employerId = caregiver.employer_id

  // Récupérer les contrats de l'employeur
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id')
    .eq('employer_id', employerId)
    .eq('status', 'active')

  const contractIds = (contracts || []).map(c => c.id)

  // Récupérer les shifts de ce mois
  const { data: shiftsThisMonth } = contractIds.length > 0
    ? await supabase
        .from('shifts')
        .select('id')
        .in('contract_id', contractIds)
        .gte('date', format(thisMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(thisMonthEnd, 'yyyy-MM-dd'))
        .in('status', ['completed', 'planned'])
    : { data: [] }

  // Récupérer les shifts à venir
  const { data: upcomingShiftsData } = contractIds.length > 0
    ? await supabase
        .from('shifts')
        .select('id')
        .in('contract_id', contractIds)
        .gte('date', format(now, 'yyyy-MM-dd'))
        .eq('status', 'planned')
    : { data: [] }

  // Récupérer les entrées du cahier de liaison cette semaine
  const { data: logEntries } = await supabase
    .from('log_entries')
    .select('id, read_by')
    .eq('employer_id', employerId)
    .gte('created_at', weekStart.toISOString())

  // Compter les entrées non lues
  const unreadLogs = (logEntries || []).filter(
    entry => !entry.read_by?.includes(caregiverId)
  ).length

  return {
    shiftsThisMonth: shiftsThisMonth?.length || 0,
    logEntriesThisWeek: logEntries?.length || 0,
    upcomingShifts: upcomingShiftsData?.length || 0,
    unreadLogs,
  }
}

/**
 * Calcule le total d'heures depuis une liste de shifts
 */
function calculateTotalHours(
  shifts: Array<{ start_time: string; end_time: string; break_duration: number | null }>
): number {
  return shifts.reduce((total, shift) => {
    const duration = calculateShiftDuration(
      shift.start_time,
      shift.end_time,
      shift.break_duration || 0
    )
    return total + duration / 60
  }, 0)
}
