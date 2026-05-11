import { describe, expect, it } from 'vitest'
import { normalizeAmplitude, preprocessAudio, trimSilence } from './audioPreprocessing'

const SAMPLE_RATE = 16000
const WINDOW_SIZE = (SAMPLE_RATE * 20) / 1000 // 320

function makeSine(durationMs: number, freq: number, amplitude: number): Float32Array {
  const n = Math.floor((SAMPLE_RATE * durationMs) / 1000)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE)
  }
  return out
}

function makeSilence(durationMs: number): Float32Array {
  const n = Math.floor((SAMPLE_RATE * durationMs) / 1000)
  return new Float32Array(n)
}

function concat(...parts: Float32Array[]): Float32Array {
  const total = parts.reduce((acc, p) => acc + p.length, 0)
  const out = new Float32Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

function peak(audio: Float32Array): number {
  let max = 0
  for (let i = 0; i < audio.length; i++) {
    const abs = Math.abs(audio[i])
    if (abs > max) max = abs
  }
  return max
}

describe('normalizeAmplitude', () => {
  it('boosts a quiet signal to peak 0.95', () => {
    const quiet = makeSine(100, 440, 0.1)
    const out = normalizeAmplitude(quiet)
    expect(peak(out)).toBeCloseTo(0.95, 2)
    expect(out.length).toBe(quiet.length)
  })

  it('does not amplify silence (peak = 0)', () => {
    const silent = makeSilence(100)
    const out = normalizeAmplitude(silent)
    expect(peak(out)).toBe(0)
  })

  it('returns audio unchanged when already at or above target', () => {
    const loud = makeSine(100, 440, 0.98)
    const out = normalizeAmplitude(loud)
    expect(out).toBe(loud)
  })

  it('handles empty input', () => {
    expect(normalizeAmplitude(new Float32Array(0)).length).toBe(0)
  })
})

describe('trimSilence', () => {
  it('removes leading and trailing silence on long audio (>= 2s)', () => {
    // 800 + 1500 + 800 = 3100ms, dépasse le seuil TRIM_MIN_DURATION_S
    const audio = concat(makeSilence(800), makeSine(1500, 440, 0.5), makeSilence(800))
    const out = trimSilence(audio)
    expect(out.length).toBeLessThan(audio.length)
    // Doit garder au moins la majorité du sinus + marges
    expect(out.length).toBeGreaterThan(1.5 * SAMPLE_RATE)
  })

  it('skips trim on short audio (< 2s) — voice commands are usually brief', () => {
    // Cas réel observé : "tableau de bord" parlé en ~1.5s → on ne touche pas
    const audio = concat(makeSilence(300), makeSine(1200, 440, 0.5), makeSilence(300))
    expect(audio.length).toBeLessThan(2 * SAMPLE_RATE)
    const out = trimSilence(audio)
    expect(out.length).toBe(audio.length)
  })

  it('keeps the original buffer when there is no silence to trim', () => {
    const audio = makeSine(2500, 440, 0.5)
    const out = trimSilence(audio)
    expect(out.length).toBe(audio.length)
  })

  it('preserves attack and release with a 5-window margin (~100ms)', () => {
    // Audio assez long pour passer le seuil TRIM_MIN_DURATION_S
    const audio = concat(makeSilence(400), makeSine(2200, 440, 0.5), makeSilence(400))
    const out = trimSilence(audio)
    // Marges : 5 fenêtres = 1600 samples mini de chaque côté en plus du contenu
    expect(out.length).toBeGreaterThanOrEqual(2.2 * SAMPLE_RATE + WINDOW_SIZE * 5)
  })

  it('aborts trim when more than 50% of the buffer would be cut (likely misfire)', () => {
    // Tout petit transient de 50ms au milieu d'un long silence : si on trim,
    // on perd >50% de l'audio → on suspecte un misfire et on garde tout.
    const audio = concat(makeSilence(1500), makeSine(50, 440, 0.5), makeSilence(1500))
    const out = trimSilence(audio)
    expect(out.length).toBe(audio.length)
  })

  it('returns original on pure silence', () => {
    const silent = makeSilence(2500)
    const out = trimSilence(silent)
    expect(out.length).toBe(silent.length)
  })

  it('handles very short audio (no trim)', () => {
    const tiny = makeSine(10, 440, 0.5)
    expect(trimSilence(tiny).length).toBe(tiny.length)
  })
})

describe('preprocessAudio', () => {
  it('trims silence and normalizes amplitude on long audio', () => {
    // Long audio (≥ 2s) avec silence aux bords → trim ET normalize
    const audio = concat(makeSilence(800), makeSine(1500, 440, 0.08), makeSilence(800))
    const out = preprocessAudio(audio)

    expect(out.length).toBeLessThan(audio.length)
    expect(peak(out)).toBeGreaterThan(0.9)
    expect(peak(out)).toBeLessThanOrEqual(0.95 + 1e-6)
  })

  it('normalizes only (skips trim) on short audio — preserves command phonemes', () => {
    // 1.2s = commande type "tableau de bord", trim désactivé pour ne pas
    // mutiler les attaques consonantiques
    const audio = concat(makeSilence(200), makeSine(1000, 440, 0.08), makeSilence(200))
    const out = preprocessAudio(audio)

    expect(out.length).toBe(audio.length)
    expect(peak(out)).toBeGreaterThan(0.9)
  })

  it('does not break on pure silence (no normalize boost of nothing)', () => {
    const silent = makeSilence(500)
    const out = preprocessAudio(silent)
    expect(peak(out)).toBe(0)
  })
})
