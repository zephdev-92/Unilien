import { useState, useCallback, useEffect, useRef } from 'react'
import { logger } from '@/lib/logger'

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

// ============================================
// HOOK OPTIONS
// ============================================

export interface UseSpeechRecognitionOptions {
  /** Language for recognition (default: 'fr-FR') */
  lang?: string
  /** Enable continuous recognition (default: false) */
  continuous?: boolean
  /** Include interim results (default: true) */
  interimResults?: boolean
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseSpeechRecognitionReturn {
  /** Whether speech recognition is supported */
  isSupported: boolean
  /** Whether currently listening */
  isListening: boolean
  /** Current transcript (interim + final) */
  transcript: string
  /** Final transcript only */
  finalTranscript: string
  /** Current error message */
  error: string | null
  /** Start listening */
  startListening: () => void
  /** Stop listening */
  stopListening: () => void
  /** Toggle listening state */
  toggleListening: () => void
  /** Reset transcript and error */
  reset: () => void
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = 'fr-FR',
    continuous = false,
    interimResults = true,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')
  const isListeningRef = useRef(false)
  const shouldRestartRef = useRef(false)
  const manualStopRef = useRef(false)

  // Keep refs in sync with state
  useEffect(() => {
    finalTranscriptRef.current = finalTranscript
  }, [finalTranscript])

  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  // Check browser support
  const isSupported = typeof window !== 'undefined' &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition)

  // Initialize recognition instance (only once)
  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onend = () => {
      // In continuous mode, auto-restart if not manually stopped
      if (continuous && shouldRestartRef.current && !manualStopRef.current) {
        try {
          recognition.start()
          return
        } catch {
          // Failed to restart, fall through to stop
        }
      }

      setIsListening(false)
      shouldRestartRef.current = false
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage: string

      switch (event.error) {
        case 'no-speech':
          errorMessage = "Aucune parole détectée. Veuillez réessayer."
          // In continuous mode, allow restart after no-speech
          if (continuous) return
          break
        case 'audio-capture':
          errorMessage = "Aucun microphone détecté. Vérifiez votre matériel."
          shouldRestartRef.current = false
          break
        case 'not-allowed':
          errorMessage = "Accès au microphone refusé. Veuillez autoriser l'accès."
          shouldRestartRef.current = false
          break
        case 'service-not-allowed':
          errorMessage = "Le service de reconnaissance vocale n'est pas disponible."
          shouldRestartRef.current = false
          break
        case 'network':
          errorMessage = "Erreur réseau. Vérifiez votre connexion."
          break
        case 'aborted':
          // Don't show error for manual abort
          setIsListening(false)
          shouldRestartRef.current = false
          return
        case 'language-not-supported':
          errorMessage = "Langue non supportée."
          shouldRestartRef.current = false
          break
        default:
          errorMessage = `Erreur de reconnaissance vocale: ${event.error}`
      }

      setError(errorMessage)
      setIsListening(false)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = ''
      let finalText = finalTranscriptRef.current

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript

        if (result.isFinal) {
          finalText += text + ' '
          finalTranscriptRef.current = finalText
          setFinalTranscript(finalText)
        } else {
          interimText += text
        }
      }

      const fullTranscript = finalText + interimText
      setTranscript(fullTranscript.trim())
    }

    // Handle no match found
    if ('onnomatch' in recognition) {
      (recognition as SpeechRecognition & { onnomatch: (() => void) | null }).onnomatch = () => {
        setError("Parole non reconnue. Veuillez réessayer.")
      }
    }

    recognitionRef.current = recognition

    return () => {
      shouldRestartRef.current = false
      manualStopRef.current = true
      recognition.abort()
    }
  }, [isSupported, lang, continuous, interimResults])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return

    // Reset before starting
    setTranscript('')
    setFinalTranscript('')
    finalTranscriptRef.current = ''
    setError(null)
    manualStopRef.current = false
    shouldRestartRef.current = continuous

    try {
      recognitionRef.current.start()
    } catch (err) {
      // Recognition might already be started
      logger.warn('Speech recognition start error:', err)
    }
  }, [continuous])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListeningRef.current) return

    manualStopRef.current = true
    shouldRestartRef.current = false

    try {
      recognitionRef.current.stop()
    } catch (err) {
      logger.warn('Speech recognition stop error:', err)
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening()
    } else {
      startListening()
    }
  }, [startListening, stopListening])

  const reset = useCallback(() => {
    setTranscript('')
    setFinalTranscript('')
    finalTranscriptRef.current = ''
    setError(null)
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    reset,
  }
}

export default useSpeechRecognition
