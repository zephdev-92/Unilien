import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

// ============================================
// EMAIL SERVICE — Edge Function `send-email`
// ============================================
//
// Cf. SECURITY_CHECK_2026-05-13 HIGH-1.
// Le client ne passe plus de `to` / `html` libres : on n'envoie que des
// kinds métier + IDs. La résolution destinataire + génération HTML
// se font côté Edge (service_role), templates dans
// `supabase/functions/_shared/emailTemplates.ts`.

async function invokeSendEmail(payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: payload,
  })

  if (error) {
    logger.error('[Email] Erreur envoi:', error)
    throw new Error(`Erreur envoi email: ${error.message}`)
  }

  logger.info('[Email] Envoyé, ID:', data?.id)
}

/**
 * Rappel d'intervention J-1. Le destinataire DOIT être l'auth.uid()
 * courant (rule serveur).
 */
export async function sendShiftReminder(shiftId: string, recipientId: string): Promise<void> {
  await invokeSendEmail({
    kind: 'shift_reminder',
    shiftId,
    recipientId,
  })
}

/**
 * Notification nouveau message. Le caller DOIT être le sender du message
 * (rule serveur) et `recipientId` un participant de la conversation.
 */
export async function sendNewMessageNotification(messageId: string, recipientId: string): Promise<void> {
  await invokeSendEmail({
    kind: 'new_message_notification',
    messageId,
    recipientId,
  })
}
