import { format, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'

/** Supprime les secondes d'un horaire DB ("16:26:00" → "16:26") */
export function formatTime(time: string): string {
  return time.slice(0, 5)
}

/** Formater la date d'un jour en label lisible */
export function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui"
  if (isYesterday(date)) return 'Hier'
  return format(date, 'EEEE d MMMM', { locale: fr })
}

/** Formater un nombre d'heures en "Xh XXmin" */
export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m.toString().padStart(2, '0')}min`
}
