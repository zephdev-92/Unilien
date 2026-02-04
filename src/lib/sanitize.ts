import DOMPurify from 'dompurify'

/**
 * Configuration de DOMPurify pour le texte simple (pas de HTML autorisé)
 * Utilisé pour les contenus utilisateur comme les messages et notes
 */
const TEXT_ONLY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [], // Aucune balise HTML autorisée
  ALLOWED_ATTR: [], // Aucun attribut autorisé
  KEEP_CONTENT: true, // Garder le contenu textuel
}

/**
 * Configuration de DOMPurify pour le texte avec formatage basique
 * Autorise uniquement les balises de formatage simples
 */
const BASIC_FORMAT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
}

/**
 * Sanitize du texte utilisateur - supprime tout HTML
 * Utilisé pour les messages, notes du cahier de liaison, commentaires
 *
 * @param text - Le texte à sanitizer
 * @returns Le texte nettoyé sans aucune balise HTML
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return ''
  return DOMPurify.sanitize(text, TEXT_ONLY_CONFIG)
}

/**
 * Sanitize du texte avec formatage basique autorisé
 * Autorise uniquement b, i, u, strong, em, br
 *
 * @param text - Le texte à sanitizer
 * @returns Le texte nettoyé avec formatage basique
 */
export function sanitizeBasicHtml(text: string | null | undefined): string {
  if (!text) return ''
  return DOMPurify.sanitize(text, BASIC_FORMAT_CONFIG)
}

/**
 * Échappe les caractères spéciaux HTML
 * Alternative légère quand DOMPurify n'est pas nécessaire
 *
 * @param text - Le texte à échapper
 * @returns Le texte avec caractères HTML échappés
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Nettoie et normalise le texte utilisateur
 * - Supprime le HTML
 * - Normalise les espaces multiples
 * - Supprime les espaces en début/fin
 *
 * @param text - Le texte à nettoyer
 * @returns Le texte nettoyé et normalisé
 */
export function cleanUserInput(text: string | null | undefined): string {
  if (!text) return ''
  const sanitized = sanitizeText(text)
  return sanitized
    .replace(/\s+/g, ' ') // Normalise les espaces multiples
    .trim()
}
