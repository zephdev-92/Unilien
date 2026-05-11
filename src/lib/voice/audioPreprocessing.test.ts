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
  it('removes leading and trailing silence', () => {
    const audio = concat(makeSilence(200), makeSine(500, 440, 0.5), makeSilence(200))
    const out = trimSilence(audio)
    expect(out.length).toBeLessThan(audio.length)
    expect(out.length).toBeGreaterThan(0.4 * SAMPLE_RATE) // au moins la majorité du sinus
  })

  it('keeps the original buffer when there is no silence to trim', () => {
    const audio = makeSine(500, 440, 0.5)
    const out = trimSilence(audio)
    expect(out.length).toBe(audio.length)
  })

  it('preserves attack and release by leaving one window margin', () => {
    const audio = concat(makeSilence(100), makeSine(300, 440, 0.5), makeSilence(100))
    const out = trimSilence(audio)
    // Doit garder au moins 1 fenêtre de marge de chaque côté = 40ms ~ 640 samples
    expect(out.length).toBeGreaterThanOrEqual(0.3 * SAMPLE_RATE + WINDOW_SIZE)
  })

  it('returns original on pure silence', () => {
    const silent = makeSilence(500)
    const out = trimSilence(silent)
    expect(out.length).toBe(silent.length)
  })

  it('handles very short audio (no trim)', () => {
    const tiny = makeSine(10, 440, 0.5) // 160 samples < 2 fenêtres
    expect(trimSilence(tiny).length).toBe(tiny.length)
  })
})

describe('preprocessAudio', () => {
  it('trims silence and normalizes amplitude in one shot', () => {
    const audio = concat(makeSilence(200), makeSine(500, 440, 0.08), makeSilence(200))
    const out = preprocessAudio(audio)

    // Trimmed
    expect(out.length).toBeLessThan(audio.length)
    // Normalized vers ~0.95
    expect(peak(out)).toBeGreaterThan(0.9)
    expect(peak(out)).toBeLessThanOrEqual(0.95 + 1e-6)
  })

  it('does not break on pure silence (no normalize boost of nothing)', () => {
    const silent = makeSilence(500)
    const out = preprocessAudio(silent)
    expect(peak(out)).toBe(0)
  })
})
