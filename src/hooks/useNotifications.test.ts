import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { Notification } from '@/types'

// Mock notificationService
const mockGetNotifications = vi.fn()
const mockGetUnreadNotificationCount = vi.fn()
const mockMarkNotificationAsRead = vi.fn()
const mockMarkAllNotificationsAsRead = vi.fn()
const mockDismissNotification = vi.fn()
const mockDismissAllNotifications = vi.fn()
const mockSubscribeToNotifications = vi.fn()

vi.mock('@/services/notificationService', () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  getUnreadNotificationCount: (...args: unknown[]) => mockGetUnreadNotificationCount(...args),
  markNotificationAsRead: (...args: unknown[]) => mockMarkNotificationAsRead(...args),
  markAllNotificationsAsRead: (...args: unknown[]) => mockMarkAllNotificationsAsRead(...args),
  dismissNotification: (...args: unknown[]) => mockDismissNotification(...args),
  dismissAllNotifications: (...args: unknown[]) => mockDismissAllNotifications(...args),
  subscribeToNotifications: (...args: unknown[]) => mockSubscribeToNotifications(...args),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { useNotifications } from './useNotifications'
import { logger } from '@/lib/logger'

// Helpers
function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    userId: 'user-123',
    type: 'shift_reminder',
    priority: 'medium',
    title: 'Rappel intervention',
    message: 'Vous avez une intervention demain',
    data: {},
    isRead: false,
    isDismissed: false,
    createdAt: new Date('2025-06-15T10:00:00Z'),
    ...overrides,
  } as Notification
}

