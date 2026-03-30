/* eslint-disable react-refresh/only-export-components */
/**
 * Générateur PDF de planning mensuel (grille calendrier)
 * Format A4 portrait - une page par employé
 *
 * Utilise @react-pdf/renderer pour un rendu vectoriel net.
 */
import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { startOfWeek, addDays, startOfMonth, getDaysInMonth, format } from 'date-fns'
import type {
  PlanningExportData,
  EmployeePlanningData,
  PlanningShiftEntry,
  ExportResult,
} from './types'
import { renderReactPdf } from './pdfReactRenderer'
import {
  colors,
  formatDateTime,
  PdfHeader,
  PdfFooter,
} from './pdfReactTheme'

const DAYS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function fmtTime(t: string): string {
  const [hh, mm] = t.split(':')
  const h = parseInt(hh, 10)
  const m = parseInt(mm, 10)
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

const SHIFT_LABEL: Record<string, string> = {
  effective: 'Interv.',
  presence_day: 'Jour',
  presence_night: 'Nuit',
  guard_24h: 'G.24h',
}

type ShiftColorKey = 'effective' | 'presence_day' | 'presence_night' | 'guard_24h' | 'absence'
const SHIFT_COLORS: Record<ShiftColorKey, { bg: string; text: string }> = {
  effective: { bg: colors.effectiveBg, text: colors.effectiveText },
  presence_day: { bg: colors.presenceDayBg, text: colors.presenceDayText },
  presence_night: { bg: colors.presenceNightBg, text: colors.presenceNightText },
  guard_24h: { bg: colors.guardBg, text: colors.guardText },
  absence: { bg: colors.absenceBg, text: colors.absenceText },
}

const LEGEND_ITEMS: { key: ShiftColorKey; label: string }[] = [
  { key: 'effective', label: 'Intervention' },
  { key: 'presence_day', label: 'Présence jour' },
  { key: 'presence_night', label: 'Présence nuit' },
  { key: 'guard_24h', label: 'Garde 24h' },
  { key: 'absence', label: 'Absence' },
]

const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 11,
    color: colors.text,
    backgroundColor: colors.bg,
    paddingBottom: 36,
  },
  body: {
    padding: '8px 24px 40px',
  },
  // Calendar
  calendarHeader: {
    flexDirection: 'row',
  },
  calendarHeaderCell: {
    flex: 1,
    backgroundColor: colors.bgSection,
    border: `1px solid ${colors.border}`,
    padding: '6px 4px',
    alignItems: 'center',
  },
  calendarHeaderText: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekendHeader: {
    backgroundColor: '#EDF1F5',
  },
  weekendHeaderText: {
    color: colors.navy,
  },
  calendarRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    border: `1px solid ${colors.border}`,
    padding: '3px 4px',
    minHeight: 75,
  },
  otherMonthCell: {
    flex: 1,
    border: `1px solid ${colors.border}`,
    padding: '3px 4px',
    minHeight: 75,
    backgroundColor: colors.bgSection,
    opacity: 0.4,
  },
  dayNumber: {
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 3,
  },
  weekendDayNumber: {
    color: colors.navy,
  },
  shiftPill: {
    borderRadius: 4,
    padding: '2px 4px',
    marginBottom: 2,
    alignItems: 'center',
  },
  shiftPillText: {
    fontSize: 7,
    fontWeight: 600,
    textAlign: 'center',
  },
  // Legend
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: colors.textMuted,
  },
})

