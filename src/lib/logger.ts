/**
 * Logger centralisé avec redaction des données sensibles
 *
 * En développement : affiche dans la console avec données sanitisées
 * En production : supprime les logs (ou envoie à un service externe comme Sentry)
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.error('Erreur création shift:', error)
 *   logger.warn('Permission refusée', { userId, action })
 *   logger.info('Shift créé', { shiftId })
 *   logger.debug('Données brutes:', data)
 */

const IS_DEV = import.meta.env.DEV
const IS_PROD = !IS_DEV

// Patterns de données sensibles à redacter
const REDACTION_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // Emails
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  // Tokens JWT (3 segments base64 séparés par des points)
  { pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, replacement: '[JWT]' },
  // UUIDs (on garde les 8 premiers chars pour le debug)
  { pattern: /([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, replacement: '$1-****-****-****-************' },
  // Numéros de téléphone français
  { pattern: /(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g, replacement: '[PHONE]' },
  // Clés API / tokens longs (32+ chars alphanumériques)
  { pattern: /(?:key|token|secret|password|apikey|api_key)['":\s=]+[a-zA-Z0-9_-]{32,}/gi, replacement: '[REDACTED_KEY]' },
]

// Clés d'objets qui contiennent des données sensibles
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'email',
  'phone',
  'telephone',
  'ssn',
  'credit_card',
  'carte_bancaire',
])

/**
 * Redacte une chaîne de caractères
 */
function redactString(value: string): string {
  let result = value
  for (const { pattern, replacement } of REDACTION_PATTERNS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/**
 * Sanitise récursivement un objet en redactant les données sensibles
 */
function sanitize(value: unknown, depth = 0): unknown {
  // Limite de profondeur pour éviter les boucles infinies
  if (depth > 5) return '[DEEP_OBJECT]'

  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    return redactString(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: IS_DEV ? redactString(value.stack || '') : undefined,
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1))
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = sanitize(val, depth + 1)
      }
    }
    return sanitized
  }

  return String(value)
}

/**
 * Formate les arguments pour le logger
 */
function formatArgs(args: unknown[]): unknown[] {
  return args.map((arg) => sanitize(arg))
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

/**
 * Détermine si un niveau de log est actif
 * En production : seuls error et warn sont actifs
 * En développement : tous les niveaux sont actifs
 */
function isLevelActive(level: LogLevel): boolean {
  if (IS_DEV) return true
  return level === 'error' || level === 'warn'
}

/**
 * Logger centralisé
 */
export const logger = {
  /**
   * Erreurs critiques - toujours loggées
   */
  error(message: string, ...args: unknown[]): void {
    if (!isLevelActive('error')) return
    const sanitizedArgs = formatArgs(args)
    console.error(`[ERROR] ${redactString(message)}`, ...sanitizedArgs)

    // En production, on pourrait envoyer à Sentry/LogRocket
    if (IS_PROD && args[0] instanceof Error) {
      // TODO: Sentry.captureException(args[0])
      void args[0] // Prêt pour intégration Sentry
    }
  },

  /**
   * Avertissements - loggés en dev et prod
   */
  warn(message: string, ...args: unknown[]): void {
    if (!isLevelActive('warn')) return
    const sanitizedArgs = formatArgs(args)
    console.warn(`[WARN] ${redactString(message)}`, ...sanitizedArgs)
  },

  /**
   * Informations - loggées uniquement en dev
   */
  info(message: string, ...args: unknown[]): void {
    if (!isLevelActive('info')) return
    const sanitizedArgs = formatArgs(args)
    console.info(`[INFO] ${redactString(message)}`, ...sanitizedArgs)
  },

  /**
   * Debug - loggées uniquement en dev
   */
  debug(message: string, ...args: unknown[]): void {
    if (!isLevelActive('debug')) return
    const sanitizedArgs = formatArgs(args)
    console.debug(`[DEBUG] ${redactString(message)}`, ...sanitizedArgs)
  },
}

export default logger
