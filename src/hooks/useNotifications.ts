import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  dismissAllNotifications,
  subscribeToNotifications,
  type NotificationFilters,
} from '@/services/notificationService'
import type { Notification } from '@/types'

// ============================================
// HOOK OPTIONS
// ============================================

export interface UseNotificationsOptions {
  /** User ID to fetch notifications for */
  userId: string | null
  /** Whether to enable realtime updates */
  realtime?: boolean
  /** Filters for fetching notifications */
  filters?: NotificationFilters
  /** Auto-fetch on mount */
  autoFetch?: boolean
  /** Callback when new notification arrives */
  onNewNotification?: (notification: Notification) => void
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseNotificationsReturn {
  /** List of notifications */
  notifications: Notification[]
  /** Unread notification count */
  unreadCount: number
  /** Whether notifications are loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refetch notifications */
  refetch: () => Promise<void>
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => Promise<void>
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>
  /** Dismiss a notification */
  dismiss: (notificationId: string) => Promise<void>
  /** Dismiss all notifications */
  dismissAll: () => Promise<void>
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useNotifications(
  options: UseNotificationsOptions
): UseNotificationsReturn {
  const {
    userId,
    realtime = true,
    filters,
    autoFetch = true,
    onNewNotification,
  } = options

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onNewNotificationRef = useRef(onNewNotification)
  onNewNotificationRef.current = onNewNotification

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [notifs, count] = await Promise.all([
        getNotifications(userId, filters),
        getUnreadNotificationCount(userId),
      ])

      setNotifications(notifs)
      setUnreadCount(count)
    } catch (err) {
      console.error('Erreur chargement notifications:', err)
      setError('Impossible de charger les notifications')
    } finally {
      setIsLoading(false)
    }
  }, [userId, filters])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && userId) {
      fetchNotifications()
    }
  }, [autoFetch, userId, fetchNotifications])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!realtime || !userId) return

    const unsubscribe = subscribeToNotifications(userId, (eventType, notification) => {
      if (eventType === 'INSERT') {
        setNotifications((prev) => [notification, ...prev])
        if (!notification.isRead) {
          setUnreadCount((prev) => prev + 1)
        }
        // Trigger callback
        onNewNotificationRef.current?.(notification)
      } else if (eventType === 'UPDATE') {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? notification : n))
        )
        // Recalculate unread count on update
        setNotifications((prev) => {
          const unread = prev.filter((n) => !n.isRead && !n.isDismissed).length
          setUnreadCount(unread)
          return prev
        })
      } else if (eventType === 'DELETE') {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
        // Recalculate unread count
        setNotifications((prev) => {
          const unread = prev.filter((n) => !n.isRead && !n.isDismissed).length
          setUnreadCount(unread)
          return prev
        })
      }
    })

    return unsubscribe
  }, [realtime, userId])

  // Mark as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      await markNotificationAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, isRead: true, readAt: new Date() }
            : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    },
    []
  )

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    await markAllNotificationsAsRead(userId)
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
    )
    setUnreadCount(0)
  }, [userId])

  // Dismiss notification
  const dismiss = useCallback(
    async (notificationId: string) => {
      await dismissNotification(notificationId)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      // Update unread count if the dismissed notification was unread
      setNotifications((prev) => {
        const unread = prev.filter((n) => !n.isRead && !n.isDismissed).length
        setUnreadCount(unread)
        return prev
      })
    },
    []
  )

  // Dismiss all
  const dismissAll = useCallback(async () => {
    if (!userId) return
    await dismissAllNotifications(userId)
    setNotifications([])
    setUnreadCount(0)
  }, [userId])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAll,
  }
}

export default useNotifications
