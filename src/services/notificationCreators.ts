import { logger } from '@/lib/logger'
import type { Notification, NotificationType, NotificationPriority } from '@/types'
import {
  createNotification,
  createBulkNotifications,
  getProfileName,
  getPlanningUrlWithDate,
} from './notificationService.core'

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
    actionUrl: '/conformite',
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
    actionUrl: '/conformite',
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
    actionUrl: '/messagerie',
    data: { senderName, messagePreview },
  })
}

// ============================================
// TEAM NOTIFICATIONS
// ============================================

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
      actionUrl: '/tableau-de-bord',
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
      actionUrl: '/tableau-de-bord',
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
      actionUrl: '/tableau-de-bord',
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
      actionUrl: '/tableau-de-bord',
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
        actionUrl: '/cahier-de-liaison',
        data: { authorName, contentPreview: preview },
      }))
    )
  } catch (err) {
    logger.error('Erreur notification logbook urgent:', err)
    return []
  }
}

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
      actionUrl: '/cahier-de-liaison',
      data: { authorName, contentPreview: preview },
    })
  } catch (err) {
    logger.error('Erreur notification logbook dirigée:', err)
    return null
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
      actionUrl: '/tableau-de-bord',
      data: { employerName },
    })
  } catch (err) {
    logger.error('Erreur notification permissions:', err)
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

// Re-export getProfileName for backward compatibility
export { getProfileName }
