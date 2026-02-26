import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================
// MOCKS
// ============================================

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeText: vi.fn((text: string) => text.trim()),
}))

const mockGetProfileName = vi.fn()
const mockCreateUrgentLogEntryNotification = vi.fn()
const mockCreateLogEntryDirectedNotification = vi.fn()

vi.mock('@/services/notificationService', () => ({
  createUrgentLogEntryNotification: (...args: unknown[]) => mockCreateUrgentLogEntryNotification(...args),
  createLogEntryDirectedNotification: (...args: unknown[]) => mockCreateLogEntryDirectedNotification(...args),
}))

vi.mock('@/services/profileService', () => ({
  getProfileName: (...args: unknown[]) => mockGetProfileName(...args),
}))

// ============================================
// HELPERS
// ============================================

function mockSupabaseQuery(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
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
  chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result)))
  mockFrom.mockImplementation(() => chain)
  return chain
}

function mockSupabaseQuerySequence(results: Array<{ data?: unknown; error?: unknown; count?: number | null }>) {
  results.forEach((result) => {
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.upsert = vi.fn().mockReturnValue(chain)
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
    chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result)))
    mockFrom.mockImplementationOnce(() => chain)
  })
}

function createMockLogEntryDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry-001',
    employer_id: 'employer-123',
    author_id: 'user-456',
    author_role: 'employer',
    type: 'note',
    importance: 'normal',
    content: 'Contenu test',
    audio_url: null,
    attachments: [],
    recipient_id: null,
    read_by: ['user-456'],
    created_at: '2026-02-10T10:00:00.000Z',
    updated_at: '2026-02-10T10:00:00.000Z',
    author: { first_name: 'Marie', last_name: 'Dupont' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// IMPORTS (apres les mocks)
// ============================================

import {
  getLogEntries,
  getLogEntryById,
  createLogEntry,
  updateLogEntry,
  deleteLogEntry,
  markAsRead,
  getUnreadCount,
  getRecentLogEntries,
} from '@/services/logbookService'
import { sanitizeText } from '@/lib/sanitize'

// ============================================
// TESTS
// ============================================

describe('logbookService', () => {
  // ------------------------------------------
  // getLogEntries
  // ------------------------------------------
  describe('getLogEntries', () => {
    it('retourne les entrees paginées avec le mapping correct', async () => {
      const rows = [createMockLogEntryDbRow(), createMockLogEntryDbRow({ id: 'entry-002' })]
      mockSupabaseQuery({ data: rows, error: null, count: 2 })

      const result = await getLogEntries('employer-123', 'user-456', 'employer')

      expect(result.entries).toHaveLength(2)
      expect(result.totalCount).toBe(2)
      expect(result.hasMore).toBe(false)
      expect(result.entries[0]).toMatchObject({
        id: 'entry-001',
        employerId: 'employer-123',
        authorId: 'user-456',
        content: 'Contenu test',
        author: { firstName: 'Marie', lastName: 'Dupont' },
      })
      expect(mockFrom).toHaveBeenCalledWith('log_entries')
    })

    it('retourne un résultat vide en cas d erreur', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'DB error' }, count: null })

      const result = await getLogEntries('employer-123', 'user-456', 'employer')

      expect(result).toEqual({ entries: [], totalCount: 0, hasMore: false })
    })

    it('applique les filtres type, importance et authorRole', async () => {
      const chain = mockSupabaseQuery({ data: [], error: null, count: 0 })

      await getLogEntries('employer-123', 'user-456', 'employer', {
        type: ['note', 'observation'],
        importance: 'urgent',
        authorRole: 'employee',
      })

      expect(chain.in).toHaveBeenCalledWith('type', ['note', 'observation'])
      expect(chain.eq).toHaveBeenCalledWith('importance', 'urgent')
      expect(chain.eq).toHaveBeenCalledWith('author_role', 'employee')
    })

    it('applique le filtre unreadOnly avec not', async () => {
      const chain = mockSupabaseQuery({ data: [], error: null, count: 0 })

      await getLogEntries('employer-123', 'user-456', 'employer', {
        unreadOnly: true,
      })

      expect(chain.not).toHaveBeenCalledWith('read_by', 'cs', '{user-456}')
    })

    it('calcule hasMore correctement pour la pagination', async () => {
      const rows = Array.from({ length: 20 }, (_, i) =>
        createMockLogEntryDbRow({ id: `entry-${i}` })
      )
      mockSupabaseQuery({ data: rows, error: null, count: 50 })

      const result = await getLogEntries('employer-123', 'user-456', 'employer', undefined, 1, 20)

      expect(result.hasMore).toBe(true)
      expect(result.totalCount).toBe(50)
    })

    it('ajoute un filtre or pour le role employee', async () => {
      const chain = mockSupabaseQuery({ data: [], error: null, count: 0 })

      await getLogEntries('employer-123', 'user-456', 'employee')

      expect(chain.or).toHaveBeenCalledWith(
        'author_id.eq.user-456,recipient_id.is.null,recipient_id.eq.user-456'
      )
    })

    it('n ajoute pas de filtre or pour le role employer', async () => {
      const chain = mockSupabaseQuery({ data: [], error: null, count: 0 })

      await getLogEntries('employer-123', 'user-456', 'employer')

      expect(chain.or).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------
  // getLogEntryById
  // ------------------------------------------
  describe('getLogEntryById', () => {
    it('retourne l entree mappée en cas de succes', async () => {
      const row = createMockLogEntryDbRow()
      mockSupabaseQuery({ data: row, error: null })

      const result = await getLogEntryById('entry-001')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('entry-001')
      expect(result!.author).toEqual({ firstName: 'Marie', lastName: 'Dupont' })
    })

    it('retourne null en cas d erreur', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'not found' } })

      const result = await getLogEntryById('entry-missing')

      expect(result).toBeNull()
    })
  })

  // ------------------------------------------
  // createLogEntry
  // ------------------------------------------
  describe('createLogEntry', () => {
    it('insere une entree avec sanitize et retourne le résultat mappé', async () => {
      const row = createMockLogEntryDbRow()
      mockSupabaseQuery({ data: row, error: null })

      const result = await createLogEntry('employer-123', 'user-456', 'employer', {
        type: 'note',
        importance: 'normal',
        content: '  Contenu test  ',
      })

      expect(sanitizeText).toHaveBeenCalledWith('  Contenu test  ')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('entry-001')
      expect(mockFrom).toHaveBeenCalledWith('log_entries')
    })

    it('lance une erreur en cas d echec d insertion', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'insert failed' } })

      await expect(
        createLogEntry('employer-123', 'user-456', 'employer', {
          type: 'note',
          importance: 'normal',
          content: 'test',
        })
      ).rejects.toThrow('insert failed')
    })

    it('envoie une notification dirigée si recipientId est fourni et importance non urgente', async () => {
      const row = createMockLogEntryDbRow({ recipient_id: 'recipient-789' })
      mockSupabaseQuery({ data: row, error: null })
      mockGetProfileName.mockResolvedValue('Marie Dupont')
      mockCreateLogEntryDirectedNotification.mockResolvedValue(undefined)

      await createLogEntry('employer-123', 'user-456', 'employer', {
        type: 'note',
        importance: 'normal',
        content: 'Message dirigé',
        recipientId: 'recipient-789',
      })

      expect(mockGetProfileName).toHaveBeenCalledWith('user-456')
      expect(mockCreateLogEntryDirectedNotification).toHaveBeenCalledWith(
        'recipient-789',
        'Marie Dupont',
        'Message dirigé'
      )
      expect(mockCreateUrgentLogEntryNotification).not.toHaveBeenCalled()
    })

    it('envoie une notification urgente a tous les membres de l equipe', async () => {
      const insertedRow = createMockLogEntryDbRow({ importance: 'urgent' })

      // Sequence: 1) insert log_entries, 2) contracts query, 3) caregivers query
      mockSupabaseQuerySequence([
        { data: insertedRow, error: null },
        { data: [{ employee_id: 'emp-A' }, { employee_id: 'emp-B' }], error: null },
        { data: [{ profile_id: 'carer-C' }], error: null },
      ])

      mockGetProfileName.mockResolvedValue('Marie Dupont')
      mockCreateUrgentLogEntryNotification.mockResolvedValue(undefined)

      await createLogEntry('employer-123', 'user-456', 'employer', {
        type: 'note',
        importance: 'urgent',
        content: 'Alerte urgente',
      })

      expect(mockGetProfileName).toHaveBeenCalledWith('user-456')
      expect(mockCreateUrgentLogEntryNotification).toHaveBeenCalledTimes(1)

      const [memberIds, authorName, content] = mockCreateUrgentLogEntryNotification.mock.calls[0]
      expect(authorName).toBe('Marie Dupont')
      expect(content).toBe('Alerte urgente')
      // L'employeur + emp-A + emp-B + carer-C, moins l'auteur (user-456)
      expect(memberIds).toContain('employer-123')
      expect(memberIds).toContain('emp-A')
      expect(memberIds).toContain('emp-B')
      expect(memberIds).toContain('carer-C')
      expect(memberIds).not.toContain('user-456')
    })

    it('tronque le preview a 80 caracteres pour la notification dirigée', async () => {
      const longContent = 'A'.repeat(120)
      const row = createMockLogEntryDbRow({ recipient_id: 'recipient-789' })
      mockSupabaseQuery({ data: row, error: null })
      mockGetProfileName.mockResolvedValue('Marie')
      mockCreateLogEntryDirectedNotification.mockResolvedValue(undefined)

      await createLogEntry('employer-123', 'user-456', 'employer', {
        type: 'note',
        importance: 'normal',
        content: longContent,
        recipientId: 'recipient-789',
      })

      const preview = mockCreateLogEntryDirectedNotification.mock.calls[0][2] as string
      expect(preview.length).toBeLessThanOrEqual(81) // 80 chars + ellipsis character
      expect(preview).toContain('…')
    })

    it('ne notifie pas si recipientId est fourni avec importance urgent (notification urgente a la place)', async () => {
      const row = createMockLogEntryDbRow({ recipient_id: 'recipient-789', importance: 'urgent' })

      mockSupabaseQuerySequence([
        { data: row, error: null },
        { data: [], error: null },
        { data: [], error: null },
      ])
      mockGetProfileName.mockResolvedValue('Marie')
      mockCreateUrgentLogEntryNotification.mockResolvedValue(undefined)

      await createLogEntry('employer-123', 'user-456', 'employer', {
        type: 'note',
        importance: 'urgent',
        content: 'test',
        recipientId: 'recipient-789',
      })

      // La notification dirigée n'est pas envoyee quand importance=urgent
      expect(mockCreateLogEntryDirectedNotification).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------
  // updateLogEntry
  // ------------------------------------------
  describe('updateLogEntry', () => {
    it('met a jour les champs fournis et sanitize le content', async () => {
      const chain = mockSupabaseQuery({ data: null, error: null })

      await updateLogEntry('entry-001', { content: '  Nouveau contenu  ', type: 'observation' })

      expect(sanitizeText).toHaveBeenCalledWith('  Nouveau contenu  ')
      expect(chain.update).toHaveBeenCalled()
      expect(chain.eq).toHaveBeenCalledWith('id', 'entry-001')
    })

    it('lance une erreur en cas d echec', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'update failed' } })

      await expect(updateLogEntry('entry-001', { content: 'test' })).rejects.toThrow('update failed')
    })
  })

  // ------------------------------------------
  // deleteLogEntry
  // ------------------------------------------
  describe('deleteLogEntry', () => {
    it('supprime l entree par id', async () => {
      const chain = mockSupabaseQuery({ data: null, error: null })

      await deleteLogEntry('entry-001')

      expect(mockFrom).toHaveBeenCalledWith('log_entries')
      expect(chain.delete).toHaveBeenCalled()
      expect(chain.eq).toHaveBeenCalledWith('id', 'entry-001')
    })

    it('lance une erreur en cas d echec', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'delete failed' } })

      await expect(deleteLogEntry('entry-001')).rejects.toThrow('delete failed')
    })
  })

  // ------------------------------------------
  // markAsRead
  // ------------------------------------------
  describe('markAsRead', () => {
    it('ajoute le userId a read_by s il n est pas deja present', async () => {
      // Premier appel: fetch l'entree, deuxieme: update
      mockSupabaseQuerySequence([
        { data: { read_by: ['other-user'] }, error: null },
        { data: null, error: null },
      ])

      await markAsRead('entry-001', 'user-456')

      // Verifie 2 appels a from('log_entries')
      expect(mockFrom).toHaveBeenCalledTimes(2)
    })

    it('ne fait pas d update si l utilisateur a deja lu', async () => {
      mockSupabaseQuery({ data: { read_by: ['user-456'] }, error: null })

      await markAsRead('entry-001', 'user-456')

      // Un seul appel a from (le fetch), pas de deuxieme appel (update)
      expect(mockFrom).toHaveBeenCalledTimes(1)
    })

    it('retourne silencieusement en cas d erreur de fetch', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'fetch error' } })

      // Ne doit pas throw
      await markAsRead('entry-001', 'user-456')

      expect(mockFrom).toHaveBeenCalledTimes(1)
    })
  })

  // ------------------------------------------
  // getUnreadCount
  // ------------------------------------------
  describe('getUnreadCount', () => {
    it('retourne le count des non lus', async () => {
      const chain = mockSupabaseQuery({ data: null, error: null, count: 5 })

      const result = await getUnreadCount('employer-123', 'user-456')

      expect(result).toBe(5)
      expect(chain.not).toHaveBeenCalledWith('read_by', 'cs', '{user-456}')
    })

    it('retourne 0 en cas d erreur', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'count error' }, count: null })

      const result = await getUnreadCount('employer-123', 'user-456')

      expect(result).toBe(0)
    })

    it('retourne 0 si count est null', async () => {
      mockSupabaseQuery({ data: null, error: null, count: null })

      const result = await getUnreadCount('employer-123', 'user-456')

      expect(result).toBe(0)
    })
  })

  // ------------------------------------------
  // getRecentLogEntries
  // ------------------------------------------
  describe('getRecentLogEntries', () => {
    it('retourne les entrees recentes avec la limite par defaut de 3', async () => {
      const rows = [
        createMockLogEntryDbRow({ id: 'entry-001' }),
        createMockLogEntryDbRow({ id: 'entry-002' }),
        createMockLogEntryDbRow({ id: 'entry-003' }),
      ]
      const chain = mockSupabaseQuery({ data: rows, error: null })

      const result = await getRecentLogEntries('employer-123')

      expect(result).toHaveLength(3)
      expect(chain.limit).toHaveBeenCalledWith(3)
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('utilise une limite personnalisée', async () => {
      const chain = mockSupabaseQuery({ data: [], error: null })

      await getRecentLogEntries('employer-123', 5)

      expect(chain.limit).toHaveBeenCalledWith(5)
    })

    it('retourne un tableau vide en cas d erreur', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'error' } })

      const result = await getRecentLogEntries('employer-123')

      expect(result).toEqual([])
    })
  })
})
