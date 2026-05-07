import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccessibilityStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { matchCommand, type VoiceCommand } from '@/lib/voice/voiceCommands'
import { logger } from '@/lib/logger'

export type VoiceEngine = 'native' | 'whisper' | 'unsupported'
export type VoiceStatus = 'idle' | 'loading-engine' | 'listening' | 'transcribing' | 'error'

export interface UseVoiceNavigationReturn {
  enabled: boolean
  status: VoiceStatus
  engine: VoiceEngine
  transcript: string
  matched: VoiceCommand | null
  error: string | null
  modelProgress: number
  speechDetected: boolean
  start: () => Promise<void>
  stop: () => void
  toggle: () => Promise<void>
}

function detectEngine(): VoiceEngine {
  if (typeof window === 'undefined') return 'unsupported'
  if (window.SpeechRecognition || window.webkitSpeechRecognition) return 'native'
  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) return 'whisper'
  return 'unsupported'
}

export function useVoiceNavigation(): UseVoiceNavigationReturn {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const enabled = useAccessibilityStore((s) => s.settings.voiceControlEnabled)

  const [engine, setEngine] = useState<VoiceEngine>(() => detectEngine())
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [matched, setMatched] = useState<VoiceCommand | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modelProgress, setModelProgress] = useState(0)
  const [speechDetected, setSpeechDetected] = useState(false)

  const nativeRef = useRef<SpeechRecognition | null>(null)
  const abortRef = useRef(false)
  const startWhisperRef = useRef<() => Promise<void>>(async () => {})

  const handleResult = useCallback(
    (heard: string) => {
      setTranscript(heard)
      const cmd = matchCommand(heard, profile?.role ?? null)
      setMatched(cmd)
      if (cmd) {
        navigate(cmd.path)
      } else if (heard) {
        setError(`Commande non reconnue : "${heard}"`)
      }
    },
    [navigate, profile?.role],
  )

  // Native engine setup
  useEffect(() => {
    if (engine !== 'native') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.lang = 'fr-FR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const heard = e.results[0]?.[0]?.transcript ?? ''
      handleResult(heard)
    }
    recognition.onspeechstart = () => setSpeechDetected(true)
    recognition.onspeechend = () => setSpeechDetected(false)
    recognition.onend = () => {
      setSpeechDetected(false)
      setStatus((s) => (s === 'listening' ? 'idle' : s))
    }
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'aborted' || e.error === 'no-speech') {
        setStatus('idle')
        return
      }
      // Chromium open-source n'a pas les clés Google Speech → "network" systématique.
      // On bascule définitivement sur Whisper local pour cette session.
      if (e.error === 'network' || e.error === 'service-not-allowed') {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          logger.info('Native voice engine unavailable, falling back to Whisper')
          setEngine('whisper')
          startWhisperRef.current()
          return
        }
      }
      setError(`Erreur reconnaissance : ${e.error}`)
      setStatus('error')
    }

    nativeRef.current = recognition
    return () => {
      try {
        recognition.abort()
      } catch {
        /* noop */
      }
    }
  }, [engine, handleResult])

  const startNative = useCallback(() => {
    if (!nativeRef.current) return
    setError(null)
    setTranscript('')
    setMatched(null)
    setSpeechDetected(false)
    setStatus('listening')
    try {
      nativeRef.current.start()
    } catch (err) {
      logger.warn('Native voice start error', err)
      setStatus('idle')
    }
  }, [])

  const startWhisper = useCallback(async () => {
    setError(null)
    setTranscript('')
    setMatched(null)
    setSpeechDetected(false)
    abortRef.current = false

    try {
      setStatus('loading-engine')
      const [{ getTranscriber, onProgress }, { captureAudio }] = await Promise.all([
        import('@/lib/voice/whisperEngine'),
        import('@/lib/voice/audioCapture'),
      ])

      const unsubscribe = onProgress((e) => {
        if (e.progress !== undefined) setModelProgress(e.progress)
      })

      await getTranscriber()
      unsubscribe()

      if (abortRef.current) {
        setStatus('idle')
        return
      }

      // Reste en 'loading-engine' tant que le VAD n'est pas prêt (modèle ONNX
      // se charge ~1-3s la première fois). Passe à 'listening' uniquement
      // quand MicVAD est réellement à l'écoute → évite que l'utilisateur
      // parle avant que le VAD soit branché sur le micro.
      const { audio } = await captureAudio({
        onReady: () => setStatus('listening'),
        onSpeechStart: () => setSpeechDetected(true),
      })
      setSpeechDetected(false)
      if (abortRef.current) {
        setStatus('idle')
        return
      }

      setStatus('transcribing')
      const { transcribe } = await import('@/lib/voice/whisperEngine')
      const heard = await transcribe(audio)
      handleResult(heard)
      setStatus('idle')
    } catch (err) {
      logger.error('Whisper voice flow error', err)
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(`Erreur micro/transcription : ${message}`)
      setStatus('error')
    }
  }, [handleResult])

  // Garde la dernière référence à startWhisper pour la bascule depuis onerror native.
  useEffect(() => {
    startWhisperRef.current = startWhisper
  }, [startWhisper])

  const start = useCallback(async () => {
    if (!enabled) return
    if (engine === 'native') startNative()
    else if (engine === 'whisper') await startWhisper()
  }, [enabled, engine, startNative, startWhisper])

  const stop = useCallback(() => {
    abortRef.current = true
    if (engine === 'native' && nativeRef.current) {
      try {
        nativeRef.current.stop()
      } catch {
        /* noop */
      }
    }
    setSpeechDetected(false)
    setStatus('idle')
  }, [engine])

  const toggle = useCallback(async () => {
    if (status === 'idle' || status === 'error') {
      await start()
    } else {
      stop()
    }
  }, [status, start, stop])

  return {
    enabled,
    status,
    engine,
    transcript,
    matched,
    error,
    modelProgress,
    speechDetected,
    start,
    stop,
    toggle,
  }
}
