/**
 * Génération des dates de répétition pour les interventions récurrentes.
 */

export type RepeatFrequency = 'weekly' | 'custom'

export interface RepeatConfig {
  /** Date de référence (= date du shift source) — exclue des occurrences générées */
  startDate: Date
  frequency: RepeatFrequency
  /** weekly : jours de semaine à inclure (0=dim, 1=lun, …, 6=sam) */
  daysOfWeek?: number[]
  /** custom : intervalle en jours entre chaque occurrence (défaut : 7) */
  intervalDays?: number
  /** custom : nombre d'occurrences à générer (ignoré si endDate fourni) */
  repeatCount?: number
  /** Date de fin (prioritaire sur repeatCount) */
  endDate?: Date
}

/** Nombre maximum d'occurrences pour éviter les boucles infinies */
const MAX_OCCURRENCES = 52

/**
 * Génère la liste des dates des occurrences à créer.
 * - Exclut la date de référence (startDate)
 * - Tri croissant
 * - Max 52 occurrences
 */
export function generateRepeatDates(config: RepeatConfig): Date[] {
  const { startDate, frequency, endDate, daysOfWeek, intervalDays = 7, repeatCount } = config

  const dates: Date[] = []
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const end = endDate ? new Date(endDate) : null
  if (end) end.setHours(23, 59, 59, 999)

  if (frequency === 'weekly') {
    if (!daysOfWeek || daysOfWeek.length === 0) return []

    // Partir du lendemain de startDate et itérer semaine par semaine
    const cursor = new Date(start)
    cursor.setDate(cursor.getDate() + 1)

    while (dates.length < MAX_OCCURRENCES) {
      if (end && cursor > end) break

      if (daysOfWeek.includes(cursor.getDay())) {
        dates.push(new Date(cursor))
      }

      cursor.setDate(cursor.getDate() + 1)

      // Si on a dépassé la date de fin ou le nombre max sans date de fin, on stoppe
      if (!end && !repeatCount && dates.length >= MAX_OCCURRENCES) break
      if (repeatCount && dates.length >= repeatCount) break
    }
  } else {
    // custom : intervalles fixes en jours
    const interval = Math.max(1, intervalDays)
    const cursor = new Date(start)
    cursor.setDate(cursor.getDate() + interval)

    while (dates.length < MAX_OCCURRENCES) {
      if (end && cursor > end) break
      if (repeatCount && dates.length >= repeatCount) break

      dates.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + interval)
    }
  }

  return dates.sort((a, b) => a.getTime() - b.getTime())
}
