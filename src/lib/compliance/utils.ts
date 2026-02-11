/**
 * Utilitaires pour les calculs de conformité
 */

import { format, addMinutes, differenceInMinutes, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Convertit une heure "HH:mm" en minutes depuis minuit
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convertit des minutes depuis minuit en "HH:mm"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Calcule la durée d'une intervention en minutes
 * Gère les interventions qui passent minuit
 */
export function calculateShiftDuration(
  startTime: string,
  endTime: string,
  breakDuration: number = 0
): number {
  const startMinutes = timeToMinutes(startTime)
  let endMinutes = timeToMinutes(endTime)

  // Si l'intervention passe minuit ou dure 24h (même heure début/fin)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60
  }

  return endMinutes - startMinutes - breakDuration
}

/**
 * Crée un DateTime à partir d'une date et d'une heure
 */
export function createDateTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}

/**
 * Calcule la fin réelle d'une intervention (gère minuit)
 */
export function getShiftEndDateTime(date: Date, startTime: string, endTime: string): Date {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  let endDate = new Date(date)
  const [hours, minutes] = endTime.split(':').map(Number)
  endDate.setHours(hours, minutes, 0, 0)

  // Si l'intervention passe minuit, ajouter un jour
  if (endMinutes < startMinutes) {
    endDate = addDays(endDate, 1)
  }

  return endDate
}

/**
 * Calcule le nombre d'heures entre deux dates
 */
export function hoursBetween(start: Date, end: Date): number {
  const diffMinutes = differenceInMinutes(end, start)
  return diffMinutes / 60
}

/**
 * Obtient le début de la semaine (lundi)
 */
export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }) // Lundi
}

/**
 * Obtient la fin de la semaine (dimanche)
 */
export function getWeekEnd(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 }) // Dimanche
}

/**
 * Calcule le nombre d'heures de nuit (21h-6h)
 */
export function calculateNightHours(
  _date: Date,
  startTime: string,
  endTime: string
): number {
  const NIGHT_START = 21 * 60 // 21h en minutes
  const NIGHT_END = 6 * 60 // 6h en minutes

  const startMinutes = timeToMinutes(startTime)
  let endMinutes = timeToMinutes(endTime)

  // Gestion du passage à minuit
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60
  }

  let nightMinutes = 0

  // Parcourir chaque minute de l'intervention
  for (let m = startMinutes; m < endMinutes; m++) {
    const normalizedMinute = m % (24 * 60)
    if (normalizedMinute >= NIGHT_START || normalizedMinute < NIGHT_END) {
      nightMinutes++
    }
  }

  return nightMinutes / 60
}

/**
 * Formate une date pour l'affichage
 */
export function formatDate(date: Date): string {
  return format(date, 'EEEE d MMMM yyyy', { locale: fr })
}

/**
 * Formate une plage horaire pour l'affichage
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`
}

/**
 * Calcule l'heure minimum de début après un repos de 11h
 */
export function calculateMinStartTime(previousEndDate: Date): Date {
  return addMinutes(previousEndDate, 11 * 60)
}

/**
 * Vérifie si deux plages horaires se chevauchent
 */
export function shiftsOverlap(
  shift1: { date: Date; startTime: string; endTime: string },
  shift2: { date: Date; startTime: string; endTime: string }
): boolean {
  const start1 = createDateTime(shift1.date, shift1.startTime)
  const end1 = getShiftEndDateTime(shift1.date, shift1.startTime, shift1.endTime)
  const start2 = createDateTime(shift2.date, shift2.startTime)
  const end2 = getShiftEndDateTime(shift2.date, shift2.startTime, shift2.endTime)

  // Chevauchement si une intervention commence avant que l'autre finisse
  return start1 < end2 && start2 < end1
}

/**
 * Groupe les interventions par jour
 */
export function groupShiftsByDay(
  shifts: Array<{ date: Date; startTime: string; endTime: string; breakDuration: number }>
): Map<string, typeof shifts> {
  const grouped = new Map<string, typeof shifts>()

  for (const shift of shifts) {
    const key = format(shift.date, 'yyyy-MM-dd')
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(shift)
  }

  return grouped
}

/**
 * Calcule le total d'heures sur une période
 */
export function calculateTotalHours(
  shifts: Array<{ startTime: string; endTime: string; breakDuration: number }>
): number {
  return shifts.reduce((total, shift) => {
    return total + calculateShiftDuration(shift.startTime, shift.endTime, shift.breakDuration) / 60
  }, 0)
}
