// ============================================
// SUPABASE EDGE FUNCTION: send-push-notification
// ============================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import webpush from 'npm:web-push@3.6.7'

interface PushPayload {
  notificationId: string
}

const ALLOWED_ORIGINS = [
  'https://unilien.fr',
  'https://www.unilien.fr',
  'https://unilien.netlify.app',
]

function getCorsOrigin(req: Request): string {
  const origin = req.headers.get('origin') || ''
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  // En développement local, autoriser localhost
  if (origin.startsWith('http://localhost:')) return origin
  return ALLOWED_ORIGINS[0]
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

  const corsHeaders = { 'Access-Control-Allow-Origin': corsOrigin, 'Vary': 'Origin', 'Content-Type': 'application/json' }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@unilien.fr'

    // Vérification interne du JWT : valider que l'appelant est authentifié
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized - no token' }), { status: 401, headers: corsHeaders })
    }

    // Vérifier le token via Supabase Auth
    const authClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - invalid token' }), { status: 401, headers: corsHeaders })
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: 'VAPID not configured' }), { status: 200, headers: corsHeaders })
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const payload: PushPayload = await req.json()

    if (!payload.notificationId) {
      return new Response(JSON.stringify({ error: 'notificationId required' }), { status: 400, headers: corsHeaders })
    }

    // Récupérer la notification depuis la base de données (source de vérité)
    // Cela garantit qu'on ne peut envoyer un push que pour une notification
    // réellement créée via le RPC create_notification (protégé par RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, action_url, type, priority, created_at')
      .eq('id', payload.notificationId)
      .single()

    if (notifError || !notification) {
      return new Response(JSON.stringify({ error: 'Notification not found' }), { status: 404, headers: corsHeaders })
    }

    // Vérification anti-replay : n'envoyer le push que pour des notifications
    // créées il y a moins de 5 minutes
    const createdAt = new Date(notification.created_at)
    const ageMs = Date.now() - createdAt.getTime()
    const MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes
    if (ageMs > MAX_AGE_MS) {
      return new Response(JSON.stringify({ error: 'Notification too old for push delivery' }), { status: 400, headers: corsHeaders })
    }

    const targetUserId = notification.user_id

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', targetUserId)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions' }), { status: 200, headers: corsHeaders })
    }

    const notifPayload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/pwa-192x192.png',
      data: {
        url: notification.action_url || '/',
        notificationId: notification.id,
        type: notification.type,
        priority: notification.priority,
      },
    })

    let sent = 0
    let failed = 0

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          notifPayload,
          { TTL: 86400 }
        )
        sent++
      } catch (e: unknown) {
        const err = e as { statusCode?: number; body?: string; message?: string }
        failed++
        if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 401 || err.statusCode === 403) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }

    return new Response(JSON.stringify({ sent, failed }), { status: 200, headers: corsHeaders })
  } catch {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: corsHeaders })
  }
})
