import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: {
    url?: string
    notificationId?: string
    type?: string
    [key: string]: unknown
  }
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

// ============================================
// CONFIGURATION
// ============================================

// Clé publique VAPID - À configurer dans .env
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

// ============================================
// UTILITIES
// ============================================

/**
 * Convertit une clé base64 URL-safe en Uint8Array pour le push manager
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}


// ============================================
// SUPPORT CHECK
// ============================================

/**
 * Vérifie si le navigateur supporte les notifications push
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Vérifie si VAPID est configuré
 */
export function isVapidConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0
}

// ============================================
// PERMISSION
// ============================================

/**
 * Retourne le statut actuel de la permission notification
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Demande la permission pour les notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    logger.warn('Ce navigateur ne supporte pas les notifications')
    return 'denied'
  }

  // Si déjà accordé ou refusé, retourner le statut actuel
  if (Notification.permission !== 'default') {
    return Notification.permission
  }

  // Demander la permission
  const permission = await Notification.requestPermission()
  return permission
}

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

/**
 * Obtient l'enregistrement du service worker
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  try {
    // Attendre que le SW soit prêt
    const registration = await navigator.serviceWorker.ready
    return registration
  } catch (error) {
    logger.error('Erreur accès service worker:', error)
    return null
  }
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Récupère la subscription push actuelle
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration()
  if (!registration) return null

  try {
    const subscription = await registration.pushManager.getSubscription()
    return subscription
  } catch (error) {
    logger.error('Erreur récupération subscription:', error)
    return null
  }
}

/**
 * S'abonne aux notifications push
 */
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  logger.debug('[Push] Début subscribeToPush pour userId:', userId)

  if (!isPushSupported()) {
    logger.warn('[Push] Push non supporté')
    return null
  }

  if (!isVapidConfigured()) {
    logger.warn('[Push] VAPID non configuré - clé:', VAPID_PUBLIC_KEY?.substring(0, 20))
    return null
  }

  const permission = await requestNotificationPermission()
  logger.debug('[Push] Permission:', permission)
  if (permission !== 'granted') {
    logger.warn('[Push] Permission notification refusée')
    return null
  }

  const registration = await getServiceWorkerRegistration()
  logger.debug('[Push] Service Worker registration:', registration ? 'OK' : 'NULL')
  if (!registration) {
    logger.error('[Push] Service worker non disponible')
    return null
  }

  try {
    // Vérifier s'il y a déjà une subscription
    const existingSubscription = await registration.pushManager.getSubscription()
    logger.debug('[Push] Subscription existante:', existingSubscription ? 'OUI' : 'NON')

    let subscription = existingSubscription

    // Vérifier si la subscription existante utilise la bonne clé VAPID
    if (subscription) {
      const currentKey = subscription.options?.applicationServerKey
      const expectedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      const keysMatch = currentKey && new Uint8Array(currentKey).length === expectedKey.length &&
        new Uint8Array(currentKey).every((v, i) => v === expectedKey[i])

      if (!keysMatch) {
        logger.debug('[Push] Clé VAPID changée, ré-abonnement nécessaire...')
        await subscription.unsubscribe()
        subscription = null
      }
    }

    if (!subscription) {
      // Créer la subscription
      logger.debug('[Push] Création nouvelle subscription avec VAPID...')
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      logger.debug('[Push] Subscription créée:', subscription.endpoint.substring(0, 50))
    }

    // Sauvegarder en base
    logger.debug('[Push] Sauvegarde en base...')
    await savePushSubscription(userId, subscription)

    logger.debug('[Push] ✅ Subscription push enregistrée avec succès!')
    return subscription
  } catch (error) {
    logger.error('[Push] ❌ Erreur création subscription push:', error)
    return null
  }
}

/**
 * Se désabonne des notifications push
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  const subscription = await getCurrentPushSubscription()
  if (!subscription) {
    return true // Déjà désabonné
  }

  try {
    // Supprimer de la base
    await deletePushSubscription(userId, subscription.endpoint)

    // Désabonner
    const success = await subscription.unsubscribe()
    return success
  } catch (error) {
    logger.error('Erreur désabonnement push:', error)
    return false
  }
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Sauvegarde la subscription push en base
 */
async function savePushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  const subscriptionJson = subscription.toJSON()
  logger.debug('[Push] Subscription JSON:', {
    endpoint: subscriptionJson.endpoint?.substring(0, 50),
    hasKeys: !!subscriptionJson.keys,
  })

  if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
    throw new Error('Subscription invalide - pas de endpoint ou keys')
  }

  const subscriptionData: PushSubscriptionData = {
    endpoint: subscriptionJson.endpoint,
    keys: {
      p256dh: subscriptionJson.keys.p256dh || '',
      auth: subscriptionJson.keys.auth || '',
    },
  }

  const insertData = {
    user_id: userId,
    endpoint: subscriptionData.endpoint,
    p256dh: subscriptionData.keys.p256dh,
    auth: subscriptionData.keys.auth,
    user_agent: navigator.userAgent,
    created_at: new Date().toISOString(),
  }

  logger.debug('[Push] Insertion dans push_subscriptions pour user:', userId)

  const { error, data } = await supabase.from('push_subscriptions').upsert(
    insertData,
    {
      onConflict: 'endpoint',
    }
  ).select()

  if (error) {
    logger.error('[Push] ❌ Erreur Supabase sauvegarde subscription:', error)
    throw error
  }

  logger.debug('[Push] ✅ Subscription sauvegardée:', data)
}

/**
 * Supprime une subscription push de la base
 */
async function deletePushSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)

  if (error) {
    logger.error('Erreur suppression subscription:', error)
  }
}

/**
 * Récupère les subscriptions push d'un utilisateur
 */
export async function getUserPushSubscriptions(
  userId: string
): Promise<PushSubscriptionData[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    logger.error('Erreur récupération subscriptions:', error)
    return []
  }

  return (data || []).map((sub) => ({
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  }))
}

// ============================================
// LOCAL NOTIFICATION (fallback)
// ============================================

/**
 * Affiche une notification locale (quand l'app est au premier plan)
 */
export function showLocalNotification(payload: PushNotificationPayload): void {
  if (Notification.permission !== 'granted') {
    logger.warn('Permission notification non accordée')
    return
  }

  const notification = new Notification(payload.title, {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag,
    data: payload.data,
  })

  // Gestion du clic
  notification.onclick = (event) => {
    event.preventDefault()
    notification.close()

    if (payload.data?.url) {
      window.focus()
      window.location.href = payload.data.url
    }
  }
}

// ============================================
// PUSH STATE HELPERS
// ============================================

/**
 * Vérifie si l'utilisateur est actuellement abonné aux push
 */
export async function isPushSubscribed(): Promise<boolean> {
  const subscription = await getCurrentPushSubscription()
  return subscription !== null
}

/**
 * Retourne l'état complet des notifications push
 */
export interface PushState {
  supported: boolean
  vapidConfigured: boolean
  permission: NotificationPermission
  subscribed: boolean
}

export async function getPushState(): Promise<PushState> {
  const supported = isPushSupported()
  const vapidConfigured = isVapidConfigured()
  const permission = getNotificationPermission()
  const subscribed = await isPushSubscribed()

  return {
    supported,
    vapidConfigured,
    permission,
    subscribed,
  }
}
