// =============================================================================
// whisperClassifier — reconnaissance de commande par scoring acoustique
// =============================================================================
// Au lieu de « transcrire puis matcher du texte » (qui échoue dès que Whisper
// se trompe de mot, ex : "planning" -> "Plague"), on inverse : pour chaque
// commande connue, on force le décodeur Whisper à « lire » cette commande sur
// l'audio et on récupère sa log-probabilité. La commande la mieux scorée gagne.
//
// La sortie est donc toujours une commande valide : la mauvaise transcription
// devient structurellement impossible. Particulièrement robuste pour les voix
// atypiques (cf. mémoire user-imc-elocution) — on ne demande plus à Whisper de
// produire le texte exact, juste de dire « de quelle commande c'est le plus
// proche acoustiquement ».
//
// Utilisé en SECOURS (cf. useVoiceNavigation) : seulement quand la
// transcription classique + matchCommand a échoué. Tout échec ici est attrapé
// et renvoie [] -> l'appelant retombe sur "commande non reconnue".
// =============================================================================

import { logger } from '@/lib/logger'
import { getTranscriber } from './whisperEngine'
import { preprocessAudio } from './audioPreprocessing'
import type { CommandCandidate, VoiceCommand } from './voiceCommands'

export interface CommandScore {
  phrase: string
  /** Log-probabilité moyenne par token (≤ 0 ; plus proche de 0 = meilleur match). */
  avgLogProb: number
}

// Tokens spéciaux Whisper multilingue — filet de secours si la dérivation via
// le tokenizer échoue. Ids valables pour les modèles whisper-{tiny..large}.
const FALLBACK_TOKENS = {
  prefix: [50258, 50265, 50359, 50363], // <|startoftranscript|><|fr|><|transcribe|><|notimestamps|>
  eot: 50257, // <|endoftext|>
}

// Accès bas niveau au pipeline transformers.js (model/processor/tokenizer ne
// sont pas dans le type Transcriber exposé par whisperEngine).
interface LooseTensor {
  type: string
  data: Float32Array | BigInt64Array | Uint16Array | number[]
  dims: number[]
  to: (type: string) => LooseTensor
}
interface WhisperPipeline {
  model: {
    forward: (inputs: Record<string, unknown>) => Promise<{ logits: LooseTensor }>
    // Exécute une session par nom et renvoie une sortie — ici l'encodeur seul.
    _encode_input: (
      sessionName: string,
      inputs: Record<string, unknown>,
      outputName: string,
    ) => Promise<unknown>
  }
  processor: (audio: Float32Array) => Promise<{ input_features: unknown }>
  tokenizer: {
    encode: (text: string, opts?: { add_special_tokens?: boolean }) => number[]
  }
}

let cachedPrefix: number[] | null = null
let cachedEot: number | null = null

function resolveSpecialTokens(tokenizer: WhisperPipeline['tokenizer']): {
  prefix: number[]
  eot: number
} {
  if (cachedPrefix && cachedEot !== null) return { prefix: cachedPrefix, eot: cachedEot }
  try {
    const prefix = tokenizer.encode(
      '<|startoftranscript|><|fr|><|transcribe|><|notimestamps|>',
      { add_special_tokens: false },
    )
    const eot = tokenizer.encode('<|endoftext|>', { add_special_tokens: false })[0]
    // Sanity check : 4 tokens de prefixe + un eot valide, sinon fallback.
    if (prefix.length === 4 && prefix.every(Number.isInteger) && Number.isInteger(eot)) {
      cachedPrefix = prefix
      cachedEot = eot
      return { prefix, eot }
    }
    logger.warn('[Classifier] dérivation tokens spéciaux inattendue, fallback', { prefix, eot })
  } catch (err) {
    logger.warn('[Classifier] tokenizer.encode des tokens spéciaux a échoué, fallback', err)
  }
  cachedPrefix = FALLBACK_TOKENS.prefix
  cachedEot = FALLBACK_TOKENS.eot
  return { prefix: cachedPrefix, eot: cachedEot }
}

// log-softmax appliqué à une seule cible : logit[target] - logsumexp(row).
function targetLogProb(row: Float32Array, target: number): number {
  let max = -Infinity
  for (let i = 0; i < row.length; i++) if (row[i] > max) max = row[i]
  let sumExp = 0
  for (let i = 0; i < row.length; i++) sumExp += Math.exp(row[i] - max)
  const logSumExp = max + Math.log(sumExp)
  return row[target] - logSumExp
}

/**
 * Score chaque phrase candidate contre l'audio par forced-decoding Whisper.
 * Renvoie les scores triés (meilleur d'abord). En cas d'échec : [].
 */
