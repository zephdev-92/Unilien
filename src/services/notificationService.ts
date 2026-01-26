import { supabase } from '@/lib/supabase/client'
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationData,
  NotificationPreferences,
} from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

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
// GET NOTIFICATIONS
// ============================================

export async function getNotifications(
  userId: string,
  filters?: NotificationFilters
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
    console.error('Erreur récupération notifications:', error)
    return []
  }

  return (data || []).map(mapNotificationFromDb)
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
    console.error('Erreur comptage notifications:', error)
    return 0
  }

  return count || 0
}

// ============================================
// CREATE NOTIFICATION
// ============================================

export async function createNotification(
  params: CreateNotificationParams
): Promise<Notification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      priority: params.priority || 'normal',
      title: params.title,
      message: params.message,
      data: params.data || {},
      action_url: params.actionUrl || null,
      is_read: false,
      is_dismissed: false,
      expires_at: params.expiresAt?.toISOString() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Erreur création notification:', error)
    return null
  }

  return mapNotificationFromDb(data)
}

// ============================================
// CREATE BULK NOTIFICATIONS
// ============================================

export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
): Promise<Notification[]> {
  if (notifications.length === 0) return []

  const { data, error } = await supabase
    .from('notifications')
    .insert(
      notifications.map((n) => ({
        user_id: n.userId,
        type: n.type,
        priority: n.priority || 'normal',
        title: n.title,
        message: n.message,
        data: n.data || {},
        action_url: n.actionUrl || null,
        is_read: false,
        is_dismissed: false,
        expires_at: n.expiresAt?.toISOString() || null,
      }))
    )
    .select()

  if (error) {
    console.error('Erreur création notifications en masse:', error)
    return []
  }

  return (data || []).map(mapNotificationFromDb)
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
    console.error('Erreur marquage notification lue:', error)
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
    console.error('Erreur marquage toutes notifications lues:', error)
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
    console.error('Erreur suppression notification:', error)
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
    console.error('Erreur suppression toutes notifications:', error)
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
    console.error('Erreur suppression notifications expirées:', error)
  }
}

// ============================================
// REALTIME SUBSCRIPTION
// ============================================

let activeChannel: RealtimeChannel | null = null

export function subscribeToNotifications(
  userId: string,
  onNotification: NotificationChangeCallback
): () => void {
  // Unsubscribe from previous channel if exists
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
          onNotification('DELETE', mapNotificationFromDb(oldData))
          return
        }

        const newData = payload.new as Record<string, unknown>
        onNotification(eventType, mapNotificationFromDb(newData))
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
    // Return defaults
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
    console.error('Erreur mise à jour préférences:', error)
  }
}

// ============================================
// COMPLIANCE NOTIFICATION HELPERS
// ============================================

export async function createComplianceWarningNotification(
  userId: string,
  employeeName: string,
  violationType: string,
  currentValue: number,
  threshold: number,
  affectedDate: Date
): Promise<Notification | null> {
  const messages: Record<string, { title: string; message: string }> = {
    weekly_hours: {
      title: 'Heures hebdomadaires - Attention',
      message: `${employeeName} a atteint ${currentValue.toFixed(1)}h cette semaine. Seuil d'alerte: ${threshold}h.`,
    },
    daily_hours: {
      title: 'Heures quotidiennes - Attention',
      message: `${employeeName} a atteint ${currentValue.toFixed(1)}h aujourd'hui. Seuil d'alerte: ${threshold}h.`,
    },
    weekly_rest: {
      title: 'Repos hebdomadaire insuffisant',
      message: `${employeeName} n'a que ${currentValue.toFixed(1)}h de repos cette semaine. Minimum requis: ${threshold}h.`,
    },
    daily_rest: {
      title: 'Repos quotidien insuffisant',
      message: `${employeeName} n'a que ${currentValue.toFixed(1)}h de repos avant la prochaine intervention. Minimum requis: ${threshold}h.`,
    },
  }

  const content = messages[violationType] || {
    title: 'Alerte conformité',
    message: `Problème de conformité détecté pour ${employeeName}.`,
  }

  return createNotification({
    userId,
    type: 'compliance_warning',
    priority: 'high',
    title: content.title,
    message: content.message,
    actionUrl: '/compliance',
    data: {
      employeeName,
      violationType,
      currentValue,
      threshold,
      affectedDate: affectedDate.toISOString(),
    },
  })
}

export async function createComplianceCriticalNotification(
  userId: string,
  employeeName: string,
  violationType: string,
  currentValue: number,
  threshold: number,
  affectedDate: Date
): Promise<Notification | null> {
  const messages: Record<string, { title: string; message: string }> = {
    weekly_hours: {
      title: 'DÉPASSEMENT HEURES HEBDO',
      message: `${employeeName} a dépassé la limite légale avec ${currentValue.toFixed(1)}h cette semaine (max: ${threshold}h).`,
    },
    daily_hours: {
      title: 'DÉPASSEMENT HEURES QUOTIDIENNES',
      message: `${employeeName} a dépassé la limite légale avec ${currentValue.toFixed(1)}h aujourd'hui (max: ${threshold}h).`,
    },
    weekly_rest: {
      title: 'VIOLATION REPOS HEBDOMADAIRE',
      message: `${employeeName} n'a que ${currentValue.toFixed(1)}h de repos cette semaine. Le minimum légal est ${threshold}h.`,
    },
    daily_rest: {
      title: 'VIOLATION REPOS QUOTIDIEN',
      message: `${employeeName} n'a que ${currentValue.toFixed(1)}h de repos. Le minimum légal est ${threshold}h.`,
    },
  }

  const content = messages[violationType] || {
    title: 'Violation conformité critique',
    message: `Violation critique détectée pour ${employeeName}.`,
  }

  return createNotification({
    userId,
    type: 'compliance_critical',
    priority: 'urgent',
    title: content.title,
    message: content.message,
    actionUrl: '/compliance',
    data: {
      employeeName,
      violationType,
      currentValue,
      threshold,
      affectedDate: affectedDate.toISOString(),
    },
  })
}

export async function createShiftReminderNotification(
  userId: string,
  employeeName: string,
  shiftDate: Date,
  startTime: string,
  shiftId: string
): Promise<Notification | null> {
  const formattedDate = shiftDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return createNotification({
    userId,
    type: 'shift_reminder',
    priority: 'normal',
    title: 'Rappel intervention',
    message: `Intervention avec ${employeeName} prévue ${formattedDate} à ${startTime}.`,
    actionUrl: '/planning',
    data: {
      employeeName,
      shiftId,
      shiftDate: shiftDate.toISOString(),
      startTime,
    },
  })
}

export async function createMessageNotification(
  userId: string,
  senderName: string,
  messagePreview: string
): Promise<Notification | null> {
  return createNotification({
    userId,
    type: 'message_received',
    priority: 'normal',
    title: 'Nouveau message',
    message: `${senderName}: ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
    actionUrl: '/liaison',
    data: {
      senderName,
      messagePreview,
    },
  })
}

// ============================================
// HELPER: MAP FROM DB
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotificationFromDb(data: any): Notification {
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
