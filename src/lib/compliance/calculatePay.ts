/**
 * Calcul de la rémunération avec majorations
 * Convention Collective IDCC 3239 - Particuliers Employeurs
 */

import type { ComputedPay } from '@/types'
import type { ShiftForValidation, ContractForCalculation } from './types'
import { isPublicHoliday, isSunday } from './types'
import { calculateShiftDuration, calculateNightHours, getWeekStart, calculateTotalHours } from './utils'

// Taux de majoration (Convention Collective IDCC 3239)
export const MAJORATION_RATES = {
  SUNDAY: 0.30, // +30% pour le dimanche
  PUBLIC_HOLIDAY_WORKED: 0.60, // +60% jour férié travaillé habituellement
  PUBLIC_HOLIDAY_EXCEPTIONAL: 1.00, // +100% jour férié travaillé exceptionnellement
  NIGHT: 0.20, // +20% pour les heures de nuit (21h-6h)
  OVERTIME_FIRST_8H: 0.25, // +25% pour les 8 premières heures supplémentaires
  OVERTIME_BEYOND_8H: 0.50, // +50% au-delà de 8h supplémentaires
}

/**
 * Calcule la rémunération complète d'une intervention avec toutes les majorations
 */
export function calculateShiftPay(
  shift: ShiftForValidation,
  contract: ContractForCalculation,
  existingShifts: ShiftForValidation[] = [],
  isHabitualWorkOnHolidays: boolean = false
): ComputedPay {
  const { hourlyRate, weeklyHours: contractualWeeklyHours } = contract

  // Durée effective de l'intervention en heures
  const durationMinutes = calculateShiftDuration(
    shift.startTime,
    shift.endTime,
    shift.breakDuration
  )
  const durationHours = durationMinutes / 60

  // Salaire de base
  const basePay = durationHours * hourlyRate

  // Majoration dimanche (+30%)
  let sundayMajoration = 0
  if (isSunday(shift.date)) {
    sundayMajoration = basePay * MAJORATION_RATES.SUNDAY
  }

  // Majoration jour férié (+60% ou +100%)
  let holidayMajoration = 0
  if (isPublicHoliday(shift.date)) {
    const rate = isHabitualWorkOnHolidays
      ? MAJORATION_RATES.PUBLIC_HOLIDAY_WORKED
      : MAJORATION_RATES.PUBLIC_HOLIDAY_EXCEPTIONAL
    holidayMajoration = basePay * rate
  }

  // Majoration nuit (+20% pour heures entre 21h-6h)
  // La majoration ne s'applique que si l'auxiliaire effectue un acte pendant la nuit
  // Simple présence = pas de majoration (Convention Collective IDCC 3239)
  let nightMajoration = 0
  const nightHours = calculateNightHours(shift.date, shift.startTime, shift.endTime)
  if (nightHours > 0 && shift.hasNightAction) {
    nightMajoration = nightHours * hourlyRate * MAJORATION_RATES.NIGHT
  }

  // Majoration heures supplémentaires
  let overtimeMajoration = 0
  const overtimeHours = calculateOvertimeHours(
    shift,
    existingShifts,
    contractualWeeklyHours
  )
  if (overtimeHours > 0) {
    // Premières 8h supplémentaires : +25%
    const first8h = Math.min(8, overtimeHours)
    overtimeMajoration += first8h * hourlyRate * MAJORATION_RATES.OVERTIME_FIRST_8H

    // Au-delà de 8h : +50%
    const beyond8h = Math.max(0, overtimeHours - 8)
    overtimeMajoration += beyond8h * hourlyRate * MAJORATION_RATES.OVERTIME_BEYOND_8H
  }

  // Présence responsable (jour : conversion 2/3, nuit : forfaitaire 1/4)
  let presenceResponsiblePay = 0
  let nightPresenceAllowance = 0
  const shiftType = shift.shiftType || 'effective'

  if (shiftType === 'presence_day') {
    // Présence responsable de jour : 1h = 2/3h de travail effectif (Art. 137.1 IDCC 3239)
    const effectiveHours = durationHours * (2 / 3)
    presenceResponsiblePay = effectiveHours * hourlyRate
  } else if (shiftType === 'presence_night') {
    const isRequalified = (shift.nightInterventionsCount ?? 0) >= 4
    if (isRequalified) {
      // Requalification : toute la plage est rémunérée en travail effectif (Art. 148 IDCC 3239)
      nightPresenceAllowance = durationHours * hourlyRate
    } else {
      // Indemnité forfaitaire >= 1/4 du salaire contractuel horaire
      nightPresenceAllowance = durationHours * hourlyRate * 0.25
    }
  }

  // Total
  const totalPay = shiftType === 'effective'
    ? basePay + sundayMajoration + holidayMajoration + nightMajoration + overtimeMajoration
    : shiftType === 'presence_day'
      ? presenceResponsiblePay + sundayMajoration + holidayMajoration
      : nightPresenceAllowance + nightMajoration

  return {
    basePay: Math.round(basePay * 100) / 100,
    sundayMajoration: Math.round(sundayMajoration * 100) / 100,
    holidayMajoration: Math.round(holidayMajoration * 100) / 100,
    nightMajoration: Math.round(nightMajoration * 100) / 100,
    overtimeMajoration: Math.round(overtimeMajoration * 100) / 100,
    presenceResponsiblePay: Math.round(presenceResponsiblePay * 100) / 100,
    nightPresenceAllowance: Math.round(nightPresenceAllowance * 100) / 100,
    totalPay: Math.round(totalPay * 100) / 100,
  }
}

