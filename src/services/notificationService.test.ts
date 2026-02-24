import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getNotifications,
  getUnreadNotificationCount,
  createNotification,
  createBulkNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  dismissAllNotifications,
  deleteExpiredNotifications,
  subscribeToNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  createComplianceWarningNotification,
  createComplianceCriticalNotification,
  createShiftReminderNotification,
  createMessageNotification,
  createTeamMemberAddedNotification,
  createTeamMemberRemovedNotification,
  createContractCreatedNotification,
  createContractTerminatedNotification,
  createShiftCreatedNotification,
  createShiftCancelledNotification,
  createUrgentLogEntryNotification,
  createPermissionsUpdatedNotification,
  createShiftModifiedNotification,
  createAbsenceRequestedNotification,
  createAbsenceResolvedNotification,
  createLogEntryDirectedNotification,
  getProfileName,
  getAlreadyNotifiedShiftIds,
  COMPLIANCE_THRESHOLDS,
} from './notificationService'

// ─── Mocks ──────────────────────────────────────────────────────────

const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockFunctionsInvoke = vi.fn()
const mockChannel = vi.fn()
const mockRemoveChannel = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeText: vi.fn((text: string) => text.trim()),
}))

// ─── Helpers ────────────────────────────────────────────────────────

function createMockNotificationDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-001',
    user_id: 'user-123',
    type: 'message_received',
    priority: 'normal',
    title: 'Notification titre',
    message: 'Notification message',
    data: {},
    action_url: '/dashboard',
    is_read: false,
    is_dismissed: false,
    created_at: '2026-01-15T10:00:00.000Z',
    read_at: null,
    expires_at: null,
    ...overrides,
  }
}

/** Crée un mock Supabase query chain standard */
function mockSupabaseQuery(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {}
  const handler = () => chain
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.lt = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.then = vi.fn().mockImplementation((resolve: (val: unknown) => unknown) => Promise.resolve(resolve(result)))
  mockFrom.mockImplementation(handler)
  return chain
}

const USER_ID = 'user-123'

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// COMPLIANCE_THRESHOLDS
// ============================================

describe('COMPLIANCE_THRESHOLDS', () => {
  it('exporte les seuils de conformité IDCC 3239', () => {
    expect(COMPLIANCE_THRESHOLDS.WEEKLY_HOURS_CRITICAL).toBe(48)
    expect(COMPLIANCE_THRESHOLDS.DAILY_HOURS_CRITICAL).toBe(10)
    expect(COMPLIANCE_THRESHOLDS.DAILY_REST_MINIMUM).toBe(11)
    expect(COMPLIANCE_THRESHOLDS.WEEKLY_REST_MINIMUM).toBe(35)
    expect(COMPLIANCE_THRESHOLDS.SHIFT_REMINDER_HOURS).toBe(24)
  })
})

// ============================================
// getNotifications
// ============================================

describe('getNotifications', () => {
  it('retourne les notifications mappées depuis la DB', async () => {
    const row = createMockNotificationDbRow()
    mockSupabaseQuery({ data: [row], error: null })

    const result = await getNotifications(USER_ID)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('notif-001')
    expect(result[0].userId).toBe('user-123')
    expect(result[0].isRead).toBe(false)
    expect(result[0].createdAt).toBeInstanceOf(Date)
  })

  it('retourne un tableau vide en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

    const result = await getNotifications(USER_ID)

    expect(result).toEqual([])
  })

  it('applique les filtres de type', async () => {
    const chain = mockSupabaseQuery({ data: [], error: null })

    await getNotifications(USER_ID, { type: ['shift_created', 'shift_cancelled'] })

    expect(chain.in).toHaveBeenCalledWith('type', ['shift_created', 'shift_cancelled'])
  })

  it('applique le filtre unreadOnly', async () => {
    const chain = mockSupabaseQuery({ data: [], error: null })

    await getNotifications(USER_ID, { unreadOnly: true })

    // eq est appelé pour user_id, is_dismissed, et is_read
    expect(chain.eq).toHaveBeenCalledWith('is_read', false)
  })

  it('applique le filtre limit', async () => {
    const chain = mockSupabaseQuery({ data: [], error: null })

    await getNotifications(USER_ID, { limit: 10 })

    expect(chain.limit).toHaveBeenCalledWith(10)
  })

  it('applique les filtres de priorité', async () => {
    const chain = mockSupabaseQuery({ data: [], error: null })

    await getNotifications(USER_ID, { priority: ['high', 'urgent'] })

    expect(chain.in).toHaveBeenCalledWith('priority', ['high', 'urgent'])
  })

  it('mappe correctement les champs optionnels', async () => {
    const row = createMockNotificationDbRow({
      read_at: '2026-01-15T11:00:00.000Z',
      expires_at: '2026-02-15T10:00:00.000Z',
      action_url: null,
      priority: null,
      data: null,
    })
    mockSupabaseQuery({ data: [row], error: null })

    const result = await getNotifications(USER_ID)

    expect(result[0].readAt).toBeInstanceOf(Date)
    expect(result[0].expiresAt).toBeInstanceOf(Date)
    expect(result[0].actionUrl).toBeUndefined()
    expect(result[0].priority).toBe('normal')
    expect(result[0].data).toEqual({})
  })
})

