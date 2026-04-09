import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export interface ShiftReminderData {
  recipientName: string
  employerName: string
  date: string        // ex: "Lundi 14 avril 2026"
  startTime: string   // ex: "09:00"
  endTime?: string    // ex: "17:00"
  address?: string
}

export interface NewMessageData {
  recipientName: string
  senderName: string
  preview: string     // premiers caractères du message
  conversationUrl: string
}

// ============================================
// CORE
// ============================================

/**
 * Envoie un email via l'Edge Function send-email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: options,
  })

  if (error) {
    logger.error('[Email] Erreur envoi:', error)
    throw new Error(`Erreur envoi email: ${error.message}`)
  }

  logger.info('[Email] Envoyé, ID:', data?.id)
}

// ============================================
// TEMPLATES
// ============================================

/**
 * Rappel d'intervention J-1
 */
export async function sendShiftReminder(to: string, data: ShiftReminderData): Promise<void> {
  await sendEmail({
    to,
    subject: `Rappel : intervention demain ${data.date}`,
    html: shiftReminderTemplate(data),
    text: `Bonjour ${data.recipientName}, rappel de votre intervention demain ${data.date} de ${data.startTime} à ${data.endTime} chez ${data.employerName}.`,
  })
}

/**
 * Notification nouveau message
 */
export async function sendNewMessageNotification(to: string, data: NewMessageData): Promise<void> {
  await sendEmail({
    to,
    subject: `Nouveau message de ${data.senderName}`,
    html: newMessageTemplate(data),
    text: `Bonjour ${data.recipientName}, vous avez reçu un message de ${data.senderName} : "${data.preview}"`,
  })
}

// ============================================
// HTML TEMPLATES
// ============================================

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unilien</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#2563eb;padding:24px 32px;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Unilien</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f0f0f0;background:#fafafa;">
              <p style="margin:0;font-size:12px;color:#999;text-align:center;">
                Unilien — Gestion de vos auxiliaires de vie<br/>
                <a href="https://unilien.fr" style="color:#2563eb;text-decoration:none;">unilien.fr</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function shiftReminderTemplate(data: ShiftReminderData): string {
  return emailLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111;font-weight:600;">Rappel d'intervention</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#666;">Bonjour ${data.recipientName},</p>

    <div style="background:#eff6ff;border-radius:8px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;">
            <span style="font-size:13px;color:#6b7280;display:block;">Date</span>
            <span style="font-size:15px;color:#111;font-weight:600;">${data.date}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <span style="font-size:13px;color:#6b7280;display:block;">Horaires</span>
            <span style="font-size:15px;color:#111;font-weight:600;">${data.startTime}${data.endTime ? ` – ${data.endTime}` : ''}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <span style="font-size:13px;color:#6b7280;display:block;">Employeur</span>
            <span style="font-size:15px;color:#111;font-weight:600;">${data.employerName}</span>
          </td>
        </tr>
        ${data.address ? `
        <tr>
          <td style="padding:6px 0;">
            <span style="font-size:13px;color:#6b7280;display:block;">Adresse</span>
            <span style="font-size:15px;color:#111;font-weight:600;">${data.address}</span>
          </td>
        </tr>` : ''}
      </table>
    </div>

    <a href="https://unilien.fr/planning" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
      Voir le planning
    </a>
  `)
}

function newMessageTemplate(data: NewMessageData): string {
  return emailLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111;font-weight:600;">Nouveau message</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#666;">Bonjour ${data.recipientName},</p>

    <p style="margin:0 0 16px;font-size:15px;color:#333;">
      <strong>${data.senderName}</strong> vous a envoyé un message :
    </p>

    <div style="background:#f9fafb;border-left:3px solid #2563eb;border-radius:4px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#555;font-style:italic;">"${data.preview}…"</p>
    </div>

    <a href="${data.conversationUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
      Répondre
    </a>
  `)
}
