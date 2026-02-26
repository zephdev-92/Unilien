import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from './logger'

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logger.error', () => {
    it('appelle console.error avec le message préfixé [ERROR]', () => {
      logger.error('Erreur critique')
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        ...[]
      )
    })

    it('sanitise les emails dans le message', () => {
      logger.error('Utilisateur user@example.com a échoué')
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL]'),
        ...[]
      )
    })

    it('passe les arguments supplémentaires sanitisés', () => {
      logger.error('Erreur', { userId: 'abc', password: 'secret' })
      expect(console.error).toHaveBeenCalled()
      const call = vi.mocked(console.error).mock.calls[0]
      // Le password doit être rédacté
      const args = call[1] as Record<string, unknown>
      expect(args.password).toBe('[REDACTED]')
    })

    it('sanitise les erreurs Error objects', () => {
      const error = new Error('Connexion échouée pour user@test.com')
      logger.error('Erreur réseau', error)
      expect(console.error).toHaveBeenCalled()
    })

    it('sanitise les tableaux dans les arguments', () => {
      logger.error('Erreur', ['item1', 'item2'])
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('logger.warn', () => {
    it('appelle console.warn avec le message préfixé [WARN]', () => {
      logger.warn('Avertissement test')
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        ...[]
      )
    })
  })

  describe('logger.info', () => {
    it('appelle console.info avec le message préfixé [INFO]', () => {
      logger.info('Information test')
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        ...[]
      )
    })

    it('sanitise les données dans les arguments', () => {
      logger.info('Shift créé', { shiftId: 'abc-123', token: 'my-secret-token-value' })
      expect(console.info).toHaveBeenCalled()
      const call = vi.mocked(console.info).mock.calls[0]
      const args = call[1] as Record<string, unknown>
      expect(args.token).toBe('[REDACTED]')
    })
  })

  describe('logger.debug', () => {
    it('appelle console.debug avec le message préfixé [DEBUG]', () => {
      logger.debug('Debug test')
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        ...[]
      )
    })

    it('sanitise les UUIDs dans les chaînes', () => {
      logger.debug('UUID: 550e8400-e29b-41d4-a716-446655440000')
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('550e8400'),
        ...[]
      )
    })
  })

  describe('Sanitisation des données sensibles', () => {
    it('redacte les clés email dans les objets', () => {
      logger.info('Profil', { email: 'user@test.com', name: 'Jean' })
      expect(console.info).toHaveBeenCalled()
      const call = vi.mocked(console.info).mock.calls[0]
      const args = call[1] as Record<string, unknown>
      expect(args.email).toBe('[REDACTED]')
      expect(args.name).toBe('Jean')
    })

    it('redacte les numéros de téléphone dans les chaînes', () => {
      logger.info('Contact: 06 12 34 56 78')
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[PHONE]'),
        ...[]
      )
    })

    it('sanitise les objets imbriqués', () => {
      logger.info('Data', { user: { name: 'Jean', password: 'secret123' } })
      expect(console.info).toHaveBeenCalled()
      const call = vi.mocked(console.info).mock.calls[0]
      const args = call[1] as Record<string, unknown>
      const user = args.user as Record<string, unknown>
      expect(user.password).toBe('[REDACTED]')
      expect(user.name).toBe('Jean')
    })

    it('gère null et undefined', () => {
      logger.info('Test null', null, undefined)
      expect(console.info).toHaveBeenCalled()
    })

    it('gère les nombres et booléens', () => {
      logger.info('Test types', 42, true, false)
      expect(console.info).toHaveBeenCalled()
    })
  })
})
