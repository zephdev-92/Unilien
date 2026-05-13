// ============================================
// SUPABASE EDGE FUNCTION: send-email
// ============================================
//
// Sécurité (cf. SECURITY_CHECK_2026-05-13 HIGH-1) :
// Le client ne peut PLUS spécifier `to` ni `html` directement. Il envoie
// uniquement un `kind` (shift_reminder | new_message_notification) + des
// IDs métier. La fonction résout côté serveur (service_role) le
// destinataire et génère le HTML via les templates dans
// `_shared/emailTemplates.ts`. Surface d'attaque "relais d'emails" =
// fermée.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { createRateLimiter } from '../_shared/rateLimit.ts'
import {
  shiftReminderTemplate,
  newMessageTemplate,
} from '../_shared/emailTemplates.ts'

type EmailRequest =
  | { kind: 'shift_reminder'; shiftId: string; recipientId: string }
  | { kind: 'new_message_notification'; messageId: string; recipientId: string }

const ALLOWED_ORIGINS = [
  'https://unilien.app',
  'https://www.unilien.app',
]

function getCorsOrigin(req: Request): string {
  const origin = req.headers.get('origin') || ''
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  if (origin.startsWith('http://localhost:')) return origin
  return ALLOWED_ORIGINS[0]
}

const rateLimiter = createRateLimiter(10) // max 10 emails/min/user

function fail(message: string, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), { status, headers })
}

function formatFrenchDate(dateStr: string): string {
  // dateStr au format ISO (YYYY-MM-DD)
  try {
    const d = new Date(dateStr + 'T00:00:00Z')
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(d)
  } catch {
    return dateStr
  }
}

function fullName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(' ').trim() || 'Utilisateur'
}

serve(async (req) => {
  const corsOrigin = getCorsOrigin(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Vary': 'Origin',
      },
    })
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      return fail('RESEND_API_KEY not configured', 500, corsHeaders)
    }

    // 1. Auth — JWT
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return fail('Unauthorized - no token', 401, corsHeaders)

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return fail('Unauthorized - invalid token', 401, corsHeaders)

    // 2. Rate limit (per-user, in-memory — cf. MEDIUM-2)
    if (rateLimiter.isLimited(user.id)) {
      return rateLimiter.tooManyRequestsResponse(corsHeaders)
    }

    // 3. Parse + valide le payload
    let body: EmailRequest
    try {
      body = await req.json()
    } catch {
      return fail('Invalid JSON', 400, corsHeaders)
    }

    if (!body || typeof body !== 'object' || !('kind' in body)) {
      return fail('Missing kind', 400, corsHeaders)
    }

    // 4. Résolution côté serveur selon le kind
    let to: string
    let subject: string
    let html: string
    let text: string

    if (body.kind === 'shift_reminder') {
      if (!body.shiftId || !body.recipientId) {
        return fail('Missing shiftId or recipientId', 400, corsHeaders)
      }

      // Seul le destinataire peut déclencher son propre rappel.
      // (Empêche un user d'envoyer des emails à un autre user au nom du système.)
      if (body.recipientId !== user.id) {
        return fail('Forbidden: recipient must be the caller', 403, corsHeaders)
      }

      const { data: shift, error: shiftErr } = await admin
        .from('shifts')
        .select(`
          date,
          start_time,
          end_time,
          contract:contracts!contract_id(
            employer_id,
            employee_id,
            employer:profiles!employer_id(first_name, last_name)
          )
        `)
        .eq('id', body.shiftId)
        .single()

      if (shiftErr || !shift) {
        return fail('Shift not found', 404, corsHeaders)
      }

      const contract = Array.isArray(shift.contract) ? shift.contract[0] : shift.contract
      if (!contract || contract.employee_id !== user.id) {
        return fail('Forbidden: not your shift', 403, corsHeaders)
      }

      const { data: recipient, error: rcpErr } = await admin
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', body.recipientId)
        .single()
      if (rcpErr || !recipient?.email) {
        return fail('Recipient email not found', 404, corsHeaders)
      }

      const employer = Array.isArray(contract.employer) ? contract.employer[0] : contract.employer
      const rendered = shiftReminderTemplate({
        recipientName: fullName(recipient.first_name, recipient.last_name),
        employerName: fullName(employer?.first_name ?? null, employer?.last_name ?? null),
        date: formatFrenchDate(shift.date),
        startTime: shift.start_time,
        endTime: shift.end_time || undefined,
      })

      to = recipient.email
      subject = rendered.subject
      html = rendered.html
      text = rendered.text
    } else if (body.kind === 'new_message_notification') {
      if (!body.messageId || !body.recipientId) {
        return fail('Missing messageId or recipientId', 400, corsHeaders)
      }

      const { data: message, error: msgErr } = await admin
        .from('liaison_messages')
        .select(`
          content,
          sender_id,
          conversation:conversations!conversation_id(participant_ids),
          sender:profiles!sender_id(first_name, last_name)
        `)
        .eq('id', body.messageId)
        .single()

      if (msgErr || !message) {
        return fail('Message not found', 404, corsHeaders)
      }

      // Seul l'expéditeur peut déclencher la notification de SON message.
      if (message.sender_id !== user.id) {
        return fail('Forbidden: not message sender', 403, corsHeaders)
      }

      const conversation = Array.isArray(message.conversation) ? message.conversation[0] : message.conversation
      const participants: string[] = conversation?.participant_ids ?? []
      if (!participants.includes(body.recipientId) || body.recipientId === message.sender_id) {
        return fail('Forbidden: recipient not in conversation', 403, corsHeaders)
      }

      const { data: recipient, error: rcpErr } = await admin
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', body.recipientId)
        .single()
      if (rcpErr || !recipient?.email) {
        return fail('Recipient email not found', 404, corsHeaders)
      }

      const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender
      const fullContent = (message.content as string) || ''
      const preview = fullContent.length > 120 ? fullContent.slice(0, 120) : fullContent
      const rendered = newMessageTemplate({
        recipientName: fullName(recipient.first_name, recipient.last_name),
        senderName: fullName(sender?.first_name ?? null, sender?.last_name ?? null),
        preview,
        conversationUrl: 'https://unilien.app/messagerie',
      })

      to = recipient.email
      subject = rendered.subject
      html = rendered.html
      text = rendered.text
    } else {
      return fail('Unknown kind', 400, corsHeaders)
    }

    // 5. Envoi Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Unilien <notifications@unilien.app>',
        to,
        subject,
        html,
        text,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: corsHeaders,
      })
    }

    return new Response(JSON.stringify({ id: data.id }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch {
    return fail('Internal error', 500, corsHeaders)
  }
})
