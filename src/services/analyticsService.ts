/**
 * Service analytics — données historiques multi-mois pour la page /analytique
 */

import { supabase } from '@/lib/supabase/client'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { calculateShiftDuration } from '@/lib/compliance/utils'

export interface MonthlyData {
  month: string // 'YYYY-MM'
  label: string // 'Mars 2026'
  hoursCompleted: number
  hoursPlanned: number
  totalHours: number
  costGross: number
  costWithCharges: number
  shiftsCount: number
  cancelledCount: number
  absentCount: number
}

export interface AuxiliaryBreakdown {
  contractId: string
  employeeName: string
  hours: number
  cost: number
  shiftsCount: number
}

export interface PresenceRate {
  month: string
  label: string
  total: number
  completed: number
  cancelled: number
  absent: number
  rate: number // percentage
}

export interface AnalyticsSummary {
  monthlyData: MonthlyData[]
  auxiliaryBreakdown: AuxiliaryBreakdown[]
  presenceRates: PresenceRate[]
  totals: {
    totalHours: number
    totalCost: number
    avgHoursPerMonth: number
    avgCostPerMonth: number
  }
}

const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function formatMonthLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`
}

/**
 * Récupère les analytics employeur sur N mois
 */
export async function getEmployerAnalytics(
  employerId: string,
  months: number = 6,
): Promise<AnalyticsSummary> {
  const now = new Date()

  // Récupérer les contrats actifs avec infos employé
  const { data: contracts } = await supabase
    .from('contracts')
    .select(`id, hourly_rate, employee_id, employee_profile:employees!employee_id(profile:profiles!profile_id(first_name, last_name))`)
    .eq('employer_id', employerId)
    .eq('status', 'active')

  const contractIds = (contracts || []).map(c => c.id)

  if (contractIds.length === 0) {
    return {
      monthlyData: [],
      auxiliaryBreakdown: [],
      presenceRates: [],
      totals: { totalHours: 0, totalCost: 0, avgHoursPerMonth: 0, avgCostPerMonth: 0 },
    }
  }

  // Plage de dates complète
  const rangeStart = startOfMonth(subMonths(now, months - 1))
  const rangeEnd = endOfMonth(now)

  // Récupérer tous les shifts de la période
  const { data: allShifts } = await supabase
    .from('shifts')
    .select('start_time, end_time, break_duration, status, date, contract_id')
    .in('contract_id', contractIds)
    .gte('date', format(rangeStart, 'yyyy-MM-dd'))
    .lte('date', format(rangeEnd, 'yyyy-MM-dd'))

  const shifts = allShifts || []

  // Construire les données par mois
  const monthlyData: MonthlyData[] = []
  const presenceRates: PresenceRate[] = []

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const monthKey = format(monthDate, 'yyyy-MM')
    const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd')

    const monthShifts = shifts.filter(
      s => s.date >= monthStart && s.date <= monthEnd,
    )

    const completed = monthShifts.filter(s => s.status === 'completed')
    const planned = monthShifts.filter(s => s.status === 'planned')
    const cancelled = monthShifts.filter(s => s.status === 'cancelled')
    const absent = monthShifts.filter(s => s.status === 'absent')

    const hoursCompleted = calculateTotalHours(completed)
    const hoursPlanned = calculateTotalHours(planned)
    const totalHours = hoursCompleted + hoursPlanned

    const avgRate = contracts!.length > 0
      ? contracts!.reduce((sum, c) => sum + (c.hourly_rate || 0), 0) / contracts!.length
      : 0

    const label = formatMonthLabel(monthDate)

    monthlyData.push({
      month: monthKey,
      label,
      hoursCompleted: round(hoursCompleted),
      hoursPlanned: round(hoursPlanned),
      totalHours: round(totalHours),
      costGross: Math.round(totalHours * avgRate),
      costWithCharges: Math.round(totalHours * avgRate * 1.42),
      shiftsCount: monthShifts.length,
      cancelledCount: cancelled.length,
      absentCount: absent.length,
    })

    const totalForRate = completed.length + cancelled.length + absent.length
    presenceRates.push({
      month: monthKey,
      label,
      total: totalForRate,
      completed: completed.length,
      cancelled: cancelled.length,
      absent: absent.length,
      rate: totalForRate > 0 ? Math.round((completed.length / totalForRate) * 100) : 0,
    })
  }

  // Breakdown par auxiliaire (mois courant)
  const currentMonthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const currentMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const currentShifts = shifts.filter(
    s => s.date >= currentMonthStart && s.date <= currentMonthEnd
      && (s.status === 'completed' || s.status === 'planned'),
  )

  const auxiliaryBreakdown: AuxiliaryBreakdown[] = (contracts || []).map(contract => {
    const contractShifts = currentShifts.filter(s => s.contract_id === contract.id)
    const hours = calculateTotalHours(contractShifts)
    const empProfile = (contract as Record<string, unknown>).employee_profile as { profile?: { first_name: string; last_name: string } | null } | null
    const profile = empProfile?.profile

    return {
      contractId: contract.id,
      employeeName: profile
        ? `${profile.first_name} ${profile.last_name}`
        : 'Inconnu',
      hours: round(hours),
      cost: Math.round(hours * (contract.hourly_rate || 0) * 1.42),
      shiftsCount: contractShifts.length,
    }
  }).filter(a => a.shiftsCount > 0)

  // Totaux
  const totalHours = monthlyData.reduce((sum, m) => sum + m.totalHours, 0)
  const totalCost = monthlyData.reduce((sum, m) => sum + m.costWithCharges, 0)

  return {
    monthlyData,
    auxiliaryBreakdown,
    presenceRates,
    totals: {
      totalHours: round(totalHours),
      totalCost: Math.round(totalCost),
      avgHoursPerMonth: round(totalHours / months),
      avgCostPerMonth: Math.round(totalCost / months),
    },
  }
}

/**
 * Analytics pour un employé (auxiliaire)
 */
export async function getEmployeeAnalytics(
  employeeId: string,
  months: number = 6,
): Promise<AnalyticsSummary> {
  const now = new Date()

  const { data: contracts } = await supabase
    .from('contracts')
    .select(`id, hourly_rate, employer_id, status, employer_profile:employers!employer_id(profile:profiles!profile_id(first_name, last_name))`)
    .eq('employee_id', employeeId)
    .eq('status', 'active')

  const contractIds = (contracts || []).map(c => c.id)

  if (contractIds.length === 0) {
    return {
      monthlyData: [],
      auxiliaryBreakdown: [],
      presenceRates: [],
      totals: { totalHours: 0, totalCost: 0, avgHoursPerMonth: 0, avgCostPerMonth: 0 },
    }
  }

  const rangeStart = startOfMonth(subMonths(now, months - 1))
  const rangeEnd = endOfMonth(now)

  const { data: allShifts } = await supabase
    .from('shifts')
    .select('start_time, end_time, break_duration, status, date, contract_id')
    .in('contract_id', contractIds)
    .gte('date', format(rangeStart, 'yyyy-MM-dd'))
    .lte('date', format(rangeEnd, 'yyyy-MM-dd'))

  const shifts = allShifts || []

  const monthlyData: MonthlyData[] = []
  const presenceRates: PresenceRate[] = []

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const monthKey = format(monthDate, 'yyyy-MM')
    const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd')

    const monthShifts = shifts.filter(s => s.date >= monthStart && s.date <= monthEnd)
    const completed = monthShifts.filter(s => s.status === 'completed')
    const planned = monthShifts.filter(s => s.status === 'planned')
    const cancelled = monthShifts.filter(s => s.status === 'cancelled')
    const absent = monthShifts.filter(s => s.status === 'absent')

    const hoursCompleted = calculateTotalHours(completed)
    const hoursPlanned = calculateTotalHours(planned)
    const totalHours = hoursCompleted + hoursPlanned

    // Revenue = heures × taux horaire de chaque contrat
    let revenue = 0
    for (const shift of [...completed, ...planned]) {
      const contract = contracts?.find(c => c.id === shift.contract_id)
      if (contract) {
        const hours = calculateShiftDuration(shift.start_time, shift.end_time, shift.break_duration || 0) / 60
        revenue += hours * (contract.hourly_rate || 0)
      }
    }

    const label = formatMonthLabel(monthDate)

    monthlyData.push({
      month: monthKey,
      label,
      hoursCompleted: round(hoursCompleted),
      hoursPlanned: round(hoursPlanned),
      totalHours: round(totalHours),
      costGross: Math.round(revenue),
      costWithCharges: Math.round(revenue),
      shiftsCount: monthShifts.length,
      cancelledCount: cancelled.length,
      absentCount: absent.length,
    })

    const totalForRate = completed.length + cancelled.length + absent.length
    presenceRates.push({
      month: monthKey,
      label,
      total: totalForRate,
      completed: completed.length,
      cancelled: cancelled.length,
      absent: absent.length,
      rate: totalForRate > 0 ? Math.round((completed.length / totalForRate) * 100) : 0,
    })
  }

  // Pas de breakdown auxiliaire pour un employé
  const totalHours = monthlyData.reduce((sum, m) => sum + m.totalHours, 0)
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.costGross, 0)

  return {
    monthlyData,
    auxiliaryBreakdown: [],
    presenceRates,
    totals: {
      totalHours: round(totalHours),
      totalCost: Math.round(totalRevenue),
      avgHoursPerMonth: round(totalHours / months),
      avgCostPerMonth: Math.round(totalRevenue / months),
    },
  }
}

function calculateTotalHours(
  shifts: Array<{ start_time: string; end_time: string; break_duration: number | null }>,
): number {
  return shifts.reduce((total, shift) => {
    const duration = calculateShiftDuration(
      shift.start_time,
      shift.end_time,
      shift.break_duration || 0,
    )
    return total + duration / 60
  }, 0)
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
