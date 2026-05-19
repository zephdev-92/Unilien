/**
 * Détection de l'environnement d'exécution, côté navigateur.
 *
 * Le build préprod (staging.unilien.app) est un build de production
 * (`import.meta.env.PROD === true`), donc indistinguable de la prod via les
 * flags Vite. On se base sur le hostname réel pour les distinguer.
 */

/** Domaines considérés comme la production. */
const PROD_HOSTS = ['unilien.app', 'www.unilien.app']

/**
 * `true` uniquement sur le domaine de production.
 * Préprod (`staging.unilien.app`) et dev (`localhost`) renvoient `false`.
 */
export function isProdHost(): boolean {
  return typeof window !== 'undefined' && PROD_HOSTS.includes(window.location.hostname)
}
