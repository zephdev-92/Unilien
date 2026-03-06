import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getConversations,
  getOrCreatePrivateConversation,
  ensureTeamConversation,
  getLiaisonMessages,
  getOlderMessages,
  createLiaisonMessage,
  updateLiaisonMessage,
  deleteLiaisonMessage,
  markMessageAsRead,
  markAllMessagesAsRead,
  getLiaisonUnreadCount,
  subscribeLiaisonMessages,
  subscribeTypingIndicator,
} from './liaisonService'
import { sanitizeText } from '@/lib/sanitize'

// ─── Mocks ──────────────────────────────────────────────────────────

const mockFrom = vi.fn()
const mockChannel = vi.fn()
const mockRemoveChannel = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeText: vi.fn((text: string) => text.trim()),
}))

// ─── Helpers ────────────────────────────────────────────────────────

function createMockConversationDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv-001',
    employer_id: 'employer-123',
    type: 'team',
    participant_ids: [],
    created_at: '2026-02-10T09:00:00.000Z',
    updated_at: '2026-02-10T10:00:00.000Z',
    ...overrides,
  }
}

function createMockMessageDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-001',
    employer_id: 'employer-123',
    conversation_id: 'conv-001',
    sender_id: 'user-456',
    sender_role: 'employer',
    content: 'Bonjour, message test',
    audio_url: null,
    attachments: [],
    is_edited: false,
    read_by: ['user-456'],
    created_at: '2026-02-10T10:00:00.000Z',
    updated_at: '2026-02-10T10:00:00.000Z',
    sender: { first_name: 'Marie', last_name: 'Dupont', avatar_url: null },
    ...overrides,
  }
}

/** Cree un mock Supabase query chain standard */
function mockSupabaseQuery(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.lte = vi.fn().mockReturnValue(chain)
  chain.lt = vi.fn().mockReturnValue(chain)
  chain.not = vi.fn().mockReturnValue(chain)
  chain.or = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.range = vi.fn().mockReturnValue(chain)
  chain.contains = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.then = vi.fn().mockImplementation((resolve: (val: unknown) => unknown) => Promise.resolve(resolve(result)))
  mockFrom.mockImplementation(() => chain)
  return chain
}

/** Cree un mock pour enchainer plusieurs appels successifs a from() */
function mockSupabaseQuerySequence(results: Array<{ data?: unknown; error?: unknown; count?: number | null }>) {
  results.forEach((result) => {
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.gte = vi.fn().mockReturnValue(chain)
    chain.lte = vi.fn().mockReturnValue(chain)
    chain.lt = vi.fn().mockReturnValue(chain)
    chain.not = vi.fn().mockReturnValue(chain)
    chain.or = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockReturnValue(chain)
    chain.range = vi.fn().mockReturnValue(chain)
    chain.contains = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue(result)
    chain.maybeSingle = vi.fn().mockResolvedValue(result)
    chain.then = vi.fn().mockImplementation((resolve: (val: unknown) => unknown) => Promise.resolve(resolve(result)))
    mockFrom.mockImplementationOnce(() => chain)
  })
}

const EMPLOYER_ID = 'employer-123'
const CONV_ID = 'conv-001'
const USER_ID = 'user-456'
const OTHER_USER_ID = 'user-789'

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// getConversations
// ============================================

describe('getConversations', () => {
  it('retourne la liste des conversations triees equipe en premier', async () => {
    const teamConv = createMockConversationDbRow({ type: 'team' })
    const privateConv = createMockConversationDbRow({
      id: 'conv-002',
      type: 'private',
      participant_ids: [USER_ID, OTHER_USER_ID],
    })

    // Ordre d'appels from() dans getConversations :
    // 1. from('conversations') → [teamConv, privateConv]
    // Iteration teamConv (type='team') : pas de profile lookup
    // 2. from('liaison_messages') → lastMessage team conv
    // 3. from('liaison_messages') → unreadCount team conv
    // Iteration privateConv (type='private') : profile lookup
    // 4. from('profiles') → otherParticipant (Paul)
    // 5. from('liaison_messages') → lastMessage private conv
    // 6. from('liaison_messages') → unreadCount private conv
    mockSupabaseQuerySequence([
      { data: [teamConv, privateConv], error: null },
      // lastMessage conv team
      { data: { content: 'Bonjour' }, error: null },
      // unreadCount conv team
      { data: null, error: null, count: 2 },
      // otherParticipant conv privée
      { data: { id: OTHER_USER_ID, first_name: 'Paul', last_name: 'Martin', avatar_url: null }, error: null },
      // lastMessage conv privée
      { data: null, error: null },
      // unreadCount conv privée
      { data: null, error: null, count: 0 },
    ])

    const result = await getConversations(EMPLOYER_ID, USER_ID)

    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('team')
    expect(result[1].type).toBe('private')
    expect(result[1].otherParticipant?.firstName).toBe('Paul')
  })

  it('retourne un tableau vide en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

    const result = await getConversations(EMPLOYER_ID, USER_ID)

    expect(result).toEqual([])
  })
})

