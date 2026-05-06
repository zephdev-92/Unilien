import { logger } from '@/lib/logger'

const SAMPLE_RATE = 16000
const MAX_DURATION_MS = 5000

export interface CaptureResult {
  audio: Float32Array
  durationMs: number
}

export async function captureAudio(maxDurationMs = MAX_DURATION_MS): Promise<CaptureResult> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  })

  return new Promise<CaptureResult>((resolve, reject) => {
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    const startedAt = performance.now()

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    recorder.onerror = (e) => {
      stream.getTracks().forEach((t) => t.stop())
      reject(e)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      try {
        const blob = new Blob(chunks, { type: chunks[0]?.type ?? 'audio/webm' })
        const buffer = await blob.arrayBuffer()
        const audio = await decodeToMono16k(buffer)
        resolve({ audio, durationMs: performance.now() - startedAt })
      } catch (err) {
        reject(err)
      }
    }

    recorder.start()
    setTimeout(() => recorder.state === 'recording' && recorder.stop(), maxDurationMs)
  })
}

async function decodeToMono16k(buffer: ArrayBuffer): Promise<Float32Array> {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  try {
    const decoded = await ctx.decodeAudioData(buffer.slice(0))
    if (decoded.sampleRate === SAMPLE_RATE && decoded.numberOfChannels === 1) {
      return decoded.getChannelData(0).slice()
    }
    return resample(decoded, SAMPLE_RATE)
  } catch (err) {
    logger.warn('decodeAudioData failed', err)
    throw err
  } finally {
    await ctx.close().catch(() => {})
  }
}

async function resample(buffer: AudioBuffer, target: number): Promise<Float32Array> {
  const offline = new OfflineAudioContext(1, Math.ceil((buffer.duration * target)), target)
  const src = offline.createBufferSource()
  src.buffer = buffer
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0).slice()
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
