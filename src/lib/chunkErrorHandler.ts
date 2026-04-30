import { logger } from '@/lib/logger'

const RELOAD_FLAG_KEY = '__unilien_chunk_reload_attempted__'

const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
]

export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false
  const msg = err instanceof Error ? err.message : String(err)
  return CHUNK_ERROR_PATTERNS.some((re) => re.test(msg))
}

/**
 * Reload la page si l'erreur ressemble à un chunk obsolète post-deploy.
 * Utilise sessionStorage pour éviter une boucle de reload infinie si
 * l'erreur persiste (ex: vraie panne, pas un simple deploy).
 *
 * Retourne true si un reload a été déclenché, false sinon.
 */
export function tryReloadOnChunkError(err: unknown): boolean {
  if (!isChunkLoadError(err)) return false

  if (sessionStorage.getItem(RELOAD_FLAG_KEY)) {
    logger.warn('[chunkErrorHandler] Erreur de chunk persistante après reload — abandon')
    return false
  }

  sessionStorage.setItem(RELOAD_FLAG_KEY, '1')
  logger.info('[chunkErrorHandler] Chunk obsolète détecté — reload')
  window.location.reload()
  return true
}

/**
 * À appeler une fois au boot de l'app, après un rendu réussi
 * (pour effacer le flag si tout va bien).
 */
export function clearChunkReloadFlag(): void {
  sessionStorage.removeItem(RELOAD_FLAG_KEY)
}

interface VitePreloadErrorEvent extends Event {
  payload?: unknown
}

export function registerChunkErrorHandlers(): void {
  // Vite émet cet event quand un import() dynamique échoue
  window.addEventListener('vite:preloadError', (event: Event) => {
    const e = event as VitePreloadErrorEvent
    if (tryReloadOnChunkError(e.payload)) {
      event.preventDefault()
    }
  })

  // Filet de sécurité : promesses rejetées non traitées
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (tryReloadOnChunkError(event.reason)) {
      event.preventDefault()
    }
  })
}