function createMockNotifications(count: number): Notification[] {
  return Array.from({ length: count }, (_, i) =>
    createMockNotification({
      id: `notif-${i + 1}`,
      title: `Notification ${i + 1}`,
      isRead: i % 2 === 0, // alternance lu/non-lu
    })
  )
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNotifications.mockResolvedValue([])
    mockGetUnreadNotificationCount.mockResolvedValue(0)
    mockSubscribeToNotifications.mockReturnValue(vi.fn()) // unsubscribe fn
    mockMarkNotificationAsRead.mockResolvedValue(undefined)
    mockMarkAllNotificationsAsRead.mockResolvedValue(undefined)
    mockDismissNotification.mockResolvedValue(undefined)
    mockDismissAllNotifications.mockResolvedValue(undefined)
  })

  // -----------------------------------------------
  // Fetch & État initial
  // -----------------------------------------------

  it('devrait charger les notifications au montage (autoFetch)', async () => {
    const notifications = createMockNotifications(3)
    mockGetNotifications.mockResolvedValue(notifications)
    mockGetUnreadNotificationCount.mockResolvedValue(2)

    const { result } = renderHook(() =>
      useNotifications({ userId: 'user-123' })
    )

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.notifications).toEqual(notifications)
    expect(result.current.unreadCount).toBe(2)
    expect(result.current.error).toBeNull()
    expect(mockGetNotifications).toHaveBeenCalledWith('user-123', undefined)
    expect(mockGetUnreadNotificationCount).toHaveBeenCalledWith('user-123')
  })

  it('devrait ne pas charger si userId est null', async () => {
    const { result } = renderHook(() =>
      useNotifications({ userId: null })
    )

    // Quand userId est null, autoFetch ne déclenche pas fetchNotifications,
    // donc isLoading reste à true (valeur initiale) et les services ne sont pas appelés
    expect(result.current.notifications).toEqual([])
    expect(result.current.unreadCount).toBe(0)
    expect(mockGetNotifications).not.toHaveBeenCalled()
    expect(mockGetUnreadNotificationCount).not.toHaveBeenCalled()
  })

  it('devrait ne pas charger automatiquement si autoFetch est false', async () => {
    const { result } = renderHook(() =>
      useNotifications({ userId: 'user-123', autoFetch: false })
    )

    // Attendre un tick pour vérifier que rien n'a été appelé
    await new Promise((r) => setTimeout(r, 50))

    expect(mockGetNotifications).not.toHaveBeenCalled()
    expect(mockGetUnreadNotificationCount).not.toHaveBeenCalled()
  })

  it('devrait gérer les erreurs de chargement', async () => {
    mockGetNotifications.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() =>
      useNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Impossible de charger les notifications')
    expect(logger.error).toHaveBeenCalledWith(
      'Erreur chargement notifications:',
      expect.any(Error)
    )
  })

  it('devrait pouvoir refetch les notifications manuellement', async () => {
    mockGetNotifications.mockResolvedValue([])
    mockGetUnreadNotificationCount.mockResolvedValue(0)

    const { result } = renderHook(() =>
      useNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Mettre à jour les données pour le refetch
    const newNotifications = createMockNotifications(5)
    mockGetNotifications.mockResolvedValue(newNotifications)
    mockGetUnreadNotificationCount.mockResolvedValue(3)

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.notifications).toEqual(newNotifications)
    expect(result.current.unreadCount).toBe(3)
    expect(mockGetNotifications).toHaveBeenCalledTimes(2)
  })

  // -----------------------------------------------
  // Compteur non-lus
  // -----------------------------------------------

  it('devrait récupérer le compteur de notifications non-lues', async () => {
    mockGetNotifications.mockResolvedValue([])
    mockGetUnreadNotificationCount.mockResolvedValue(7)

    const { result } = renderHook(() =>
      useNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(7)
    })
  })

  // -----------------------------------------------
  // Mark as read
  // -----------------------------------------------

  it('devrait marquer une notification comme lue', async () => {
    const notifications = [
      createMockNotification({ id: 'notif-1', isRead: false }),
      createMockNotification({ id: 'notif-2', isRead: false }),
    ]
    mockGetNotifications.mockResolvedValue(notifications)
    mockGetUnreadNotificationCount.mockResolvedValue(2)

    const { result } = renderHook(() =>
      useNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.markAsRead('notif-1')
    })

    expect(mockMarkNotificationAsRead).toHaveBeenCalledWith('notif-1')
    // La notification devrait etre mise à jour localement
    const updated = result.current.notifications.find((n) => n.id === 'notif-1')
    expect(updated?.isRead).toBe(true)
    expect(updated?.readAt).toBeInstanceOf(Date)
    // Le compteur devrait diminuer
    expect(result.current.unreadCount).toBe(1)
  })

  it('devrait marquer toutes les notifications comme lues', async () => {
    const notifications = [
      createMockNotification({ id: 'notif-1', isRead: false }),
      createMockNotification({ id: 'notif-2', isRead: false }),
      createMockNotification({ id: 'notif-3', isRead: false }),
    ]
    mockGetNotifications.mockResolvedValue(notifications)
    mockGetUnreadNotificationCount.mockResolvedValue(3)

    const { result } = renderHook(() =>
      useNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.markAllAsRead()
    })

    expect(mockMarkAllNotificationsAsRead).toHaveBeenCalledWith('user-123')
    // Toutes les notifications devraient être lues
    expect(result.current.notifications.every((n) => n.isRead)).toBe(true)
    expect(result.current.unreadCount).toBe(0)
  })

  it('devrait ne rien faire pour markAllAsRead si userId est null', async () => {
    const { result } = renderHook(() =>
      useNotifications({ userId: null })
    )

    // userId null => pas de fetch, on peut appeler markAllAsRead directement
    await act(async () => {
      await result.current.markAllAsRead()
    })

    expect(mockMarkAllNotificationsAsRead).not.toHaveBeenCalled()
  })

  // -----------------------------------------------
  // Dismiss
  // -----------------------------------------------

  it('devrait supprimer une notification (dismiss)', async () => {
    const notifications = [
      createMockNotification({ id: 'notif-1', isRead: false }),
      createMockNotification({ id: 'notif-2', isRead: true }),
    ]
    mockGetNotifications.mockResolvedValue(notifications)
    mockGetUnreadNotificationCount.mockResolvedValue(1)

    const { result } = renderHook(() =>
      useNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.dismiss('notif-1')
    })

    expect(mockDismissNotification).toHaveBeenCalledWith('notif-1')
    // La notification devrait etre retirée de la liste
    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0].id).toBe('notif-2')
  })

  it('devrait supprimer toutes les notifications (dismissAll)', async () => {
    const notifications = createMockNotifications(5)
    mockGetNotifications.mockResolvedValue(notifications)
    mockGetUnreadNotificationCount.mockResolvedValue(3)

    const { result } = renderHook(() =>
      useNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.dismissAll()
    })

    expect(mockDismissAllNotifications).toHaveBeenCalledWith('user-123')
    expect(result.current.notifications).toEqual([])
    expect(result.current.unreadCount).toBe(0)
  })

  it('devrait ne rien faire pour dismissAll si userId est null', async () => {
    const { result } = renderHook(() =>
      useNotifications({ userId: null })
    )

    // userId null => pas de fetch, on peut appeler dismissAll directement
    await act(async () => {
      await result.current.dismissAll()
    })

    expect(mockDismissAllNotifications).not.toHaveBeenCalled()
  })

  // -----------------------------------------------
  // Realtime subscription
  // -----------------------------------------------

  it('devrait s\'abonner aux notifications en temps réel', async () => {
    const mockUnsubscribe = vi.fn()
    mockSubscribeToNotifications.mockReturnValue(mockUnsubscribe)

    const { unmount } = renderHook(() =>
      useNotifications({ userId: 'user-123', realtime: true })
    )

    expect(mockSubscribeToNotifications).toHaveBeenCalledWith(
      'user-123',
      expect.any(Function)
    )

    // Devrait se désabonner au démontage
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('devrait ne pas s\'abonner au realtime si realtime=false', () => {
    renderHook(() =>
      useNotifications({ userId: 'user-123', realtime: false })
    )

    expect(mockSubscribeToNotifications).not.toHaveBeenCalled()
  })

  it('devrait ne pas s\'abonner au realtime si userId est null', () => {
    renderHook(() =>
      useNotifications({ userId: null, realtime: true })
    )

    expect(mockSubscribeToNotifications).not.toHaveBeenCalled()
  })

  it('devrait ajouter une nouvelle notification via realtime INSERT', async () => {
    let realtimeCallback: (
      eventType: 'INSERT' | 'UPDATE' | 'DELETE',
      notification: Notification
    ) => void

    mockSubscribeToNotifications.mockImplementation(
      (_userId: string, cb: typeof realtimeCallback) => {
        realtimeCallback = cb
        return vi.fn()
      }
    )

    mockGetNotifications.mockResolvedValue([])
    mockGetUnreadNotificationCount.mockResolvedValue(0)

    const onNewNotification = vi.fn()

    const { result } = renderHook(() =>
      useNotifications({
        userId: 'user-123',
        realtime: true,
        onNewNotification,
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Simuler un INSERT realtime
    const newNotif = createMockNotification({
      id: 'notif-new',
      isRead: false,
      title: 'Nouvelle notification',
    })

    act(() => {
      realtimeCallback!('INSERT', newNotif)
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0].id).toBe('notif-new')
    expect(result.current.unreadCount).toBe(1)
    expect(onNewNotification).toHaveBeenCalledWith(newNotif)
  })

  it('devrait mettre à jour une notification via realtime UPDATE', async () => {
    const existingNotif = createMockNotification({ id: 'notif-1', isRead: false })

    let realtimeCallback: (
      eventType: 'INSERT' | 'UPDATE' | 'DELETE',
      notification: Notification
    ) => void

    mockSubscribeToNotifications.mockImplementation(
      (_userId: string, cb: typeof realtimeCallback) => {
        realtimeCallback = cb
        return vi.fn()
      }
    )

    mockGetNotifications.mockResolvedValue([existingNotif])
    mockGetUnreadNotificationCount.mockResolvedValue(1)

    const { result } = renderHook(() =>
      useNotifications({ userId: 'user-123', realtime: true })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Simuler un UPDATE realtime (notification marquée comme lue)
    const updatedNotif = createMockNotification({
      id: 'notif-1',
      isRead: true,
      isDismissed: false,
    })

    act(() => {
      realtimeCallback!('UPDATE', updatedNotif)
    })

    expect(result.current.notifications[0].isRead).toBe(true)
    // Le compteur devrait être recalculé
    expect(result.current.unreadCount).toBe(0)
  })

  it('devrait supprimer une notification via realtime DELETE', async () => {
    const existingNotifs = [
      createMockNotification({ id: 'notif-1', isRead: false }),
      createMockNotification({ id: 'notif-2', isRead: true }),
    ]

    let realtimeCallback: (
      eventType: 'INSERT' | 'UPDATE' | 'DELETE',
      notification: Notification
    ) => void

    mockSubscribeToNotifications.mockImplementation(
      (_userId: string, cb: typeof realtimeCallback) => {
        realtimeCallback = cb
        return vi.fn()
      }
    )

    mockGetNotifications.mockResolvedValue(existingNotifs)
    mockGetUnreadNotificationCount.mockResolvedValue(1)

    const { result } = renderHook(() =>
      useNotifications({ userId: 'user-123', realtime: true })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Simuler un DELETE realtime
    const deletedNotif = createMockNotification({ id: 'notif-1' })

    act(() => {
      realtimeCallback!('DELETE', deletedNotif)
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0].id).toBe('notif-2')
  })

  // -----------------------------------------------
  // Filtres
  // -----------------------------------------------

  it('devrait passer les filtres à getNotifications', async () => {
    const filters = { unreadOnly: true, limit: 10 }

    renderHook(() =>
      useNotifications({ userId: 'user-123', filters })
    )

    await waitFor(() => {
      expect(mockGetNotifications).toHaveBeenCalledWith('user-123', filters)
    })
  })
})
