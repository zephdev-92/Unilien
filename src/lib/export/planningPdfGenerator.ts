/**
 * Générateur PDF de planning mensuel (grille calendrier)
 * Format A4 portrait — une page par employé
 */

import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { startOfWeek, addDays, startOfMonth, getDaysInMonth } from 'date-fns'
import type { PlanningExportData, PlanningShiftEntry, PlanningAbsenceEntry } from './types'
import type { ExportResult } from './types'

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary:    [78,  100, 120] as [number, number, number],
  white:      [255, 255, 255] as [number, number, number],
  black:      [17,   24,  39] as [number, number, number],
  gray:       [107, 114, 128] as [number, number, number],
  grayLight:  [245, 246, 247] as [number, number, number],
  border:     [210, 214, 220] as [number, number, number],

  // Couleurs shifts
  effective:      [34,  197,  94] as [number, number, number], // vert
  effectiveBg:    [220, 252, 231] as [number, number, number],
  presenceDay:    [245, 158,  11] as [number, number, number], // ambre
  presenceDayBg:  [254, 243, 199] as [number, number, number],
  presenceNight:  [99,  102, 241] as [number, number, number], // indigo
  presenceNightBg:[224, 231, 255] as [number, number, number],
  guard24h:       [220,  38,  38] as [number, number, number], // rouge
  guard24hBg:     [254, 226, 226] as [number, number, number],
  absence:        [156, 163, 175] as [number, number, number], // gris
  absenceBg:      [243, 244, 246] as [number, number, number],
}

const W   = 210  // largeur A4
const H   = 297  // hauteur A4
const MG  = 12   // marges
const CW  = W - 2 * MG  // 186mm

const DAYS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const SHIFT_COLORS: Record<string, { fg: [number,number,number]; bg: [number,number,number]; label: string }> = {
  effective:     { fg: C.effective,     bg: C.effectiveBg,     label: 'Interv.' },
  presence_day:  { fg: C.presenceDay,   bg: C.presenceDayBg,   label: 'Jour' },
  presence_night:{ fg: C.presenceNight, bg: C.presenceNightBg, label: 'Nuit' },
  guard_24h:     { fg: C.guard24h,      bg: C.guard24hBg,      label: 'G.24h' },
}

// ─── Layout calendrier ────────────────────────────────────────────────────────

const HEADER_H = 36   // hauteur en-tête
const DAY_ROW_H = 8   // hauteur ligne jours semaine
const CELL_H = 28     // hauteur ligne semaine
const COL_W = CW / 7  // largeur colonne (≈ 26.57mm)

/**
 * Retourne les semaines du mois : tableau de 5-6 lignes de 7 jours.
 * Commence le lundi (weekStartsOn: 1), comme MonthView.tsx.
 */
function buildCalendarWeeks(year: number, month: number): Date[][] {
  const monthStart = startOfMonth(new Date(year, month - 1))
  const firstCell = startOfWeek(monthStart, { weekStartsOn: 1 })

  const weeks: Date[][] = []
  let current = firstCell

  while (true) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(addDays(current, d))
    }
    weeks.push(week)
    current = addDays(current, 7)
    // Stopper quand la semaine commence après la fin du mois
    const daysInMonth = getDaysInMonth(new Date(year, month - 1))
    const monthEnd = new Date(year, month - 1, daysInMonth)
    if (current > monthEnd) break
  }

  return weeks
}

// ─── Dessin ───────────────────────────────────────────────────────────────────

function drawEmployeePage(
  doc: jsPDF,
  data: PlanningExportData,
  employeeIdx: number
): void {
  const employee = data.employees[employeeIdx]
  const fullName = `${employee.firstName} ${employee.lastName}`

  // En-tête bleue
  doc.setFillColor(...C.primary)
  doc.rect(0, 0, W, HEADER_H, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PLANNING', W / 2, 12, { align: 'center' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(data.periodLabel.toUpperCase(), W / 2, 20, { align: 'center' })
  doc.setFontSize(9)
  doc.text(fullName, W / 2, 28, { align: 'center' })
  doc.setFontSize(7)
  doc.text(
    `Généré le ${format(data.generatedAt, "d MMMM yyyy 'à' HH:mm", { locale: fr })}`,
    W - MG, 34, { align: 'right' }
  )

  // Grille jours
  let y = HEADER_H + 4
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(...C.grayLight)
  doc.rect(MG, y, CW, DAY_ROW_H, 'F')

  DAYS_LABELS.forEach((label, i) => {
    const x = MG + i * COL_W + COL_W / 2
    doc.setTextColor(...C.gray)
    doc.text(label, x, y + 5.5, { align: 'center' })
  })
  y += DAY_ROW_H

  // Semaines
  const weeks = buildCalendarWeeks(data.year, data.month)
  const shiftsMap = buildShiftsMap(employee.shifts)
  const absencesForEmployee = employee.absences.filter((a) => a.status === 'approved')

  for (const week of weeks) {
    drawWeekRow(doc, week, data.month, y, shiftsMap, absencesForEmployee)
    y += CELL_H
  }

  // Légende
  y += 4
  drawLegend(doc, y)

  // Résumé
  y += 12
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.black)
  doc.text(
    `${employee.totalShifts} intervention(s) — ${employee.totalHours.toFixed(2).replace('.', ',')} h — ${employee.totalPay.toFixed(2).replace('.', ',')} €`,
    MG, y
  )
}

