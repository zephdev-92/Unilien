import { logger } from '@/lib/logger'

type Transcriber = (
  audio: Float32Array,
  options: { language: string; task: string }
) => Promise<{ text: string }>

let transcriberPromise: Promise<Transcriber> | null = null
let downloadProgress = 0

// whisper-base offre une nettement meilleure qualité FR que tiny (~140 Mo total
// avec notre dtype mix vs ~80 Mo). Le saut tiny→base est le plus rentable du
// benchmark Whisper sur le français.
export const WHISPER_MODEL = 'onnx-community/whisper-base'
// fp32 sur le decoder évite le bug MatMulNBits d'onnxruntime-web sur les
// variantes quantisées (q4/q8). Encoder en q8 reste sûr.
export const WHISPER_DTYPE = { encoder_model: 'q8', decoder_model_merged: 'fp32' } as const

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
    const { pipeline } = await import('@huggingface/transformers')

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
  const result = await transcriber(audio, { language: 'french', task: 'transcribe' })
  return (result?.text ?? '').trim()
}

export function isWhisperLoaded(): boolean {
  return downloadProgress >= 100
}
