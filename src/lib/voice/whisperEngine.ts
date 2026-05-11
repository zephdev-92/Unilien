import { logger } from '@/lib/logger'
import { preprocessAudio } from './audioPreprocessing'

// Note historique — Vocabulary prompt biasing (PR #366) retiré.
//
// L'idée originale : injecter "tableau de bord, planning, équipe..." dans
// le préfixe `<|startofprev|>` pour biaiser Whisper vers nos commandes.
//
// Le problème observé en prod (11/05/2026) : Whisper régurgite le prompt
// entier dans la sortie au lieu de l'utiliser comme contexte, puis génère
// "et" et s'arrête. Latence +50% à cause de num_beams=3 × la regen du prompt.
//
// Cause racine : `transformers.js` ne supporte pas vraiment le pattern
// `prompt_ids` du Whisper Python. L'override manuel via `decoder_input_ids`
// fait que le decoder voit son propre prefix comme tokens à régénérer.
//
// Solution : revenir au décodage classique. Le matcher fuzzy + variantes
// phonétiques dans `voiceCommands.ts` compense largement pour 12 commandes
// courtes. Si on voulait revenir à du biasing, il faudrait passer par du
// keyword spotting / acoustic matching, pas par le prompt prefix.

type Transcriber = (
  audio: Float32Array,
  options: Record<string, unknown>
) => Promise<{ text: string }>

let transcriberPromise: Promise<Transcriber> | null = null
let downloadProgress = 0

// Bump quand on change de modèle pour purger l'ancien cache des users existants.
// Sans ça, l'ancien whisper-base resterait dans le Cache API du browser ad vitam.
const CACHE_VERSION_KEY = 'unilien-whisper-cache-version'
const CACHE_VERSION = 'v2-small'

async function migrateWhisperCacheIfNeeded(): Promise<void> {
  if (typeof window === 'undefined' || typeof caches === 'undefined') return
  if (localStorage.getItem(CACHE_VERSION_KEY) === CACHE_VERSION) return
  try {
    const cacheNames = await caches.keys()
    const transformersCacheName = cacheNames.find((n) => n.startsWith('transformers'))
    if (transformersCacheName) {
      const cache = await caches.open(transformersCacheName)
      const requests = await cache.keys()
      const stale = requests.filter((r) => r.url.includes('/whisper-base/'))
      await Promise.all(stale.map((r) => cache.delete(r)))
      if (stale.length > 0) {
        logger.info(`Whisper cache cleanup: removed ${stale.length} whisper-base entries`)
      }
    }
    localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION)
  } catch (err) {
    logger.warn('Whisper cache migration failed (non-fatal)', err)
  }
}

// whisper-small donne un saut massif de qualité FR vs base (transcription
// nettement plus fiable sur les commandes courtes type "tableau de bord").
// Coût : ~400 Mo cache total (vs 140 Mo en base). Acceptable pour une feature
// desktop optionnelle.
export const WHISPER_MODEL = 'onnx-community/whisper-small'
// fp16 sur le decoder : compromis taille/qualité. fp32 = 615 Mo (trop gros),
// q8/q4 = bug MatMulNBits connu en onnxruntime-web. Encoder reste en q8.
export const WHISPER_DTYPE = { encoder_model: 'q8', decoder_model_merged: 'fp16' } as const

export interface ProgressEvent {
  status: 'progress' | 'ready' | 'download' | 'init'
  progress?: number
}

export type ProgressListener = (e: ProgressEvent) => void

const listeners = new Set<ProgressListener>()
export function onProgress(listener: ProgressListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const emit = (e: ProgressEvent) => listeners.forEach((l) => l(e))

export function getDownloadProgress(): number {
  return downloadProgress
}

export async function getTranscriber(): Promise<Transcriber> {
  if (transcriberPromise) return transcriberPromise

  transcriberPromise = (async () => {
    emit({ status: 'init' })
    await migrateWhisperCacheIfNeeded()
    const { pipeline, env } = await import('@huggingface/transformers')

    // Réutilise les WASM onnxruntime self-hostés (copiés à la racine par
    // vite-plugin-static-copy). Évite la dépendance à cdn.jsdelivr.net.
    env.backends.onnx.wasm.wasmPaths = '/'

    const transcriber = await pipeline('automatic-speech-recognition', WHISPER_MODEL, {
      // Cast volontaire : la signature dtype permet string | record selon le modèle,
      // mais le typage générique du SDK ne le reflète pas pleinement.
      dtype: WHISPER_DTYPE as unknown as 'fp32',
      progress_callback: (data: { status: string; progress?: number; loaded?: number; total?: number }) => {
        if (data.status === 'progress' && typeof data.progress === 'number') {
          downloadProgress = Math.round(data.progress)
          emit({ status: 'progress', progress: downloadProgress })
        } else if (data.status === 'ready') {
          downloadProgress = 100
          emit({ status: 'ready', progress: 100 })
        }
      },
    })
    logger.info('Whisper engine initialized')
    return transcriber as unknown as Transcriber
  })().catch((err) => {
    logger.error('Whisper init failed', err)
    transcriberPromise = null
    throw err
  })

  return transcriberPromise
}

export async function transcribe(audio: Float32Array): Promise<string> {
  const transcriber = await getTranscriber()
  // Trim silences (head/tail) + peak-normalize. Évite les hallucinations sur le
  // padding VAD et compense un mic faible avant que Whisper voie le signal.
  const processed = preprocessAudio(audio)
  logger.info(
    `[Whisper] transcribe start, audio.length=${processed.length} (${(processed.length / 16000).toFixed(2)}s, raw=${audio.length})`,
  )
  const t0 = performance.now()
  try {
    // Décodage classique + anti-hallucination — pas de prompt biasing (cf.
    // note historique en haut de fichier). num_beams=3 reste pour explorer
    // plusieurs hypothèses sur les commandes courtes.
    const options: Record<string, unknown> = {
      language: 'french',
      task: 'transcribe',
      temperature: 0,
      num_beams: 3,
      no_repeat_ngram_size: 3,
      compression_ratio_threshold: 2.4,
    }

    const result = await transcriber(processed, options)
    const text = (result?.text ?? '').trim()
    logger.info(
      `[Whisper] transcribe done in ${Math.round(performance.now() - t0)}ms → "${text}"`,
    )
    return text
  } catch (err) {
    logger.error(`[Whisper] transcribe failed after ${Math.round(performance.now() - t0)}ms`, err)
    throw err
  }
}

export function isWhisperLoaded(): boolean {
  return downloadProgress >= 100
}