function drawWeekRow(
  doc: jsPDF,
  week: Date[],
  month: number,
  y: number,
  shiftsMap: Map<string, PlanningShiftEntry[]>,
  absences: PlanningAbsenceEntry[]
): void {
  week.forEach((day, colIdx) => {
    const x = MG + colIdx * COL_W
    const isCurrentMonth = day.getMonth() === month - 1

    // Fond cellule
    doc.setFillColor(...(isCurrentMonth ? C.white : C.grayLight))
    doc.rect(x, y, COL_W, CELL_H, 'F')
    // Bordure
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.2)
    doc.rect(x, y, COL_W, CELL_H, 'S')

    if (!isCurrentMonth) return

    // Numéro du jour
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.black)
    doc.text(String(day.getDate()), x + 1.5, y + 5)

    const key = format(day, 'yyyy-MM-dd')
    const dayShifts = shiftsMap.get(key) || []

    // Pills shifts (max 3 pour tenir dans la cellule)
    const pillH = 5
    let pillY = y + 7
    const visible = dayShifts.slice(0, 3)
    for (const shift of visible) {
      if (shift.status === 'cancelled') continue
      const colors = SHIFT_COLORS[shift.shiftType] ?? SHIFT_COLORS.effective
      doc.setFillColor(...colors.bg)
      doc.roundedRect(x + 1, pillY, COL_W - 2, pillH, 0.8, 0.8, 'F')
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.fg)
      doc.text(
        `${colors.label} ${shift.startTime}–${shift.endTime}`,
        x + COL_W / 2, pillY + 3.2, { align: 'center' }
      )
      pillY += pillH + 1
    }

    // Bande absence grise (si absence ce jour)
    const isAbsent = absences.some(
      (a) => day >= a.startDate && day <= a.endDate
    )
    if (isAbsent && dayShifts.length === 0) {
      doc.setFillColor(...C.absenceBg)
      doc.rect(x + 1, y + 7, COL_W - 2, 8, 'F')
      doc.setFontSize(5)
      doc.setTextColor(...C.absence)
      doc.text('Absence', x + COL_W / 2, y + 12, { align: 'center' })
    }
  })
}

function buildShiftsMap(shifts: PlanningShiftEntry[]): Map<string, PlanningShiftEntry[]> {
  const map = new Map<string, PlanningShiftEntry[]>()
  for (const shift of shifts) {
    const key = format(shift.date, 'yyyy-MM-dd')
    const existing = map.get(key) || []
    existing.push(shift)
    map.set(key, existing)
  }
  return map
}

function drawLegend(doc: jsPDF, y: number): void {
  const items = [
    { label: 'Intervention', ...SHIFT_COLORS.effective },
    { label: 'Présence jour', ...SHIFT_COLORS.presence_day },
    { label: 'Présence nuit', ...SHIFT_COLORS.presence_night },
    { label: 'Garde 24h', ...SHIFT_COLORS.guard_24h },
    { label: 'Absence', fg: C.absence, bg: C.absenceBg },
  ]
  let x = MG
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  for (const item of items) {
    doc.setFillColor(...item.bg)
    doc.roundedRect(x, y, 3.5, 3.5, 0.5, 0.5, 'F')
    doc.setTextColor(...item.fg)
    doc.text(item.label, x + 4.5, y + 3)
    x += 28
  }
}

function addPageNumbers(doc: jsPDF, total: number): void {
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.gray)
    doc.text(
      `Page ${i} / ${pageCount}  —  ${total} employé(s)`,
      W / 2, H - 5, { align: 'center' }
    )
  }
}

// ─── Point d'entrée public ────────────────────────────────────────────────────

export function generatePlanningPdf(data: PlanningExportData): ExportResult {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    data.employees.forEach((_, idx) => {
      if (idx > 0) doc.addPage()
      drawEmployeePage(doc, data, idx)
    })

    addPageNumbers(doc, data.employees.length)

    const suffix = data.employees.length === 1
      ? `${data.employees[0].lastName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_`
      : 'complet_'
    const filename = `planning_${suffix}${data.year}_${String(data.month).padStart(2, '0')}.pdf`

    return {
      success: true,
      filename,
      content: doc.output('datauristring'),
      mimeType: 'application/pdf',
    }
  } catch (error) {
    return {
      success: false,
      filename: '',
      content: '',
      mimeType: '',
      error: error instanceof Error ? error.message : 'Erreur génération PDF planning',
    }
  }
}