// ============================================
// getUnreadNotificationCount
// ============================================

describe('getUnreadNotificationCount', () => {
  it('retourne le nombre de notifications non lues', async () => {
    mockSupabaseQuery({ data: null, error: null, count: 5 })

    const count = await getUnreadNotificationCount(USER_ID)

    expect(count).toBe(5)
  })

  it('retourne 0 en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'error' }, count: null })

    const count = await getUnreadNotificationCount(USER_ID)

    expect(count).toBe(0)
  })

  it('retourne 0 si count est null', async () => {
    mockSupabaseQuery({ data: null, error: null, count: null })

    const count = await getUnreadNotificationCount(USER_ID)

    expect(count).toBe(0)
  })
})

// ============================================
// createNotification
// ============================================

describe('createNotification', () => {
  it('crée une notification via RPC et retourne le résultat mappé', async () => {
    const dbRow = createMockNotificationDbRow()
    mockRpc.mockResolvedValue({ data: dbRow, error: null })
    // Mock pour triggerPushNotification → getNotificationPreferences
    mockSupabaseQuery({ data: null, error: { message: 'no prefs' } })
    mockFunctionsInvoke.mockResolvedValue({ error: null })

    const result = await createNotification({
      userId: USER_ID,
      type: 'message_received',
      title: 'Test',
      message: 'Test message',
    })

    expect(mockRpc).toHaveBeenCalledWith('create_notification', {
      p_user_id: USER_ID,
      p_type: 'message_received',
      p_title: 'Test',
      p_message: 'Test message',
      p_priority: 'normal',
      p_data: {},
      p_action_url: null,
    })
    expect(result).not.toBeNull()
    expect(result!.id).toBe('notif-001')
  })

  it('retourne null en cas d\'erreur RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })

    const result = await createNotification({
      userId: USER_ID,
      type: 'message_received',
      title: 'Test',
      message: 'Test message',
    })

    expect(result).toBeNull()
  })

  it('transmet la priorité et les données optionnelles', async () => {
    const dbRow = createMockNotificationDbRow({ priority: 'urgent' })
    mockRpc.mockResolvedValue({ data: dbRow, error: null })
    mockSupabaseQuery({ data: null, error: { message: 'no prefs' } })

    await createNotification({
      userId: USER_ID,
      type: 'compliance_critical',
      priority: 'urgent',
      title: 'Alert',
      message: 'Critical',
      data: { employeeName: 'Jean' },
      actionUrl: '/compliance',
    })

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_priority: 'urgent',
      p_data: { employeeName: 'Jean' },
      p_action_url: '/compliance',
    }))
  })

  it('déclenche le push notification après la création', async () => {
    const dbRow = createMockNotificationDbRow()
    mockRpc.mockResolvedValue({ data: dbRow, error: null })
    // Prefs avec push activé
    mockSupabaseQuery({
      data: {
        email_enabled: true,
        push_enabled: true,
        compliance_alerts: true,
        shift_reminders: true,
        message_notifications: true,
        reminder_hours_before: 24,
      },
      error: null,
    })
    mockFunctionsInvoke.mockResolvedValue({ error: null })

    await createNotification({
      userId: USER_ID,
      type: 'message_received',
      title: 'Test',
      message: 'Test',
    })

    // Attendre l'exécution async du push
    await vi.waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('send-push-notification', {
        body: { notificationId: 'notif-001' },
      })
    })
  })

  it('sanitise le title et le message avant d\'appeler le RPC', async () => {
    const { sanitizeText } = await import('@/lib/sanitize')
    const dbRow = createMockNotificationDbRow()
    mockRpc.mockResolvedValue({ data: dbRow, error: null })
    mockSupabaseQuery({ data: null, error: { message: 'no prefs' } })

    await createNotification({
      userId: USER_ID,
      type: 'message_received',
      title: '  Alerte <script>xss</script>  ',
      message: '  Message avec balise <b>html</b>  ',
    })

    expect(sanitizeText).toHaveBeenCalledWith('  Alerte <script>xss</script>  ')
    expect(sanitizeText).toHaveBeenCalledWith('  Message avec balise <b>html</b>  ')
  })

  it('ne déclenche pas le push si pushEnabled est false', async () => {
    const dbRow = createMockNotificationDbRow()
    mockRpc.mockResolvedValue({ data: dbRow, error: null })
    mockSupabaseQuery({
      data: {
        email_enabled: true,
        push_enabled: false,
        compliance_alerts: true,
        shift_reminders: true,
        message_notifications: true,
        reminder_hours_before: 24,
      },
      error: null,
    })

    await createNotification({
      userId: USER_ID,
      type: 'message_received',
      title: 'Test',
      message: 'Test',
    })

    // Attendre un tick pour laisser la Promise async s'exécuter
    await new Promise((r) => setTimeout(r, 50))

    expect(mockFunctionsInvoke).not.toHaveBeenCalled()
  })
})

