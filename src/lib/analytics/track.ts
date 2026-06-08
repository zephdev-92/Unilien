/**
 * Helper de tracking d'events custom Plausible.
 *
 * Le script Plausible est injecté conditionnellement par `Analytics.tsx`
 * (selon `VITE_PLAUSIBLE_*` + toggle Confidentialité de l'utilisateur).
 * Tant qu'il n'est pas chargé, les events sont empilés dans `window.plausible.q`
 * et envoyés au chargement du script — exactement comme le snippet officiel.
 * Si l'utilisateur a désactivé les analytics, aucun script ne charge : les
 * events restent en mémoire et ne sont jamais transmis.
 *
 * ⚠️ RGPD art. 9 : ne JAMAIS passer de PII ni de donnée de santé en `props`
 * (email, nom, téléphone, handicap_type, pch_*…). Voir `docs/KPIS.md`.
 */

type PlausibleProps = Record<string, string | number | boolean>

interface PlausibleFn {
  (event: string, options?: { props?: PlausibleProps }): void
  q?: unknown[]
}

declare global {
  interface Window {
    plausible?: PlausibleFn
  }
}

export function track(event: string, props?: PlausibleProps): void {
  if (typeof window === 'undefined') return

  // Queue stub : empile les events tant que le script réel n'est pas chargé.
  if (!window.plausible) {
    const stub: PlausibleFn = (...args: unknown[]) => {
      ;(stub.q = stub.q ?? []).push(args)
    }
    window.plausible = stub
  }

  window.plausible(event, props ? { props } : undefined)
}
