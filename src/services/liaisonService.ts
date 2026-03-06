import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type { Conversation, LiaisonMessage, LiaisonMessageWithSender, UserRole } from '@/types'
import type { ConversationDbRow, LiaisonMessageDbRow } from '@/types/database'
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
// CONVERSATIONS
// ============================================

/**
 * Récupère toutes les conversations accessibles par un utilisateur pour un employeur.
 * Inclut toujours la conversation d'équipe + les conversations privées de l'utilisateur.
 */
export async function getConversations(
  employerId: string,
  userId: string
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('employer_id', employerId)
    .order('updated_at', { ascending: false })

  if (error) {
    logger.error('Erreur récupération conversations:', error)
    return []
  }

  const conversations = data || []
  const result: Conversation[] = []

  for (const conv of conversations) {
    // Pour les conversations privées, récupérer le profil de l'autre participant
    let otherParticipant: Conversation['otherParticipant'] = undefined

    if (conv.type === 'private') {
      const otherUserId = conv.participant_ids.find((id: string) => id !== userId)
      if (otherUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .eq('id', otherUserId)
          .single()

        if (profile) {
          otherParticipant = {
            id: profile.id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            avatarUrl: profile.avatar_url || undefined,
          }
        }
      }
    }

    // Dernier message
    const { data: lastMsgData } = await supabase
      .from('liaison_messages')
      .select('content')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Nombre de messages non lus
    const { count: unreadCount } = await supabase
      .from('liaison_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .not('read_by', 'cs', `{${userId}}`)

    result.push(mapConversationFromDb(conv, {
      otherParticipant,
      lastMessage: lastMsgData?.content,
      unreadCount: unreadCount || 0,
    }))
  }

  // Toujours mettre la conversation d'équipe en premier
  result.sort((a, b) => {
    if (a.type === 'team') return -1
    if (b.type === 'team') return 1
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })

  return result
}

/**
 * Crée ou retrouve la conversation privée entre deux utilisateurs.
 */
export async function getOrCreatePrivateConversation(
  employerId: string,
  userId: string,
  otherUserId: string
): Promise<Conversation | null> {
  // Chercher une conversation privée existante entre ces deux participants
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('employer_id', employerId)
    .eq('type', 'private')
    .contains('participant_ids', [userId, otherUserId])
    .maybeSingle()

  if (existing) {
    // Récupérer le profil de l'autre participant
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .eq('id', otherUserId)
      .single()

    return mapConversationFromDb(existing, {
      otherParticipant: profile
        ? {
            id: profile.id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            avatarUrl: profile.avatar_url || undefined,
          }
        : undefined,
      unreadCount: 0,
    })
  }

  // Créer une nouvelle conversation privée
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      employer_id: employerId,
      type: 'private',
      participant_ids: [userId, otherUserId],
    })
    .select()
    .single()

  if (error) {
    logger.error('Erreur création conversation privée:', error)
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url')
    .eq('id', otherUserId)
    .single()

  return mapConversationFromDb(created, {
    otherParticipant: profile
      ? {
          id: profile.id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          avatarUrl: profile.avatar_url || undefined,
        }
      : undefined,
    unreadCount: 0,
  })
}

/**
 * Crée ou retrouve la conversation d'équipe d'un employeur.
 * Retourne l'ID de la conversation.
 */
export async function ensureTeamConversation(employerId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('employer_id', employerId)
    .eq('type', 'team')
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      employer_id: employerId,
      type: 'team',
      participant_ids: [],
    })
    .select('id')
    .single()

  if (error) {
    logger.error('Erreur création conversation équipe:', error)
    return null
  }

  return created.id
}

// ============================================
// GET MESSAGES
// ============================================

export async function getLiaisonMessages(
  conversationId: string,
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
    .eq('conversation_id', conversationId)
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
  conversationId: string,
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
    .eq('conversation_id', conversationId)
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
  conversationId: string,
  senderId: string,
  senderRole: UserRole,
  content: string,
  audioUrl?: string
): Promise<LiaisonMessage | null> {
  const { data, error } = await supabase
    .from('liaison_messages')
    .insert({
      employer_id: employerId,
      conversation_id: conversationId,
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

  // Mettre à jour updated_at de la conversation
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

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
// MARK ALL AS READ (par conversation)
// ============================================

export async function markAllMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  // Get all unread messages in this conversation
  const { data: unreadMessages, error: fetchError } = await supabase
    .from('liaison_messages')
    .select('id, read_by')
    .eq('conversation_id', conversationId)
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
// GET UNREAD COUNT (par conversation)
// ============================================

export async function getLiaisonUnreadCount(
  conversationId: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('liaison_messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .not('read_by', 'cs', `{${userId}}`)

  if (error) {
    logger.error('Erreur comptage messages non lus:', error)
    return 0
  }

  return count || 0
}

/**
 * Compte le total des messages non lus pour un employeur (pour badge nav).
 */
export async function getTotalUnreadCount(
  employerId: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('liaison_messages')
    .select('*', { count: 'exact', head: true })
    .eq('employer_id', employerId)
    .not('read_by', 'cs', `{${userId}}`)

  if (error) {
    logger.error('Erreur comptage messages non lus total:', error)
    return 0
  }

  return count || 0
}

// ============================================
// REALTIME SUBSCRIPTION
// ============================================

let activeChannel: RealtimeChannel | null = null

export function subscribeLiaisonMessages(
  conversationId: string,
  onMessage: MessageChangeCallback
): () => void {
  // Unsubscribe from previous channel if exists
  if (activeChannel) {
    supabase.removeChannel(activeChannel)
    activeChannel = null
  }

  const channel = supabase
    .channel(`liaison:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'liaison_messages',
        filter: `conversation_id=eq.${conversationId}`,
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
  conversationId: string,
  userId: string,
  userName: string,
  onTypingChange: (typingUsers: TypingUser[]) => void
): {
  setTyping: (isTyping: boolean) => void
  unsubscribe: () => void
} {
  const channel = supabase.channel(`typing:${conversationId}`, {
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
// HELPERS: MAP FROM DB
// ============================================

function mapConversationFromDb(
  data: ConversationDbRow,
  computed: {
    otherParticipant?: Conversation['otherParticipant']
    lastMessage?: string
    unreadCount: number
  }
): Conversation {
  return {
    id: data.id,
    employerId: data.employer_id,
    type: data.type,
    participantIds: data.participant_ids || [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    otherParticipant: computed.otherParticipant,
    lastMessage: computed.lastMessage,
    unreadCount: computed.unreadCount,
  }
}

function mapMessageFromDb(data: LiaisonMessageDbRow | Record<string, unknown>): LiaisonMessageWithSender {
  const row = data as LiaisonMessageDbRow
  return {
    id: row.id,
    employerId: row.employer_id,
    conversationId: row.conversation_id || '',
    senderId: row.sender_id,
    senderRole: row.sender_role,
    content: row.content,
    audioUrl: row.audio_url || undefined,
    attachments: row.attachments || [],
    isEdited: row.is_edited || false,
    readBy: row.read_by || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sender: row.sender
      ? {
          firstName: row.sender.first_name,
          lastName: row.sender.last_name,
          avatarUrl: row.sender.avatar_url || undefined,
        }
      : undefined,
  }
}
