// ============================================
// SUPABASE EDGE FUNCTION: send-push-notification
// ============================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import webpush from 'npm:web-push@3.6.7'

interface PushPayload {
  userId: string
  title: string
  body: string
  icon?: string
  data?: Record<string, unknown>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

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
      console.log('Auth failed:', authError?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized - invalid token' }), { status: 401, headers: corsHeaders })
    }
    console.log('Authenticated user:', user.id)

    console.log('Push function called')
    console.log('VAPID configured:', !!vapidPublicKey && !!vapidPrivateKey)

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log('VAPID keys missing')
      return new Response(JSON.stringify({ error: 'VAPID not configured' }), { status: 200, headers: corsHeaders })
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const payload: PushPayload = await req.json()
    console.log('Payload received:', payload.userId, payload.title)

    if (!payload.userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', payload.userId)

    console.log('Subscriptions found:', subs?.length || 0, error ? `Error: ${error.message}` : '')

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }

    if (!subs?.length) {
      console.log('No subscriptions for user')
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions' }), { status: 200, headers: corsHeaders })
    }

    const notifPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      data: payload.data || {},
    })

    let sent = 0
    let failed = 0

    for (const sub of subs) {
      console.log('Sending to endpoint:', sub.endpoint.substring(0, 50))
      try {
        const result = await webpush.sendNotification(
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
        console.log('Success:', result.statusCode)
        sent++
      } catch (e: unknown) {
        const err = e as { statusCode?: number; body?: string; message?: string }
        console.log('Failed:', err.statusCode, err.body || err.message)
        failed++
        if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 401 || err.statusCode === 403) {
          console.log('Removing invalid/expired subscription:', err.statusCode)
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }

    console.log(`Complete: ${sent} sent, ${failed} failed`)
    return new Response(JSON.stringify({ sent, failed }), { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('Error:', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