// ============================================
// ensureTeamConversation
// ============================================

describe('ensureTeamConversation', () => {
  it('retourne l\'id si la conversation equipe existe', async () => {
    mockSupabaseQuery({ data: { id: CONV_ID }, error: null })

    const result = await ensureTeamConversation(EMPLOYER_ID)

    expect(result).toBe(CONV_ID)
  })

  it('cree la conversation si elle n\'existe pas', async () => {
    mockSupabaseQuerySequence([
      { data: null, error: null }, // maybeSingle → pas de conv existante
      { data: { id: 'conv-new' }, error: null }, // insert → nouvelle conv
    ])

    const result = await ensureTeamConversation(EMPLOYER_ID)

    expect(result).toBe('conv-new')
  })

  it('retourne null en cas d\'erreur de creation', async () => {
    mockSupabaseQuerySequence([
      { data: null, error: null }, // pas de conv existante
      { data: null, error: { message: 'Insert failed' } }, // erreur insert
    ])

    const result = await ensureTeamConversation(EMPLOYER_ID)

    expect(result).toBeNull()
  })
})

// ============================================
// getOrCreatePrivateConversation
// ============================================

describe('getOrCreatePrivateConversation', () => {
  it('retourne la conversation existante si elle existe', async () => {
    const existingConv = createMockConversationDbRow({
      type: 'private',
      participant_ids: [USER_ID, OTHER_USER_ID],
    })
    mockSupabaseQuerySequence([
      { data: existingConv, error: null }, // maybeSingle → conv existante
      { data: { id: OTHER_USER_ID, first_name: 'Paul', last_name: 'Martin', avatar_url: null }, error: null },
    ])

    const result = await getOrCreatePrivateConversation(EMPLOYER_ID, USER_ID, OTHER_USER_ID)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('private')
    expect(result!.otherParticipant?.firstName).toBe('Paul')
  })

  it('cree une nouvelle conversation si elle n\'existe pas', async () => {
    const newConv = createMockConversationDbRow({
      type: 'private',
      participant_ids: [USER_ID, OTHER_USER_ID],
    })
    mockSupabaseQuerySequence([
      { data: null, error: null }, // pas de conv existante
      { data: newConv, error: null }, // insert → nouvelle conv
      { data: { id: OTHER_USER_ID, first_name: 'Paul', last_name: 'Martin', avatar_url: null }, error: null },
    ])

    const result = await getOrCreatePrivateConversation(EMPLOYER_ID, USER_ID, OTHER_USER_ID)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('private')
  })

  it('retourne null en cas d\'erreur', async () => {
    mockSupabaseQuerySequence([
      { data: null, error: null }, // pas de conv existante
      { data: null, error: { message: 'Insert failed' } }, // erreur insert
    ])

    const result = await getOrCreatePrivateConversation(EMPLOYER_ID, USER_ID, OTHER_USER_ID)

    expect(result).toBeNull()
  })
})

// ============================================
// getLiaisonMessages
// ============================================

