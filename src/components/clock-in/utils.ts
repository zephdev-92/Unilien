import { format, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'

export function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui"
  if (isYesterday(date)) return 'Hier'
  return format(date, 'EEEE d MMMM', { locale: fr })
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m.toString().padStart(2, '0')}min`
}