// ============================================
// createBulkNotifications
// ============================================

describe('createBulkNotifications', () => {
  it('retourne un tableau vide pour une liste vide', async () => {
    const result = await createBulkNotifications([])

    expect(result).toEqual([])
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('crée plusieurs notifications et filtre les null', async () => {
    const dbRow1 = createMockNotificationDbRow({ id: 'n-1' })
    const dbRow2 = createMockNotificationDbRow({ id: 'n-2' })
    mockRpc
      .mockResolvedValueOnce({ data: dbRow1, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'fail' } })
      .mockResolvedValueOnce({ data: dbRow2, error: null })
    // Mock prefs pour push (appelé pour chaque notification créée)
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })

    const result = await createBulkNotifications([
      { userId: USER_ID, type: 'message_received', title: 'A', message: 'a' },
      { userId: USER_ID, type: 'message_received', title: 'B', message: 'b' },
      { userId: USER_ID, type: 'message_received', title: 'C', message: 'c' },
    ])

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('n-1')
    expect(result[1].id).toBe('n-2')
  })
})

// ============================================
// markNotificationAsRead
// ============================================

describe('markNotificationAsRead', () => {
  it('met à jour is_read et read_at', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await markNotificationAsRead('notif-001')

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      is_read: true,
    }))
    expect(chain.eq).toHaveBeenCalledWith('id', 'notif-001')
  })

  it('gère les erreurs sans throw', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'error' } })

    await expect(markNotificationAsRead('notif-001')).resolves.toBeUndefined()
  })
})

// ============================================
// markAllNotificationsAsRead
// ============================================

describe('markAllNotificationsAsRead', () => {
  it('met à jour toutes les notifications non lues de l\'utilisateur', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await markAllNotificationsAsRead(USER_ID)

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      is_read: true,
    }))
    expect(chain.eq).toHaveBeenCalledWith('user_id', USER_ID)
  })
})

// ============================================
// dismissNotification
// ============================================

