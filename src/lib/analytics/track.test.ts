import { describe, it, expect, beforeEach, vi } from 'vitest'
import { track } from './track'

describe('track', () => {
  beforeEach(() => {
    // Réinitialise le stub Plausible entre les tests
    delete (window as { plausible?: unknown }).plausible
  })

  it('appelle window.plausible avec le nom de l’event', () => {
    const spy = vi.fn()
    window.plausible = spy
    track('Signup')
    expect(spy).toHaveBeenCalledWith('Signup', undefined)
  })

  it('passe les props quand fournies', () => {
    const spy = vi.fn()
    window.plausible = spy
    track('Signup', { role: 'employer' })
    expect(spy).toHaveBeenCalledWith('Signup', { props: { role: 'employer' } })
  })

  it('empile l’event dans la queue si le script n’est pas chargé', () => {
    expect(window.plausible).toBeUndefined()
    track('CTA Signup Click', { location: 'hero' })
    expect(window.plausible).toBeDefined()
    expect(window.plausible?.q).toEqual([
      ['CTA Signup Click', { props: { location: 'hero' } }],
    ])
  })
})
