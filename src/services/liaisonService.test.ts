import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
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

function createMockMessageDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-001',
    employer_id: 'employer-123',
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
    chain.single = vi.fn().mockResolvedValue(result)
    chain.maybeSingle = vi.fn().mockResolvedValue(result)
    chain.then = vi.fn().mockImplementation((resolve: (val: unknown) => unknown) => Promise.resolve(resolve(result)))
    mockFrom.mockImplementationOnce(() => chain)
  })
}

const EMPLOYER_ID = 'employer-123'
const USER_ID = 'user-456'

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// getLiaisonMessages
// ============================================

describe('getLiaisonMessages', () => {
  it('retourne les messages mappes et reverses en ordre chronologique', async () => {
    const row1 = createMockMessageDbRow({ id: 'msg-001', created_at: '2026-02-10T11:00:00.000Z' })
    const row2 = createMockMessageDbRow({ id: 'msg-002', created_at: '2026-02-10T10:00:00.000Z' })
    mockSupabaseQuery({ data: [row1, row2], error: null, count: 2 })

    const result = await getLiaisonMessages(EMPLOYER_ID)

    expect(result.messages).toHaveLength(2)
    // Reversed: row2 (plus ancien) en premier
    expect(result.messages[0].id).toBe('msg-002')
    expect(result.messages[1].id).toBe('msg-001')
    expect(result.totalCount).toBe(2)
    expect(result.messages[0].employerId).toBe('employer-123')
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

    const result = await getLiaisonMessages(EMPLOYER_ID)

    expect(result.messages).toEqual([])
    expect(result.totalCount).toBe(0)
    expect(result.hasMore).toBe(false)
  })

  it('hasMore est true quand il reste des messages', async () => {
    const rows = Array.from({ length: 50 }, (_, i) =>
      createMockMessageDbRow({ id: `msg-${i}` })
    )
    mockSupabaseQuery({ data: rows, error: null, count: 100 })

    const result = await getLiaisonMessages(EMPLOYER_ID, 1, 50)

    expect(result.hasMore).toBe(true)
  })

  it('hasMore est false quand tous les messages sont charges', async () => {
    const rows = [createMockMessageDbRow()]
    mockSupabaseQuery({ data: rows, error: null, count: 1 })

    const result = await getLiaisonMessages(EMPLOYER_ID, 1, 50)

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
    const result = await getOlderMessages(EMPLOYER_ID, beforeDate, 20)

    expect(result).toHaveLength(2)
    // Reversed: row2 (plus ancien) en premier
    expect(result[0].id).toBe('msg-old-2')
    expect(result[1].id).toBe('msg-old-1')
    expect(chain.lt).toHaveBeenCalledWith('created_at', beforeDate.toISOString())
    expect(chain.limit).toHaveBeenCalledWith(20)
  })

  it('retourne un tableau vide en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

    const result = await getOlderMessages(EMPLOYER_ID, new Date())

    expect(result).toEqual([])
  })
})

// ============================================
// createLiaisonMessage
// ============================================

describe('createLiaisonMessage', () => {
  it('insere un message et retourne le resultat mappe', async () => {
    const row = createMockMessageDbRow()
    const chain = mockSupabaseQuery({ data: row, error: null })

    const result = await createLiaisonMessage(EMPLOYER_ID, USER_ID, 'employer', 'Bonjour')

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      employer_id: EMPLOYER_ID,
      sender_id: USER_ID,
      sender_role: 'employer',
      audio_url: null,
      attachments: [],
      is_edited: false,
      read_by: [USER_ID],
    }))
    expect(chain.select).toHaveBeenCalled()
    expect(chain.single).toHaveBeenCalled()
    expect(result).not.toBeNull()
    expect(result!.id).toBe('msg-001')
  })

  it('lance une erreur en cas d\'echec d\'insertion', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'Insert failed' } })

    await expect(
      createLiaisonMessage(EMPLOYER_ID, USER_ID, 'employer', 'Test')
    ).rejects.toThrow('Insert failed')
  })

  it('sanitize le contenu du message', async () => {
    const row = createMockMessageDbRow()
    mockSupabaseQuery({ data: row, error: null })

    await createLiaisonMessage(EMPLOYER_ID, USER_ID, 'employer', '  Contenu avec espaces  ')

    expect(sanitizeText).toHaveBeenCalledWith('Contenu avec espaces')
  })

  it('transmet l\'audioUrl si fourni', async () => {
    const row = createMockMessageDbRow({ audio_url: 'https://audio.test/file.mp3' })
    const chain = mockSupabaseQuery({ data: row, error: null })

    await createLiaisonMessage(EMPLOYER_ID, USER_ID, 'employer', 'Message', 'https://audio.test/file.mp3')

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      audio_url: 'https://audio.test/file.mp3',
    }))
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
// markAllMessagesAsRead
// ============================================

