// ============================================
// SUPABASE EDGE FUNCTION: invite-caregiver
// Invites a new caregiver by creating their account
// and sending a magic link email to set their password.
// ============================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface InvitePayload {
  email: string
  firstName: string
  lastName: string
  employerId: string
}

const ALLOWED_ORIGINS = [
  'https://unilien.fr',
  'https://www.unilien.fr',
  'https://unilien.netlify.app',
]

function getCorsOrigin(req: Request): string {
  const origin = req.headers.get('origin') || ''
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin
  return ALLOWED_ORIGINS[0]
}

function corsHeaders(req: Request) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(req),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    // Verify the calling user is authenticated
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const { email, firstName, lastName, employerId } = (await req.json()) as InvitePayload

    if (!email || !firstName || !lastName || !employerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, firstName, lastName, employerId' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify the caller is actually the employer
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller || caller.id !== employerId) {
      console.error('Auth check failed:', authError?.message, 'caller:', caller?.id, 'employerId:', employerId)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: caller must be the employer' }),
        { status: 403, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    // Check if a profile with this email already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existingProfile) {
      return new Response(
        JSON.stringify({
          error: 'Un compte existe deja avec cette adresse email.',
          existingProfileId: existingProfile.id,
          existingRole: existingProfile.role,
        }),
        { status: 409, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    // Invite the user — creates auth account + sends magic link email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim(),
      {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'caregiver',
          invited_by: employerId,
        },
        redirectTo: `${Deno.env.get('SITE_URL') || 'https://unilien.netlify.app'}/reinitialisation`,
      },
    )

    if (inviteError) {
      console.error('Invite error:', inviteError)
      return new Response(
        JSON.stringify({ error: `Erreur lors de l'invitation: ${inviteError.message}` }),
        { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const userId = inviteData.user.id

    // Create the profile for the invited user
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email.toLowerCase().trim(),
        first_name: firstName,
        last_name: lastName,
        role: 'caregiver',
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Don't fail — the user was created, profile can be completed on first login
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: `Invitation envoyee a ${email}`,
      }),
      { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }
})
