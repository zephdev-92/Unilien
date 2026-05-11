import { logger } from '@/lib/logger'
import { preprocessAudio } from './audioPreprocessing'

// Le vocabulaire à biaiser dans Whisper. Whisper interprète ces mots comme du
// "contexte" précédent (via le token <|startofprev|>) et augmente sensiblement
// la probabilité de les prédire. C'est l'équivalent du `initial_prompt`
// d'OpenAI Whisper pour les commandes courtes à vocabulaire fixe.
const VOCABULARY_PROMPT =
  'tableau de bord, planning, équipe, messagerie, cahier de liaison, conformité, documents, analytique, paramètres, profil, aide, contact'

type WhisperTokenizer = {
  encode(text: string, options?: { add_special_tokens?: boolean }): number[]
  convert_tokens_to_ids<T extends string | string[]>(tokens: T): T extends string ? number : number[]
}

type Transcriber = ((
  audio: Float32Array,
  options: Record<string, unknown>
) => Promise<{ text: string }>) & {
  tokenizer: WhisperTokenizer
}

let transcriberPromise: Promise<Transcriber> | null = null
let cachedDecoderInputIds: number[] | null = null
let downloadProgress = 0

/**
 * Whisper décode le préfixe `<|startofprev|>...prompt...` dans le texte de
 * sortie au lieu de le strip (contrairement au comportement Python d'OpenAI
 * Whisper). On retire manuellement le prompt du début de la transcription.
 *
 * Compare en mode normalisé (lowercase + sans accents + sans ponctuation/espaces)
 * pour résister aux libertés que Whisper peut prendre sur le prompt
 * (capitalisation, virgules, etc.).
 */
function stripVocabularyPrefix(text: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[\s,.;:!?'"`-]/g, '')
  const normPrompt = normalize(VOCABULARY_PROMPT)
  const normText = normalize(text)
  if (!normText.startsWith(normPrompt)) return text

  // Avance dans le texte original jusqu'à avoir consommé l'équivalent normalisé
  // du prompt — c'est plus fiable que de slicer par longueur car Whisper peut
  // ajouter/enlever espaces et ponctuation.
  let i = 0
  let consumed = 0
  while (i < text.length && consumed < normPrompt.length) {
    const c = normalize(text[i])
    consumed += c.length
    i++
  }
  return text.slice(i).trim()
}

/**
 * Construit le `decoder_input_ids` pour Whisper avec un préfixe de vocabulaire
 * cible. Format multilingual :
 *   [<|startofprev|>, ...promptTokens, <|startoftranscript|>, <|fr|>,
 *    <|transcribe|>, <|notimestamps|>]
 *
 * Mémoïsé : le prompt ne change pas pendant la session.
 */
function buildDecoderInputIds(transcriber: Transcriber): number[] | null {
  if (cachedDecoderInputIds) return cachedDecoderInputIds
  try {
    const tok = transcriber.tokenizer
    const startOfPrev = tok.convert_tokens_to_ids('<|startofprev|>')
    const startOfTranscript = tok.convert_tokens_to_ids('<|startoftranscript|>')
    const lang = tok.convert_tokens_to_ids('<|fr|>')
    const transcribeTok = tok.convert_tokens_to_ids('<|transcribe|>')
    const noTimestamps = tok.convert_tokens_to_ids('<|notimestamps|>')

    if (
      typeof startOfPrev !== 'number' ||
      typeof startOfTranscript !== 'number' ||
      typeof lang !== 'number' ||
      typeof transcribeTok !== 'number' ||
      typeof noTimestamps !== 'number'
    ) {
      logger.warn('[Whisper] special tokens missing, skipping vocabulary prompt')
      return null
    }

    // Espace en tête : convention Whisper (le tokenizer BPE génère un meilleur
    // segmentage avec un espace prefix sur du texte non-initial).
    const promptIds = tok.encode(' ' + VOCABULARY_PROMPT, { add_special_tokens: false })

    cachedDecoderInputIds = [
      startOfPrev,
      ...promptIds,
      startOfTranscript,
      lang,
      transcribeTok,
      noTimestamps,
    ]
    logger.info(
      `[Whisper] decoder prefix built: ${cachedDecoderInputIds.length} tokens (${promptIds.length} for vocabulary)`,
    )
    return cachedDecoderInputIds
  } catch (err) {
    logger.warn('[Whisper] could not build decoder prefix, falling back to default', err)
    return null
  }
}

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
    const decoder_input_ids = buildDecoderInputIds(transcriber)
    // Décodage déterministe (temperature 0) — base commune.
    // num_beams=3 : beam search au lieu du greedy decoding. Compatible avec
    // decoder_input_ids (pas de conflit comme no_repeat_ngram_size). Latence
    // +50% environ, mais qualité notablement meilleure sur audio court / commandes.
    const options: Record<string, unknown> = {
      language: 'french',
      task: 'transcribe',
      temperature: 0,
      num_beams: 3,
    }
    if (decoder_input_ids) {
      // Avec prompt : on biaise déjà vers notre vocabulaire, donc l'anti-
      // hallucination devient contre-productive (no_repeat_ngram_size=3 bloque
      // les commandes du prompt comme "tableau de bord" puisque leur 3-gram
      // existe déjà dans le préfixe → Whisper s'arrête au 1er mot).
      options.decoder_input_ids = decoder_input_ids
    } else {
      // Sans prompt : anti-hallucination classique sur commandes courtes.
      options.no_repeat_ngram_size = 3
      options.compression_ratio_threshold = 2.4
    }

    const result = await transcriber(processed, options)
    const rawText = (result?.text ?? '').trim()
    const text = decoder_input_ids ? stripVocabularyPrefix(rawText) : rawText
    logger.info(
      `[Whisper] transcribe done in ${Math.round(performance.now() - t0)}ms → "${text}"${rawText !== text ? ` (raw: "${rawText.slice(0, 60)}...")` : ''}`,
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