describe('getLiaisonMessages', () => {
  it('retourne les messages mappes et reverses en ordre chronologique', async () => {
    const row1 = createMockMessageDbRow({ id: 'msg-001', created_at: '2026-02-10T11:00:00.000Z' })
    const row2 = createMockMessageDbRow({ id: 'msg-002', created_at: '2026-02-10T10:00:00.000Z' })
    mockSupabaseQuery({ data: [row1, row2], error: null, count: 2 })

    const result = await getLiaisonMessages(CONV_ID)

    expect(result.messages).toHaveLength(2)
    // Reversed: row2 (plus ancien) en premier
    expect(result.messages[0].id).toBe('msg-002')
    expect(result.messages[1].id).toBe('msg-001')
    expect(result.totalCount).toBe(2)
    expect(result.messages[0].employerId).toBe('employer-123')
    expect(result.messages[0].conversationId).toBe('conv-001')
    expect(result.messages[0].senderId).toBe('user-456')
    expect(result.messages[0].senderRole).toBe('employer')
    expect(result.messages[0].content).toBe('Bonjour, message test')
    expect(result.messages[0].isEdited).toBe(false)
    expect(result.messages[0].readBy).toEqual(['user-456'])
    expect(result.messages[0].createdAt).toBeInstanceOf(Date)
    expect(result.messages[0].sender?.firstName).toBe('Marie')
    expect(result.messages[0].sender?.lastName).toBe('Dupont')
    expect(result.messages[0].sender?.avatarUrl).toBeUndefined()
  })

  it('retourne un resultat vide en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

    const result = await getLiaisonMessages(CONV_ID)

    expect(result.messages).toEqual([])
    expect(result.totalCount).toBe(0)
    expect(result.hasMore).toBe(false)
  })

  it('hasMore est true quand il reste des messages', async () => {
    const rows = Array.from({ length: 50 }, (_, i) =>
      createMockMessageDbRow({ id: `msg-${i}` })
    )
    mockSupabaseQuery({ data: rows, error: null, count: 100 })

    const result = await getLiaisonMessages(CONV_ID, 1, 50)

    expect(result.hasMore).toBe(true)
  })

  it('hasMore est false quand tous les messages sont charges', async () => {
    const rows = [createMockMessageDbRow()]
    mockSupabaseQuery({ data: rows, error: null, count: 1 })

    const result = await getLiaisonMessages(CONV_ID, 1, 50)

    expect(result.hasMore).toBe(false)
  })
})

// ============================================
// getOlderMessages
// ============================================

describe('getOlderMessages', () => {
  it('retourne les anciens messages reverses en ordre chronologique', async () => {
    const row1 = createMockMessageDbRow({ id: 'msg-old-1', created_at: '2026-02-09T12:00:00.000Z' })
    const row2 = createMockMessageDbRow({ id: 'msg-old-2', created_at: '2026-02-09T11:00:00.000Z' })
    const chain = mockSupabaseQuery({ data: [row1, row2], error: null })

    const beforeDate = new Date('2026-02-10T10:00:00.000Z')
    const result = await getOlderMessages(CONV_ID, beforeDate, 20)

    expect(result).toHaveLength(2)
    // Reversed: row2 (plus ancien) en premier
    expect(result[0].id).toBe('msg-old-2')
    expect(result[1].id).toBe('msg-old-1')
    expect(chain.lt).toHaveBeenCalledWith('created_at', beforeDate.toISOString())
    expect(chain.limit).toHaveBeenCalledWith(20)
  })

  it('retourne un tableau vide en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

    const result = await getOlderMessages(CONV_ID, new Date())

    expect(result).toEqual([])
  })
})

// ============================================
// createLiaisonMessage
// ============================================

describe('createLiaisonMessage', () => {
  it('insere un message avec conversationId et retourne le resultat mappe', async () => {
    const row = createMockMessageDbRow()
    // 2 appels : insert + update conversations
    mockSupabaseQuerySequence([
      { data: row, error: null },
      { data: null, error: null },
    ])

    const result = await createLiaisonMessage(EMPLOYER_ID, CONV_ID, USER_ID, 'employer', 'Bonjour')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('msg-001')
    expect(result!.conversationId).toBe('conv-001')
  })

  it('lance une erreur en cas d\'echec d\'insertion', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'Insert failed' } })

    await expect(
      createLiaisonMessage(EMPLOYER_ID, CONV_ID, USER_ID, 'employer', 'Test')
    ).rejects.toThrow('Insert failed')
  })

  it('sanitize le contenu du message', async () => {
    const row = createMockMessageDbRow()
    mockSupabaseQuerySequence([
      { data: row, error: null },
      { data: null, error: null },
    ])

    await createLiaisonMessage(EMPLOYER_ID, CONV_ID, USER_ID, 'employer', '  Contenu avec espaces  ')

    expect(sanitizeText).toHaveBeenCalledWith('Contenu avec espaces')
  })
})

// ============================================
// updateLiaisonMessage
// ============================================

