import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'

const mockUsePrivacySettings = vi.fn()

vi.mock('@/hooks/usePrivacySettings', () => ({
  usePrivacySettings: () => mockUsePrivacySettings(),
}))

const SCRIPT_ID = 'plausible-analytics'

async function loadAnalytics() {
  vi.resetModules()
  const mod = await import('./Analytics')
  return mod.Analytics
}

beforeEach(() => {
  document.head.querySelectorAll(`#${SCRIPT_ID}`).forEach((el) => el.remove())
  mockUsePrivacySettings.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  cleanup()
  document.head.querySelectorAll(`#${SCRIPT_ID}`).forEach((el) => el.remove())
})

describe('Analytics', () => {
  it("n'injecte rien si analytics activé mais env vars absentes", async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', '')
    vi.stubEnv('VITE_PLAUSIBLE_SRC', '')
    mockUsePrivacySettings.mockReturnValue({ analyticsEnabled: true })

    const Analytics = await loadAnalytics()
    render(<Analytics />)

    expect(document.getElementById(SCRIPT_ID)).toBeNull()
  })

  it("n'injecte rien si analytics désactivé", async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', 'unilien.app')
    vi.stubEnv('VITE_PLAUSIBLE_SRC', 'https://plausible.unilien.app/js/script.js')
    mockUsePrivacySettings.mockReturnValue({ analyticsEnabled: false })

    const Analytics = await loadAnalytics()
    render(<Analytics />)

    expect(document.getElementById(SCRIPT_ID)).toBeNull()
  })

  it('injecte le script si activé + env configurées', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', 'unilien.app')
    vi.stubEnv('VITE_PLAUSIBLE_SRC', 'https://plausible.unilien.app/js/script.js')
    mockUsePrivacySettings.mockReturnValue({ analyticsEnabled: true })

    const Analytics = await loadAnalytics()
    render(<Analytics />)

    const script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    expect(script).not.toBeNull()
    expect(script?.dataset.domain).toBe('unilien.app')
    expect(script?.src).toBe('https://plausible.unilien.app/js/script.js')
    expect(script?.defer).toBe(true)
  })

  it('retire le script quand analytics passe à false', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', 'unilien.app')
    vi.stubEnv('VITE_PLAUSIBLE_SRC', 'https://plausible.unilien.app/js/script.js')
    mockUsePrivacySettings.mockReturnValue({ analyticsEnabled: true })

    const Analytics = await loadAnalytics()
    const { rerender } = render(<Analytics />)
    expect(document.getElementById(SCRIPT_ID)).not.toBeNull()

    mockUsePrivacySettings.mockReturnValue({ analyticsEnabled: false })
    rerender(<Analytics />)

    expect(document.getElementById(SCRIPT_ID)).toBeNull()
  })

  it('ne duplique pas le script sur re-render', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', 'unilien.app')
    vi.stubEnv('VITE_PLAUSIBLE_SRC', 'https://plausible.unilien.app/js/script.js')
    mockUsePrivacySettings.mockReturnValue({ analyticsEnabled: true })

    const Analytics = await loadAnalytics()
    const { rerender } = render(<Analytics />)
    rerender(<Analytics />)
    rerender(<Analytics />)

    expect(document.querySelectorAll(`#${SCRIPT_ID}`).length).toBe(1)
  })
})
