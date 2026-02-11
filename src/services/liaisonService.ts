import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type { LiaisonMessage, LiaisonMessageWithSender, UserRole, Attachment } from '@/types'
import type { LiaisonMessageDbRow } from '@/types/database'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// ============================================
// TYPES
// ============================================

export interface PaginatedMessages {
  messages: LiaisonMessageWithSender[]
  totalCount: number
  hasMore: boolean
}

export type MessageChangeCallback = (
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  message: LiaisonMessageWithSender
) => void

// ============================================
// GET MESSAGES
// ============================================

export async function getLiaisonMessages(
  employerId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<PaginatedMessages> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('liaison_messages')
    .select(`
      *,
      sender:profiles!sender_id(
        first_name,
        last_name,
        avatar_url
      )
    `, { count: 'exact' })
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    logger.error('Erreur récupération messages liaison:', error)
    return { messages: [], totalCount: 0, hasMore: false }
  }

  // Reverse to get chronological order for display
  const messages = (data || []).map(mapMessageFromDb).reverse()
  const totalCount = count || 0
  const hasMore = from + (data?.length || 0) < totalCount

  return { messages, totalCount, hasMore }
}

// ============================================
// GET OLDER MESSAGES (for infinite scroll up)
// ============================================

export async function getOlderMessages(
  employerId: string,
  beforeDate: Date,
  limit: number = 20
): Promise<LiaisonMessageWithSender[]> {
  const { data, error } = await supabase
    .from('liaison_messages')
    .select(`
      *,
      sender:profiles!sender_id(
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('employer_id', employerId)
    .lt('created_at', beforeDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('Erreur récupération anciens messages:', error)
    return []
  }

  // Reverse to get chronological order
  return (data || []).map(mapMessageFromDb).reverse()
}

// ============================================
// CREATE MESSAGE
// ============================================

export async function createLiaisonMessage(
  employerId: string,
  senderId: string,
  senderRole: UserRole,
  content: string,
  audioUrl?: string
): Promise<LiaisonMessage | null> {
  const { data, error } = await supabase
    .from('liaison_messages')
    .insert({
      employer_id: employerId,
      sender_id: senderId,
      sender_role: senderRole,
      content: sanitizeText(content.trim()),
      audio_url: audioUrl || null,
      attachments: [],
      is_edited: false,
      read_by: [senderId],
    })
    .select()
    .single()

  if (error) {
    logger.error('Erreur création message liaison:', error)
    throw new Error(error.message)
  }

  return mapMessageFromDb(data)
}

// ============================================
// UPDATE MESSAGE
// ============================================

export async function updateLiaisonMessage(
  messageId: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from('liaison_messages')
    .update({
      content: sanitizeText(content.trim()),
      is_edited: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', messageId)

  if (error) {
    logger.error('Erreur modification message:', error)
    throw new Error(error.message)
  }
}

// ============================================
// DELETE MESSAGE
// ============================================

export async function deleteLiaisonMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('liaison_messages')
    .delete()
    .eq('id', messageId)

  if (error) {
    logger.error('Erreur suppression message:', error)
    throw new Error(error.message)
  }
}

// ============================================
// MARK AS READ
// ============================================

export async function markMessageAsRead(
  messageId: string,
  userId: string
): Promise<void> {
  const { data: message, error: fetchError } = await supabase
    .from('liaison_messages')
    .select('read_by')
    .eq('id', messageId)
    .single()

  if (fetchError) {
    logger.error('Erreur récupération message pour marquer lu:', fetchError)
    return
  }

  const readBy = message.read_by || []
  if (readBy.includes(userId)) return

  const { error } = await supabase
    .from('liaison_messages')
    .update({ read_by: [...readBy, userId] })
    .eq('id', messageId)

  if (error) {
    logger.error('Erreur marquage message lu:', error)
  }
}

// ============================================
// MARK ALL AS READ
// ============================================

export async function markAllMessagesAsRead(
  employerId: string,
  userId: string
): Promise<void> {
  // Get all unread messages
  const { data: unreadMessages, error: fetchError } = await supabase
    .from('liaison_messages')
    .select('id, read_by')
    .eq('employer_id', employerId)
    .not('read_by', 'cs', `{${userId}}`)

  if (fetchError) {
    logger.error('Erreur récupération messages non lus:', fetchError)
    return
  }

  // Update each unread message
  for (const msg of unreadMessages || []) {
    const readBy = msg.read_by || []
    await supabase
      .from('liaison_messages')
      .update({ read_by: [...readBy, userId] })
      .eq('id', msg.id)
  }
}

// ============================================
// GET UNREAD COUNT
// ============================================

export async function getLiaisonUnreadCount(
  employerId: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('liaison_messages')
    .select('*', { count: 'exact', head: true })
    .eq('employer_id', employerId)
    .not('read_by', 'cs', `{${userId}}`)

  if (error) {
    logger.error('Erreur comptage messages non lus:', error)
    return 0
  }

  return count || 0
}

// ============================================
// REALTIME SUBSCRIPTION
// ============================================

let activeChannel: RealtimeChannel | null = null

export function subscribeLiaisonMessages(
  employerId: string,
  onMessage: MessageChangeCallback
): () => void {
  // Unsubscribe from previous channel if exists
  if (activeChannel) {
    supabase.removeChannel(activeChannel)
    activeChannel = null
  }

  const channel = supabase
    .channel(`liaison:${employerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'liaison_messages',
        filter: `employer_id=eq.${employerId}`,
      },
      async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'

        if (eventType === 'DELETE') {
          // For delete, we only have the old record
          const oldData = payload.old as Record<string, unknown>
          onMessage('DELETE', mapMessageFromDb(oldData))
          return
        }

        // For INSERT/UPDATE, fetch the complete message with sender info
        const newData = payload.new as Record<string, unknown>
        const messageId = newData.id as string

        const { data } = await supabase
          .from('liaison_messages')
          .select(`
            *,
            sender:profiles!sender_id(
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('id', messageId)
          .single()

        if (data) {
          onMessage(eventType, mapMessageFromDb(data))
        }
      }
    )
    .subscribe()

  activeChannel = channel

  // Return unsubscribe function
  return () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel)
      activeChannel = null
    }
  }
}

// ============================================
// TYPING INDICATOR (presence)
// ============================================

export interface TypingUser {
  id: string
  name: string
}

export function subscribeTypingIndicator(
  employerId: string,
  userId: string,
  userName: string,
  onTypingChange: (typingUsers: TypingUser[]) => void
): {
  setTyping: (isTyping: boolean) => void
  unsubscribe: () => void
} {
  const channel = supabase.channel(`typing:${employerId}`, {
    config: {
      presence: {
        key: userId,
      },
    },
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const typingUsers: TypingUser[] = []

      Object.entries(state).forEach(([key, presences]) => {
        if (key !== userId) {
          const presence = presences[0] as { isTyping?: boolean; name?: string }
          if (presence?.isTyping) {
            typingUsers.push({
              id: key,
              name: presence.name || 'Utilisateur',
            })
          }
        }
      })

      onTypingChange(typingUsers)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ isTyping: false, name: userName })
      }
    })

  return {
    setTyping: async (isTyping: boolean) => {
      await channel.track({ isTyping, name: userName })
    },
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

// ============================================
// HELPER: MAP FROM DB
// ============================================

function mapMessageFromDb(data: LiaisonMessageDbRow): LiaisonMessageWithSender {
  return {
    id: data.id,
    employerId: data.employer_id,
    senderId: data.sender_id,
    senderRole: data.sender_role,
    content: data.content,
    audioUrl: data.audio_url || undefined,
    attachments: (data.attachments || []) as Attachment[],
    isEdited: data.is_edited || false,
    readBy: data.read_by || [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    sender: data.sender
      ? {
          firstName: data.sender.first_name,
          lastName: data.sender.last_name,
          avatarUrl: data.sender.avatar_url || undefined,
        }
      : undefined,
  }
}