export async function classifyCommand(
  audio: Float32Array,
  phrases: string[],
): Promise<CommandScore[]> {
  if (phrases.length === 0) return []
  const t0 = performance.now()
  try {
    const pipe = (await getTranscriber()) as unknown as WhisperPipeline
    const { prefix, eot } = resolveSpecialTokens(pipe.tokenizer)
    logger.info(`[Classifier] prefix=[${prefix}] eot=${eot}`)

    const processed = preprocessAudio(audio)
    const { input_features } = await pipe.processor(processed)

    const { Tensor } = await import('@huggingface/transformers')

    // Encodeur exécuté UNE seule fois (c'est la passe coûteuse, ~plusieurs
    // secondes). On réutilise `encoder_outputs` pour chaque candidat : le
    // forward ne fait alors tourner que le décodeur (passe légère).
    const encoderOutputs = await pipe.model._encode_input(
      'model',
      { input_features },
      'last_hidden_state',
    )
    // Diagnostic : confirme que la chaîne audio est saine.
    const featDims = (input_features as { dims?: number[] })?.dims
    const encDims = (encoderOutputs as { dims?: number[] })?.dims
    logger.info(`[Classifier] input_features.dims=[${featDims}] encoder_outputs.dims=[${encDims}]`)

    const scores: CommandScore[] = []
    for (const phrase of phrases) {
      // Whisper produit du texte naturel : espace initial (BPE GPT-2) +
      // majuscule en début de segment. On ne score PAS <|endoftext|> :
      // après une phrase courte le modèle ne l'attend pas, ce qui plombait
      // injustement les commandes courtes ("planning", "aide").
      const display = phrase.charAt(0).toUpperCase() + phrase.slice(1)
      const targets = pipe.tokenizer.encode(' ' + display, { add_special_tokens: false })
      const ids = [...prefix, ...targets]

      const decoderInputIds = new Tensor(
        'int64',
        BigInt64Array.from(ids.map((x) => BigInt(x))),
        [1, ids.length],
      )

      const { logits } = await pipe.model.forward({
        encoder_outputs: encoderOutputs,
        decoder_input_ids: decoderInputIds,
      })

      // Le décodeur tourne en fp16 : les logits sont alors stockés en
      // Uint16Array (demi-flottants). Conversion en float32 indispensable
      // avant tout calcul — sinon on lit des bits bruts comme des nombres.
      const logitsF32 = logits.to('float32')
      const vocab = logitsF32.dims[logitsF32.dims.length - 1]
      const data = logitsF32.data as Float32Array
      // La ligne de logits à la position p prédit le token p+1. On score les
      // `targets` (tokens de la phrase + eot), dont le 1er est à la position
      // `prefix.length` dans la séquence.
      let sum = 0
      for (let j = 0; j < targets.length; j++) {
        const seqPos = prefix.length + j
        const row = data.subarray((seqPos - 1) * vocab, seqPos * vocab) as Float32Array
        sum += targetLogProb(row, targets[j])
      }
      scores.push({ phrase, avgLogProb: sum / targets.length })
    }

    scores.sort((a, b) => b.avgLogProb - a.avgLogProb)
    logger.info(
      `[Classifier] ${phrases.length} commandes scorées en ${Math.round(performance.now() - t0)}ms`,
    )
    logger.info(
      `[Classifier] classement: ${scores
        .map((s) => `${s.phrase}=${s.avgLogProb.toFixed(2)}`)
        .join('  ')}`,
    )
    return scores
  } catch (err) {
    logger.error('[Classifier] classifyCommand a échoué', err)
    return []
  }
}

// --- Décision ----------------------------------------------------------------
//
// Seuils À CALIBRER au micro (le panneau diagnostic logge les scores) :
//  - MIN_AVG_LOGPROB : score minimal du meilleur candidat ; en-dessous, l'audio
//    ne ressemble à aucune commande -> rejet.
//  - MIN_MARGIN : écart minimal entre le 1er et le 2e ; trop proche = ambigu.
const MIN_AVG_LOGPROB = -1.2
const MIN_MARGIN = 0.15

export interface RecognitionResult {
  command: VoiceCommand | null
  /** Scores triés (debug / panneau diagnostic). */
  scores: CommandScore[]
}

/**
 * Applique les seuils de décision à des scores déjà calculés (fonction pure).
 * `scores` doit être trié décroissant. Renvoie `command: null` si rejet.
 */
export function pickWinner(
  scores: CommandScore[],
  candidates: CommandCandidate[],
): RecognitionResult {
  if (scores.length === 0) return { command: null, scores }

  const [best, second] = scores
  if (best.avgLogProb < MIN_AVG_LOGPROB) {
    logger.info(`[Classifier] rejet : meilleur score ${best.avgLogProb.toFixed(3)} < ${MIN_AVG_LOGPROB}`)
    return { command: null, scores }
  }
  if (second && best.avgLogProb - second.avgLogProb < MIN_MARGIN) {
    logger.info(
      `[Classifier] rejet : marge ${(best.avgLogProb - second.avgLogProb).toFixed(3)} < ${MIN_MARGIN} ` +
        `("${best.phrase}" vs "${second.phrase}")`,
    )
    return { command: null, scores }
  }

  const match = candidates.find((c) => c.phrase === best.phrase)
  return { command: match?.command ?? null, scores }
}

/**
 * Reconnaît une commande à partir de l'audio par scoring acoustique.
 * Renvoie `command: null` si rejet (sous seuil, marge insuffisante, ou échec).
 */
export async function recognizeCommand(
  audio: Float32Array,
  candidates: CommandCandidate[],
): Promise<RecognitionResult> {
  const scores = await classifyCommand(audio, candidates.map((c) => c.phrase))
  return pickWinner(scores, candidates)
}