export async function generatePlanningPdf(data: PlanningExportData): Promise<ExportResult> {
  try {
    const content = await renderReactPdf(<PlanningDocument data={data} />)
    const suffix = data.employees.length === 1
      ? `${data.employees[0].lastName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_`
      : 'complet_'
    const filename = `planning_${suffix}${data.year}_${String(data.month).padStart(2, '0')}.pdf`
    return { success: true, filename, content, mimeType: 'application/pdf' }
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

function PlanningDocument({ data }: { data: PlanningExportData }) {
  return (
    <Document>
      {data.employees.map((emp, idx) => (
        <EmployeePage key={idx} data={data} employee={emp} pageIdx={idx} totalPages={data.employees.length} />
      ))}
    </Document>
  )
}

function EmployeePage({
  data,
  employee,
  pageIdx,
  totalPages,
}: {
  data: PlanningExportData
  employee: EmployeePlanningData
  pageIdx: number
  totalPages: number
}) {
  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(' ') || 'Employé inconnu'
  const weeks = buildCalendarWeeks(data.year, data.month)
  const shiftsMap = buildShiftsMap(employee.shifts)
  const absences = employee.absences.filter(a => a.status === 'approved')

  return (
    <Page size="A4" style={s.page}>
      <PdfHeader
        title="PLANNING"
        subtitle={data.periodLabel}
        rightText={`Généré le ${formatDateTime(data.generatedAt)}`}
        badge={fullName}
      />

      <View style={s.body}>
        {/* Calendar header */}
        <View style={s.calendarHeader}>
          {DAYS_LABELS.map((d, i) => (
            <View key={i} style={[s.calendarHeaderCell, i >= 5 && s.weekendHeader]}>
              <Text style={[s.calendarHeaderText, i >= 5 && s.weekendHeaderText]}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar weeks */}
        {weeks.map((week, wi) => (
          <View key={wi} style={s.calendarRow}>
            {week.map((day, di) => {
              const isCurrentMonth = day.getMonth() === data.month - 1
              const isWeekend = di >= 5

              if (!isCurrentMonth) {
                return (
                  <View key={di} style={s.otherMonthCell}>
                    <Text style={[s.dayNumber, isWeekend && s.weekendDayNumber]}>{day.getDate()}</Text>
                  </View>
                )
              }

              const key = format(day, 'yyyy-MM-dd')
              const dayShifts = (shiftsMap.get(key) || []).filter(sh => sh.status !== 'cancelled')
              const isAbsent = absences.some(a => day >= a.startDate && day <= a.endDate)

              return (
                <View key={di} style={s.dayCell}>
                  <Text style={[s.dayNumber, isWeekend && s.weekendDayNumber]}>{day.getDate()}</Text>
                  {dayShifts.slice(0, 3).map((shift, si) => {
                    const colorKey = (SHIFT_COLORS[shift.shiftType as ShiftColorKey] ? shift.shiftType : 'effective') as ShiftColorKey
                    const c = SHIFT_COLORS[colorKey]
                    const label = SHIFT_LABEL[shift.shiftType] ?? 'Interv.'
                    return (
                      <View key={si} style={[s.shiftPill, { backgroundColor: c.bg }]}>
                        <Text style={[s.shiftPillText, { color: c.text }]}>
                          {label} {fmtTime(shift.startTime)}–{fmtTime(shift.endTime)}
                        </Text>
                      </View>
                    )
                  })}
                  {isAbsent && dayShifts.length === 0 && (
                    <View style={[s.shiftPill, { backgroundColor: SHIFT_COLORS.absence.bg }]}>
                      <Text style={[s.shiftPillText, { color: SHIFT_COLORS.absence.text }]}>Absence</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        ))}

        {/* Legend */}
        <View style={[s.legend, { marginTop: 12 }]}>
          {LEGEND_ITEMS.map(item => (
            <View key={item.key} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: SHIFT_COLORS[item.key].bg, borderWidth: 1, borderColor: SHIFT_COLORS[item.key].text }]} />
              <Text style={s.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Summary supprimé */}
      </View>

      <PdfFooter
        legal={`${fullName} — ${data.periodLabel}`}
        page={`Page ${pageIdx + 1}/${totalPages}`}
      />
    </Page>
  )
}

// ─── Pure logic helpers ─────────────────────────────────────────────────────

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
    const daysInMonth = getDaysInMonth(new Date(year, month - 1))
    const monthEnd = new Date(year, month - 1, daysInMonth)
    if (current > monthEnd) break
  }

  return weeks
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
