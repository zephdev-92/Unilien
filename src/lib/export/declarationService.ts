/**
 * Service de génération des données de déclaration
 * Agrège les données des interventions pour les déclarations CESU
 */

import { supabase } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { calculateShiftDuration, calculateNightHours } from '@/lib/compliance/utils'
import { isPublicHoliday, isSunday } from '@/lib/compliance/types'
import { MAJORATION_RATES, calculateOvertimeHours } from '@/lib/compliance/calculatePay'
import type { ShiftForValidation } from '@/lib/compliance/types'
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

  return {
    year,
    month,
    periodLabel: getMonthLabel(year, month),
    employerId,
    employerFirstName: employerData.firstName,
    employerLastName: employerData.lastName,
    employerAddress: formatAddress(employerData.address),
    cesuNumber: employerData.cesuNumber,
    employees,
    totalHours: Math.round(totalHours * 100) / 100,
    totalGrossPay: Math.round(totalGrossPay * 100) / 100,
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
 * Convertit un ShiftDbRow en ShiftForValidation pour les fonctions de calcul centralisées
 */
function toShiftForValidation(shift: ShiftDbRow, employeeId: string, contractId: string): ShiftForValidation {
  return {
    id: shift.id,
    contractId,
    employeeId,
    date: new Date(shift.date),
    startTime: shift.start_time,
    endTime: shift.end_time,
    breakDuration: shift.break_duration || 0,
  }
}

/**
 * Calcule les données de déclaration pour un employé
 * Utilise les taux de MAJORATION_RATES (Convention Collective IDCC 3239)
 * et le calcul réel des heures supplémentaires via calculateOvertimeHours
 */
function calculateEmployeeDeclaration(
  contract: ContractForDeclarationDb,
  shifts: ShiftDbRow[]
): EmployeeDeclarationData {
  const hourlyRate = contract.hourly_rate
  const contractualWeeklyHours = contract.weekly_hours || 35
  const shiftsDetails: ShiftDeclarationDetail[] = []

  let totalHours = 0
  let normalHours = 0
  let sundayHours = 0
  let holidayHours = 0
  let nightHours = 0
  let overtimeHours = 0

  let basePay = 0
  let sundayMajoration = 0
  let holidayMajoration = 0
  let nightMajoration = 0
  let overtimeMajoration = 0

  // Préparer tous les shifts au format ShiftForValidation pour le calcul des heures sup
  const allShiftsForValidation = shifts.map((s) =>
    toShiftForValidation(s, contract.employee_id, contract.id)
  )

  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i]
    const shiftDate = new Date(shift.date)
    const effectiveMinutes = calculateShiftDuration(
      shift.start_time,
      shift.end_time,
      shift.break_duration || 0
    )
    const effectiveHours = effectiveMinutes / 60
    const shiftNightHours = calculateNightHours(shiftDate, shift.start_time, shift.end_time)
    const isSundayShift = isSunday(shiftDate)
    const isHolidayShift = isPublicHoliday(shiftDate)

    // Calcul de la paie pour cette intervention (taux centralisés)
    const shiftBasePay = effectiveHours * hourlyRate
    let shiftTotal = shiftBasePay
    let shiftSundayMaj = 0
    let shiftHolidayMaj = 0
    let shiftNightMaj = 0
    let shiftOvertimeMaj = 0

    if (isSundayShift) {
      shiftSundayMaj = shiftBasePay * MAJORATION_RATES.SUNDAY
      shiftTotal += shiftSundayMaj
      sundayHours += effectiveHours
    }

    if (isHolidayShift) {
      shiftHolidayMaj = shiftBasePay * MAJORATION_RATES.PUBLIC_HOLIDAY_WORKED
      shiftTotal += shiftHolidayMaj
      holidayHours += effectiveHours
    }

    // Majoration nuit : uniquement si un acte est effectué (has_night_action)
    // Pour les anciens shifts sans le champ (null), on applique la majoration par rétrocompatibilité
    const shiftHasNightAction = shift.has_night_action !== false // null = rétrocompat (appliquée), true = appliquée, false = pas de majoration
    if (shiftNightHours > 0 && shiftHasNightAction) {
      shiftNightMaj = shiftNightHours * hourlyRate * MAJORATION_RATES.NIGHT
      shiftTotal += shiftNightMaj
      nightHours += shiftNightHours
    }

    // Calcul réel des heures supplémentaires pour cette intervention
    const shiftForValidation = allShiftsForValidation[i]
    const previousShifts = allShiftsForValidation.slice(0, i)
    const shiftOvertime = calculateOvertimeHours(
      shiftForValidation,
      previousShifts,
      contractualWeeklyHours
    )

    if (shiftOvertime > 0) {
      // Premières 8h supplémentaires : +25%, au-delà : +50%
      const cumulativeOvertimeBefore = overtimeHours
      const cumulativeOvertimeAfter = overtimeHours + shiftOvertime

      // Calculer la majoration pour les heures sup de CE shift
      const first8hBefore = Math.min(8, cumulativeOvertimeBefore)
      const first8hAfter = Math.min(8, cumulativeOvertimeAfter)
      const beyond8hBefore = Math.max(0, cumulativeOvertimeBefore - 8)
      const beyond8hAfter = Math.max(0, cumulativeOvertimeAfter - 8)

      shiftOvertimeMaj =
        (first8hAfter - first8hBefore) * hourlyRate * MAJORATION_RATES.OVERTIME_FIRST_8H +
        (beyond8hAfter - beyond8hBefore) * hourlyRate * MAJORATION_RATES.OVERTIME_BEYOND_8H

      shiftTotal += shiftOvertimeMaj
      overtimeHours += shiftOvertime
      overtimeMajoration += shiftOvertimeMaj
    }

    // Accumuler les totaux
    totalHours += effectiveHours
    basePay += shiftBasePay
    sundayMajoration += shiftSundayMaj
    holidayMajoration += shiftHolidayMaj
    nightMajoration += shiftNightMaj

    // Ajouter le détail
    shiftsDetails.push({
      date: shiftDate,
      startTime: shift.start_time,
      endTime: shift.end_time,
      breakDuration: shift.break_duration || 0,
      effectiveHours,
      isSunday: isSundayShift,
      isHoliday: isHolidayShift,
      nightHours: shiftNightHours,
      pay: Math.round(shiftTotal * 100) / 100,
    })
  }

  // Heures normales = total - spéciales - supplémentaires (éviter double comptage)
  normalHours = totalHours - sundayHours - holidayHours - overtimeHours

  const totalGrossPay = basePay + sundayMajoration + holidayMajoration + nightMajoration + overtimeMajoration

  return {
    employeeId: contract.employee_id,
    firstName: contract.employee_profile?.profile?.first_name || '',
    lastName: contract.employee_profile?.profile?.last_name || '',
    contractId: contract.id,
    contractType: contract.contract_type,
    hourlyRate,
    totalHours: Math.round(totalHours * 100) / 100,
    normalHours: Math.round(normalHours * 100) / 100,
    sundayHours: Math.round(sundayHours * 100) / 100,
    holidayHours: Math.round(holidayHours * 100) / 100,
    nightHours: Math.round(nightHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    basePay: Math.round(basePay * 100) / 100,
    sundayMajoration: Math.round(sundayMajoration * 100) / 100,
    holidayMajoration: Math.round(holidayMajoration * 100) / 100,
    nightMajoration: Math.round(nightMajoration * 100) / 100,
    overtimeMajoration: Math.round(overtimeMajoration * 100) / 100,
    totalGrossPay: Math.round(totalGrossPay * 100) / 100,
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
