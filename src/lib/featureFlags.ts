/**
 * Feature flags applicatifs.
 *
 * Permet d'activer/désactiver des fonctionnalités sans supprimer le code.
 * À utiliser uniquement pour des décisions produit binaires (ON/OFF).
 * Pour de la config runtime, passer par les paramètres utilisateur ou les env vars.
 */
export const FEATURES = {
  /**
   * Pointage / Suivi des heures.
   * Désactivé pour la v1 le temps de livrer le pointage par QR code
   * (cf. docs/QR_CLOCKIN_IMPLEMENTATION.md). Le code, les services et
   * la table DB `clock_in_entries` restent intacts pour réactivation rapide.
   */
  clockIn: false,
} as const
