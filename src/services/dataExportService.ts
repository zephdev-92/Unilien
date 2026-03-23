import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface ExportQuery {
  table: string
  filter: string
  col: 'eq' | 'or_employee' | 'or_employer'
  columns: string
}

const EXPORT_QUERIES: ExportQuery[] = [
  { table: 'profiles', filter: 'id', col: 'eq', columns: 'id, role, first_name, last_name, email, phone, avatar_url, created_at, updated_at' },
  { table: 'shifts', filter: 'employer_id', col: 'or_employee', columns: 'id, contract_id, date, start_time, end_time, break_duration, tasks, notes, shift_type, status, validated_by_employer, validated_by_employee, created_at' },
  { table: 'absences', filter: 'employee_id', col: 'or_employer', columns: 'id, employee_id, absence_type, start_date, end_date, reason, status, business_days_count, created_at' },
  { table: 'contracts', filter: 'employer_id', col: 'or_employee', columns: 'id, employer_id, employee_id, contract_category, contract_type, start_date, end_date, weekly_hours, hourly_rate, status, created_at' },
  { table: 'logbook_entries', filter: 'user_id', col: 'eq', columns: 'id, employer_id, author_id, author_role, type, importance, content, created_at' },
  { table: 'liaison_messages', filter: 'sender_id', col: 'eq', columns: 'id, conversation_id, sender_id, sender_role, content, created_at' },
  { table: 'documents', filter: 'user_id', col: 'eq', columns: 'id, user_id, type, name, url, created_at' },
]

const SHIFT_CSV_COLUMNS = 'id, contract_id, date, start_time, end_time, break_duration, tasks, notes, shift_type, status, validated_by_employer, validated_by_employee, created_at'

/**
 * Exporte toutes les données utilisateur en JSON
 */
export async function exportUserDataJSON(userId: string): Promise<Record<string, unknown[]>> {
  const data: Record<string, unknown[]> = {}

  for (const q of EXPORT_QUERIES) {
    let query = supabase.from(q.table).select(q.columns)
    if (q.col === 'eq') {
      query = query.eq(q.filter, userId)
    } else {
      query = query.or(`employee_id.eq.${userId},employer_id.eq.${userId}`)
    }
    const { data: rows, error } = await query
    if (error) {
      logger.error(`Erreur export table ${q.table}:`, error)
      continue
    }
    if (rows) data[q.table] = rows
  }

  return data
}

/**
 * Exporte les shifts de l'utilisateur en CSV
 */
export async function exportUserShiftsCSV(userId: string): Promise<string | null> {
  const { data: shifts, error } = await supabase
    .from('shifts')
    .select(SHIFT_CSV_COLUMNS)
    .or(`employee_id.eq.${userId},employer_id.eq.${userId}`)

  if (error) {
    logger.error('Erreur export CSV shifts:', error)
    return null
  }

  if (!shifts || shifts.length === 0) return null

  const headers = Object.keys(shifts[0])
  return [
    headers.join(';'),
    ...shifts.map((r) => headers.map((h) => String(r[h as keyof typeof r] ?? '')).join(';'))
  ].join('\n')
}
