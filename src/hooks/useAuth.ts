import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'
import { logger } from '@/lib/logger'
import { createDefaultProfile } from '@/lib/mappers'
import { getProfileById, createFallbackProfile } from '@/services/profileService'

interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
}

/**
 * Convertit les erreurs d'inscription Supabase en messages utilisateur clairs
 */
function getSignUpErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.'
  }

  const message = err.message.toLowerCase()

  // Email déjà utilisé (notre marker personnalisé)
  if (err.message === 'EMAIL_ALREADY_EXISTS') {
    return 'Cette adresse email est déjà associée à un compte. Connectez-vous ou utilisez une autre adresse.'
  }

  // Erreur Supabase: User already registered
  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'Cette adresse email est déjà associée à un compte. Connectez-vous ou utilisez une autre adresse.'
  }

  // Erreur Supabase: Email rate limit
  if (message.includes('email rate limit') || message.includes('rate limit')) {
    return 'Trop de tentatives d\'inscription. Veuillez patienter quelques minutes avant de réessayer.'
  }

  // Erreur Supabase: Invalid email
  if (message.includes('invalid email') || message.includes('email not valid')) {
    return 'L\'adresse email saisie n\'est pas valide.'
  }

  // Erreur Supabase: Password too weak
  if (message.includes('password') && (message.includes('weak') || message.includes('short'))) {
    return 'Le mot de passe est trop faible. Utilisez au moins 8 caractères avec majuscule, minuscule et chiffre.'
  }

  // Erreur réseau
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
  }

  // Erreur par défaut avec le message original pour debug
  logger.error('Erreur inscription non mappée:', err.message)
  return 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.'
}

interface SignInData {
  email: string
  password: string
}

export function useAuth() {
  const navigate = useNavigate()
  const {
    user,
    session,
    profile,
    isLoading,
    isInitialized,
    error,
    setUser,
    setSession,
    setProfile,
    setLoading,
    setInitialized,
    setError,
    reset,
    isAuthenticated,
    getUserRole,
  } = useAuthStore()

  // Initialisation de l'authentification
  const initialize = useCallback(async () => {
    try {
      setLoading(true)

      // Récupérer la session existante
      const { data: { session: currentSession }, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      if (currentSession) {
        setSession(currentSession)
        setUser(currentSession.user)

        // Récupérer le profil
        const profile = await getProfileById(
          currentSession.user.id,
          currentSession.user.email || ''
        )

        if (profile) {
          setProfile(profile)
        } else {
          // Profil manquant - créer automatiquement à partir des métadonnées auth
          const defaultProfile = createDefaultProfile(
            currentSession.user.id,
            currentSession.user.email || '',
            currentSession.user.user_metadata
          )

          const created = await createFallbackProfile({
            id: defaultProfile.id,
            role: defaultProfile.role,
            firstName: defaultProfile.firstName,
            lastName: defaultProfile.lastName,
            email: currentSession.user.email || null,
          })

          if (created) {
            setProfile(defaultProfile)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'initialisation')
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [setUser, setSession, setProfile, setLoading, setInitialized, setError])

  // Écouter les changements d'authentification
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession) {
          setSession(newSession)
          setUser(newSession.user)
        } else if (event === 'SIGNED_OUT') {
          reset()
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession)
        }
      }
    )

    // Initialiser au montage
    if (!isInitialized) {
      initialize()
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [initialize, isInitialized, setSession, setUser, reset])

  // Inscription
  const signUp = useCallback(
    async (data: SignUpData) => {
      try {
        setLoading(true)
        setError(null)

        // Créer le compte
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              first_name: data.firstName,
              last_name: data.lastName,
              role: data.role,
            },
          },
        })

        if (signUpError) {
          throw signUpError
        }

        // Vérifier si l'utilisateur existe déjà (Supabase retourne un user sans session)
        // Quand l'email existe déjà et que la confirmation n'est pas faite,
        // Supabase retourne un user avec identities vide
        if (authData.user && authData.user.identities?.length === 0) {
          throw new Error('EMAIL_ALREADY_EXISTS')
        }

        if (!authData.user) {
          throw new Error('Erreur lors de la création du compte')
        }

        // Le profil sera créé automatiquement par le trigger Supabase
        // lors de la confirmation de l'email

        return { success: true, user: authData.user }
      } catch (err) {
        const message = getSignUpErrorMessage(err)
        setError(message)
        return { success: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setError]
  )

  // Connexion
  const signIn = useCallback(
    async (data: SignInData) => {
      try {
        setLoading(true)
        setError(null)

        const { data: authData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          })

        if (signInError) {
          throw signInError
        }

        if (!authData.session || !authData.user) {
          throw new Error('Erreur de connexion')
        }

        // Récupérer le profil
        const profile = await getProfileById(
          authData.user.id,
          authData.user.email || ''
        )

        if (profile) {
          setProfile(profile)
        } else {
          // Profil manquant - créer automatiquement à partir des métadonnées auth
          const defaultProfile = createDefaultProfile(
            authData.user.id,
            authData.user.email || '',
            authData.user.user_metadata
          )

          const created = await createFallbackProfile({
            id: defaultProfile.id,
            role: defaultProfile.role,
            firstName: defaultProfile.firstName,
            lastName: defaultProfile.lastName,
            email: authData.user.email || null,
          })

          if (created) {
            setProfile(defaultProfile)
          }
        }

        navigate('/dashboard')
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur de connexion'
        setError(message)
        return { success: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [navigate, setLoading, setError, setProfile]
  )

  // Déconnexion
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      reset()
      navigate('/login')
    } catch (err) {
      logger.error('Erreur déconnexion:', err)
    } finally {
      setLoading(false)
    }
  }, [navigate, reset, setLoading])

  // Réinitialisation du mot de passe
  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw error
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la réinitialisation'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError])

  return {
    // État
    user,
    session,
    profile,
    isLoading,
    isInitialized,
    error,
    isAuthenticated: isAuthenticated(),
    userRole: getUserRole(),

    // Actions
    signUp,
    signIn,
    signOut,
    resetPassword,
    initialize,
  }
}

export default useAuth
