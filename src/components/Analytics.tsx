/**
 * Charge conditionnellement le script Plausible (cookieless analytics).
 *
 * Conditions d'activation :
 * - `VITE_PLAUSIBLE_DOMAIN` et `VITE_PLAUSIBLE_SRC` configurés (sinon no-op)
 * - L'utilisateur n'a pas désactivé les analytics dans Paramètres > Confidentialité
 *
 * Le script est injecté/retiré dynamiquement quand la préférence change.
 */

import { useEffect } from 'react'
import { usePrivacySettings } from '@/hooks/usePrivacySettings'

const SCRIPT_ID = 'plausible-analytics'

const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined
const PLAUSIBLE_SRC = import.meta.env.VITE_PLAUSIBLE_SRC as string | undefined

export function Analytics() {
  const { analyticsEnabled } = usePrivacySettings()

  useEffect(() => {
    // Pas configuré → ne rien faire
    if (!PLAUSIBLE_DOMAIN || !PLAUSIBLE_SRC) return

    const existing = document.getElementById(SCRIPT_ID)

    if (analyticsEnabled) {
      if (existing) return
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.defer = true
      script.dataset.domain = PLAUSIBLE_DOMAIN
      script.src = PLAUSIBLE_SRC
      document.head.appendChild(script)
    } else if (existing) {
      existing.remove()
    }
  }, [analyticsEnabled])

  return null
}