describe('dismissNotification', () => {
  it('met à jour is_dismissed', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await dismissNotification('notif-001')

    expect(chain.update).toHaveBeenCalledWith({ is_dismissed: true })
    expect(chain.eq).toHaveBeenCalledWith('id', 'notif-001')
  })
})

// ============================================
// dismissAllNotifications
// ============================================

describe('dismissAllNotifications', () => {
  it('masque toutes les notifications de l\'utilisateur', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await dismissAllNotifications(USER_ID)

    expect(chain.update).toHaveBeenCalledWith({ is_dismissed: true })
    expect(chain.eq).toHaveBeenCalledWith('user_id', USER_ID)
  })
})

// ============================================
// deleteExpiredNotifications
// ============================================

describe('deleteExpiredNotifications', () => {
  it('supprime les notifications expirées', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await deleteExpiredNotifications(USER_ID)

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('user_id', USER_ID)
    expect(chain.lt).toHaveBeenCalledWith('expires_at', expect.any(String))
  })
})

// ============================================
// subscribeToNotifications
// ============================================

describe('subscribeToNotifications', () => {
  it('crée un channel Supabase et retourne une fonction de désabonnement', () => {
    // subscribe() doit retourner l'objet channel pour que activeChannel soit défini
    const channelObj: Record<string, unknown> = {}
    channelObj.on = vi.fn().mockReturnValue(channelObj)
    channelObj.subscribe = vi.fn().mockReturnValue(channelObj)
    mockChannel.mockReturnValue(channelObj)

    const callback = vi.fn()
    const unsubscribe = subscribeToNotifications(USER_ID, callback)

    expect(mockChannel).toHaveBeenCalledWith(`notifications:${USER_ID}`)
    expect(channelObj.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${USER_ID}`,
      }),
      expect.any(Function)
    )
    expect(channelObj.subscribe).toHaveBeenCalled()
    expect(typeof unsubscribe).toBe('function')
  })

  it('la fonction de désabonnement retire le channel', () => {
    const channelObj: Record<string, unknown> = {}
    channelObj.on = vi.fn().mockReturnValue(channelObj)
    channelObj.subscribe = vi.fn().mockReturnValue(channelObj)
    mockChannel.mockReturnValue(channelObj)

    const unsubscribe = subscribeToNotifications(USER_ID, vi.fn())
    unsubscribe()

    expect(mockRemoveChannel).toHaveBeenCalledWith(channelObj)
  })

  it('retire le channel précédent lors d\'un nouvel abonnement', () => {
    const channelObj1: Record<string, unknown> = {}
    channelObj1.on = vi.fn().mockReturnValue(channelObj1)
    channelObj1.subscribe = vi.fn().mockReturnValue(channelObj1)

    const channelObj2: Record<string, unknown> = {}
    channelObj2.on = vi.fn().mockReturnValue(channelObj2)
    channelObj2.subscribe = vi.fn().mockReturnValue(channelObj2)

    mockChannel.mockReturnValueOnce(channelObj1).mockReturnValueOnce(channelObj2)

    subscribeToNotifications(USER_ID, vi.fn())
    // Deuxième abonnement — doit retirer le premier
    subscribeToNotifications('user-456', vi.fn())

    expect(mockRemoveChannel).toHaveBeenCalledWith(channelObj1)
  })
})

// ============================================
// getNotificationPreferences
// ============================================

describe('getNotificationPreferences', () => {
  it('retourne les préférences depuis la DB', async () => {
    mockSupabaseQuery({
      data: {
        email_enabled: false,
        push_enabled: true,
        compliance_alerts: true,
        shift_reminders: false,
        message_notifications: true,
        reminder_hours_before: 12,
      },
      error: null,
    })

    const prefs = await getNotificationPreferences(USER_ID)

    expect(prefs).toEqual({
      emailEnabled: false,
      pushEnabled: true,
      complianceAlerts: true,
      shiftReminders: false,
      messageNotifications: true,
      reminderHoursBefore: 12,
    })
  })

  it('retourne les valeurs par défaut en cas d\'erreur', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'not found' } })

    const prefs = await getNotificationPreferences(USER_ID)

    expect(prefs).toEqual({
      emailEnabled: true,
      pushEnabled: true,
      complianceAlerts: true,
      shiftReminders: true,
      messageNotifications: true,
      reminderHoursBefore: 24,
    })
  })
})

// ============================================
// updateNotificationPreferences
// ============================================

describe('updateNotificationPreferences', () => {
  it('upsert les préférences avec les champs fournis', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await updateNotificationPreferences(USER_ID, {
      pushEnabled: false,
      reminderHoursBefore: 12,
    })

    expect(chain.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: USER_ID,
      push_enabled: false,
      reminder_hours_before: 12,
    }))
  })

  it('ne met à jour que les champs spécifiés', async () => {
    const chain = mockSupabaseQuery({ data: null, error: null })

    await updateNotificationPreferences(USER_ID, { emailEnabled: false })

    const upsertArg = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(upsertArg.email_enabled).toBe(false)
    expect(upsertArg.push_enabled).toBeUndefined()
  })

  it('gère les erreurs sans throw', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'error' } })

    await expect(
      updateNotificationPreferences(USER_ID, { pushEnabled: true })
    ).resolves.toBeUndefined()
  })
})

// ============================================
// Compliance notification helpers
// ============================================

describe('createComplianceWarningNotification', () => {
  beforeEach(() => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'compliance_warning', priority: 'high' }),
      error: null,
    })
    // Mock prefs pour push
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })
  })

  it('crée une notification warning heures hebdo', async () => {
    const date = new Date('2026-03-01')
    const result = await createComplianceWarningNotification(
      USER_ID, 'Marie Dupont', 'weekly_hours', 44, 48, date
    )

    expect(result).not.toBeNull()
    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'compliance_warning',
      p_priority: 'high',
      p_action_url: '/compliance',
    }))
  })

  it('crée une notification warning heures quotidiennes', async () => {
    const date = new Date('2026-03-01')
    await createComplianceWarningNotification(
      USER_ID, 'Jean Martin', 'daily_hours', 8, 10, date
    )

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_title: 'Heures quotidiennes - Attention',
    }))
  })

  it('crée une notification warning repos hebdomadaire', async () => {
    const date = new Date('2026-03-01')
    await createComplianceWarningNotification(
      USER_ID, 'Jean Martin', 'weekly_rest', 30, 35, date
    )

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_title: 'Repos hebdomadaire insuffisant',
    }))
  })

  it('utilise un message par défaut pour un type inconnu', async () => {
    const date = new Date('2026-03-01')
    await createComplianceWarningNotification(
      USER_ID, 'Jean', 'unknown_type', 1, 2, date
    )

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_title: 'Alerte conformité',
    }))
  })

  it('inclut les données de violation dans data', async () => {
    const date = new Date('2026-03-01')
    await createComplianceWarningNotification(
      USER_ID, 'Marie', 'weekly_hours', 44, 48, date
    )

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_data: expect.objectContaining({
        employeeName: 'Marie',
        violationType: 'weekly_hours',
        currentValue: 44,
        threshold: 48,
      }),
    }))
  })
})

describe('createComplianceCriticalNotification', () => {
  beforeEach(() => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'compliance_critical', priority: 'urgent' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })
  })

  it('crée une notification critique heures hebdo avec priorité urgent', async () => {
    const date = new Date('2026-03-01')
    await createComplianceCriticalNotification(
      USER_ID, 'Marie', 'weekly_hours', 50, 48, date
    )

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'compliance_critical',
      p_priority: 'urgent',
      p_title: 'DÉPASSEMENT HEURES HEBDO',
    }))
  })

  it('crée une notification critique repos quotidien', async () => {
    const date = new Date('2026-03-01')
    await createComplianceCriticalNotification(
      USER_ID, 'Jean', 'daily_rest', 8, 11, date
    )

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_title: 'VIOLATION REPOS QUOTIDIEN',
    }))
  })

  it('utilise un message par défaut pour un type inconnu', async () => {
    const date = new Date('2026-03-01')
    await createComplianceCriticalNotification(
      USER_ID, 'Jean', 'other', 1, 2, date
    )

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_title: 'Violation conformité critique',
    }))
  })
})

// ============================================
// Shift notification helpers
// ============================================

describe('createShiftReminderNotification', () => {
  beforeEach(() => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'shift_reminder' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })
  })

  it('crée un rappel d\'intervention avec date formatée en français', async () => {
    const date = new Date('2026-03-15')
    await createShiftReminderNotification(USER_ID, 'Marie Dupont', date, '09:00', 'shift-123')

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'shift_reminder',
      p_priority: 'normal',
      p_title: 'Rappel intervention',
      p_action_url: '/planning?date=2026-03-15',
    }))
  })

  it('inclut shiftId dans les données', async () => {
    const date = new Date('2026-03-15')
    await createShiftReminderNotification(USER_ID, 'Marie', date, '09:00', 'shift-123')

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_data: expect.objectContaining({
        shiftId: 'shift-123',
        startTime: '09:00',
      }),
    }))
  })
})

// ============================================
// Message notification
// ============================================

describe('createMessageNotification', () => {
  beforeEach(() => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'message_received' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })
  })

  it('crée une notification de message avec actionUrl /liaison', async () => {
    await createMessageNotification(USER_ID, 'Jean Martin', 'Bonjour, comment allez-vous ?')

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'message_received',
      p_title: 'Nouveau message',
      p_action_url: '/liaison',
    }))
  })

  it('tronque le message preview à 100 caractères', async () => {
    const longMessage = 'A'.repeat(150)
    await createMessageNotification(USER_ID, 'Jean', longMessage)

    const call = mockRpc.mock.calls[0]
    const message = call[1].p_message as string
    expect(message).toContain('...')
    // Jean: AAA... — la partie preview est tronquée à 100
    expect(message.length).toBeLessThan(150)
  })
})

// ============================================
// Team notifications
// ============================================

describe('createTeamMemberAddedNotification', () => {
  it('crée une notification d\'ajout à l\'équipe', async () => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'team_member_added' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })

    const result = await createTeamMemberAddedNotification('caregiver-1', 'Famille Dupont')

    expect(result).not.toBeNull()
    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'team_member_added',
      p_action_url: '/dashboard',
    }))
  })

  it('retourne null en cas d\'erreur', async () => {
    mockRpc.mockRejectedValue(new Error('network error'))

    const result = await createTeamMemberAddedNotification('caregiver-1', 'Famille Dupont')

    expect(result).toBeNull()
  })
})

describe('createTeamMemberRemovedNotification', () => {
  it('crée une notification de retrait avec priorité high', async () => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'team_member_removed', priority: 'high' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })

    const result = await createTeamMemberRemovedNotification('caregiver-1', 'Famille Dupont')

    expect(result).not.toBeNull()
    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'team_member_removed',
      p_priority: 'high',
    }))
  })
})

// ============================================
// Contract notifications
// ============================================

describe('createContractCreatedNotification', () => {
  beforeEach(() => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'contract_created' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })
  })

  it('crée une notification de contrat CDI', async () => {
    await createContractCreatedNotification('emp-1', 'M. Dupont', 'CDI')

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'contract_created',
      p_data: expect.objectContaining({ contractType: 'CDI' }),
    }))
  })

  it('crée une notification de contrat CDD', async () => {
    await createContractCreatedNotification('emp-1', 'M. Dupont', 'CDD')

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_message: expect.stringContaining('CDD'),
    }))
  })
})

describe('createContractTerminatedNotification', () => {
  it('crée une notification de fin de contrat avec priorité high', async () => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'contract_terminated', priority: 'high' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })

    const result = await createContractTerminatedNotification('emp-1', 'M. Dupont')

    expect(result).not.toBeNull()
    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'contract_terminated',
      p_priority: 'high',
    }))
  })
})

// ============================================
// Shift created / cancelled / modified
// ============================================

describe('createShiftCreatedNotification', () => {
  beforeEach(() => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'shift_created' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })
  })

  it('crée une notification shift avec l\'URL du planning', async () => {
    const date = new Date('2026-04-10')
    await createShiftCreatedNotification('emp-1', date, '08:00', 'M. Dupont')

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'shift_created',
      p_action_url: '/planning?date=2026-04-10',
    }))
  })

  it('retourne null en cas d\'erreur', async () => {
    mockRpc.mockRejectedValue(new Error('fail'))

    const result = await createShiftCreatedNotification('emp-1', new Date(), '08:00', 'X')

    expect(result).toBeNull()
  })
})

describe('createShiftCancelledNotification', () => {
  it('crée une notification d\'annulation avec priorité high', async () => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'shift_cancelled', priority: 'high' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })

    const date = new Date('2026-04-10')
    await createShiftCancelledNotification('emp-1', date, '08:00')

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'shift_cancelled',
      p_priority: 'high',
      p_action_url: '/planning?date=2026-04-10',
    }))
  })
})

describe('createShiftModifiedNotification', () => {
  it('crée une notification de modification avec le nouvel horaire', async () => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'shift_modified' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })

    const date = new Date('2026-04-10')
    await createShiftModifiedNotification('emp-1', date, '14:00')

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'shift_modified',
      p_title: 'Intervention modifiée',
      p_message: expect.stringContaining('14:00'),
    }))
  })
})

// ============================================
// Logbook notifications
// ============================================

describe('createUrgentLogEntryNotification', () => {
  beforeEach(() => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })
  })

  it('retourne un tableau vide pour une liste de userIds vide', async () => {
    const result = await createUrgentLogEntryNotification([], 'Jean', 'Contenu')

    expect(result).toEqual([])
  })

  it('crée des notifications bulk pour chaque userId', async () => {
    const dbRow = createMockNotificationDbRow({ type: 'logbook_urgent', priority: 'urgent' })
    mockRpc.mockResolvedValue({ data: dbRow, error: null })

    const result = await createUrgentLogEntryNotification(
      ['user-1', 'user-2'],
      'Marie',
      'Note urgente'
    )

    expect(result).toHaveLength(2)
    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  it('tronque le contenu à 100 caractères', async () => {
    const dbRow = createMockNotificationDbRow({ type: 'logbook_urgent' })
    mockRpc.mockResolvedValue({ data: dbRow, error: null })
    const longContent = 'B'.repeat(150)

    await createUrgentLogEntryNotification(['user-1'], 'Marie', longContent)

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_data: expect.objectContaining({
        contentPreview: expect.stringContaining('...'),
      }),
    }))
  })

  it('retourne un tableau vide en cas d\'erreur', async () => {
    mockRpc.mockRejectedValue(new Error('fail'))

    const result = await createUrgentLogEntryNotification(['user-1'], 'Marie', 'Note')

    expect(result).toEqual([])
  })
})

describe('createLogEntryDirectedNotification', () => {
  it('crée une notification logbook dirigée vers un destinataire', async () => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'logbook_entry_directed' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })

    const result = await createLogEntryDirectedNotification('recipient-1', 'Jean', 'Note importante')

    expect(result).not.toBeNull()
    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'logbook_entry_directed',
      p_action_url: '/logbook',
    }))
  })
})

// ============================================
// Permissions notification
// ============================================

describe('createPermissionsUpdatedNotification', () => {
  it('crée une notification de permissions mises à jour', async () => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'permissions_updated' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })

    const result = await createPermissionsUpdatedNotification('caregiver-1', 'Famille Martin')

    expect(result).not.toBeNull()
    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'permissions_updated',
      p_action_url: '/dashboard',
      p_data: expect.objectContaining({ employerName: 'Famille Martin' }),
    }))
  })
})

// ============================================
// Absence notifications
// ============================================

describe('createAbsenceRequestedNotification', () => {
  beforeEach(() => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'absence_requested' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })
  })

  it('crée une notification de demande d\'absence avec les dates formatées', async () => {
    const start = new Date('2026-03-10')
    const end = new Date('2026-03-15')

    await createAbsenceRequestedNotification('employer-1', 'Marie Dupont', 'sick', start, end)

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_type: 'absence_requested',
      p_message: expect.stringContaining('maladie'),
      p_action_url: '/planning?date=2026-03-10',
    }))
  })

  it('utilise le type brut si non trouvé dans absenceTypeLabels', async () => {
    const start = new Date('2026-03-10')
    const end = new Date('2026-03-15')

    await createAbsenceRequestedNotification('employer-1', 'Marie', 'custom_type', start, end)

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_message: expect.stringContaining('custom_type'),
    }))
  })

  it('traduit correctement les types d\'absence', async () => {
    const start = new Date('2026-03-10')
    const end = new Date('2026-03-15')

    await createAbsenceRequestedNotification('employer-1', 'Marie', 'vacation', start, end)

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_message: expect.stringContaining('congé'),
    }))
  })
})

describe('createAbsenceResolvedNotification', () => {
  beforeEach(() => {
    mockRpc.mockResolvedValue({
      data: createMockNotificationDbRow({ type: 'absence_resolved', priority: 'high' }),
      error: null,
    })
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'no prefs' } })
      return chain
    })
  })

  it('crée une notification approuvée', async () => {
    const start = new Date('2026-03-10')
    const end = new Date('2026-03-15')

    await createAbsenceResolvedNotification('emp-1', 'approved', start, end)

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_title: 'Absence approuvée',
      p_message: expect.stringContaining('approuvée'),
      p_priority: 'high',
    }))
  })

  it('crée une notification refusée', async () => {
    const start = new Date('2026-03-10')
    const end = new Date('2026-03-15')

    await createAbsenceResolvedNotification('emp-1', 'rejected', start, end)

    expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
      p_title: 'Absence refusée',
      p_message: expect.stringContaining('refusée'),
    }))
  })
})

// ============================================
// getProfileName
// ============================================

describe('getProfileName', () => {
  it('retourne le nom complet depuis le profil', async () => {
    mockSupabaseQuery({
      data: { first_name: 'Marie', last_name: 'Dupont' },
      error: null,
    })

    const name = await getProfileName('profile-1')

    expect(name).toBe('Marie Dupont')
  })

  it('retourne "Utilisateur" si pas de données', async () => {
    mockSupabaseQuery({ data: null, error: { message: 'not found' } })

    const name = await getProfileName('profile-1')

    expect(name).toBe('Utilisateur')
  })

  it('retourne "Utilisateur" si le nom est vide', async () => {
    mockSupabaseQuery({
      data: { first_name: '', last_name: '' },
      error: null,
    })

    const name = await getProfileName('profile-1')

    expect(name).toBe('Utilisateur')
  })
})

// ─── getAlreadyNotifiedShiftIds ──────────────────────────────────────────────

describe('getAlreadyNotifiedShiftIds', () => {
  function mockShiftReminderQuery(data: unknown) {
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.gte = vi.fn().mockReturnValue(chain)
    chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve({ data, error: null }))
    )
    mockFrom.mockReturnValue(chain)
    return chain
  }

  beforeEach(() => vi.clearAllMocks())

  it('retourne un Set des shiftIds déjà notifiés', async () => {
    mockShiftReminderQuery([
      { data: { shiftId: 'shift-1' } },
      { data: { shiftId: 'shift-2' } },
    ])

    const result = await getAlreadyNotifiedShiftIds('user-1', new Date())

    expect(result).toBeInstanceOf(Set)
    expect(result.has('shift-1')).toBe(true)
    expect(result.has('shift-2')).toBe(true)
    expect(result.size).toBe(2)
  })

  it('retourne un Set vide si aucune notification', async () => {
    mockShiftReminderQuery([])

    const result = await getAlreadyNotifiedShiftIds('user-1', new Date())

    expect(result.size).toBe(0)
  })

  it('ignore les entrées sans shiftId dans data', async () => {
    mockShiftReminderQuery([
      { data: { shiftId: 'shift-1' } },
      { data: {} },
      { data: null },
    ])

    const result = await getAlreadyNotifiedShiftIds('user-1', new Date())

    expect(result.size).toBe(1)
    expect(result.has('shift-1')).toBe(true)
  })
})
