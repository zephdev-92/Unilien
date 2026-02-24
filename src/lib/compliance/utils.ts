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
 * Calcule le nombre d'heures de nuit (plage 21h–6h) d'une intervention.
 *
 * **Algorithme O(1) par intersection géométrique.**
 * Les fenêtres nuit sont modélisées comme des intervalles fixes sur une
 * timeline linéaire de 48h (2 cycles de 24h). L'intersection de chaque
 * fenêtre avec [start, end] donne directement les minutes de nuit, sans
 * itérer minute par minute.
 *
 * Fenêtres nuit couvertes :
 * - [0h, 6h)   jour J   → [0, 360)
 * - [21h, 24h) jour J   → [1260, 1440)
 * - [0h, 6h)   jour J+1 → [1440, 1800)   (shifts passant minuit)
 * - [21h, 24h) jour J+1 → [2700, 2880)   (shifts > 21h le lendemain)
 *
 * @param _date    Non utilisé (conservé pour compatibilité de signature)
 * @param startTime Heure de début au format "HH:mm"
 * @param endTime   Heure de fin au format "HH:mm" (peut être < startTime si passage minuit)
 * @returns Nombre d'heures de nuit (ex : 2.5 pour 2h30 de nuit)
 *
 * @example
 * calculateNightHours(date, '20:00', '23:00') // → 2  (21h–23h)
 * calculateNightHours(date, '22:00', '06:00') // → 8  (22h–6h, passage minuit)
 * calculateNightHours(date, '08:00', '17:00') // → 0  (plage de jour)
 */
export function calculateNightHours(
  _date: Date,
  startTime: string,
  endTime: string
): number {
  const NIGHT_START = 21 * 60 // 1260 min
  const NIGHT_END = 6 * 60   // 360 min
  const DAY = 24 * 60        // 1440 min

  const start = timeToMinutes(startTime)
  let end = timeToMinutes(endTime)

  if (end < start) {
    end += DAY
  }

  // Longueur de l'intersection de [a, b) avec [c, d)
  const intersect = (a: number, b: number, c: number, d: number): number =>
    Math.max(0, Math.min(b, d) - Math.max(a, c))

  // Fenêtres nuit sur 2 cycles de 24h (couvre les shifts qui passent minuit)
  const nightMinutes =
    intersect(start, end, 0, NIGHT_END) +                  // [0h,  6h) — jour J
    intersect(start, end, NIGHT_START, DAY) +               // [21h, 24h) — jour J
    intersect(start, end, DAY, DAY + NIGHT_END) +           // [0h,  6h) — jour J+1
    intersect(start, end, DAY + NIGHT_START, 2 * DAY)       // [21h, 24h) — jour J+1

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

/**
 * Calcule les heures effectives d'une intervention selon son type
 * - effective (défaut) : 100% du temps
 * - presence_day : 2/3 du temps (Art. 137.1 IDCC 3239)
 * - presence_night : 0 (repos sur place, pas du travail — Art. 148 IDCC 3239)
 */
export function getEffectiveHours(
  shift: {
    startTime: string
    endTime: string
    breakDuration: number
    shiftType?: string
    guardSegments?: Array<{ startTime: string; type: string; breakMinutes?: number }>
  }
): number {
  const rawHours = calculateShiftDuration(shift.startTime, shift.endTime, shift.breakDuration) / 60
  const type = shift.shiftType || 'effective'

  if (type === 'presence_night') return 0
  if (type === 'presence_day') return rawHours * (2 / 3)
  if (type === 'guard_24h') {
    // Somme des heures effectives de tous les segments de type 'effective' (hors pause)
    if (!shift.guardSegments?.length) return rawHours // fallback gracieux
    return shift.guardSegments.reduce((total, seg, i, arr) => {
      const end = arr[i + 1]?.startTime ?? shift.startTime
      const mins = calculateShiftDuration(seg.startTime, end, 0)
      return seg.type === 'effective'
        ? total + Math.max(0, mins - (seg.breakMinutes ?? 0)) / 60
        : total
    }, 0)
  }
  return rawHours
}

/**
 * Calcule le total d'heures effectives (pondérées par type)
 */
export function calculateTotalEffectiveHours(
  shifts: Array<{ startTime: string; endTime: string; breakDuration: number; shiftType?: string }>
): number {
  return shifts.reduce((total, shift) => total + getEffectiveHours(shift), 0)
}
