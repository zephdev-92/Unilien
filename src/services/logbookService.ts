import { supabase } from '@/lib/supabase/client'
import type { LogEntry, UserRole, Attachment } from '@/types'

// ============================================
// TYPES
// ============================================

export interface LogEntryFilters {
  type?: LogEntry['type'][]
  importance?: LogEntry['importance']
  authorRole?: UserRole
  unreadOnly?: boolean
}

export interface LogEntryWithAuthor extends LogEntry {
  author?: {
    firstName: string
    lastName: string
  }
}

export interface PaginatedLogEntries {
  entries: LogEntryWithAuthor[]
  totalCount: number
  hasMore: boolean
}

// ============================================
// GET LOG ENTRIES
// ============================================

export async function getLogEntries(
  employerId: string,
  userId: string,
  userRole: UserRole,
  filters?: LogEntryFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedLogEntries> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('log_entries')
    .select(`
      *,
      author:profiles!author_id(
        first_name,
        last_name
      )
    `, { count: 'exact' })
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .range(from, to)

  // Appliquer les filtres
  if (filters?.type && filters.type.length > 0) {
    query = query.in('type', filters.type)
  }

  if (filters?.importance) {
    query = query.eq('importance', filters.importance)
  }

  if (filters?.authorRole) {
    query = query.eq('author_role', filters.authorRole)
  }

  if (filters?.unreadOnly) {
    query = query.not('read_by', 'cs', `{${userId}}`)
  }

  // Filtrage par rôle utilisateur
  if (userRole === 'employee') {
    // Les employés voient leurs entrées + les entrées broadcast + celles qui leur sont destinées
    query = query.or(`author_id.eq.${userId},recipient_id.is.null,recipient_id.eq.${userId}`)
  }
  // Note: Pour les caregivers, vérifier canViewLiaison côté appelant

  const { data, error, count } = await query

  if (error) {
    console.error('Erreur récupération entrées cahier:', error)
    return { entries: [], totalCount: 0, hasMore: false }
  }

  const entries = (data || []).map(mapLogEntryFromDb)
  const totalCount = count || 0
  const hasMore = from + entries.length < totalCount

  return { entries, totalCount, hasMore }
}

// ============================================
// GET SINGLE ENTRY
// ============================================

export async function getLogEntryById(
  entryId: string
): Promise<LogEntryWithAuthor | null> {
  const { data, error } = await supabase
    .from('log_entries')
    .select(`
      *,
      author:profiles!author_id(
        first_name,
        last_name
      )
    `)
    .eq('id', entryId)
    .single()

  if (error) {
    console.error('Erreur récupération entrée:', error)
    return null
  }

  return mapLogEntryFromDb(data)
}

// ============================================
// CREATE LOG ENTRY
// ============================================

export async function createLogEntry(
  employerId: string,
  authorId: string,
  authorRole: UserRole,
  data: {
    type: LogEntry['type']
    importance: LogEntry['importance']
    content: string
    recipientId?: string
  }
): Promise<LogEntry | null> {
  const { data: created, error } = await supabase
    .from('log_entries')
    .insert({
      employer_id: employerId,
      author_id: authorId,
      author_role: authorRole,
      type: data.type,
      importance: data.importance,
      content: data.content,
      recipient_id: data.recipientId || null,
      audio_url: null,
      attachments: [],
      read_by: [authorId], // L'auteur a déjà "lu" son entrée
    })
    .select()
    .single()

  if (error) {
    console.error('Erreur création entrée cahier:', error)
    throw new Error(error.message)
  }

  return mapLogEntryFromDb(created)
}

// ============================================
// UPDATE LOG ENTRY
// ============================================

export async function updateLogEntry(
  entryId: string,
  updates: Partial<{
    type: LogEntry['type']
    importance: LogEntry['importance']
    content: string
    recipientId: string | null
  }>
): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.type) payload.type = updates.type
  if (updates.importance) payload.importance = updates.importance
  if (updates.content) payload.content = updates.content
  if (updates.recipientId !== undefined) payload.recipient_id = updates.recipientId

  const { error } = await supabase
    .from('log_entries')
    .update(payload)
    .eq('id', entryId)

  if (error) {
    console.error('Erreur mise à jour entrée:', error)
    throw new Error(error.message)
  }
}

// ============================================
// DELETE LOG ENTRY
// ============================================

export async function deleteLogEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('log_entries')
    .delete()
    .eq('id', entryId)

  if (error) {
    console.error('Erreur suppression entrée:', error)
    throw new Error(error.message)
  }
}

// ============================================
// MARK AS READ
// ============================================

export async function markAsRead(
  entryId: string,
  userId: string
): Promise<void> {
  // Récupérer l'entrée actuelle
  const { data: entry, error: fetchError } = await supabase
    .from('log_entries')
    .select('read_by')
    .eq('id', entryId)
    .single()

  if (fetchError) {
    console.error('Erreur récupération entrée pour marquer comme lue:', fetchError)
    return
  }

  // Ajouter l'utilisateur s'il n'est pas déjà dans la liste
  const readBy = entry.read_by || []
  if (readBy.includes(userId)) {
    return // Déjà lu
  }

  const updatedReadBy = [...readBy, userId]

  const { error } = await supabase
    .from('log_entries')
    .update({ read_by: updatedReadBy })
    .eq('id', entryId)

  if (error) {
    console.error('Erreur marquage comme lu:', error)
  }
}

// ============================================
// GET UNREAD COUNT
// ============================================

export async function getUnreadCount(
  employerId: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('log_entries')
    .select('*', { count: 'exact', head: true })
    .eq('employer_id', employerId)
    .not('read_by', 'cs', `{${userId}}`)

  if (error) {
    console.error('Erreur comptage non lus:', error)
    return 0
  }

  return count || 0
}

// ============================================
// GET RECENT ENTRIES (for dashboard widget)
// ============================================

export async function getRecentLogEntries(
  employerId: string,
  limit: number = 3
): Promise<LogEntryWithAuthor[]> {
  const { data, error } = await supabase
    .from('log_entries')
    .select(`
      *,
      author:profiles!author_id(
        first_name,
        last_name
      )
    `)
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Erreur récupération entrées récentes:', error)
    return []
  }

  return (data || []).map(mapLogEntryFromDb)
}

// ============================================
// HELPER: MAP FROM DB
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLogEntryFromDb(data: any): LogEntryWithAuthor {
  return {
    id: data.id,
    employerId: data.employer_id,
    authorId: data.author_id,
    authorRole: data.author_role,
    type: data.type,
    importance: data.importance,
    content: data.content,
    audioUrl: data.audio_url || undefined,
    attachments: (data.attachments || []) as Attachment[],
    recipientId: data.recipient_id || undefined,
    readBy: data.read_by || [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    author: data.author
      ? {
          firstName: data.author.first_name,
          lastName: data.author.last_name,
        }
      : undefined,
  }
}
