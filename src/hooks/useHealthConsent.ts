import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { logger } from '@/lib/logger'
import { logAudit } from '@/services/auditService'

interface HealthConsent {
  hasConsent: boolean
  loading: boolean
  grantedAt: string | null
}

export function useHealthConsent() {
  const { user } = useAuthStore()
  const userId = user?.id
  const [state, setState] = useState<HealthConsent>({
    hasConsent: false,
    loading: true,
    grantedAt: null,
  })
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      // Defer state update to avoid synchronous setState in effect
      Promise.resolve().then(() => {
        if (!cancelled) setState({ hasConsent: false, loading: false, grantedAt: null })
      })
      return () => { cancelled = true }
    }

    async function fetchConsent() {
      try {
        const { data, error } = await supabase
          .from('user_consents')
          .select('id, granted_at, revoked_at')
          .eq('user_id', userId!)
          .eq('consent_type', 'health_data')
          .maybeSingle()

        if (cancelled) return

        if (error) {
          logger.error('Erreur vérification consentement santé:', error)
          setState({ hasConsent: false, loading: false, grantedAt: null })
          return
        }

        const hasConsent = !!data && !data.revoked_at
        setState({
          hasConsent,
          loading: false,
          grantedAt: hasConsent ? data.granted_at : null,
        })
      } catch (err) {
        if (cancelled) return
        logger.error('Erreur inattendue consentement santé:', err)
        setState({ hasConsent: false, loading: false, grantedAt: null })
      }
    }

    fetchConsent()
    return () => { cancelled = true }
  }, [userId, refreshKey])

  const grantConsent = async (): Promise<boolean> => {
    if (!userId) return false

    try {
      const { error } = await supabase
        .from('user_consents')
        .upsert(
          {
            user_id: userId,
            consent_type: 'health_data' as const,
            granted_at: new Date().toISOString(),
            revoked_at: null,
          },
          { onConflict: 'user_id,consent_type' }
        )

      if (error) {
        logger.error('Erreur enregistrement consentement santé:', error)
        return false
      }

      logAudit({ action: 'grant_consent', resource: 'user_consents', resourceId: userId })

      setState({
        hasConsent: true,
        loading: false,
        grantedAt: new Date().toISOString(),
      })
      return true
    } catch (err) {
      logger.error('Erreur inattendue grant consentement:', err)
      return false
    }
  }

  const revokeConsent = async (): Promise<boolean> => {
    if (!userId) return false

    try {
      const { error } = await supabase
        .from('user_consents')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('consent_type', 'health_data')

      if (error) {
        logger.error('Erreur révocation consentement santé:', error)
        return false
      }

      logAudit({ action: 'revoke_consent', resource: 'user_consents', resourceId: userId })

      setState({ hasConsent: false, loading: false, grantedAt: null })
      return true
    } catch (err) {
      logger.error('Erreur inattendue revoke consentement:', err)
      return false
    }
  }

  return {
    hasConsent: state.hasConsent,
    loading: state.loading,
    grantedAt: state.grantedAt,
    grantConsent,
    revokeConsent,
    recheckConsent: () => setRefreshKey((k) => k + 1),
  }
}
