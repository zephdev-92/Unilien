// ============================================
// EMAIL TEMPLATES — Deno side
// ============================================
//
// Les templates sont générés côté Edge Function pour que le client ne
// puisse jamais injecter de HTML arbitraire dans le pipeline Resend.
// Toute donnée externe (noms, contenus de message, dates) DOIT passer
// par escapeHtml() avant interpolation.

export interface ShiftReminderData {
  recipientName: string
  employerName: string
  date: string
  startTime: string
  endTime?: string
  address?: string
}

export interface NewMessageData {
  recipientName: string
  senderName: string
  preview: string
  conversationUrl: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function emailLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
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

export function shiftReminderTemplate(data: ShiftReminderData): { subject: string; html: string; text: string } {
  const safeRecipient = escapeHtml(data.recipientName)
  const safeEmployer = escapeHtml(data.employerName)
  const safeDate = escapeHtml(data.date)
  const safeStart = escapeHtml(data.startTime)
  const safeEnd = data.endTime ? escapeHtml(data.endTime) : ''
  const safeAddress = data.address ? escapeHtml(data.address) : ''

  const html = emailLayout(
    "Rappel d'intervention",
    `
    <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:#1F2C3B;">Rappel d'intervention</h2>
    <p style="margin:0 0 24px 0;font-size:16px;color:#4E6478;">Bonjour ${safeRecipient}, votre prochaine intervention est prévue pour demain.</p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#EDF1F5;border-radius:8px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:13px;color:#6D93AD;display:block;">Date</span>
                <span style="font-size:15px;color:#1F2C3B;font-weight:600;">${safeDate}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:13px;color:#6D93AD;display:block;">Horaires</span>
                <span style="font-size:15px;color:#1F2C3B;font-weight:600;">${safeStart}${safeEnd ? ` – ${safeEnd}` : ''}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:13px;color:#6D93AD;display:block;">Employeur</span>
                <span style="font-size:15px;color:#1F2C3B;font-weight:600;">${safeEmployer}</span>
              </td>
            </tr>
            ${safeAddress ? `
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:13px;color:#6D93AD;display:block;">Adresse</span>
                <span style="font-size:15px;color:#1F2C3B;font-weight:600;">${safeAddress}</span>
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
  `
  )

  return {
    subject: `Rappel : intervention demain ${data.date}`,
    html,
    text: `Bonjour ${data.recipientName}, rappel de votre intervention demain ${data.date} de ${data.startTime}${data.endTime ? ` à ${data.endTime}` : ''} chez ${data.employerName}.`,
  }
}

export function newMessageTemplate(data: NewMessageData): { subject: string; html: string; text: string } {
  const safeRecipient = escapeHtml(data.recipientName)
  const safeSender = escapeHtml(data.senderName)
  const safePreview = escapeHtml(data.preview)
  // L'URL n'est pas escapée comme du HTML : on n'autorise que des URL https://unilien.app/* (validation côté Edge).
  const safeUrl = escapeHtml(data.conversationUrl)

  const html = emailLayout('Nouveau message', `
    <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:#1F2C3B;">Nouveau message</h2>
    <p style="margin:0 0 24px 0;font-size:16px;color:#4E6478;">Bonjour ${safeRecipient}, <strong style="color:#1F2C3B;">${safeSender}</strong> vous a envoyé un message.</p>

    <div style="background-color:#EDF1F5;border-left:3px solid #3D5166;border-radius:4px;padding:16px 20px;margin:0 0 24px 0;">
      <p style="margin:0;font-size:15px;color:#4E6478;font-style:italic;">&ldquo;${safePreview}…&rdquo;</p>
    </div>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:8px 0 0 0;">
          <a href="${safeUrl}" style="display:inline-block;background-color:#3D5166;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Répondre</a>
        </td>
      </tr>
    </table>
  `)

  return {
    subject: `Nouveau message de ${data.senderName}`,
    html,
    text: `Bonjour ${data.recipientName}, vous avez reçu un message de ${data.senderName} : "${data.preview}"`,
  }
}