describe('updateLiaisonMessage', () => {
  it('met a jour le contenu et marque is_edited a true', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await updateLiaisonMessage('msg-001', 'Contenu modifie')

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      is_edited: true,
      updated_at: expect.any(String),
    }))
    expect(chain.eq).toHaveBeenCalledWith('id', 'msg-001')
  })

  it('lance une erreur en cas d\'echec', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'Update failed' } })

    await expect(
      updateLiaisonMessage('msg-001', 'Nouveau contenu')
    ).rejects.toThrow('Update failed')
  })

  it('sanitize le contenu avant la mise a jour', async () => {
    mockSupabaseQuery({ data: null, error: null })

    await updateLiaisonMessage('msg-001', '  Contenu modifie  ')

    expect(sanitizeText).toHaveBeenCalledWith('Contenu modifie')
  })
})

// ============================================
// deleteLiaisonMessage
// ============================================

describe('deleteLiaisonMessage', () => {
  it('supprime le message par id', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await deleteLiaisonMessage('msg-001')

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'msg-001')
  })

  it('lance une erreur en cas d\'echec', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'Delete failed' } })

    await expect(
      deleteLiaisonMessage('msg-001')
    ).rejects.toThrow('Delete failed')
  })
})

// ============================================
// markMessageAsRead
// ============================================

describe('markMessageAsRead', () => {
  it('ne met pas a jour si l\'utilisateur a deja lu', async () => {
    mockSupabaseQuery({
      data: { read_by: ['user-456'] },
      error: null,
    })

    await markMessageAsRead('msg-001', 'user-456')

    // from() est appele une seule fois pour le fetch, pas d'update
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('ajoute le userId au tableau read_by', async () => {
    const newUserId = 'user-789'
    mockSupabaseQuerySequence([
      { data: { read_by: ['user-456'] }, error: null },
      { data: null, error: null },
    ])

    await markMessageAsRead('msg-001', newUserId)

    // 2 appels: fetch puis update
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('retourne sans erreur si le fetch echoue', async () => {
    mockSupabaseQuery({
      data: null,
      error: { message: 'Fetch error' },
    })

    await expect(markMessageAsRead('msg-001', 'user-456')).resolves.toBeUndefined()
  })
})

// ============================================
// markAllMessagesAsRead (par conversation)
// ============================================

describe('markAllMessagesAsRead', () => {
  it('met a jour chaque message non lu dans la conversation', async () => {
    const unreadMessages = [
      { id: 'msg-001', read_by: ['other-user'] },
      { id: 'msg-002', read_by: [] },
    ]
    mockSupabaseQuerySequence([
      { data: unreadMessages, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ])

    await markAllMessagesAsRead(CONV_ID, USER_ID)

    // 1 fetch + 2 updates = 3 appels a from()
    expect(mockFrom).toHaveBeenCalledTimes(3)
  })

  it('retourne sans erreur si le fetch echoue', async () => {
    mockSupabaseQuery({
      data: null,
      error: { message: 'Fetch error' },
    })

    await expect(markAllMessagesAsRead(CONV_ID, USER_ID)).resolves.toBeUndefined()
  })
})

// ============================================
// getLiaisonUnreadCount (par conversation)
// ============================================

describe('getLiaisonUnreadCount', () => {
  it('retourne le nombre de messages non lus dans la conversation', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null, count: 5 })

    const count = await getLiaisonUnreadCount(CONV_ID, USER_ID)

    expect(count).toBe(5)
    expect(chain.not).toHaveBeenCalledWith('read_by', 'cs', `{${USER_ID}}`)
  })

  it('retourne 0 en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'error' }, count: null })

    const count = await getLiaisonUnreadCount(CONV_ID, USER_ID)

    expect(count).toBe(0)
  })

  it('retourne 0 si count est null', async () => {
    mockSupabaseQuery({ data: null, error: null, count: null })

    const count = await getLiaisonUnreadCount(CONV_ID, USER_ID)

    expect(count).toBe(0)
  })
})

// ============================================
// subscribeLiaisonMessages
// ============================================

describe('subscribeLiaisonMessages', () => {
  it('cree un channel filtre par conversation_id', () => {
    const channelObj: Record<string, unknown> = {}
    channelObj.on = vi.fn().mockReturnValue(channelObj)
    channelObj.subscribe = vi.fn().mockReturnValue(channelObj)
    mockChannel.mockReturnValue(channelObj)

    const callback = vi.fn()
    const unsubscribe = subscribeLiaisonMessages(CONV_ID, callback)

    expect(mockChannel).toHaveBeenCalledWith(`liaison:${CONV_ID}`)
    expect(channelObj.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'liaison_messages',
        filter: `conversation_id=eq.${CONV_ID}`,
      }),
      expect.any(Function)
    )
    expect(channelObj.subscribe).toHaveBeenCalled()
    expect(typeof unsubscribe).toBe('function')
  })

  it('la fonction de desabonnement retire le channel', () => {
    const channelObj: Record<string, unknown> = {}
    channelObj.on = vi.fn().mockReturnValue(channelObj)
    channelObj.subscribe = vi.fn().mockReturnValue(channelObj)
    mockChannel.mockReturnValue(channelObj)

    const unsubscribe = subscribeLiaisonMessages(CONV_ID, vi.fn())
    unsubscribe()

    expect(mockRemoveChannel).toHaveBeenCalledWith(channelObj)
  })

  it('retire le channel precedent lors d\'un nouvel abonnement', () => {
    const channelObj1: Record<string, unknown> = {}
    channelObj1.on = vi.fn().mockReturnValue(channelObj1)
    channelObj1.subscribe = vi.fn().mockReturnValue(channelObj1)

    const channelObj2: Record<string, unknown> = {}
    channelObj2.on = vi.fn().mockReturnValue(channelObj2)
    channelObj2.subscribe = vi.fn().mockReturnValue(channelObj2)

    mockChannel.mockReturnValueOnce(channelObj1).mockReturnValueOnce(channelObj2)

    subscribeLiaisonMessages(CONV_ID, vi.fn())
    subscribeLiaisonMessages('conv-999', vi.fn())

    expect(mockRemoveChannel).toHaveBeenCalledWith(channelObj1)
  })
})

