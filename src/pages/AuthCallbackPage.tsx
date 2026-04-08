import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Center, Spinner, Text, Box } from '@chakra-ui/react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { User } from '@supabase/supabase-js'

async function resolveRedirect(user: User): Promise<string> {
  const provider = user.app_metadata?.provider

  // Utilisateur email/mdp classique → pas d'onboarding
  if (!provider || provider === 'email') {
    return '/tableau-de-bord'
  }

  // Utilisateur OAuth → vérifier si le profil a été initialisé
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle()

  // Profil absent ou avec le prénom par défaut → onboarding requis
  if (!profile || profile.first_name === 'Utilisateur') {
    return '/onboarding/role'
  }

  return '/tableau-de-bord'
}

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    async function handle(user: User) {
      if (handled.current) return
      handled.current = true
      try {
        const destination = await resolveRedirect(user)
        navigate(destination, { replace: true })
      } catch (err) {
        logger.error('Erreur callback OAuth:', err)
        navigate('/connexion', { replace: true })
      }
    }

    // Vérifier si la session est déjà disponible (detectSessionInUrl)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handle(session.user)
        return
      }

      // Attendre le SIGNED_IN (échange de code en cours)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
        if (event === 'SIGNED_IN' && s) {
          subscription.unsubscribe()
          handle(s.user)
        } else if (event === 'SIGNED_OUT') {
          subscription.unsubscribe()
          navigate('/connexion', { replace: true })
        }
      })

      // Timeout de sécurité (10s)
      const timeout = setTimeout(() => {
        subscription.unsubscribe()
        if (!handled.current) {
          navigate('/connexion', { replace: true })
        }
      }, 10_000)

      return () => {
        clearTimeout(timeout)
        subscription.unsubscribe()
      }
    })
  }, [navigate])

  return (
    <Center minH="100vh" bg="bg.page">
      <Box textAlign="center" role="status" aria-live="polite">
        <Spinner size="xl" color="brand.500" borderWidth="4px" mb={4} />
        <Text fontSize="md" color="text.muted">
          Connexion en cours…
        </Text>
      </Box>
    </Center>
  )
}
