/**
 * Génération des dates de répétition pour les interventions récurrentes.
 * Toutes les opérations utilisent UTC pour être cohérentes avec les dates ISO
 * YYYY-MM-DD stockées en base (interprétées comme UTC midnight).
 */

export type RepeatFrequency = 'weekly' | 'custom'

export interface RepeatConfig {
  /** Date de référence (= date du shift source) — exclue des occurrences générées */
  startDate: Date
  frequency: RepeatFrequency
  /** weekly : jours de semaine à inclure (0=dim, 1=lun, …, 6=sam, UTC) */
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

/** Crée une date UTC midnight à partir des composantes UTC d'une date */
function toUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/**
 * Génère la liste des dates des occurrences à créer.
 * - Exclut la date de référence (startDate)
 * - Tri croissant
 * - Max 52 occurrences
 */
export function generateRepeatDates(config: RepeatConfig): Date[] {
  const { startDate, frequency, endDate, daysOfWeek, intervalDays = 7, repeatCount } = config

  const dates: Date[] = []
  const start = toUTCMidnight(startDate)
  const end = endDate ? toUTCMidnight(endDate) : null

  if (frequency === 'weekly') {
    if (!daysOfWeek || daysOfWeek.length === 0) return []

    // Commencer au lendemain de startDate
    const cursor = new Date(start)
    cursor.setUTCDate(cursor.getUTCDate() + 1)

    while (dates.length < MAX_OCCURRENCES) {
      if (end && cursor > end) break

      if (daysOfWeek.includes(cursor.getUTCDay())) {
        dates.push(new Date(cursor))
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1)

      if (repeatCount && dates.length >= repeatCount) break
    }
  } else {
    // custom : intervalles fixes en jours
    const interval = Math.max(1, intervalDays)
    const cursor = new Date(start)
    cursor.setUTCDate(cursor.getUTCDate() + interval)

    while (dates.length < MAX_OCCURRENCES) {
      if (end && cursor > end) break
      if (repeatCount && dates.length >= repeatCount) break

      dates.push(new Date(cursor))
      cursor.setUTCDate(cursor.getUTCDate() + interval)
    }
  }

  return dates.sort((a, b) => a.getTime() - b.getTime())
}
