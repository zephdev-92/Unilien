/**
 * Utilitaires pour le module d'absences
 * Calcul des jours ouvrables, fériés français, périodes de congés
 */

import { getFrenchPublicHolidays } from '@/lib/compliance/types'

/**
 * Compte les jours ouvrables entre deux dates (incluses)
 * Jours ouvrables = lundi à samedi, hors jours fériés et dimanches
 * (Convention IDCC 3239 : décompte en jours ouvrables)
 */
export function countBusinessDays(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)

  const endDate = new Date(end)
  endDate.setHours(0, 0, 0, 0)

  // Collecter les jours fériés pour les années concernées
  const holidays = new Set<string>()
  for (let year = current.getFullYear(); year <= endDate.getFullYear(); year++) {
    for (const h of getFrenchPublicHolidays(year)) {
      holidays.add(formatDateKey(h))
    }
  }

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    const isHoliday = holidays.has(formatDateKey(current))

    // Jours ouvrables : lundi (1) à samedi (6), hors fériés
    if (dayOfWeek !== 0 && !isHoliday) {
      count++
    }

    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * Retourne la période de congés (leave year) pour une date
 * Période d'acquisition : 1er juin N au 31 mai N+1
 */
export function getLeaveYear(date: Date): string {
  const month = date.getMonth() // 0-indexed
  const year = date.getFullYear()

  // Juin (5) à décembre (11) → année courante - année suivante
  if (month >= 5) {
    return `${year}-${year + 1}`
  }
  // Janvier (0) à mai (4) → année précédente - année courante
  return `${year - 1}-${year}`
}

/**
 * Vérifie si une date est dans la période principale de congés (mai-octobre)
 * Le congé principal (12j minimum) doit être pris entre mai et octobre
 */
export function isInMainLeavePeriod(date: Date): boolean {
  const month = date.getMonth() // 0-indexed
  return month >= 4 && month <= 9 // mai (4) à octobre (9)
}

/**
 * Calcule la date limite de justificatif pour un arrêt maladie
 * Le salarié a 48h pour fournir l'arrêt de travail
 */
export function calculateJustificationDueDate(startDate: Date): Date {
  const dueDate = new Date(startDate)
  dueDate.setDate(dueDate.getDate() + 2)
  return dueDate
}

/**
 * Vérifie si deux plages de dates se chevauchent
 */
export function dateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  const s1 = new Date(start1); s1.setHours(0, 0, 0, 0)
  const e1 = new Date(end1); e1.setHours(0, 0, 0, 0)
  const s2 = new Date(start2); s2.setHours(0, 0, 0, 0)
  const e2 = new Date(end2); e2.setHours(0, 0, 0, 0)

  return s1 <= e2 && s2 <= e1
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
