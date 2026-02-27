/**
 * Générateur Excel (.xlsx) pour le planning mensuel
 * Utilise la bibliothèque xlsx (SheetJS)
 */

import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { PlanningExportData, EmployeePlanningData } from './types'
import type { ExportResult } from './types'

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

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

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  completed: 'Réalisé',
  cancelled: 'Annulé',
  absent: 'Absent',
}

// ─── Feuille résumé ───────────────────────────────────────────────────────────

function buildSummarySheet(data: PlanningExportData): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    [`Planning mensuel — ${data.periodLabel}`],
    [`Employeur : ${data.employerFirstName} ${data.employerLastName}`],
    [`Généré le : ${format(data.generatedAt, "d MMMM yyyy 'à' HH:mm", { locale: fr })}`],
    [],
    ['Employé', 'Contrat', 'Heures/sem.', 'Taux horaire', 'Interventions', 'Heures totales', 'Total brut (€)'],
  ]

  for (const e of data.employees) {
    rows.push([
      `${e.firstName} ${e.lastName}`,
      e.contractType,
      e.weeklyHours,
      e.hourlyRate,
      e.totalShifts,
      e.totalHours,
      e.totalPay,
    ])
  }

  rows.push([])
  rows.push([
    'TOTAUX',
    '',
    '',
    '',
    data.totalShifts,
    data.totalHours,
    data.employees.reduce((s, e) => s + e.totalPay, 0),
  ])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  // Largeurs colonnes
  ws['!cols'] = [
    { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 15 }, { wch: 15 },
  ]
  return ws
}

// ─── Feuille par employé ──────────────────────────────────────────────────────

function buildEmployeeSheet(employee: EmployeePlanningData): XLSX.WorkSheet {
  const rows: (string | number | boolean)[][] = [
    [`${employee.firstName} ${employee.lastName} — ${employee.contractType}`],
    [`Taux horaire : ${employee.hourlyRate} € | Heures/sem. : ${employee.weeklyHours}h`],
    [],
    ['Date', 'Jour', 'Début', 'Fin', 'Pause (min)', 'Type', 'Statut', 'Heures', 'Dimanche', 'Férié', 'Montant (€)'],
  ]

  for (const s of employee.shifts) {
    rows.push([
      format(s.date, 'dd/MM/yyyy'),
      DAYS_FR[s.date.getDay()],
      s.startTime,
      s.endTime,
      s.breakDuration,
      SHIFT_TYPE_LABELS[s.shiftType] ?? s.shiftType,
      STATUS_LABELS[s.status] ?? s.status,
      s.effectiveHours,
      s.isSunday ? 'Oui' : 'Non',
      s.isHoliday ? 'Oui' : 'Non',
      s.totalPay,
    ])
  }

  if (employee.absences.length > 0) {
    rows.push([])
    rows.push(['── Absences ──'])
    rows.push(['Début', 'Fin', 'Type', 'Statut'])
    for (const a of employee.absences) {
      rows.push([
        format(a.startDate, 'dd/MM/yyyy'),
        format(a.endDate, 'dd/MM/yyyy'),
        ABSENCE_TYPE_LABELS[a.absenceType] ?? a.absenceType,
        a.status === 'approved' ? 'Approuvée' : a.status === 'rejected' ? 'Rejetée' : 'En attente',
      ])
    }
  }

  rows.push([])
  rows.push(['Total interventions', employee.totalShifts])
  rows.push(['Total heures', employee.totalHours])
  rows.push(['Total brut (€)', employee.totalPay])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
    { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 14 },
  ]
  return ws
}

// ─── Point d'entrée public ────────────────────────────────────────────────────

export function generatePlanningExcel(data: PlanningExportData): ExportResult {
  try {
    const wb = XLSX.utils.book_new()

    // Feuille résumé
    XLSX.utils.book_append_sheet(wb, buildSummarySheet(data), 'Résumé')

    // Une feuille par employé
    for (const employee of data.employees) {
      const sheetName = `${employee.firstName} ${employee.lastName}`.slice(0, 31) // limite Excel
      XLSX.utils.book_append_sheet(wb, buildEmployeeSheet(employee), sheetName)
    }

    // Sérialisation base64
    const content = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }) as string

    const suffix = data.employees.length === 1
      ? `${data.employees[0].lastName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_`
      : ''
    const filename = `planning_${suffix}${data.year}_${String(data.month).padStart(2, '0')}.xlsx`

    return {
      success: true,
      filename,
      content,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  } catch (error) {
    return {
      success: false,
      filename: '',
      content: '',
      mimeType: '',
      error: error instanceof Error ? error.message : 'Erreur génération Excel',
    }
  }
}
