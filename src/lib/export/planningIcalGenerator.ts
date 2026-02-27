/**
 * Générateur iCal (RFC 5545) pour le planning mensuel
 * Aucune dépendance externe — format hand-crafted
 */

import { format, addDays } from 'date-fns'
import type { PlanningExportData, PlanningShiftEntry, PlanningAbsenceEntry } from './types'
import type { ExportResult } from './types'

const SHIFT_TYPE_LABELS: Record<string, string> = {
  effective: 'Intervention',
  presence_day: 'Présence jour',
  presence_night: 'Présence nuit',
  guard_24h: 'Garde 24h',
}

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  sick: 'Arrêt maladie',
  vacation: 'Congé payé',
  family_event: 'Événement familial',
  training: 'Formation',
  unavailable: 'Indisponibilité',
  emergency: 'Urgence personnelle',
}

/** Repli à 74 caractères selon RFC 5545 §3.1 */
function foldLine(line: string): string {
  const LIMIT = 74
  if (line.length <= LIMIT) return line

  const result: string[] = []
  let pos = 0
  // Première ligne
  result.push(line.slice(0, LIMIT))
  pos = LIMIT
  // Suites : 73 chars (1 espace de continuation)
  while (pos < line.length) {
    result.push(' ' + line.slice(pos, pos + 73))
    pos += 73
  }
  return result.join('\r\n')
}

/** Formate une date + heure pour TZID=Europe/Paris */
function formatDtLocal(date: Date, time: string): string {
  const [h, m] = time.split(':')
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}T${h.padStart(2, '0')}${m.padStart(2, '0')}00`
}

/** Formate une date all-day (YYYYMMDD) */
function formatDateOnly(date: Date): string {
  return format(date, 'yyyyMMdd')
}

/** Génère un VEVENT pour un shift */
function shiftToVEvent(
  shift: PlanningShiftEntry,
  employeeName: string,
  now: string
): string {
  const summary = `${SHIFT_TYPE_LABELS[shift.shiftType] ?? 'Intervention'} – ${employeeName}`
  const dtStart = formatDtLocal(shift.date, shift.startTime)
  const dtEnd = formatDtLocal(shift.date, shift.endTime)
  const status = shift.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'
  const uid = `unilien-shift-${shift.id}@unilien.app`

  const lines = [
    'BEGIN:VEVENT',
    foldLine(`UID:${uid}`),
    `DTSTAMP:${now}`,
    foldLine(`DTSTART;TZID=Europe/Paris:${dtStart}`),
    foldLine(`DTEND;TZID=Europe/Paris:${dtEnd}`),
    foldLine(`SUMMARY:${summary}`),
    `STATUS:${status}`,
    'END:VEVENT',
  ]
  return lines.join('\r\n')
}

/** Génère un VEVENT all-day pour une absence approuvée */
function absenceToVEvent(
  absence: PlanningAbsenceEntry,
  employeeName: string,
  now: string
): string {
  const label = ABSENCE_TYPE_LABELS[absence.absenceType] ?? 'Absence'
  const summary = `${label} – ${employeeName}`
  const uid = `unilien-absence-${absence.id}@unilien.app`
  // DTEND exclusif pour all-day : +1 jour
  const dtEnd = formatDateOnly(addDays(absence.endDate, 1))

  const lines = [
    'BEGIN:VEVENT',
    foldLine(`UID:${uid}`),
    `DTSTAMP:${now}`,
    foldLine(`DTSTART;VALUE=DATE:${formatDateOnly(absence.startDate)}`),
    foldLine(`DTEND;VALUE=DATE:${dtEnd}`),
    foldLine(`SUMMARY:${summary}`),
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ]
  return lines.join('\r\n')
}

/** Point d'entrée public */
export function generatePlanningIcal(data: PlanningExportData): ExportResult {
  try {
    const now = format(data.generatedAt, "yyyyMMdd'T'HHmmss'Z'")

    const events: string[] = []

    for (const employee of data.employees) {
      const name = `${employee.firstName} ${employee.lastName}`.trim()

      for (const shift of employee.shifts) {
        events.push(shiftToVEvent(shift, name, now))
      }

      for (const absence of employee.absences.filter((a) => a.status === 'approved')) {
        events.push(absenceToVEvent(absence, name, now))
      }
    }

    const calLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Unilien//Planning//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      foldLine(`X-WR-CALNAME:Planning ${data.periodLabel}`),
      'X-WR-TIMEZONE:Europe/Paris',
      ...events,
      'END:VCALENDAR',
    ]

    const content = calLines.join('\r\n') + '\r\n'

    const employerName = data.employees.length === 1
      ? `${data.employees[0].lastName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_`
      : ''
    const filename = `planning_${employerName}${data.year}_${String(data.month).padStart(2, '0')}.ics`

    return {
      success: true,
      filename,
      content,
      mimeType: 'text/calendar',
    }
  } catch (error) {
    return {
      success: false,
      filename: '',
      content: '',
      mimeType: '',
      error: error instanceof Error ? error.message : 'Erreur génération iCal',
    }
  }
}
