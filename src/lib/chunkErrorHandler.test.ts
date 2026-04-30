import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isChunkLoadError,
  tryReloadOnChunkError,
  clearChunkReloadFlag,
} from './chunkErrorHandler'

const RELOAD_FLAG_KEY = '__unilien_chunk_reload_attempted__'

describe('chunkErrorHandler', () => {
  let reloadSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.clear()
    reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, reload: reloadSpy },
    })
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  describe('isChunkLoadError', () => {
    it('détecte "Failed to fetch dynamically imported module"', () => {
      const err = new Error('Failed to fetch dynamically imported module: /assets/x.js')
      expect(isChunkLoadError(err)).toBe(true)
    })

    it('détecte "error loading dynamically imported module"', () => {
      const err = new Error('error loading dynamically imported module: https://app/x.js')
      expect(isChunkLoadError(err)).toBe(true)
    })

    it('détecte "Importing a module script failed"', () => {
      const err = new Error('Importing a module script failed.')
      expect(isChunkLoadError(err)).toBe(true)
    })

    it('détecte "Unable to preload CSS"', () => {
      const err = new Error('Unable to preload CSS for /assets/x.css')
      expect(isChunkLoadError(err)).toBe(true)
    })

    it('ignore les erreurs non liées', () => {
      expect(isChunkLoadError(new Error('TypeError: foo is undefined'))).toBe(false)
      expect(isChunkLoadError(new Error('Network error'))).toBe(false)
    })

    it('gère null / undefined / strings', () => {
      expect(isChunkLoadError(null)).toBe(false)
      expect(isChunkLoadError(undefined)).toBe(false)
      expect(isChunkLoadError('error loading dynamically imported module')).toBe(true)
    })
  })

  describe('tryReloadOnChunkError', () => {
    it('reload et set le flag pour une chunk error', () => {
      const err = new Error('Failed to fetch dynamically imported module: /x.js')
      const result = tryReloadOnChunkError(err)

      expect(result).toBe(true)
      expect(reloadSpy).toHaveBeenCalledOnce()
      expect(sessionStorage.getItem(RELOAD_FLAG_KEY)).toBe('1')
    })

    it('ne reload pas si le flag est déjà présent (anti-boucle)', () => {
      sessionStorage.setItem(RELOAD_FLAG_KEY, '1')
      const err = new Error('Failed to fetch dynamically imported module: /x.js')
      const result = tryReloadOnChunkError(err)

      expect(result).toBe(false)
      expect(reloadSpy).not.toHaveBeenCalled()
    })

    it('ne fait rien pour une erreur non chunk', () => {
      const err = new Error('Some other error')
      const result = tryReloadOnChunkError(err)

      expect(result).toBe(false)
      expect(reloadSpy).not.toHaveBeenCalled()
      expect(sessionStorage.getItem(RELOAD_FLAG_KEY)).toBeNull()
    })
  })

  describe('clearChunkReloadFlag', () => {
    it('efface le flag', () => {
      sessionStorage.setItem(RELOAD_FLAG_KEY, '1')
      clearChunkReloadFlag()
      expect(sessionStorage.getItem(RELOAD_FLAG_KEY)).toBeNull()
    })
  })
})
