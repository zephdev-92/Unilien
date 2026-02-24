/**
 * Service de récupération des données pour les bulletins de paie
 * Réutilise getMonthlyDeclarationData du declarationService
 */

import { supabase } from '@/lib/supabase/client'
import { getMonthlyDeclarationData } from './declarationService'
import { calculateCotisations } from './cotisationsCalculator'
import { getMonthLabel } from './types'
import type { PayslipData, ExportOptions } from './types'
import { logger } from '@/lib/logger'

/**
 * Récupère et calcule toutes les données nécessaires au bulletin de paie
 * d'un employé pour un mois donné.
 */
export async function getPayslipData(
  employerId: string,
  employeeId: string,
  year: number,
  month: number,
  pasRate: number = 0,
  isExemptPatronalSS: boolean = false
): Promise<PayslipData | null> {
  const options: ExportOptions = {
    format: 'pdf',
    year,
    month,
    employeeIds: [employeeId],
  }

  const monthlyData = await getMonthlyDeclarationData(employerId, options)

  if (!monthlyData || monthlyData.employees.length === 0) {
    logger.error('Aucune donnée de paie trouvée', { employeeId, year, month })
    return null
  }

  const empData = monthlyData.employees[0]

  const weeklyHours = await getContractWeeklyHours(empData.contractId)

  const cotisations = calculateCotisations(empData.totalGrossPay, { pasRate, isExemptPatronalSS })

  return {
    year,
    month,
    periodLabel: getMonthLabel(year, month),
    employerId,
    employerFirstName: monthlyData.employerFirstName,
    employerLastName: monthlyData.employerLastName,
    employerAddress: monthlyData.employerAddress,
    employeeId,
    employeeFirstName: empData.firstName,
    employeeLastName: empData.lastName,
    contractType: empData.contractType,
    hourlyRate: empData.hourlyRate,
    weeklyHours: weeklyHours ?? 35,
    totalHours: empData.totalHours,
    normalHours: empData.normalHours,
    sundayHours: empData.sundayHours,
    holidayHours: empData.holidayHours,
    nightHours: empData.nightHours,
    overtimeHours: empData.overtimeHours,
    basePay: empData.basePay,
    sundayMajoration: empData.sundayMajoration,
    holidayMajoration: empData.holidayMajoration,
    nightMajoration: empData.nightMajoration,
    overtimeMajoration: empData.overtimeMajoration,
    presenceResponsiblePay: 0,
    nightPresenceAllowance: 0,
    totalGrossPay: empData.totalGrossPay,
    shiftsCount: empData.shiftsCount,
    cotisations,
    generatedAt: new Date(),
    isExemptPatronalSS,
  }
}

async function getContractWeeklyHours(contractId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('weekly_hours')
    .eq('id', contractId)
    .single()

  if (error || !data) return null
  return (data as { weekly_hours: number }).weekly_hours
}
