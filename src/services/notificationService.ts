import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { Notification, NotificationPreferences } from '@/types'
import type { NotificationDbRow } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { mapNotificationFromDb } from './notificationService.core'

// Re-exports for backward compatibility (all public contracts preserved)
export {
  createNotification,
  createBulkNotifications,
  getNotificationPreferences,
  getProfileName,
  COMPLIANCE_THRESHOLDS,
} from './notificationService.core'
export type {
  CreateNotificationParams,
  NotificationFilters,
  NotificationChangeCallback,
} from './notificationService.core'
export * from './notificationCreators'

// ============================================
// GET NOTIFICATIONS
// ============================================

export async function getNotifications(
  userId: string,
  filters?: import('./notificationService.core').NotificationFilters
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })

  if (filters?.type && filters.type.length > 0) {
    query = query.in('type', filters.type)
  }

  if (filters?.priority && filters.priority.length > 0) {
    query = query.in('priority', filters.priority)
  }

  if (filters?.unreadOnly) {
    query = query.eq('is_read', false)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Erreur récupération notifications:', error)
    return []
  }

  return (data || []).map((row) => mapNotificationFromDb(row as NotificationDbRow))
}

// ============================================
// GET UNREAD COUNT
// ============================================

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .eq('is_dismissed', false)

  if (error) {
    logger.error('Erreur comptage notifications:', error)
    return 0
  }

  return count || 0
}

// ============================================
// MARK AS READ
// ============================================

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)

  if (error) {
    logger.error('Erreur marquage notification lue:', error)
  }
}

// ============================================
// MARK ALL AS READ
// ============================================

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    logger.error('Erreur marquage toutes notifications lues:', error)
  }
}

// ============================================
// DISMISS NOTIFICATION
// ============================================

export async function dismissNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_dismissed: true })
    .eq('id', notificationId)

  if (error) {
    logger.error('Erreur suppression notification:', error)
  }
}

// ============================================
// DISMISS ALL
// ============================================

export async function dismissAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_dismissed: true })
    .eq('user_id', userId)

  if (error) {
    logger.error('Erreur suppression toutes notifications:', error)
  }
}

// ============================================
// DELETE OLD NOTIFICATIONS
// ============================================

export async function deleteExpiredNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .lt('expires_at', new Date().toISOString())

  if (error) {
    logger.error('Erreur suppression notifications expirées:', error)
  }
}

// ============================================
// REALTIME SUBSCRIPTION
// ============================================

let activeChannel: RealtimeChannel | null = null

export function subscribeToNotifications(
  userId: string,
  onNotification: import('./notificationService.core').NotificationChangeCallback
): () => void {
  if (activeChannel) {
    supabase.removeChannel(activeChannel)
    activeChannel = null
  }

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'

        if (eventType === 'DELETE') {
          const oldData = payload.old as Record<string, unknown>
          onNotification('DELETE', mapNotificationFromDb(oldData as NotificationDbRow))
          return
        }

        const newData = payload.new as Record<string, unknown>
        onNotification(eventType, mapNotificationFromDb(newData as NotificationDbRow))
      }
    )
    .subscribe()

  activeChannel = channel

  return () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel)
      activeChannel = null
    }
  }
}

// ============================================
// NOTIFICATION PREFERENCES (UPDATE)
// ============================================

export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  const updates: Record<string, unknown> = {}

  if (preferences.emailEnabled !== undefined) {
    updates.email_enabled = preferences.emailEnabled
  }
  if (preferences.pushEnabled !== undefined) {
    updates.push_enabled = preferences.pushEnabled
  }
  if (preferences.complianceAlerts !== undefined) {
    updates.compliance_alerts = preferences.complianceAlerts
  }
  if (preferences.shiftReminders !== undefined) {
    updates.shift_reminders = preferences.shiftReminders
  }
  if (preferences.messageNotifications !== undefined) {
    updates.message_notifications = preferences.messageNotifications
  }
  if (preferences.reminderHoursBefore !== undefined) {
    updates.reminder_hours_before = preferences.reminderHoursBefore
  }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      ...updates,
    })

  if (error) {
    logger.error('Erreur mise à jour préférences:', error)
  }
}

// ============================================
// SHIFT REMINDERS DEDUP
// ============================================

/**
 * Retourne les shiftIds déjà notifiés en rappel depuis une date donnée.
 * Utilisé par useShiftReminders pour éviter les doublons sans import Supabase direct.
 */
export async function getAlreadyNotifiedShiftIds(
  userId: string,
  since: Date
): Promise<Set<string>> {
  const { data } = await supabase
    .from('notifications')
    .select('data')
    .eq('user_id', userId)
    .eq('type', 'shift_reminder')
    .gte('created_at', since.toISOString())

  return new Set(
    (data || [])
      .map((n) => n.data?.shiftId as string)
      .filter(Boolean)
  )
}
