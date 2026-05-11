// Preprocessing audio avant Whisper. But : compenser un micro faible et virer
// le silence ajouté par le padding VAD (preSpeechPadFrames + redemptionFrames)
// qui fait halluciner Whisper sur du quasi-rien.

const SAMPLE_RATE = 16000
const WINDOW_MS = 20
const WINDOW_SIZE = (SAMPLE_RATE * WINDOW_MS) / 1000 // 320 samples
const PEAK_TARGET = 0.95
const SILENCE_RATIO = 10 // seuil dynamique = maxRMS / SILENCE_RATIO

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
 * Garde une marge de 1 fenêtre de chaque côté pour ne pas couper l'attaque
 * d'un phonème ou la fin d'une syllabe.
 */
export function trimSilence(audio: Float32Array): Float32Array {
  if (audio.length <= WINDOW_SIZE * 2) return audio

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

  // Marge d'une fenêtre de chaque côté pour préserver l'attaque/queue
  const startWindow = Math.max(0, firstActive - 1)
  const endWindow = Math.min(windowCount - 1, lastActive + 1)

  const startSample = startWindow * WINDOW_SIZE
  const endSample = (endWindow + 1) * WINDOW_SIZE

  // Si le trim ne gagne rien (< 1 fenêtre de chaque côté), retourne l'original
  if (startSample === 0 && endSample >= audio.length) return audio

  return audio.slice(startSample, endSample)
}

/**
 * Pipeline complet : trim d'abord (pour que le normalize calibre sur le vrai
 * signal vocal et pas sur du silence), puis normalize.
 */
export function preprocessAudio(audio: Float32Array): Float32Array {
  return normalizeAmplitude(trimSilence(audio))
}
