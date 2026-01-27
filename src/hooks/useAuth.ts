import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
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
        console.log('Fetching profile for user:', currentSession.user.id)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .maybeSingle()

        console.log('Profile result:', { profileData, profileError })

        if (profileError) {
          console.error('Erreur récupération profil:', profileError)
        }

        if (profileData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = profileData as any
          setProfile({
            id: data.id,
            role: data.role,
            firstName: data.first_name,
            lastName: data.last_name,
            email: currentSession.user.email || '',
            phone: data.phone || undefined,
            avatarUrl: data.avatar_url || undefined,
            accessibilitySettings: data.accessibility_settings || {},
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
          })
        } else {
          // Profil manquant - créer automatiquement à partir des métadonnées auth
          const userMeta = currentSession.user.user_metadata
          const firstName = userMeta?.first_name || 'Utilisateur'
          const lastName = userMeta?.last_name || ''
          const userRole = (userMeta?.role as UserRole) || 'employer'

          const { error: createError } = await supabase.from('profiles').insert({
            id: currentSession.user.id,
            role: userRole,
            first_name: firstName,
            last_name: lastName,
            email: currentSession.user.email || null,
            phone: null,
            avatar_url: null,
            accessibility_settings: {},
          })

          if (!createError) {
            setProfile({
              id: currentSession.user.id,
              role: userRole,
              firstName,
              lastName,
              email: currentSession.user.email || '',
              phone: undefined,
              avatarUrl: undefined,
              accessibilitySettings: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            console.log('Profil créé automatiquement pour utilisateur existant')
          } else {
            console.error('Erreur création profil automatique:', createError)
          }
        }
      }
    } catch (err) {
      console.error('Erreur initialisation auth:', err)
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

        if (!authData.user) {
          throw new Error('Erreur lors de la création du compte')
        }

        // Le profil sera créé automatiquement par le trigger Supabase
        // lors de la confirmation de l'email

        return { success: true, user: authData.user }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de l\'inscription'
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
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle()

        if (profileData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pData = profileData as any
          setProfile({
            id: pData.id,
            role: pData.role,
            firstName: pData.first_name,
            lastName: pData.last_name,
            email: authData.user.email || '',
            phone: pData.phone || undefined,
            avatarUrl: pData.avatar_url || undefined,
            accessibilitySettings: pData.accessibility_settings || {},
            createdAt: new Date(pData.created_at),
            updatedAt: new Date(pData.updated_at),
          })
        } else {
          // Profil manquant - créer automatiquement à partir des métadonnées auth
          const userMeta = authData.user.user_metadata
          const firstName = userMeta?.first_name || 'Utilisateur'
          const lastName = userMeta?.last_name || ''
          const userRole = (userMeta?.role as UserRole) || 'employer'

          const { error: createError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            role: userRole,
            first_name: firstName,
            last_name: lastName,
            email: authData.user.email || null,
            phone: null,
            avatar_url: null,
            accessibility_settings: {},
          })

          if (!createError) {
            setProfile({
              id: authData.user.id,
              role: userRole,
              firstName,
              lastName,
              email: authData.user.email || '',
              phone: undefined,
              avatarUrl: undefined,
              accessibilitySettings: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            console.log('Profil créé automatiquement pour utilisateur existant')
          } else {
            console.error('Erreur création profil automatique:', createError)
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
      console.error('Erreur déconnexion:', err)
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
