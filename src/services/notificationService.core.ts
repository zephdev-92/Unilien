import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationData,
  NotificationPreferences,
} from '@/types'
import type { NotificationDbRow } from '@/types/database'

// ============================================
// TYPES
// ============================================

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  data?: NotificationData
  actionUrl?: string
  expiresAt?: Date
}

export interface NotificationFilters {
  type?: NotificationType[]
  priority?: NotificationPriority[]
  unreadOnly?: boolean
  limit?: number
}

export type NotificationChangeCallback = (
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  notification: Notification
) => void

// ============================================
// COMPLIANCE THRESHOLDS
// ============================================

export const COMPLIANCE_THRESHOLDS = {
  // Weekly hours
  WEEKLY_HOURS_WARNING: 44,     // Warning at 44h (92% of 48h)
  WEEKLY_HOURS_CRITICAL: 48,    // Critical at 48h (max legal)
  WEEKLY_HOURS_APPROACHING: 40, // Start monitoring at 40h

  // Daily hours
  DAILY_HOURS_WARNING: 8,       // Warning at 8h (80% of 10h)
  DAILY_HOURS_CRITICAL: 10,     // Critical at 10h (max legal)

  // Rest periods
  DAILY_REST_MINIMUM: 11,       // 11h minimum daily rest
  WEEKLY_REST_MINIMUM: 35,      // 35h minimum weekly rest

  // Notification timing
  SHIFT_REMINDER_HOURS: 24,     // Remind 24h before shift
} as const

// ============================================
// URL HELPERS
// ============================================

/**
 * Génère l'URL du planning avec une date spécifique
 */
export function getPlanningUrlWithDate(date: Date): string {
  const dateStr = date.toISOString().split('T')[0]
  return `/planning?date=${dateStr}`
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return {
      emailEnabled: true,
      pushEnabled: true,
      complianceAlerts: true,
      shiftReminders: true,
      messageNotifications: true,
      reminderHoursBefore: 24,
    }
  }

  return {
    emailEnabled: data.email_enabled,
    pushEnabled: data.push_enabled,
    complianceAlerts: data.compliance_alerts,
    shiftReminders: data.shift_reminders,
    messageNotifications: data.message_notifications,
    reminderHoursBefore: data.reminder_hours_before,
  }
}

// ============================================
// PUSH NOTIFICATION TRIGGER
// ============================================

/**
 * Déclenche l'envoi d'une notification push via Supabase Edge Function.
 * Cette fonction est appelée après la création d'une notification en base.
 */
async function triggerPushNotification(notification: Notification): Promise<void> {
  try {
    const prefs = await getNotificationPreferences(notification.userId)
    if (!prefs.pushEnabled) {
      logger.debug('[Push] Push désactivé par les préférences utilisateur')
      return
    }

    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: { notificationId: notification.id },
    })

    if (error) {
      logger.warn('[Push] Erreur Edge Function:', error)
    }
  } catch (err) {
    logger.warn('[Push] Push notification non envoyée:', err)
  }
}

// ============================================
// HELPER: MAP FROM DB
// ============================================

export function mapNotificationFromDb(data: NotificationDbRow): Notification {
  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    priority: data.priority || 'normal',
    title: data.title,
    message: data.message,
    data: data.data || {},
    actionUrl: data.action_url || undefined,
    isRead: data.is_read || false,
    isDismissed: data.is_dismissed || false,
    createdAt: new Date(data.created_at),
    readAt: data.read_at ? new Date(data.read_at) : undefined,
    expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
  }
}

// ============================================
// PROFILE HELPER
// ============================================

export async function getProfileName(profileId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', profileId)
    .single()

  if (!data) return 'Utilisateur'
  return `${data.first_name} ${data.last_name}`.trim() || 'Utilisateur'
}

// ============================================
// CREATE NOTIFICATION
// ============================================

export async function createNotification(
  params: CreateNotificationParams
): Promise<Notification | null> {
  const { data, error } = await supabase.rpc('create_notification', {
    p_user_id: params.userId,
    p_type: params.type,
    p_title: sanitizeText(params.title),
    p_message: sanitizeText(params.message),
    p_priority: params.priority || 'normal',
    p_data: params.data || {},
    p_action_url: params.actionUrl || null,
  })

  if (error) {
    logger.error('Erreur création notification:', error)
    return null
  }

  const notification = mapNotificationFromDb(data)

  triggerPushNotification(notification).catch((err) => {
    logger.warn('[Push] Échec triggerPushNotification:', err)
  })

  return notification
}

// ============================================
// CREATE BULK NOTIFICATIONS
// ============================================

export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
): Promise<Notification[]> {
  if (notifications.length === 0) return []

  const results = await Promise.all(
    notifications.map((n) => createNotification(n))
  )

  return results.filter((n): n is Notification => n !== null)
}