/**
 * Calcule le nombre d'heures supplémentaires pour une intervention
 */
export function calculateOvertimeHours(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[],
  contractualWeeklyHours: number
): number {
  const weekStart = getWeekStart(newShift.date)

  // Filtrer les interventions de la même semaine pour le même employé
  const weekShifts = existingShifts.filter((shift) => {
    if (newShift.id && shift.id === newShift.id) return false
    if (shift.employeeId !== newShift.employeeId) return false
    const shiftWeekStart = getWeekStart(shift.date)
    return shiftWeekStart.getTime() === weekStart.getTime()
  })

  // Total des heures AVANT cette intervention
  const previousHours = calculateTotalHours(weekShifts)

  // Durée de cette intervention
  const thisShiftHours = calculateShiftDuration(
    newShift.startTime,
    newShift.endTime,
    newShift.breakDuration
  ) / 60

  // Heures totales après cette intervention
  const totalHours = previousHours + thisShiftHours

  // Si le total dépasse les heures contractuelles, calculer les heures sup
  if (totalHours > contractualWeeklyHours) {
    // Heures sup AVANT cette intervention
    const previousOvertime = Math.max(0, previousHours - contractualWeeklyHours)

    // Heures sup APRÈS cette intervention
    const totalOvertime = Math.max(0, totalHours - contractualWeeklyHours)

    // Heures sup générées par CETTE intervention
    return totalOvertime - previousOvertime
  }

  return 0
}

/**
 * Calcule le coût estimé mensuel pour un contrat
 */
export function calculateMonthlyEstimate(
  weeklyHours: number,
  hourlyRate: number,
  averageSundays: number = 0,
  averageNightHours: number = 0
): {
  baseSalary: number
  estimatedMajorations: number
  totalEstimate: number
  employerCost: number
} {
  // Nombre moyen de semaines par mois
  const weeksPerMonth = 4.33

  // Salaire de base
  const baseSalary = weeklyHours * weeksPerMonth * hourlyRate

  // Estimation des majorations
  const sundayMajoration = (averageSundays * weeklyHours / 7 * hourlyRate) * MAJORATION_RATES.SUNDAY * weeksPerMonth
  const nightMajoration = averageNightHours * hourlyRate * MAJORATION_RATES.NIGHT * weeksPerMonth
  const estimatedMajorations = sundayMajoration + nightMajoration

  const totalEstimate = baseSalary + estimatedMajorations

  // Coût employeur (charges sociales ~42% pour particuliers employeurs)
  const employerCost = totalEstimate * 1.42

  return {
    baseSalary: Math.round(baseSalary * 100) / 100,
    estimatedMajorations: Math.round(estimatedMajorations * 100) / 100,
    totalEstimate: Math.round(totalEstimate * 100) / 100,
    employerCost: Math.round(employerCost * 100) / 100,
  }
}

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/**
 * Détaille les majorations pour affichage
 */
export function getPayBreakdown(pay: ComputedPay): Array<{
  label: string
  amount: number
  percentage?: number
}> {
  const breakdown: Array<{ label: string; amount: number; percentage?: number }> = [
    { label: 'Salaire de base', amount: pay.basePay },
  ]

  if (pay.sundayMajoration > 0) {
    breakdown.push({
      label: 'Majoration dimanche',
      amount: pay.sundayMajoration,
      percentage: MAJORATION_RATES.SUNDAY * 100,
    })
  }

  if (pay.holidayMajoration > 0) {
    breakdown.push({
      label: 'Majoration jour férié',
      amount: pay.holidayMajoration,
      percentage: pay.holidayMajoration / pay.basePay * 100,
    })
  }

  if (pay.nightMajoration > 0) {
    breakdown.push({
      label: 'Majoration heures de nuit',
      amount: pay.nightMajoration,
      percentage: MAJORATION_RATES.NIGHT * 100,
    })
  }

  if (pay.overtimeMajoration > 0) {
    breakdown.push({
      label: 'Majoration heures supplémentaires',
      amount: pay.overtimeMajoration,
    })
  }

  if (pay.presenceResponsiblePay > 0) {
    breakdown.push({
      label: 'Présence responsable jour (×2/3)',
      amount: pay.presenceResponsiblePay,
    })
  }

  if (pay.nightPresenceAllowance > 0) {
    breakdown.push({
      label: 'Indemnité présence de nuit',
      amount: pay.nightPresenceAllowance,
    })
  }

  return breakdown
}
