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

function emailLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F9FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1F2C3B;line-height:1.5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F7F9FA;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(31,44,59,0.06);">
          <tr>
            <td style="background-color:#3D5166;padding:28px 32px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 14px auto;">
                <tr>
                  <td style="background-color:#FFFFFF;border-radius:16px;padding:10px;">
                    <img src="https://unilien.app/pwa-192x192.png" alt="Unilien" width="48" height="48" style="display:block;border:0;">
                  </td>
                </tr>
              </table>
              <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:-0.02em;">Unilien</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px 24px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#EDF1F5;border-top:1px solid #C2D2E0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6D93AD;">Unilien — Gestion de soins pour personnes handicapées</p>
              <p style="margin:4px 0 0 0;font-size:12px;color:#6D93AD;"><a href="https://unilien.app" style="color:#3D5166;text-decoration:none;">unilien.app</a></p>
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
  return emailLayout('Rappel d\'intervention', `
    <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:#1F2C3B;">Rappel d'intervention</h2>
    <p style="margin:0 0 24px 0;font-size:16px;color:#4E6478;">Bonjour ${data.recipientName}, votre prochaine intervention est prévue pour demain.</p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#EDF1F5;border-radius:8px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:13px;color:#6D93AD;display:block;">Date</span>
                <span style="font-size:15px;color:#1F2C3B;font-weight:600;">${data.date}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:13px;color:#6D93AD;display:block;">Horaires</span>
                <span style="font-size:15px;color:#1F2C3B;font-weight:600;">${data.startTime}${data.endTime ? ` – ${data.endTime}` : ''}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:13px;color:#6D93AD;display:block;">Employeur</span>
                <span style="font-size:15px;color:#1F2C3B;font-weight:600;">${data.employerName}</span>
              </td>
            </tr>
            ${data.address ? `
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:13px;color:#6D93AD;display:block;">Adresse</span>
                <span style="font-size:15px;color:#1F2C3B;font-weight:600;">${data.address}</span>
              </td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:8px 0 0 0;">
          <a href="https://unilien.app/planning" style="display:inline-block;background-color:#3D5166;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Voir le planning</a>
        </td>
      </tr>
    </table>
  `)
}

function newMessageTemplate(data: NewMessageData): string {
  return emailLayout('Nouveau message', `
    <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:#1F2C3B;">Nouveau message</h2>
    <p style="margin:0 0 24px 0;font-size:16px;color:#4E6478;">Bonjour ${data.recipientName}, <strong style="color:#1F2C3B;">${data.senderName}</strong> vous a envoyé un message.</p>

    <div style="background-color:#EDF1F5;border-left:3px solid #3D5166;border-radius:4px;padding:16px 20px;margin:0 0 24px 0;">
      <p style="margin:0;font-size:15px;color:#4E6478;font-style:italic;">&ldquo;${data.preview}…&rdquo;</p>
    </div>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:8px 0 0 0;">
          <a href="${data.conversationUrl}" style="display:inline-block;background-color:#3D5166;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Répondre</a>
        </td>
      </tr>
    </table>
  `)
}
