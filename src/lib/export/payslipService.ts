/**
 * Service de récupération des données pour les bulletins de paie
 * Réutilise getMonthlyDeclarationData du declarationService
 */

import { supabase } from '@/lib/supabase/client'
import { getMonthlyDeclarationData } from './declarationService'
import { calculateCotisations } from './cotisationsCalculator'
import { getMonthLabel } from './types'
import type { PayslipData, PayslipPchData, ExportOptions } from './types'
import { getEmployer } from '@/services/profileService'
import { getPchElementRate, calcEnveloppePch } from '@/lib/pch/pchTariffs'
import type { PchType } from '@/lib/pch/pchTariffs'
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

  const [weeklyHours, employer] = await Promise.all([
    getContractWeeklyHours(empData.contractId),
    getEmployer(employerId),
  ])

  const cotisations = calculateCotisations(empData.totalGrossPay, { pasRate, isExemptPatronalSS })

  // Calcul PCH si l'employeur est configuré
  let pch: PayslipPchData | undefined
  const isPchBeneficiary = !!(
    employer?.pchBeneficiary &&
    employer.pchType &&
    employer.pchMonthlyHours
  )

  if (isPchBeneficiary && employer?.pchType && employer.pchMonthlyHours) {
    const pchType = employer.pchType as PchType
    const pchElement1Rate = getPchElementRate(pchType)
    const pchEnvelopePch = calcEnveloppePch(employer.pchMonthlyHours, pchType)
    const pchTotalCost = cotisations.grossPay + cotisations.totalEmployerContributions
    pch = {
      pchType,
      pchMonthlyHours: employer.pchMonthlyHours,
      pchElement1Rate,
      pchEnvelopePch,
      pchTotalCost,
      pchResteACharge: Math.max(0, pchTotalCost - pchEnvelopePch),
    }
  }

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
    isPchBeneficiary,
    pch,
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
