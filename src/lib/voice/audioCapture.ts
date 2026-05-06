import { logger } from '@/lib/logger'

export interface CaptureResult {
  audio: Float32Array
  durationMs: number
}

export interface CaptureOptions {
  /** Délai max sans parole détectée avant abandon (default 12s). */
  maxDurationMs?: number
  /** Appelé quand l'utilisateur commence vraiment à parler. */
  onSpeechStart?: () => void
  /** Permet d'annuler la capture en cours. */
  signal?: AbortSignal
}

/**
 * Capture audio via Silero VAD (@ricky0123/vad-web). Le VAD coupe
 * automatiquement à la fin de la parole — pas de timeout fixe.
 * Retourne un Float32Array à 16 kHz mono prêt pour Whisper.
 *
 * Config conforme à la doc officielle docs.vad.ricky0123.com :
 * assets servis à la racine via vite-plugin-static-copy.
 */
export async function captureAudio(options: CaptureOptions = {}): Promise<CaptureResult> {
  const { maxDurationMs = 20000, onSpeechStart, signal } = options
  const { MicVAD } = await import('@ricky0123/vad-web')

  return new Promise<CaptureResult>((resolve, reject) => {
    let vad: Awaited<ReturnType<typeof MicVAD.new>> | null = null
    const startedAt = performance.now()

    const cleanup = () => {
      vad?.destroy()
      vad = null
    }

    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('Aucune parole détectée. Cliquez à nouveau et parlez.'))
    }, maxDurationMs)

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeoutId)
        cleanup()
        reject(new DOMException('Capture aborted', 'AbortError'))
      },
      { once: true },
    )

    MicVAD.new({
      baseAssetPath: '/',
      onnxWASMBasePath: '/',
      model: 'v5',
      // Seuils permissifs pour les commandes courtes ("aide", "planning") :
      // - threshold bas (0.35) → détecte voix faible / bruyante
      // - minSpeechFrames=1 → autorise mots monosyllabiques
      // - redemptionFrames=12 → laisse 12 frames (~384ms) de marge avant de
      //   couper, évite de couper en plein mot.
      positiveSpeechThreshold: 0.35,
      negativeSpeechThreshold: 0.25,
      redemptionFrames: 12,
      minSpeechFrames: 1,
      onSpeechStart: () => {
        onSpeechStart?.()
      },
      onSpeechEnd: (audio: Float32Array) => {
        clearTimeout(timeoutId)
        cleanup()
        resolve({ audio, durationMs: performance.now() - startedAt })
      },
    })
      .then((instance) => {
        if (signal?.aborted) {
          instance.destroy()
          clearTimeout(timeoutId)
          reject(new DOMException('Capture aborted', 'AbortError'))
          return
        }
        vad = instance
        vad.start()
      })
      .catch((err) => {
        clearTimeout(timeoutId)
        logger.error('MicVAD init failed', err)
        reject(err)
      })
  })
}

export async function ensureMicPermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return true
  } catch {
    return false
  }
}
