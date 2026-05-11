import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test/helpers'
import { screen } from '@testing-library/react'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: { id: 'p1', role: 'employer', firstName: 'Marie' } }),
}))

const accessibilityState = { settings: { voiceControlEnabled: false } }
vi.mock('@/stores/authStore', async () => {
  const actual = await vi.importActual<typeof import('@/stores/authStore')>('@/stores/authStore')
  return {
    ...actual,
    useAccessibilityStore: (selector?: (s: typeof accessibilityState) => unknown) =>
      selector ? selector(accessibilityState) : accessibilityState,
  }
})

// Override pour les tests de feedback : status forcé sans déclencher tout le flow audio
const voiceState: {
  enabled: boolean
  status: 'idle' | 'loading-engine' | 'listening' | 'transcribing' | 'error'
  engine: 'native' | 'whisper' | 'unsupported'
} = { enabled: false, status: 'idle', engine: 'native' }
vi.mock('@/hooks/useVoiceNavigation', () => ({
  useVoiceNavigation: () => ({
    enabled: voiceState.enabled,
    status: voiceState.status,
    engine: voiceState.engine,
    transcript: '',
    matched: null,
    error: null,
    modelProgress: 0,
    speechDetected: false,
    start: vi.fn(),
    stop: vi.fn(),
    toggle: vi.fn(),
  }),
}))

import { VoiceNavButton } from './VoiceNavButton'

describe('VoiceNavButton', () => {
  beforeEach(() => {
    accessibilityState.settings.voiceControlEnabled = false
    voiceState.enabled = false
    voiceState.status = 'idle'
    voiceState.engine = 'native'
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true })
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true })
  })

  it('does not render when voice control is disabled', () => {
    voiceState.enabled = false
    renderWithProviders(<VoiceNavButton />)
    expect(screen.queryByLabelText(/navigation vocale/i)).not.toBeInTheDocument()
  })

  it('does not render when voice engine is unsupported', () => {
    voiceState.enabled = true
    voiceState.engine = 'unsupported'
    renderWithProviders(<VoiceNavButton />)
    expect(screen.queryByLabelText(/navigation vocale/i)).not.toBeInTheDocument()
  })

  it('renders microphone button when enabled and engine is native', () => {
    voiceState.enabled = true
    voiceState.engine = 'native'
    renderWithProviders(<VoiceNavButton />)
    expect(screen.getByLabelText(/démarrer la navigation vocale/i)).toBeInTheDocument()
  })

  it('shows ANALYSE badge and "Transcription en cours" while transcribing', () => {
    voiceState.enabled = true
    voiceState.engine = 'whisper'
    voiceState.status = 'transcribing'
    renderWithProviders(<VoiceNavButton />)
    expect(screen.getByText('ANALYSE')).toBeInTheDocument()
    expect(screen.getByText(/transcription en cours/i)).toBeInTheDocument()
  })

  it('shows REC badge and "Parlez maintenant" while listening', () => {
    voiceState.enabled = true
    voiceState.engine = 'whisper'
    voiceState.status = 'listening'
    renderWithProviders(<VoiceNavButton />)
    expect(screen.getByText('REC')).toBeInTheDocument()
    expect(screen.getByText(/parlez maintenant/i)).toBeInTheDocument()
  })
})
