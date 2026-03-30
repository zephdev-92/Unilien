import { useState, useEffect, useCallback } from 'react'
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
  const [state, setState] = useState<HealthConsent>({
    hasConsent: false,
    loading: true,
    grantedAt: null,
  })

  const checkConsent = useCallback(async () => {
    if (!user?.id) {
      setState({ hasConsent: false, loading: false, grantedAt: null })
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_consents')
        .select('id, granted_at, revoked_at')
        .eq('user_id', user.id)
        .eq('consent_type', 'health_data')
        .maybeSingle()

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
      logger.error('Erreur inattendue consentement santé:', err)
      setState({ hasConsent: false, loading: false, grantedAt: null })
    }
  }, [user?.id])

  useEffect(() => {
    checkConsent()
  }, [checkConsent])

  const grantConsent = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const { error } = await supabase
        .from('user_consents')
        .upsert(
          {
            user_id: user.id,
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

      logAudit({ action: 'grant_consent', resource: 'user_consents', resourceId: user.id })

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
  }, [user?.id])

  const revokeConsent = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const { error } = await supabase
        .from('user_consents')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('consent_type', 'health_data')

      if (error) {
        logger.error('Erreur révocation consentement santé:', error)
        return false
      }

      logAudit({ action: 'revoke_consent', resource: 'user_consents', resourceId: user.id })

      setState({ hasConsent: false, loading: false, grantedAt: null })
      return true
    } catch (err) {
      logger.error('Erreur inattendue revoke consentement:', err)
      return false
    }
  }, [user?.id])

  return {
    hasConsent: state.hasConsent,
    loading: state.loading,
    grantedAt: state.grantedAt,
    grantConsent,
    revokeConsent,
    recheckConsent: checkConsent,
  }
}
