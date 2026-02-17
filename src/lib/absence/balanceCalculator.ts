/**
 * Calcul des soldes de congés payés
 * Convention Collective IDCC 3239
 *
 * Sources légales :
 * - Art. L3141-3 : 2.5 jours ouvrables par mois de travail effectif (max 30j/an)
 * - Art. L3141-4 : 1 mois effectif = 4 semaines ou 24 jours de travail
 * - Art. L3141-7 : arrondi à l'entier supérieur (ordre public)
 * - Période d'acquisition : 1er juin N au 31 mai N+1 (Art. R3141-4 + IDCC 3239)
 * - Temps partiel : mêmes droits que temps plein (IDCC 3239)
 * - Fractionnement : +1j si 3-5j hors mai-oct, +2j si 6+j hors mai-oct
 */

import type { Contract } from '@/types'
import type { LeaveBalanceForValidation } from './types'
import { getLeaveYear } from './utils'

/**
 * Calcule le nombre de jours de congés acquis pour un contrat
 * à une date donnée dans la période d'acquisition.
 *
 * Méthode : cumul des jours ouvrables (lun-sam) travaillés sur la période,
 * chaque tranche de 24 jours = 1 mois = 2.5 jours de CP.
 * Arrondi à l'entier supérieur (Art. L3141-7).
 */
export function calculateAcquiredDays(
  contract: Pick<Contract, 'startDate' | 'weeklyHours'>,
  leaveYearStart: Date,
  asOfDate: Date
): number {
  // Début effectif = max(début contrat, début période)
  const effectiveStart = contract.startDate > leaveYearStart
    ? contract.startDate
    : leaveYearStart

  if (effectiveStart > asOfDate) return 0

  // Compter les jours ouvrables travaillés
  const workingDays = countWorkingDays(effectiveStart, asOfDate)

  // 24 jours ouvrables = 1 mois effectif (Art. L3141-4)
  const monthsWorked = Math.floor(workingDays / 24)

  // 2.5 jours ouvrables par mois (max 30 jours/an)
  const baseDays = Math.min(monthsWorked * 2.5, 30)

  // Arrondi à l'entier supérieur (Art. L3141-7, ordre public)
  return Math.ceil(baseDays)
}

/**
 * Calcule les jours restants dans un solde
 */
export function calculateRemainingDays(balance: LeaveBalanceForValidation): number {
  return balance.acquiredDays + balance.adjustmentDays - balance.takenDays
}

/**
 * Calcule les jours de fractionnement
 * +1 jour si 3 à 5 jours pris hors période principale (mai-oct)
 * +2 jours si 6 jours ou plus pris hors période principale
 */
export function calculateFractionnement(daysOutsideMainPeriod: number): number {
  if (daysOutsideMainPeriod >= 6) return 2
  if (daysOutsideMainPeriod >= 3) return 1
  return 0
}

/**
 * Calcule le début de la période d'acquisition pour un leave_year
 * Ex: "2025-2026" → 1er juin 2025
 */
export function getLeaveYearStartDate(leaveYear: string): Date {
  const startYear = parseInt(leaveYear.split('-')[0], 10)
  return new Date(startYear, 5, 1) // 1er juin
}

/**
 * Calcule la fin de la période d'acquisition
 * Ex: "2025-2026" → 31 mai 2026
 */
export function getLeaveYearEndDate(leaveYear: string): Date {
  const endYear = parseInt(leaveYear.split('-')[1], 10)
  return new Date(endYear, 4, 31) // 31 mai
}

/**
 * Calcule les jours acquis à partir d'un nombre de mois travaillés.
 * Utilisé pour la reprise manuelle de l'historique congés.
 *
 * - 2.5 jours/mois (Art. L3141-3)
 * - Max 30 jours/an (Art. L3141-3)
 * - Arrondi supérieur (Art. L3141-7)
 */
export function calculateAcquiredFromMonths(months: number): number {
  if (months <= 0) return 0
  return Math.ceil(Math.min(months * 2.5, 30))
}

/**
 * Calcule le nombre de mois travaillés par défaut (suggestion automatique).
 * Borné à l'année de congés en cours : compte depuis max(startDate, leaveYearStart).
 */
export function calculateDefaultMonthsWorked(startDate: Date): number {
  const today = new Date()
  if (startDate > today) return 0

  // Borner au début de l'année de congés en cours
  const leaveYear = getLeaveYear(today)
  const leaveYearStart = getLeaveYearStartDate(leaveYear)

  const effectiveStart = startDate > leaveYearStart ? startDate : leaveYearStart

  if (effectiveStart > today) return 0

  const workingDays = countWorkingDays(effectiveStart, today)
  return Math.min(Math.floor(workingDays / 24), 12)
}

/**
 * Compte les jours ouvrables (lundi à samedi) entre deux dates incluses.
 * Art. L3141-4 : 24 jours ouvrables = 1 mois de travail effectif.
 */
export function countWorkingDays(start: Date, end: Date): number {
  let count = 0
  const day = new Date(start)
  day.setHours(0, 0, 0, 0)

  const endDate = new Date(end)
  endDate.setHours(0, 0, 0, 0)

  while (day <= endDate) {
    if (day.getDay() !== 0) { // Exclure dimanche (0)
      count++
    }
    day.setDate(day.getDate() + 1)
  }

  return count
}
