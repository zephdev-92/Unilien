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
// Normalisation par le prior : la log-prob brute d'une phrase porte un biais
// de base (longueur de tokens, fréquence dans le modèle de langue) qui écrase
// le signal audio — sans correction, la même commande gagne quel que soit ce
// qui est dit. On corrige en soustrayant le score "prior" : la même phrase
// décodée avec un encodeur à zéro (aucune info audio). Score final =
// logP(phrase | audio) − logP(phrase | prior), soit de combien l'audio
// augmente la phrase, et non sa probabilité absolue. Le prior ne dépend pas
// de l'audio → calculé une fois par phrase puis mis en cache.
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
  /**
   * Score normalisé : log-prob moyenne par token avec audio − sans audio
   * (prior). Plus c'est haut, plus l'audio « pousse » cette phrase. Un score
   * proche de 0 (ou négatif) = l'audio ne ressemble pas à cette commande.
   */
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

// Constructeur Tensor de transformers.js, typé a minima (l'export réel n'a pas
// de signature publique stable pour ce qu'on en fait).
type TensorCtor = new (type: string, data: unknown, dims: number[]) => LooseTensor

// Cache des log-prob "prior" (sans audio) par phrase canonique. Le prior ne
// dépend que du modèle et de la phrase, jamais de l'audio → calculé une fois,
// réutilisé pour tous les essais suivants de la session.
const priorCache = new Map<string, number>()

/** Réinitialise le cache des priors (utile en test). */
export function resetPriorCache(): void {
  priorCache.clear()
}

// Whisper produit du texte naturel : espace initial (BPE GPT-2) + majuscule en
// début de segment. On NE score PAS <|endoftext|> : après une phrase courte le
// modèle ne l'attend pas, ce qui plombait injustement les commandes courtes.
function tokenizePhrase(pipe: WhisperPipeline, phrase: string): number[] {
  const display = phrase.charAt(0).toUpperCase() + phrase.slice(1)
  return pipe.tokenizer.encode(' ' + display, { add_special_tokens: false })
}

/**
 * Force-décode `targets` après `prefix` en attendant `encoder` en
 * cross-attention, et renvoie la somme des log-probabilités des tokens cibles.
 */
async function sumTargetLogProbs(
  pipe: WhisperPipeline,
  Tensor: TensorCtor,
  encoder: unknown,
  prefix: number[],
  targets: number[],
): Promise<number> {
  const ids = [...prefix, ...targets]
  const decoderInputIds = new Tensor(
    'int64',
    BigInt64Array.from(ids.map((x) => BigInt(x))),
    [1, ids.length],
  )

  const { logits } = await pipe.model.forward({
    encoder_outputs: encoder,
    decoder_input_ids: decoderInputIds,
  })

  // Le décodeur tourne en fp16 : les logits sont stockés en Uint16Array
  // (demi-flottants). Conversion en float32 indispensable avant tout calcul —
  // sinon on lit des bits bruts comme des nombres.
  const logitsF32 = logits.to('float32')
  const vocab = logitsF32.dims[logitsF32.dims.length - 1]
  const data = logitsF32.data as Float32Array
  // La ligne de logits à la position p prédit le token p+1. Le 1er target est
  // à la position `prefix.length` dans la séquence.
  let sum = 0
  for (let j = 0; j < targets.length; j++) {
    const seqPos = prefix.length + j
    const row = data.subarray((seqPos - 1) * vocab, seqPos * vocab) as Float32Array
    sum += targetLogProb(row, targets[j])
  }
  return sum
}

/** Tenseur d'encodeur entièrement à zéro, même forme et dtype que la sortie réelle. */
function makeZeroEncoder(Tensor: TensorCtor, encoderOutputs: LooseTensor): LooseTensor {
  const src = encoderOutputs.data as Float32Array | Uint16Array
  const Ctor = src.constructor as Float32ArrayConstructor | Uint16ArrayConstructor
  return new Tensor(encoderOutputs.type, new Ctor(src.length), encoderOutputs.dims)
}

/**
 * Score chaque phrase candidate contre l'audio par forced-decoding Whisper,
 * normalisé par le prior (cf. en-tête du fichier). Renvoie les scores triés
 * (meilleur d'abord). En cas d'échec : [].
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
    const TensorCtor = Tensor as unknown as TensorCtor

    // Encodeur exécuté UNE seule fois (c'est la passe coûteuse, ~plusieurs
    // secondes). On réutilise `encoder_outputs` pour chaque candidat : le
    // forward ne fait alors tourner que le décodeur (passe légère).
    const encoderOutputs = (await pipe.model._encode_input(
      'model',
      { input_features },
      'last_hidden_state',
    )) as LooseTensor
    // Diagnostic : confirme que la chaîne audio est saine.
    const featDims = (input_features as { dims?: number[] })?.dims
    logger.info(
      `[Classifier] input_features.dims=[${featDims}] encoder_outputs.dims=[${encoderOutputs.dims}]`,
    )

    // Encodeur neutre (zéros) : le décodeur n'a alors aucune info audio et
    // retombe sur son modèle de langue → sert à mesurer le prior de chaque phrase.
    const zeroEncoder = makeZeroEncoder(TensorCtor, encoderOutputs)

    const scores: CommandScore[] = []
    for (const phrase of phrases) {
      const targets = tokenizePhrase(pipe, phrase)
      if (targets.length === 0) continue

      const audioAvg =
        (await sumTargetLogProbs(pipe, TensorCtor, encoderOutputs, prefix, targets)) /
        targets.length

      // Prior indépendant de l'audio → calculé une fois puis mis en cache.
      let priorAvg = priorCache.get(phrase)
      if (priorAvg === undefined) {
        priorAvg =
          (await sumTargetLogProbs(pipe, TensorCtor, zeroEncoder, prefix, targets)) /
          targets.length
        priorCache.set(phrase, priorAvg)
      }

      // Score normalisé : de combien l'audio augmente la log-prob de la phrase
      // par rapport au pur prior. Annule le biais de base propre à chaque phrase.
      scores.push({ phrase, avgLogProb: audioAvg - priorAvg })
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
// Les scores sont normalisés (audio − prior) : un bon match est franchement
// positif, un non-match tourne autour de 0. Seuils À CALIBRER au micro (le
// panneau diagnostic affiche le classement) :
//  - MIN_DELTA : score normalisé minimal du meilleur candidat ; en-dessous,
//    l'audio ne « pousse » aucune commande -> rejet.
//  - MIN_MARGIN : écart minimal entre le 1er et le 2e ; trop proche = ambigu.
const MIN_DELTA = 0.2
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
  if (best.avgLogProb < MIN_DELTA) {
    logger.info(`[Classifier] rejet : meilleur score ${best.avgLogProb.toFixed(3)} < ${MIN_DELTA}`)
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
