import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// ---------- Mock SpeechRecognition ----------

let mockInstance: MockSpeechRecognition | null = null

class MockSpeechRecognition {
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1

  onstart: ((ev: Event) => void) | null = null
  onend: ((ev: Event) => void) | null = null
  onerror: ((ev: { error: string; message?: string }) => void) | null = null
  onresult: ((ev: {
    resultIndex: number
    results: { length: number; [index: number]: { isFinal: boolean; length: number; 0: { transcript: string; confidence: number } } }
  }) => void) | null = null
  onspeechstart: (() => void) | null = null
  onspeechend: (() => void) | null = null
  onaudiostart: (() => void) | null = null
  onaudioend: (() => void) | null = null

  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockInstance = this
  }
}

// Import du hook APRES les mocks
import { useSpeechRecognition } from './useSpeechRecognition'

// ---------- Helpers ----------

/** Sauvegarde des valeurs originales de window */
const originalSpeechRecognition = (window as Record<string, unknown>).SpeechRecognition
const originalWebkitSpeechRecognition = (window as Record<string, unknown>).webkitSpeechRecognition

function setSpeechRecognitionSupport(variant: 'standard' | 'webkit' | 'none') {
  if (variant === 'standard') {
    ;(window as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition
    delete (window as Record<string, unknown>).webkitSpeechRecognition
  } else if (variant === 'webkit') {
    delete (window as Record<string, unknown>).SpeechRecognition
    ;(window as Record<string, unknown>).webkitSpeechRecognition = MockSpeechRecognition
  } else {
    delete (window as Record<string, unknown>).SpeechRecognition
    delete (window as Record<string, unknown>).webkitSpeechRecognition
  }
}

function createFinalResultEvent(text: string, resultIndex = 0) {
  return {
    resultIndex,
    results: {
      length: resultIndex + 1,
      [resultIndex]: {
        isFinal: true,
        length: 1,
        0: { transcript: text, confidence: 0.95 },
      },
    },
  }
}

function createInterimResultEvent(text: string, resultIndex = 0) {
  return {
    resultIndex,
    results: {
      length: resultIndex + 1,
      [resultIndex]: {
        isFinal: false,
        length: 1,
        0: { transcript: text, confidence: 0.5 },
      },
    },
  }
}

// ---------- Tests ----------

describe('useSpeechRecognition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInstance = null
    setSpeechRecognitionSupport('standard')
  })

  afterEach(() => {
    // Restaurer les valeurs originales
    ;(window as Record<string, unknown>).SpeechRecognition = originalSpeechRecognition
    ;(window as Record<string, unknown>).webkitSpeechRecognition = originalWebkitSpeechRecognition
  })

  // =============================================
  // Support du navigateur
  // =============================================

  describe('Support du navigateur', () => {
    it('isSupported est false si SpeechRecognition n\'est pas disponible', () => {
      setSpeechRecognitionSupport('none')

      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.isSupported).toBe(false)
    })

    it('isSupported est true si window.webkitSpeechRecognition existe', () => {
      setSpeechRecognitionSupport('webkit')

      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.isSupported).toBe(true)
    })

    it('startListening set une erreur si le navigateur ne supporte pas l\'API', () => {
      setSpeechRecognitionSupport('none')

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      expect(result.current.error).toBe("La reconnaissance vocale n'est pas supportée par ce navigateur.")
      expect(result.current.isListening).toBe(false)
    })

    it('toggleListening set une erreur si le navigateur ne supporte pas l\'API', () => {
      setSpeechRecognitionSupport('none')

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.toggleListening()
      })

      expect(result.current.error).toBe("La reconnaissance vocale n'est pas supportée par ce navigateur.")
      expect(result.current.isListening).toBe(false)
    })
  })

  // =============================================
  // Valeurs par defaut
  // =============================================

  describe('Valeurs par defaut', () => {
    it('retourne les valeurs par defaut correctes', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.isSupported).toBe(true)
      expect(result.current.isListening).toBe(false)
      expect(result.current.transcript).toBe('')
      expect(result.current.finalTranscript).toBe('')
      expect(result.current.error).toBeNull()
      expect(typeof result.current.startListening).toBe('function')
      expect(typeof result.current.stopListening).toBe('function')
      expect(typeof result.current.toggleListening).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })
  })

  // =============================================
  // startListening
  // =============================================

  describe('startListening', () => {
    it('initialise la reconnaissance et appelle start()', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      expect(mockInstance).not.toBeNull()

      act(() => {
        result.current.startListening()
      })

      expect(mockInstance!.start).toHaveBeenCalledTimes(1)
    })
  })

  // =============================================
  // onstart
  // =============================================

  describe('onstart', () => {
    it('met isListening a true', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      // Simuler le callback onstart
      act(() => {
        mockInstance!.onstart!(new Event('start'))
      })

      expect(result.current.isListening).toBe(true)
      expect(result.current.error).toBeNull()
    })
  })

  // =============================================
  // stopListening
  // =============================================

  describe('stopListening', () => {
    it('appelle stop() et met manualStop a true', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      // Demarrer d'abord pour que isListeningRef soit true
      act(() => {
        result.current.startListening()
      })
      act(() => {
        mockInstance!.onstart!(new Event('start'))
      })

      expect(result.current.isListening).toBe(true)

      act(() => {
        result.current.stopListening()
      })

      expect(mockInstance!.stop).toHaveBeenCalledTimes(1)
    })
  })

  // =============================================
  // toggleListening
  // =============================================

  describe('toggleListening', () => {
    it('alterne entre start et stop', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      // Premier toggle : devrait demarrer
      act(() => {
        result.current.toggleListening()
      })
      expect(mockInstance!.start).toHaveBeenCalledTimes(1)

      // Simuler onstart pour que isListeningRef passe a true
      act(() => {
        mockInstance!.onstart!(new Event('start'))
      })
      expect(result.current.isListening).toBe(true)

      // Deuxieme toggle : devrait arreter
      act(() => {
        result.current.toggleListening()
      })
      expect(mockInstance!.stop).toHaveBeenCalledTimes(1)
    })
  })

  // =============================================
  // reset
  // =============================================

  describe('reset', () => {
    it('remet transcript, finalTranscript et error a leurs valeurs initiales', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      // D'abord, produire des donnees
      act(() => {
        result.current.startListening()
      })
      act(() => {
        mockInstance!.onstart!(new Event('start'))
      })

      // Simuler un resultat final
      act(() => {
        mockInstance!.onresult!(createFinalResultEvent('Bonjour'))
      })
      expect(result.current.transcript).not.toBe('')
      expect(result.current.finalTranscript).not.toBe('')

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.transcript).toBe('')
      expect(result.current.finalTranscript).toBe('')
      expect(result.current.error).toBeNull()
    })
  })

  // =============================================
  // onresult
  // =============================================

  describe('onresult', () => {
    it('avec resultat final met a jour finalTranscript et transcript', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })
      act(() => {
        mockInstance!.onstart!(new Event('start'))
      })

      act(() => {
        mockInstance!.onresult!(createFinalResultEvent('Bonjour le monde'))
      })

      expect(result.current.finalTranscript).toBe('Bonjour le monde ')
      expect(result.current.transcript).toBe('Bonjour le monde')
    })

    it('avec resultat interim met a jour transcript mais pas finalTranscript', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })
      act(() => {
        mockInstance!.onstart!(new Event('start'))
      })

      act(() => {
        mockInstance!.onresult!(createInterimResultEvent('en cours de'))
      })

      expect(result.current.transcript).toBe('en cours de')
      expect(result.current.finalTranscript).toBe('')
    })
  })

  // =============================================
  // onerror
  // =============================================

  describe('onerror', () => {
    it('no-speech affiche le bon message d\'erreur en francais', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })
      act(() => {
        mockInstance!.onstart!(new Event('start'))
      })

      act(() => {
        mockInstance!.onerror!({ error: 'no-speech' } as { error: string })
      })

      expect(result.current.error).toBe('Aucune parole détectée. Veuillez réessayer.')
      expect(result.current.isListening).toBe(false)
    })

    it('not-allowed affiche le bon message', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })
      act(() => {
        mockInstance!.onstart!(new Event('start'))
      })

      act(() => {
        mockInstance!.onerror!({ error: 'not-allowed' } as { error: string })
      })

      expect(result.current.error).toBe("Accès au microphone refusé. Veuillez autoriser l'accès.")
      expect(result.current.isListening).toBe(false)
    })

    it('aborted ne genere pas d\'erreur', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })
      act(() => {
        mockInstance!.onstart!(new Event('start'))
      })

      act(() => {
        mockInstance!.onerror!({ error: 'aborted' } as { error: string })
      })

      expect(result.current.error).toBeNull()
      expect(result.current.isListening).toBe(false)
    })
  })

  // =============================================
  // Mode continu
  // =============================================

  describe('Mode continu', () => {
    it('onend en mode continu redemarre automatiquement si pas d\'arret manuel', () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({ continuous: true })
      )

      // Demarrer l'ecoute (shouldRestartRef sera mis a true car continuous=true)
      act(() => {
        result.current.startListening()
      })
      act(() => {
        mockInstance!.onstart!(new Event('start'))
      })

      expect(result.current.isListening).toBe(true)

      // Nombre d'appels a start() avant onend
      const startCallsBefore = mockInstance!.start.mock.calls.length

      // Simuler onend (pas d'arret manuel, shouldRestart est true)
      act(() => {
        mockInstance!.onend!(new Event('end'))
      })

      // start() doit avoir ete appele une fois de plus (redemarrage)
      expect(mockInstance!.start.mock.calls.length).toBe(startCallsBefore + 1)
    })
  })

  // =============================================
  // Nettoyage au demontage
  // =============================================

  describe('Nettoyage', () => {
    it('appelle abort() au demontage du hook', () => {
      const { unmount } = renderHook(() => useSpeechRecognition())

      expect(mockInstance).not.toBeNull()

      unmount()

      expect(mockInstance!.abort).toHaveBeenCalledTimes(1)
    })
  })
})
