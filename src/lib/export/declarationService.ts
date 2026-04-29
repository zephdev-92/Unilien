/**
 * Service de génération des données de déclaration
 * Agrège les données des interventions pour les déclarations CESU
 */

import { supabase } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { calculateShiftDuration, calculateNightHours } from '@/lib/compliance/utils'
import { isPublicHoliday, isSunday } from '@/lib/compliance/types'
import { calculateShiftPay, calculateOvertimeHours, MAJORATION_RATES } from '@/lib/compliance/calculatePay'
import type { ShiftForValidation, ContractForCalculation, GuardSegment } from '@/lib/compliance/types'
import { calculateCotisations } from './cotisationsCalculator'
import type {
  MonthlyDeclarationData,
  EmployeeDeclarationData,
  ShiftDeclarationDetail,
  ExportOptions,
} from './types'
import { getMonthLabel } from './types'
import type { AddressDb, ShiftDbRow } from '@/types/database'
import { logger } from '@/lib/logger'

// Types pour les données de la DB
interface EmployerDataDb {
  firstName: string
  lastName: string
  address: {
    street: string
    city: string
    postalCode: string
  }
  cesuNumber?: string
}

interface ContractForDeclarationDb {
  id: string
  employee_id: string
  contract_type: 'CDI' | 'CDD'
  start_date: string
  end_date: string | null
  hourly_rate: number
  weekly_hours: number
  pas_rate?: number
  employee_profile?: {
    profile?: {
      id?: string
      first_name?: string
      last_name?: string
    }
  }
}

/**
 * Récupère les données complètes pour une déclaration mensuelle
 */
export async function getMonthlyDeclarationData(
  employerId: string,
  options: ExportOptions
): Promise<MonthlyDeclarationData | null> {
  const { year, month, employeeIds } = options

  // Dates de la période
  const startDate = startOfMonth(new Date(year, month - 1))
  const endDate = endOfMonth(new Date(year, month - 1))

  // Récupérer les infos employeur
  const employerData = await getEmployerData(employerId)
  if (!employerData) {
    logger.error('Employeur non trouvé')
    return null
  }

  // Récupérer les contrats actifs avec leurs employés
  const contracts = await getActiveContracts(employerId, employeeIds)
  if (contracts.length === 0) {
    logger.error('Aucun contrat actif trouvé')
    return null
  }

  // Pour chaque contrat, récupérer les shifts du mois et calculer
  const employees: EmployeeDeclarationData[] = []

  for (const contract of contracts) {
    const shifts = await getShiftsForPeriod(contract.id, startDate, endDate)
    if (shifts.length === 0) continue

    const employeeData = calculateEmployeeDeclaration(contract, shifts)
    employees.push(employeeData)
  }

  // Calculer les totaux
  const totalHours = employees.reduce((sum, e) => sum + e.totalHours, 0)
  const totalGrossPay = employees.reduce((sum, e) => sum + e.totalGrossPay, 0)
  const totalNetPay = employees.reduce((sum, e) => sum + e.netPay, 0)

  return {
    year,
    month,
    periodLabel: getMonthLabel(year, month),
    periodStartDate: startDate,
    periodEndDate: endDate,
    employerId,
    employerFirstName: employerData.firstName,
    employerLastName: employerData.lastName,
    employerAddress: formatAddress(employerData.address),
    cesuNumber: employerData.cesuNumber,
    employees,
    totalHours: Math.round(totalHours * 100) / 100,
    totalGrossPay: Math.round(totalGrossPay * 100) / 100,
    totalNetPay: Math.round(totalNetPay * 100) / 100,
    totalEmployees: employees.length,
    generatedAt: new Date(),
  }
}

/**
 * Récupère les données de l'employeur
 */
async function getEmployerData(employerId: string): Promise<EmployerDataDb | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', employerId)
    .single()

  if (profileError || !profile) return null

  const { data: employer, error: employerError } = await supabase
    .from('employers')
    .select('address, cesu_number')
    .eq('profile_id', employerId)
    .single()

  if (employerError || !employer) return null

  const address = employer.address as AddressDb | null

  return {
    firstName: profile.first_name,
    lastName: profile.last_name,
    address: {
      street: address?.street || '',
      city: address?.city || '',
      postalCode: address?.postalCode || '',
    },
    cesuNumber: employer.cesu_number || undefined,
  }
}

/**
 * Récupère les contrats actifs pour un employeur
 */
