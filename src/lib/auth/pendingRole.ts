/**
 * Stockage temporaire du rôle sélectionné dans le SignupForm avant un
 * redirect OAuth. Permet de pré-remplir l'onboarding au retour, sans dépendre
 * d'une intégration côté provider OAuth (Google/Microsoft n'envoient pas de
 * `role` métier dans leur token).
 *
 * Persisté en sessionStorage : survit au redirect OAuth, tombe avec l'onglet.
 */

import type { UserRole } from '@/types'

const STORAGE_KEY = 'unilien-pending-role'
const VALID_ROLES: readonly UserRole[] = ['employer', 'employee', 'caregiver']

export function setPendingRole(role: UserRole): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, role)
  } catch {
    // sessionStorage indisponible (mode privé / quota) → on ignore silencieusement
  }
}

/**
 * Lit le rôle pending et le supprime du storage (one-shot).
 */
export function consumePendingRole(): UserRole | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)
    if (!value) return null
    sessionStorage.removeItem(STORAGE_KEY)
    return VALID_ROLES.includes(value as UserRole) ? (value as UserRole) : null
  } catch {
    return null
  }
}
