/**
 * Rate limiter en mémoire par clé (userId).
 * Chaque instance gère sa propre Map — créer une instance par Edge Function.
 * Reset automatique au redéploiement de la fonction.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

export function createRateLimiter(maxRequests: number, windowMs: number = 60_000) {
  const map = new Map<string, RateLimitEntry>()

  return {
    /**
     * Vérifie si la clé est rate-limitée.
     * Incrémente le compteur à chaque appel.
     * @returns true si la limite est dépassée
     */
    isLimited(key: string): boolean {
      const now = Date.now()
      const entry = map.get(key)

      if (!entry || now > entry.resetAt) {
        map.set(key, { count: 1, resetAt: now + windowMs })
        return false
      }

      entry.count++
      return entry.count > maxRequests
    },

    /** Réponse 429 standard avec headers CORS */
    tooManyRequestsResponse(headers: Record<string, string>): Response {
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers }
      )
    },
  }
}
