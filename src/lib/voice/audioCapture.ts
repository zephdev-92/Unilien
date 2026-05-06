import { logger } from '@/lib/logger'

export interface CaptureResult {
  audio: Float32Array
  durationMs: number
}

export interface CaptureOptions {
  /** Délai max sans parole détectée avant abandon (default 12s). */
  maxDurationMs?: number
  /** Appelé quand l'utilisateur commence vraiment à parler (parole détectée). */
  onSpeechStart?: () => void
  /** Permet d'annuler la capture en cours. */
  signal?: AbortSignal
}

/**
 * Capture audio de l'utilisateur via Silero VAD (@ricky0123/vad-web).
 * Le VAD détecte automatiquement le début et la fin de la parole — on n'a
 * pas besoin d'un timeout fixe : ça coupe dès que l'utilisateur se tait.
 *
 * Retourne un Float32Array à 16 kHz mono prêt à passer à Whisper.
 */
export async function captureAudio(options: CaptureOptions = {}): Promise<CaptureResult> {
  const { maxDurationMs = 12000, onSpeechStart, signal } = options
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

    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId)
      cleanup()
      reject(new DOMException('Capture aborted', 'AbortError'))
    }, { once: true })

    MicVAD.new({
      // Tous les assets self-hostés sous /vad/ (vite-plugin-static-copy).
      // baseAssetPath  : worklet + modèle Silero (.onnx)
      // onnxWASMBasePath : runtimes WASM/MJS d'onnxruntime
      baseAssetPath: '/vad/',
      onnxWASMBasePath: '/vad/',
      model: 'v5',

      // Sensibilité et timing : valeurs par défaut adaptées à la nav courte
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.35,
      redemptionFrames: 8,
      minSpeechFrames: 3,

      onSpeechStart: () => {
        onSpeechStart?.()
      },
      onSpeechEnd: (audio: Float32Array) => {
        clearTimeout(timeoutId)
        cleanup()
        resolve({ audio, durationMs: performance.now() - startedAt })
      },
      onVADMisfire: () => {
        // Brève détection sans parole confirmée — on ignore et on continue d'écouter
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