// ============================================
// subscribeTypingIndicator
// ============================================

describe('subscribeTypingIndicator', () => {
  it('cree un channel presence lie a la conversation', () => {
    const channelObj: Record<string, unknown> = {}
    channelObj.on = vi.fn().mockReturnValue(channelObj)
    channelObj.subscribe = vi.fn().mockReturnValue(channelObj)
    channelObj.track = vi.fn().mockResolvedValue(undefined)
    channelObj.presenceState = vi.fn().mockReturnValue({})
    mockChannel.mockReturnValue(channelObj)

    const onTypingChange = vi.fn()
    const result = subscribeTypingIndicator(CONV_ID, USER_ID, 'Marie', onTypingChange)

    expect(mockChannel).toHaveBeenCalledWith(`typing:${CONV_ID}`, {
      config: {
        presence: {
          key: USER_ID,
        },
      },
    })
    expect(channelObj.on).toHaveBeenCalledWith(
      'presence',
      { event: 'sync' },
      expect.any(Function)
    )
    expect(channelObj.subscribe).toHaveBeenCalled()
    expect(typeof result.setTyping).toBe('function')
    expect(typeof result.unsubscribe).toBe('function')
  })

  it('unsubscribe retire le channel', () => {
    const channelObj: Record<string, unknown> = {}
    channelObj.on = vi.fn().mockReturnValue(channelObj)
    channelObj.subscribe = vi.fn().mockReturnValue(channelObj)
    channelObj.track = vi.fn().mockResolvedValue(undefined)
    channelObj.presenceState = vi.fn().mockReturnValue({})
    mockChannel.mockReturnValue(channelObj)

    const { unsubscribe } = subscribeTypingIndicator(CONV_ID, USER_ID, 'Marie', vi.fn())
    unsubscribe()

    expect(mockRemoveChannel).toHaveBeenCalledWith(channelObj)
  })

  it('setTyping appelle channel.track avec l\'etat de frappe', async () => {
    const channelObj: Record<string, unknown> = {}
    channelObj.on = vi.fn().mockReturnValue(channelObj)
    channelObj.subscribe = vi.fn().mockReturnValue(channelObj)
    channelObj.track = vi.fn().mockResolvedValue(undefined)
    channelObj.presenceState = vi.fn().mockReturnValue({})
    mockChannel.mockReturnValue(channelObj)

    const { setTyping } = subscribeTypingIndicator(CONV_ID, USER_ID, 'Marie', vi.fn())
    await setTyping(true)

    expect(channelObj.track).toHaveBeenCalledWith({ isTyping: true, name: 'Marie' })
  })
})
