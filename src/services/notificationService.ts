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
import type { RealtimeChannel } from '@supabase/supabase-js'

// ============================================
// PUSH NOTIFICATION TRIGGER
// ============================================

/**
 * Déclenche l'envoi d'une notification push via Supabase Edge Function
 * Cette fonction est appelée après la création d'une notification en base
 */
async function triggerPushNotification(notification: Notification): Promise<void> {
  try {
    // Vérifier les préférences utilisateur
    const prefs = await getNotificationPreferences(notification.userId)
    if (!prefs.pushEnabled) {
      logger.debug('[Push] Push désactivé par les préférences utilisateur')
      return
    }

    // Appeler l'Edge Function avec uniquement l'ID de la notification
    // La fonction edge récupère les données depuis la DB (source de vérité)
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        notificationId: notification.id,
      },
    })

    if (error) {
      logger.warn('[Push] Erreur Edge Function:', error)
    }
  } catch (err) {
    // Ne pas bloquer si le push échoue
    logger.warn('[Push] Push notification non envoyée:', err)
  }
}

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
// URL HELPERS
// ============================================

/**
 * Génère l'URL du planning avec une date spécifique
 * @param date - Date à afficher dans le planning
 * @returns URL avec paramètre date (ex: /planning?date=2026-03-01)
 */
function getPlanningUrlWithDate(date: Date): string {
  const dateStr = date.toISOString().split('T')[0] // Format YYYY-MM-DD
  return `/planning?date=${dateStr}`
}

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
    logger.error('Erreur récupération notifications:', error)
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
    logger.error('Erreur comptage notifications:', error)
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

  // Déclencher le push notification en arrière-plan (non bloquant)
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

  // Utiliser la fonction RPC pour chaque notification
  const results = await Promise.all(
    notifications.map((n) => createNotification(n))
  )

  return results.filter((n): n is Notification => n !== null)
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
    logger.error('Erreur mise à jour préférences:', error)
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
    actionUrl: getPlanningUrlWithDate(shiftDate),
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
// TEAM NOTIFICATIONS
// ============================================

async function getProfileName(profileId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', profileId)
    .single()

  if (!data) return 'Utilisateur'
  return `${data.first_name} ${data.last_name}`.trim() || 'Utilisateur'
}

export async function createTeamMemberAddedNotification(
  caregiverId: string,
  employerName: string
): Promise<Notification | null> {
  try {
    return await createNotification({
      userId: caregiverId,
      type: 'team_member_added',
      priority: 'normal',
      title: 'Ajout à une équipe',
      message: `${employerName} vous a ajouté comme aidant à son équipe.`,
      actionUrl: '/dashboard',
    })
  } catch (err) {
    logger.error('Erreur notification ajout aidant:', err)
    return null
  }
}

export async function createTeamMemberRemovedNotification(
  caregiverId: string,
  employerName: string
): Promise<Notification | null> {
  try {
    return await createNotification({
      userId: caregiverId,
      type: 'team_member_removed',
      priority: 'high',
      title: 'Retrait d\'une équipe',
      message: `Vous avez été retiré de l'équipe de ${employerName}.`,
      actionUrl: '/dashboard',
    })
  } catch (err) {
    logger.error('Erreur notification retrait aidant:', err)
    return null
  }
}

// ============================================
// CONTRACT NOTIFICATIONS
// ============================================

export async function createContractCreatedNotification(
  employeeId: string,
  employerName: string,
  contractType: 'CDI' | 'CDD'
): Promise<Notification | null> {
  try {
    return await createNotification({
      userId: employeeId,
      type: 'contract_created',
      priority: 'normal',
      title: 'Nouveau contrat',
      message: `${employerName} a créé un contrat ${contractType} avec vous.`,
      actionUrl: '/dashboard',
      data: { employerName, contractType },
    })
  } catch (err) {
    logger.error('Erreur notification nouveau contrat:', err)
    return null
  }
}

export async function createContractTerminatedNotification(
  employeeId: string,
  employerName: string
): Promise<Notification | null> {
  try {
    return await createNotification({
      userId: employeeId,
      type: 'contract_terminated',
      priority: 'high',
      title: 'Fin de contrat',
      message: `Votre contrat avec ${employerName} a été terminé.`,
      actionUrl: '/dashboard',
      data: { employerName },
    })
  } catch (err) {
    logger.error('Erreur notification fin contrat:', err)
    return null
  }
}

// ============================================
// SHIFT NOTIFICATIONS
// ============================================

export async function createShiftCreatedNotification(
  employeeId: string,
  shiftDate: Date,
  startTime: string,
  employerName: string
): Promise<Notification | null> {
  try {
    const formattedDate = shiftDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    return await createNotification({
      userId: employeeId,
      type: 'shift_created',
      priority: 'normal',
      title: 'Nouvelle intervention',
      message: `Intervention planifiée chez ${employerName} le ${formattedDate} à ${startTime}.`,
      actionUrl: getPlanningUrlWithDate(shiftDate),
      data: { employerName, shiftDate: shiftDate.toISOString(), startTime },
    })
  } catch (err) {
    logger.error('Erreur notification shift créé:', err)
    return null
  }
}

