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

import { VoiceNavButton } from './VoiceNavButton'

describe('VoiceNavButton', () => {
  beforeEach(() => {
    accessibilityState.settings.voiceControlEnabled = false
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true })
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true })
  })

  it('does not render when voice control is disabled', () => {
    accessibilityState.settings.voiceControlEnabled = false
    renderWithProviders(<VoiceNavButton />)
    expect(screen.queryByLabelText(/navigation vocale/i)).not.toBeInTheDocument()
  })

  it('does not render when voice engine is unsupported', () => {
    accessibilityState.settings.voiceControlEnabled = true
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
    renderWithProviders(<VoiceNavButton />)
    expect(screen.queryByLabelText(/navigation vocale/i)).not.toBeInTheDocument()
  })

  it('renders microphone button when enabled and engine is native', () => {
    accessibilityState.settings.voiceControlEnabled = true
    class FakeSR {
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 0
      onresult: unknown = null
      onend: unknown = null
      onerror: unknown = null
      start = vi.fn()
      stop = vi.fn()
      abort = vi.fn()
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: FakeSR, configurable: true })

    renderWithProviders(<VoiceNavButton />)
    expect(screen.getByLabelText(/démarrer la navigation vocale/i)).toBeInTheDocument()
  })
})
