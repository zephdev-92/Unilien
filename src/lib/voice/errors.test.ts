import { describe, it, expect } from 'vitest'
import { formatVoiceError } from './errors'

describe('formatVoiceError', () => {
  it('maps NotAllowedError to a permission-denied message', () => {
    const err = new DOMException('blocked', 'NotAllowedError')
    expect(formatVoiceError(err)).toContain('cadenas')
  })

  it('maps NotFoundError to a no-mic message', () => {
    const err = new DOMException('no device', 'NotFoundError')
    expect(formatVoiceError(err)).toContain('Aucun micro')
  })

  it('maps NotReadableError to a busy-mic message', () => {
    const err = new DOMException('busy', 'NotReadableError')
    expect(formatVoiceError(err)).toContain('autre application')
  })

  it('maps SecurityError to an HTTPS message', () => {
    const err = new DOMException('insecure', 'SecurityError')
    expect(formatVoiceError(err)).toContain('HTTPS')
  })

  it('falls back to the error message for unknown errors', () => {
    expect(formatVoiceError(new Error('boom'))).toBe('boom')
  })

  it('falls back to a generic message for non-Error inputs', () => {
    expect(formatVoiceError('weird')).toBe('Erreur inconnue')
    expect(formatVoiceError(null)).toBe('Erreur inconnue')
  })
})
