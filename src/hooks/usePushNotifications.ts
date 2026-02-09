import { useState, useEffect, useCallback } from 'react'
import {
  isPushSupported,
  isVapidConfigured,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  showLocalNotification,
  type PushNotificationPayload,
} from '@/services/pushService'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface UsePushNotificationsOptions {
  /** User ID for subscription management */
  userId: string | null
  /** Auto-subscribe when permission is granted */
  autoSubscribe?: boolean
  /** Callback when a push notification should be shown locally */
  onNotification?: (payload: PushNotificationPayload) => void
}

export interface UsePushNotificationsReturn {
  /** Whether push is supported in this browser */
  isSupported: boolean
  /** Whether VAPID is configured */
  isConfigured: boolean
  /** Current notification permission */
  permission: NotificationPermission
  /** Whether user is subscribed to push */
  isSubscribed: boolean
  /** Whether subscription is loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Request notification permission */
  requestPermission: () => Promise<NotificationPermission>
  /** Subscribe to push notifications */
  subscribe: () => Promise<boolean>
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>
  /** Show a local notification (for testing or foreground) */
  showNotification: (payload: PushNotificationPayload) => void
}

// ============================================
// HOOK
// ============================================

export function usePushNotifications(
  options: UsePushNotificationsOptions
): UsePushNotificationsReturn {
  const { userId, autoSubscribe = false, onNotification } = options

  const [isSupported] = useState(() => isPushSupported())
  const [isConfigured] = useState(() => isVapidConfigured())
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    getNotificationPermission()
  )
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check subscription status on mount and re-subscribe if VAPID key changed
  useEffect(() => {
    async function checkSubscription() {
      if (!isSupported || !userId) {
        setIsLoading(false)
        return
      }

      try {
        const subscribed = await isPushSubscribed()
        setIsSubscribed(subscribed)

        // Si la permission est accordée mais pas d'abonnement actif,
        // tenter un ré-abonnement (cas rotation de clé VAPID)
        if (!subscribed && isConfigured && permission === 'granted') {
          logger.debug('[Push] Ré-abonnement automatique après changement de clé VAPID...')
          const sub = await subscribeToPush(userId)
          if (sub) {
            setIsSubscribed(true)
          }
        }
      } catch (err) {
        logger.error('Erreur vérification subscription:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkSubscription()
  }, [isSupported, isConfigured, permission, userId])

  // Auto-subscribe if enabled and permission granted
  useEffect(() => {
    if (
      autoSubscribe &&
      isSupported &&
      isConfigured &&
      permission === 'granted' &&
      !isSubscribed &&
      userId &&
      !isLoading
    ) {
      subscribeToPush(userId).then((subscription) => {
        if (subscription) {
          setIsSubscribed(true)
        }
      })
    }
  }, [autoSubscribe, isSupported, isConfigured, permission, isSubscribed, userId, isLoading])

  // Listen for permission changes
  useEffect(() => {
    if (!('permissions' in navigator)) return

    let permissionStatus: PermissionStatus | null = null

    navigator.permissions
      .query({ name: 'notifications' })
      .then((status) => {
        permissionStatus = status
        status.onchange = () => {
          setPermission(Notification.permission)
        }
      })
      .catch(() => {
        // Some browsers don't support querying notifications permission
      })

    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null
      }
    }
  }, [])

  // Listen for push messages when app is in foreground
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        const payload = event.data.payload as PushNotificationPayload
        onNotification?.(payload)
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [onNotification])

  // Request permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    setError(null)

    if (!isSupported) {
      setError('Les notifications ne sont pas supportées par ce navigateur')
      return 'denied'
    }

    try {
      const newPermission = await requestNotificationPermission()
      setPermission(newPermission)

      if (newPermission === 'denied') {
        setError('Les notifications ont été refusées')
      }

      return newPermission
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur demande permission'
      setError(message)
      return 'denied'
    }
  }, [isSupported])

  // Subscribe
  const subscribe = useCallback(async (): Promise<boolean> => {
    setError(null)

    if (!userId) {
      setError('Utilisateur non connecté')
      return false
    }

    if (!isSupported) {
      setError('Push non supporté')
      return false
    }

    if (!isConfigured) {
      setError('Configuration push manquante')
      return false
    }

    setIsLoading(true)

    try {
      // Request permission first if needed
      if (permission === 'default') {
        const newPermission = await requestNotificationPermission()
        setPermission(newPermission)
        if (newPermission !== 'granted') {
          setError('Permission refusée')
          return false
        }
      } else if (permission === 'denied') {
        setError('Les notifications sont bloquées. Activez-les dans les paramètres du navigateur.')
        return false
      }

      const subscription = await subscribeToPush(userId)

      if (subscription) {
        setIsSubscribed(true)
        return true
      } else {
        setError('Échec de l\'abonnement aux notifications')
        return false
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur abonnement'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [userId, isSupported, isConfigured, permission])

  // Unsubscribe
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setError(null)

    if (!userId) {
      return true
    }

    setIsLoading(true)

    try {
      const success = await unsubscribeFromPush(userId)
      if (success) {
        setIsSubscribed(false)
      }
      return success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur désabonnement'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Show local notification
  const showNotification = useCallback((payload: PushNotificationPayload) => {
    if (permission !== 'granted') {
      logger.warn('Permission non accordée pour les notifications')
      return
    }
    showLocalNotification(payload)
  }, [permission])

  return {
    isSupported,
    isConfigured,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
  }
}

export default usePushNotifications
