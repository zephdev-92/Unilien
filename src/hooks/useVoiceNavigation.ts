import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccessibilityStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { matchCommand, type VoiceCommand } from '@/lib/voice/voiceCommands'
import { formatVoiceError } from '@/lib/voice/errors'
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
  // Timestamp de fin de parole (côté user) pour mesurer la latence perçue
  // jusqu'à l'affichage du résultat. Whisper logge sa propre latence pipeline,
  // ce ref capte la latence end-to-end ressentie par l'utilisateur.
  const speechEndAtRef = useRef<number | null>(null)

  const handleResult = useCallback(
    (heard: string | string[]) => {
      // Latence perçue : depuis la fin de parole jusqu'à l'affichage du
      // résultat. Utile pour comparer engine natif vs Whisper en prod.
      if (speechEndAtRef.current !== null) {
        const latencyMs = Math.round(performance.now() - speechEndAtRef.current)
        logger.info(`[Voice] end-to-end latency: ${latencyMs}ms`)
        speechEndAtRef.current = null
      }

      const candidates = Array.isArray(heard) ? heard : [heard]
      const primary = candidates[0] ?? ''
      // 1ère alternative affichée comme "transcript", peu importe ce qui matche
      setTranscript(primary)

      // Tente toutes les alternatives ; la 1ère qui matche gagne.
      let cmd = null
      for (const alt of candidates) {
        cmd = matchCommand(alt, profile?.role ?? null)
        if (cmd) break
      }
      setMatched(cmd)
      if (cmd) {
        navigate(cmd.path)
      } else if (primary) {
        setError(`Commande non reconnue : "${primary}"`)
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
    // Edge/Chrome renvoient souvent la bonne transcription en 2e/3e alternative
    // (Edge en particulier déraille beaucoup sur le FR). On lit jusqu'à 5
    // alternatives et on prend la 1ère qui matche une commande.
    recognition.maxAlternatives = 5

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const result = e.results[0]
      if (!result) return
      const alternatives = Array.from({ length: result.length }, (_, i) => result[i]?.transcript ?? '')
        .filter(Boolean)
      handleResult(alternatives)
    }
    recognition.onspeechstart = () => setSpeechDetected(true)
    recognition.onspeechend = () => {
      setSpeechDetected(false)
      speechEndAtRef.current = performance.now()
    }
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
      // captureAudio resolve sur le speech end côté VAD → marque le moment T0
      // pour mesurer la latence perçue jusqu'à handleResult.
      speechEndAtRef.current = performance.now()
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
      setError(formatVoiceError(err))
      setStatus('error')
    }
  }, [handleResult])

  // Garde la dernière référence à startWhisper pour la bascule depuis onerror native.
  useEffect(() => {
    startWhisperRef.current = startWhisper
  }, [startWhisper])

  // Pre-warm Whisper en background dès qu'on sait que la nav vocale est
  // activée et que l'engine cible est Whisper. Évite ~12s de cold start au
  // 1er clic FAB. Délai de 2s pour laisser le boot principal de l'app finir
  // (le téléchargement modèle est ~400 Mo, on ne veut pas bouffer la bande
  // passante pendant le 1er render).
  useEffect(() => {
    if (!enabled) return
    if (engine !== 'whisper') return
    let cancelled = false
    const t = setTimeout(async () => {
      if (cancelled) return
      try {
        const { getTranscriber, isWhisperLoaded } = await import('@/lib/voice/whisperEngine')
        if (isWhisperLoaded()) return
        logger.info('Whisper pre-warm starting')
        await getTranscriber()
        if (!cancelled) logger.info('Whisper pre-warm done')
      } catch (err) {
        logger.warn('Whisper pre-warm failed (non-fatal)', err)
      }
    }, 2000)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [enabled, engine])

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
