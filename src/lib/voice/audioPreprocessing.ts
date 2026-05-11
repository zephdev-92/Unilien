// Preprocessing audio avant Whisper. But : compenser un micro faible et virer
// le silence ajouté par le padding VAD (preSpeechPadFrames + redemptionFrames)
// qui fait halluciner Whisper sur du quasi-rien.
//
// HISTORIQUE — la v1 était trop agressive (cf. logs prod 11/05/2026) :
// marge 1 fenêtre + seuil maxRMS/10 → coupait 75% d'un audio "tableau de bord"
// → transcription = "et" + latence Whisper qui montait à 12s sur audio mutilé.
// Trois garde-fous depuis :
//  1. Marge 5 fenêtres (100ms) au lieu d'1 pour préserver attaque/queue
//  2. Seuil plus conservateur (maxRMS/20) — moins de chances de misfire sur transient
//  3. Skip total si audio court (< 2s) — les commandes brèves ne profitent pas du trim

const SAMPLE_RATE = 16000
const WINDOW_MS = 20
const WINDOW_SIZE = (SAMPLE_RATE * WINDOW_MS) / 1000 // 320 samples
const PEAK_TARGET = 0.95
const SILENCE_RATIO = 20 // seuil dynamique = maxRMS / SILENCE_RATIO
const TRIM_MARGIN_WINDOWS = 5 // 5 × 20ms = 100ms de marge de chaque côté
const TRIM_MIN_DURATION_S = 2 // ne pas trim sous 2s — les commandes courtes y perdent
const TRIM_MAX_RATIO_CUT = 0.5 // si on coupe plus de 50% → suspect, on garde l'original

/**
 * Normalise l'amplitude vers `PEAK_TARGET` (anti-clip headroom). No-op si
 * l'audio est déjà silencieux (évite de booster un signal nul à l'infini).
 */
export function normalizeAmplitude(audio: Float32Array): Float32Array {
  if (audio.length === 0) return audio

  let peak = 0
  for (let i = 0; i < audio.length; i++) {
    const abs = Math.abs(audio[i])
    if (abs > peak) peak = abs
  }
  if (peak === 0 || peak >= PEAK_TARGET) return audio

  const gain = PEAK_TARGET / peak
  const out = new Float32Array(audio.length)
  for (let i = 0; i < audio.length; i++) out[i] = audio[i] * gain
  return out
}

function rms(audio: Float32Array, start: number, end: number): number {
  let sum = 0
  for (let i = start; i < end; i++) sum += audio[i] * audio[i]
  return Math.sqrt(sum / (end - start))
}

/**
 * Trim le silence en tête et queue du buffer (laisse l'intérieur intact).
 * Approche énergétique par fenêtre de 20ms, seuil dynamique relatif au pic.
 *
 * Trois garde-fous pour ne pas dégrader la transcription :
 *  - Marge `TRIM_MARGIN_WINDOWS` × 20ms de chaque côté (préserve attaque/queue)
 *  - Skip si audio < `TRIM_MIN_DURATION_S` (commandes courtes : pas de gain réel)
 *  - Garde l'original si on coupe plus de `TRIM_MAX_RATIO_CUT` (seuil misfire)
 */
export function trimSilence(audio: Float32Array): Float32Array {
  if (audio.length <= WINDOW_SIZE * 2) return audio
  if (audio.length < SAMPLE_RATE * TRIM_MIN_DURATION_S) return audio

  const windowCount = Math.floor(audio.length / WINDOW_SIZE)
  const rmsValues = new Float32Array(windowCount)
  let maxRms = 0
  for (let w = 0; w < windowCount; w++) {
    const r = rms(audio, w * WINDOW_SIZE, (w + 1) * WINDOW_SIZE)
    rmsValues[w] = r
    if (r > maxRms) maxRms = r
  }

  if (maxRms === 0) return audio
  const threshold = maxRms / SILENCE_RATIO

  let firstActive = 0
  while (firstActive < windowCount && rmsValues[firstActive] < threshold) firstActive++

  let lastActive = windowCount - 1
  while (lastActive > firstActive && rmsValues[lastActive] < threshold) lastActive--

  const startWindow = Math.max(0, firstActive - TRIM_MARGIN_WINDOWS)
  const endWindow = Math.min(windowCount - 1, lastActive + TRIM_MARGIN_WINDOWS)

  const startSample = startWindow * WINDOW_SIZE
  const endSample = (endWindow + 1) * WINDOW_SIZE

  // Si le trim ne gagne rien, retourne l'original
  if (startSample === 0 && endSample >= audio.length) return audio

  // Garde-fou anti-misfire : si on supprime plus de la moitié du buffer, le
  // seuil énergétique a probablement calé sur un transient (claquement, pop)
  // et on est en train de tuer de la vraie parole. On garde l'original.
  const trimmedLength = endSample - startSample
  if (trimmedLength / audio.length < 1 - TRIM_MAX_RATIO_CUT) return audio

  return audio.slice(startSample, endSample)
}

/**
 * Pipeline complet : trim d'abord (pour que le normalize calibre sur le vrai
 * signal vocal et pas sur du silence), puis normalize.
 */
export function preprocessAudio(audio: Float32Array): Float32Array {
  return normalizeAmplitude(trimSilence(audio))
}