describe('markAllMessagesAsRead', () => {
  it('met a jour chaque message non lu', async () => {
    const unreadMessages = [
      { id: 'msg-001', read_by: ['other-user'] },
      { id: 'msg-002', read_by: [] },
    ]
    // Appel 1: fetch des messages non lus
    // Appels 2 et 3: update de chaque message
    mockSupabaseQuerySequence([
      { data: unreadMessages, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ])

    await markAllMessagesAsRead(EMPLOYER_ID, USER_ID)

    // 1 fetch + 2 updates = 3 appels a from()
    expect(mockFrom).toHaveBeenCalledTimes(3)
  })

  it('retourne sans erreur si le fetch echoue', async () => {
    mockSupabaseQuery({
      data: null,
      error: { message: 'Fetch error' },
    })

    await expect(markAllMessagesAsRead(EMPLOYER_ID, USER_ID)).resolves.toBeUndefined()
  })
})

// ============================================
// getLiaisonUnreadCount
// ============================================

describe('getLiaisonUnreadCount', () => {
  it('retourne le nombre de messages non lus', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null, count: 5 })

    const count = await getLiaisonUnreadCount(EMPLOYER_ID, USER_ID)

    expect(count).toBe(5)
    expect(chain.not).toHaveBeenCalledWith('read_by', 'cs', `{${USER_ID}}`)
  })

  it('retourne 0 en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'error' }, count: null })

    const count = await getLiaisonUnreadCount(EMPLOYER_ID, USER_ID)

    expect(count).toBe(0)
  })

  it('retourne 0 si count est null', async () => {
    mockSupabaseQuery({ data: null, error: null, count: null })

    const count = await getLiaisonUnreadCount(EMPLOYER_ID, USER_ID)

    expect(count).toBe(0)
  })
})

// ============================================
// subscribeLiaisonMessages
// ============================================

describe('subscribeLiaisonMessages', () => {
  it('cree un channel Supabase et retourne une fonction de desabonnement', () => {
    const channelObj: Record<string, unknown> = {}
    channelObj.on = vi.fn().mockReturnValue(channelObj)
    channelObj.subscribe = vi.fn().mockReturnValue(channelObj)
    mockChannel.mockReturnValue(channelObj)

    const callback = vi.fn()
    const unsubscribe = subscribeLiaisonMessages(EMPLOYER_ID, callback)

    expect(mockChannel).toHaveBeenCalledWith(`liaison:${EMPLOYER_ID}`)
    expect(channelObj.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'liaison_messages',
        filter: `employer_id=eq.${EMPLOYER_ID}`,
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

    const unsubscribe = subscribeLiaisonMessages(EMPLOYER_ID, vi.fn())
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

    subscribeLiaisonMessages(EMPLOYER_ID, vi.fn())
    // Deuxieme abonnement — doit retirer le premier
    subscribeLiaisonMessages('employer-999', vi.fn())

    expect(mockRemoveChannel).toHaveBeenCalledWith(channelObj1)
  })
})

// ============================================
// subscribeTypingIndicator
// ============================================

describe('subscribeTypingIndicator', () => {
  it('cree un channel presence et retourne setTyping et unsubscribe', () => {
    const channelObj: Record<string, unknown> = {}
    channelObj.on = vi.fn().mockReturnValue(channelObj)
    channelObj.subscribe = vi.fn().mockReturnValue(channelObj)
    channelObj.track = vi.fn().mockResolvedValue(undefined)
    channelObj.presenceState = vi.fn().mockReturnValue({})
    mockChannel.mockReturnValue(channelObj)

    const onTypingChange = vi.fn()
    const result = subscribeTypingIndicator(EMPLOYER_ID, USER_ID, 'Marie', onTypingChange)

    expect(mockChannel).toHaveBeenCalledWith(`typing:${EMPLOYER_ID}`, {
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

    const { unsubscribe } = subscribeTypingIndicator(EMPLOYER_ID, USER_ID, 'Marie', vi.fn())
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

    const { setTyping } = subscribeTypingIndicator(EMPLOYER_ID, USER_ID, 'Marie', vi.fn())
    await setTyping(true)

    expect(channelObj.track).toHaveBeenCalledWith({ isTyping: true, name: 'Marie' })
  })
})