export async function createShiftCancelledNotification(
  employeeId: string,
  shiftDate: Date,
  startTime: string
): Promise<Notification | null> {
  try {
    const formattedDate = shiftDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    return await createNotification({
      userId: employeeId,
      type: 'shift_cancelled',
      priority: 'high',
      title: 'Intervention annulée',
      message: `L'intervention du ${formattedDate} à ${startTime} a été annulée.`,
      actionUrl: getPlanningUrlWithDate(shiftDate),
      data: { shiftDate: shiftDate.toISOString(), startTime },
    })
  } catch (err) {
    logger.error('Erreur notification shift annulé:', err)
    return null
  }
}

// ============================================
// LOGBOOK NOTIFICATIONS
// ============================================

export async function createUrgentLogEntryNotification(
  userIds: string[],
  authorName: string,
  contentPreview: string
): Promise<Notification[]> {
  if (userIds.length === 0) return []

  try {
    const preview = contentPreview.substring(0, 100) + (contentPreview.length > 100 ? '...' : '')

    return await createBulkNotifications(
      userIds.map((userId) => ({
        userId,
        type: 'logbook_urgent' as NotificationType,
        priority: 'urgent' as NotificationPriority,
        title: 'Entrée urgente au cahier',
        message: `${authorName} : ${preview}`,
        actionUrl: '/logbook',
        data: { authorName, contentPreview: preview },
      }))
    )
  } catch (err) {
    logger.error('Erreur notification logbook urgent:', err)
    return []
  }
}

// ============================================
// PERMISSIONS NOTIFICATIONS
// ============================================

export async function createPermissionsUpdatedNotification(
  caregiverId: string,
  employerName: string
): Promise<Notification | null> {
  try {
    return await createNotification({
      userId: caregiverId,
      type: 'permissions_updated',
      priority: 'normal',
      title: 'Permissions modifiées',
      message: `${employerName} a mis à jour vos permissions d'accès.`,
      actionUrl: '/dashboard',
      data: { employerName },
    })
  } catch (err) {
    logger.error('Erreur notification permissions:', err)
    return null
  }
}

// ============================================
// SHIFT MODIFIED NOTIFICATION
// ============================================

export async function createShiftModifiedNotification(
  employeeId: string,
  shiftDate: Date,
  startTime: string
): Promise<Notification | null> {
  try {
    const formattedDate = shiftDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    return await createNotification({
      userId: employeeId,
      type: 'shift_modified',
      priority: 'normal',
      title: 'Intervention modifiée',
      message: `L'intervention du ${formattedDate} a été modifiée. Nouvel horaire : ${startTime}.`,
      actionUrl: getPlanningUrlWithDate(shiftDate),
      data: { shiftDate: shiftDate.toISOString(), startTime },
    })
  } catch (err) {
    logger.error('Erreur notification shift modifié:', err)
    return null
  }
}

// ============================================
// ABSENCE NOTIFICATIONS
// ============================================

const absenceTypeLabels: Record<string, string> = {
  sick: 'maladie',
  vacation: 'congé',
  training: 'formation',
  unavailable: 'indisponibilité',
  emergency: 'urgence',
}

export async function createAbsenceRequestedNotification(
  employerId: string,
  employeeName: string,
  absenceType: string,
  startDate: Date,
  endDate: Date
): Promise<Notification | null> {
  try {
    const label = absenceTypeLabels[absenceType] || absenceType
    const start = startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const end = endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

    return await createNotification({
      userId: employerId,
      type: 'absence_requested',
      priority: 'normal',
      title: 'Demande d\'absence',
      message: `${employeeName} a déclaré une absence (${label}) du ${start} au ${end}.`,
      actionUrl: getPlanningUrlWithDate(startDate),
      data: { employeeName, absenceType, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    })
  } catch (err) {
    logger.error('Erreur notification demande absence:', err)
    return null
  }
}

export async function createAbsenceResolvedNotification(
  employeeId: string,
  status: 'approved' | 'rejected',
  startDate: Date,
  endDate: Date
): Promise<Notification | null> {
  try {
    const start = startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const end = endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const statusLabel = status === 'approved' ? 'approuvée' : 'refusée'

    return await createNotification({
      userId: employeeId,
      type: 'absence_resolved',
      priority: 'high',
      title: `Absence ${statusLabel}`,
      message: `Votre demande d'absence du ${start} au ${end} a été ${statusLabel}.`,
      actionUrl: getPlanningUrlWithDate(startDate),
      data: { status, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    })
  } catch (err) {
    logger.error('Erreur notification absence résolue:', err)
    return null
  }
}

// ============================================
// LOGBOOK DIRECTED NOTIFICATION
// ============================================

export async function createLogEntryDirectedNotification(
  recipientId: string,
  authorName: string,
  contentPreview: string
): Promise<Notification | null> {
  try {
    const preview = contentPreview.substring(0, 100) + (contentPreview.length > 100 ? '...' : '')

    return await createNotification({
      userId: recipientId,
      type: 'logbook_entry_directed',
      priority: 'normal',
      title: 'Nouvelle entrée au cahier',
      message: `${authorName} vous a adressé une note : ${preview}`,
      actionUrl: '/logbook',
      data: { authorName, contentPreview: preview },
    })
  } catch (err) {
    logger.error('Erreur notification logbook dirigée:', err)
    return null
  }
}

// ============================================
// EXPORTED HELPER
// ============================================

export { getProfileName }

// ============================================
// HELPER: MAP FROM DB
// ============================================

function mapNotificationFromDb(data: NotificationDbRow): Notification {
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
