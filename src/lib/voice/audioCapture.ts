import { logger } from '@/lib/logger'

export interface CaptureResult {
  audio: Float32Array
  durationMs: number
}

export interface CaptureOptions {
  /** Délai max sans parole détectée avant abandon (default 20s). */
  maxDurationMs?: number
  /** Appelé quand le VAD est réellement prêt à écouter (modèle ONNX chargé). */
  onReady?: () => void
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
  const { maxDurationMs = 20000, onReady, onSpeechStart, signal } = options
  const { MicVAD } = await import('@ricky0123/vad-web')

  return new Promise<CaptureResult>((resolve, reject) => {
    let vad: Awaited<ReturnType<typeof MicVAD.new>> | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const startedAt = performance.now()

    const cleanup = () => {
      vad?.destroy()
      vad = null
    }

    signal?.addEventListener(
      'abort',
      () => {
        if (timeoutId) clearTimeout(timeoutId)
        cleanup()
        reject(new DOMException('Capture aborted', 'AbortError'))
      },
      { once: true },
    )

    MicVAD.new({
      baseAssetPath: '/',
      onnxWASMBasePath: '/',
      model: 'v5',
      // noiseSuppression et echoCancellation OFF : ils tuent le signal vocal
      // continu et ne laissent que des transitoires (cf. testing 06/05).
      // autoGainControl ON : compense un niveau micro faible — sans ça les
      // utilisateurs avec un mic peu sensible plafonnent à isSpeech ~0.5
      // et le VAD misfire en boucle.
      getStream: async () => {
        return navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          },
        })
      },
      // Seuils très permissifs : on préfère envoyer du bruit à Whisper plutôt
      // que rater une commande. Whisper sait dire "no speech" via le compression
      // ratio threshold côté décodage si vraiment c'est du silence.
      positiveSpeechThreshold: 0.25,
      negativeSpeechThreshold: 0.15,
      // 48 frames ≈ 1.5s : tolère les pauses entre syllabes ("tableau ... de bord")
      redemptionFrames: 48,
      // 1 frame suffit : tout pic positif déclenche un vrai speech, pas de misfire
      minSpeechFrames: 1,
      // Padding pré-speech : Whisper hallucine sur audio brut sans contexte
      preSpeechPadFrames: 10,
      onSpeechStart: () => {
        onSpeechStart?.()
      },
      onSpeechEnd: (audio: Float32Array) => {
        if (timeoutId) clearTimeout(timeoutId)
        cleanup()
        resolve({ audio, durationMs: performance.now() - startedAt })
      },
      onVADMisfire: () => {
        logger.warn('VAD misfire (speech too short, ignored)')
      },
    })
      .then((instance) => {
        if (signal?.aborted) {
          instance.destroy()
          reject(new DOMException('Capture aborted', 'AbortError'))
          return
        }
        vad = instance
        vad.start()
        onReady?.()
        // Démarre le timeout APRÈS que le VAD soit prêt — sinon on consomme
        // une partie du délai pendant le chargement du modèle ONNX.
        timeoutId = setTimeout(() => {
          cleanup()
          reject(new Error('Aucune parole détectée. Cliquez à nouveau et parlez.'))
        }, maxDurationMs)
      })
      .catch((err) => {
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
