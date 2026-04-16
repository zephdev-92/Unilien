/**
 * Formate un nombre d'heures décimal en format lisible "XhYY".
 * Ex: 11.7 → "11h42", 3 → "3h", 0.5 → "0h30"
 */
export function formatHoursCompact(h: number): string {
  if (h === 0) return '0h'
  const hours = Math.floor(Math.abs(h))
  const mins = Math.round((Math.abs(h) - hours) * 60)
  const sign = h < 0 ? '-' : ''
  if (mins === 0) return `${sign}${hours}h`
  return `${sign}${hours}h${mins < 10 ? '0' : ''}${mins}`
}