async function getActiveContracts(
  employerId: string,
  employeeIds?: string[]
): Promise<ContractForDeclarationDb[]> {
  let query = supabase
    .from('contracts')
    .select(`
      id,
      employee_id,
      contract_type,
      start_date,
      end_date,
      hourly_rate,
      weekly_hours,
      pas_rate,
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

  if (employeeIds && employeeIds.length > 0) {
    query = query.in('employee_id', employeeIds)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Erreur récupération contrats:', error)
    return []
  }

  return (data || []) as ContractForDeclarationDb[]
}

/**
 * Récupère les interventions pour une période
 */
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
    .in('status', ['completed', 'planned']) // Inclure planifiées et complétées
    .order('date', { ascending: true })

  if (error) {
    logger.error('Erreur récupération shifts:', error)
    return []
  }

  return (data || []) as ShiftDbRow[]
}

/**
 * Convertit un ShiftDbRow en ShiftForValidation enrichi pour calculateShiftPay.
 */
function toShiftForCalc(shift: ShiftDbRow, employeeId: string, contractId: string): ShiftForValidation {
  return {
    id: shift.id,
    contractId,
    employeeId,
    date: new Date(shift.date),
    startTime: shift.start_time,
    endTime: shift.end_time,
    breakDuration: shift.break_duration || 0,
    shiftType: shift.shift_type ?? 'effective',
    hasNightAction: shift.has_night_action !== false,
    nightInterventionsCount: shift.night_interventions_count ?? 0,
    guardSegments: (shift.guard_segments as GuardSegment[] | null) ?? undefined,
  }
}

/**
 * Calcule les données de déclaration pour un employé.
 *
 * Utilise `calculateShiftPay` pour chaque shift (source unique de vérité du calcul de paie
 * IDCC 3239 — y compris le split jour/nuit pour les présences mixtes), puis agrège
 * les composants pour obtenir les totaux mensuels.
 *
 * Le NET estimé est calculé via `calculateCotisations` à partir du brut total.
 */
function calculateEmployeeDeclaration(
  contract: ContractForDeclarationDb,
  shifts: ShiftDbRow[]
): EmployeeDeclarationData {
  const hourlyRate = contract.hourly_rate
  const contractualWeeklyHours = contract.weekly_hours || 35
  const contractForCalc: ContractForCalculation = {
    id: contract.id,
    weeklyHours: contractualWeeklyHours,
    hourlyRate,
  }
  const shiftsDetails: ShiftDeclarationDetail[] = []

  let totalHours = 0
  let effectiveWorkHours = 0
  let presenceDayHours = 0
  let presenceNightHours = 0
  let sundayHours = 0
  let holidayHours = 0
  let nightHours = 0
  let overtimeHours = 0

  let basePay = 0
  let sundayMajoration = 0
  let holidayMajoration = 0
  let nightMajoration = 0
  let overtimeMajoration = 0
  let presenceResponsiblePay = 0
  let nightPresenceAllowance = 0

  // Tous les shifts au format calcul (utile pour les heures sup contextualisées)
  const allShiftsForCalc = shifts.map((s) =>
    toShiftForCalc(s, contract.employee_id, contract.id)
  )

  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i]
    const shiftDate = new Date(shift.date)
    const shiftType = shift.shift_type || 'effective'
    const fullDurationHours =
      calculateShiftDuration(shift.start_time, shift.end_time, shift.break_duration || 0) / 60
    const shiftNightHours = calculateNightHours(shiftDate, shift.start_time, shift.end_time)
    const isSundayShift = isSunday(shiftDate)
    const isHolidayShift = isPublicHoliday(shiftDate)

    // Calcul de paie centralisé (split jour/nuit, requalification, garde 24h, majorations).
    // Hypothèse : travail habituel sur jours fériés → +60% (comportement historique du récap CESU).
    const shiftForCalc = allShiftsForCalc[i]
    const previousShifts = allShiftsForCalc.slice(0, i)
    const pay = calculateShiftPay(shiftForCalc, contractForCalc, previousShifts, true)

    // Agrégation des composants de paie (overtime recalculé en cumulatif plus bas)
    basePay += pay.basePay
    sundayMajoration += pay.sundayMajoration
    holidayMajoration += pay.holidayMajoration
    nightMajoration += pay.nightMajoration
    presenceResponsiblePay += pay.presenceResponsiblePay
    nightPresenceAllowance += pay.nightPresenceAllowance

    // Compteurs d'heures (par catégorie pour le récap)
    if (shiftType === 'presence_day') {
      presenceDayHours += fullDurationHours
    } else if (shiftType === 'presence_night') {
      presenceNightHours += fullDurationHours
    } else if (shiftType === 'guard_24h') {
      effectiveWorkHours += shift.effective_hours ?? 0
    } else {
      effectiveWorkHours += fullDurationHours
    }
    totalHours += fullDurationHours

    if (isSundayShift) sundayHours += fullDurationHours
    if (isHolidayShift) holidayHours += fullDurationHours
    // nightHours = heures de nuit majorées (uniquement si action de nuit)
    const shiftHasNightAction = shift.has_night_action !== false
    if (shiftNightHours > 0 && shiftHasNightAction && shiftType !== 'presence_day' && shiftType !== 'presence_night') {
      nightHours += shiftNightHours
    }

    // Heures sup : calcul cumulatif sur la semaine pour répartir +25% / +50%
    const shiftOvertime = calculateOvertimeHours(shiftForCalc, previousShifts, contractualWeeklyHours)
    if (shiftOvertime > 0) {
      const before = overtimeHours
      const after = overtimeHours + shiftOvertime
      const first8hAdded = Math.min(8, after) - Math.min(8, before)
      const beyond8hAdded = Math.max(0, after - 8) - Math.max(0, before - 8)
      overtimeMajoration += first8hAdded * hourlyRate * MAJORATION_RATES.OVERTIME_FIRST_8H
      overtimeMajoration += beyond8hAdded * hourlyRate * MAJORATION_RATES.OVERTIME_BEYOND_8H
      overtimeHours += shiftOvertime
    }

    shiftsDetails.push({
      date: shiftDate,
      startTime: shift.start_time,
      endTime: shift.end_time,
      breakDuration: shift.break_duration || 0,
      effectiveHours:
        shiftType === 'presence_day'
          ? (shift.effective_hours ?? fullDurationHours * (2 / 3))
          : shiftType === 'guard_24h'
            ? (shift.effective_hours ?? 0)
            : fullDurationHours,
      isSunday: isSundayShift,
      isHoliday: isHolidayShift,
      nightHours: shiftNightHours,
      pay: pay.totalPay,
    })
  }

  // Heures normales = total - spéciales - supplémentaires (sans double comptage)
  const normalHours = Math.max(0, totalHours - sundayHours - holidayHours - overtimeHours)

  const totalGrossPay =
    basePay + sundayMajoration + holidayMajoration + nightMajoration +
    overtimeMajoration + presenceResponsiblePay + nightPresenceAllowance

  // Net estimé via le calculateur de cotisations IDCC 3239
  const cotisations = calculateCotisations(totalGrossPay, {
    pasRate: contract.pas_rate ?? 0,
  })

  return {
    employeeId: contract.employee_id,
    firstName: contract.employee_profile?.profile?.first_name || '',
    lastName: contract.employee_profile?.profile?.last_name || '',
    contractId: contract.id,
    contractType: contract.contract_type,
    contractStartDate: contract.start_date ? new Date(contract.start_date) : undefined,
    contractEndDate: contract.end_date ? new Date(contract.end_date) : undefined,
    hourlyRate,
    totalHours: Math.round(totalHours * 100) / 100,
    normalHours: Math.round(normalHours * 100) / 100,
    effectiveWorkHours: Math.round(effectiveWorkHours * 100) / 100,
    presenceDayHours: Math.round(presenceDayHours * 100) / 100,
    presenceNightHours: Math.round(presenceNightHours * 100) / 100,
    sundayHours: Math.round(sundayHours * 100) / 100,
    holidayHours: Math.round(holidayHours * 100) / 100,
    nightHours: Math.round(nightHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    basePay: Math.round(basePay * 100) / 100,
    sundayMajoration: Math.round(sundayMajoration * 100) / 100,
    holidayMajoration: Math.round(holidayMajoration * 100) / 100,
    nightMajoration: Math.round(nightMajoration * 100) / 100,
    overtimeMajoration: Math.round(overtimeMajoration * 100) / 100,
    presenceResponsiblePay: Math.round(presenceResponsiblePay * 100) / 100,
    nightPresenceAllowance: Math.round(nightPresenceAllowance * 100) / 100,
    totalGrossPay: Math.round(totalGrossPay * 100) / 100,
    netPay: cotisations.netAPayer,
    totalEmployeeDeductions: cotisations.totalEmployeeDeductions,
    shiftsCount: shifts.length,
    shiftsDetails,
  }
}

/**
 * Formate une adresse pour l'affichage
 */
function formatAddress(address: { street: string; city: string; postalCode: string }): string {
  const parts = [address.street, `${address.postalCode} ${address.city}`].filter(Boolean)
  return parts.join(', ')
}
