// ============================================
// SUPABASE EDGE FUNCTION: send-email
// ============================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { createRateLimiter } from '../_shared/rateLimit.ts'

interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

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

const rateLimiter = createRateLimiter(10) // max 10 emails/min

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
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    // Vérification JWT
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized - no token' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - invalid token' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    // Rate limiting
    if (rateLimiter.isLimited(user.id)) {
      return rateLimiter.tooManyRequestsResponse(corsHeaders)
    }

    const payload: EmailPayload = await req.json()

    if (!payload.to || !payload.subject || !payload.html) {
      return new Response(JSON.stringify({ error: 'to, subject and html are required' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Unilien <notifications@unilien.app>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        ...(payload.text ? { text: payload.text } : {}),
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
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
