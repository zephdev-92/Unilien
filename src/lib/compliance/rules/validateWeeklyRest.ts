/**
 * Validation du repos hebdomadaire
 * Règle : Minimum 35h de repos consécutives par semaine
 * Article L3132-2 du Code du travail
 */

import { format, addDays, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ShiftForValidation, RuleValidationResult } from '../types'
import { COMPLIANCE_RULES, COMPLIANCE_MESSAGES } from '../types'
import { createDateTime, getShiftEndDateTime, hoursBetween, getWeekStart, getWeekEnd } from '../utils'

const MINIMUM_WEEKLY_REST_HOURS = 35

/**
 * Valide que le repos hebdomadaire de 35h consécutives est respecté
 * Cette validation est plus complexe car elle doit trouver une période
 * de 35h sans interruption dans la semaine
 */
export function validateWeeklyRest(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): RuleValidationResult {
  // Période à analyser : semaine contenant la nouvelle intervention
  // + jours avant/après pour le repos à cheval sur deux semaines
  const weekStart = subDays(getWeekStart(newShift.date), 1)
  const weekEnd = addDays(getWeekEnd(newShift.date), 1)

  // Récupérer toutes les interventions de l'employé sur cette période
  const relevantShifts = existingShifts.filter((shift) => {
    if (newShift.id && shift.id === newShift.id) return false
    if (shift.employeeId !== newShift.employeeId) return false
    return shift.date >= weekStart && shift.date <= weekEnd
  })

  // Ajouter la nouvelle intervention à la liste
  const allShifts = [...relevantShifts, newShift]

  // Trier par date/heure de début
  allShifts.sort((a, b) => {
    const startA = createDateTime(a.date, a.startTime)
    const startB = createDateTime(b.date, b.startTime)
    return startA.getTime() - startB.getTime()
  })

  // Calculer le plus long repos consécutif dans la semaine
  const longestRest = findLongestRestPeriod(allShifts, weekStart, weekEnd)

  if (longestRest < MINIMUM_WEEKLY_REST_HOURS) {
    return {
      valid: false,
      code: COMPLIANCE_RULES.WEEKLY_REST,
      rule: COMPLIANCE_MESSAGES.WEEKLY_REST.rule,
      message: COMPLIANCE_MESSAGES.WEEKLY_REST.error(longestRest),
      details: {
        longestRestHours: Math.round(longestRest * 10) / 10,
        minimumRequired: MINIMUM_WEEKLY_REST_HOURS,
        weekStart: format(getWeekStart(newShift.date), 'dd/MM/yyyy', { locale: fr }),
        weekEnd: format(getWeekEnd(newShift.date), 'dd/MM/yyyy', { locale: fr }),
        isBlocking: true,
      },
    }
  }

  return {
    valid: true,
    code: COMPLIANCE_RULES.WEEKLY_REST,
    rule: COMPLIANCE_MESSAGES.WEEKLY_REST.rule,
    details: {
      longestRestHours: Math.round(longestRest * 10) / 10,
    },
  }
}

/**
 * Trouve la plus longue période de repos consécutive
 */
function findLongestRestPeriod(
  shifts: ShiftForValidation[],
  periodStart: Date,
  periodEnd: Date
): number {
  if (shifts.length === 0) {
    // Pas d'intervention = repos total
    return hoursBetween(periodStart, periodEnd)
  }

  let longestRest = 0

  // Repos avant la première intervention
  const firstShiftStart = createDateTime(shifts[0].date, shifts[0].startTime)
  const restBeforeFirst = hoursBetween(periodStart, firstShiftStart)
  longestRest = Math.max(longestRest, restBeforeFirst)

  // Repos entre chaque intervention
  for (let i = 0; i < shifts.length - 1; i++) {
    const currentEnd = getShiftEndDateTime(
      shifts[i].date,
      shifts[i].startTime,
      shifts[i].endTime
    )
    const nextStart = createDateTime(shifts[i + 1].date, shifts[i + 1].startTime)

    const restBetween = hoursBetween(currentEnd, nextStart)
    longestRest = Math.max(longestRest, restBetween)
  }

  // Repos après la dernière intervention
  const lastShift = shifts[shifts.length - 1]
  const lastShiftEnd = getShiftEndDateTime(
    lastShift.date,
    lastShift.startTime,
    lastShift.endTime
  )
  const restAfterLast = hoursBetween(lastShiftEnd, periodEnd)
  longestRest = Math.max(longestRest, restAfterLast)

  return longestRest
}

/**
 * Calcule le nombre d'heures de repos hebdomadaire disponibles
 */
export function getWeeklyRestStatus(
  date: Date,
  employeeId: string,
  existingShifts: ShiftForValidation[]
): {
  longestRest: number
  isCompliant: boolean
  restPeriods: Array<{ start: Date; end: Date; hours: number }>
} {
  const weekStart = subDays(getWeekStart(date), 1)
  const weekEnd = addDays(getWeekEnd(date), 1)

  const relevantShifts = existingShifts
    .filter((shift) => {
      if (shift.employeeId !== employeeId) return false
      return shift.date >= weekStart && shift.date <= weekEnd
    })
    .sort((a, b) => {
      const startA = createDateTime(a.date, a.startTime)
      const startB = createDateTime(b.date, b.startTime)
      return startA.getTime() - startB.getTime()
    })

  const restPeriods: Array<{ start: Date; end: Date; hours: number }> = []

  if (relevantShifts.length === 0) {
    restPeriods.push({
      start: weekStart,
      end: weekEnd,
      hours: hoursBetween(weekStart, weekEnd),
    })
  } else {
    // Avant première intervention
    const firstStart = createDateTime(relevantShifts[0].date, relevantShifts[0].startTime)
    if (hoursBetween(weekStart, firstStart) > 0) {
      restPeriods.push({
        start: weekStart,
        end: firstStart,
        hours: hoursBetween(weekStart, firstStart),
      })
    }

    // Entre interventions
    for (let i = 0; i < relevantShifts.length - 1; i++) {
      const currentEnd = getShiftEndDateTime(
        relevantShifts[i].date,
        relevantShifts[i].startTime,
        relevantShifts[i].endTime
      )
      const nextStart = createDateTime(
        relevantShifts[i + 1].date,
        relevantShifts[i + 1].startTime
      )
      const hours = hoursBetween(currentEnd, nextStart)
      if (hours > 0) {
        restPeriods.push({ start: currentEnd, end: nextStart, hours })
      }
    }

    // Après dernière intervention
    const lastShift = relevantShifts[relevantShifts.length - 1]
    const lastEnd = getShiftEndDateTime(lastShift.date, lastShift.startTime, lastShift.endTime)
    if (hoursBetween(lastEnd, weekEnd) > 0) {
      restPeriods.push({
        start: lastEnd,
        end: weekEnd,
        hours: hoursBetween(lastEnd, weekEnd),
      })
    }
  }

  const longestRest = Math.max(...restPeriods.map((p) => p.hours), 0)

  return {
    longestRest,
    isCompliant: longestRest >= MINIMUM_WEEKLY_REST_HOURS,
    restPeriods,
  }
}
