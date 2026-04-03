import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface MfaFactor {
  id: string
  status: 'verified' | 'unverified'
  friendly_name?: string
  created_at: string
}

interface EnrollResult {
  factorId: string
  qrCode: string
  uri: string
}

export function useMfa() {
  const [factors, setFactors] = useState<MfaFactor[]>([])
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadFactors = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) {
        logger.error('Erreur chargement facteurs MFA:', error.message)
        return
      }
      if (data) {
        const totp = (data.totp ?? []) as MfaFactor[]
        setFactors(totp)
        setIsEnabled(totp.some((f) => f.status === 'verified'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFactors()
  }, [loadFactors])

  const enroll = useCallback(async (): Promise<EnrollResult> => {
    // Nettoyer les facteurs non vérifiés (tentatives précédentes)
    const { data: existing } = await supabase.auth.mfa.listFactors()
    if (existing?.totp) {
      for (const factor of existing.totp) {
        if (factor.status === 'unverified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id })
        }
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Unilien',
    })
    if (error || !data) {
      logger.error('Erreur enrôlement MFA:', error?.message)
      throw error ?? new Error('Enrôlement échoué')
    }
    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      uri: data.totp.uri,
    }
  }, [])

  const verify = useCallback(async (factorId: string, code: string) => {
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      throw challengeError ?? new Error('Challenge échoué')
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    })
    if (verifyError) throw verifyError

    await loadFactors()
  }, [loadFactors])

  const unenroll = useCallback(async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw error
    await loadFactors()
  }, [loadFactors])

  const getAssuranceLevel = useCallback(async () => {
    const { data, error } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error) throw error
    return data
  }, [])

  return {
    factors,
    isEnabled,
    loading,
    enroll,
    verify,
    unenroll,
    getAssuranceLevel,
    reload: loadFactors,
  }
}
