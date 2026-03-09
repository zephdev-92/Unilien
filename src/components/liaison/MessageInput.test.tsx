import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { MessageInput } from './MessageInput'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockSpeechRecognition = {
  isSupported: true,
  isListening: false,
  transcript: '',
  error: null as string | null,
  startListening: vi.fn(),
  stopListening: vi.fn(),
  reset: vi.fn(),
}

vi.mock('@/hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: () => mockSpeechRecognition,
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('@/services/attachmentService', () => ({
  validateAttachmentFiles: () => ({ valid: true }),
  formatSize: (bytes: number) => `${Math.round(bytes / 1024)} Ko`,
  getAttachmentType: (file: File) => (file.type.startsWith('image/') ? 'image' : 'document'),
}))

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('MessageInput', () => {
  const defaultProps = {
    onSend: vi.fn().mockResolvedValue(undefined),
    onTyping: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSpeechRecognition.isSupported = true
    mockSpeechRecognition.isListening = false
    mockSpeechRecognition.transcript = ''
    mockSpeechRecognition.error = null
  })

  describe('Rendu initial', () => {
    it('affiche le textarea avec le placeholder par défaut', () => {
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.getByPlaceholderText('Écrivez un message...')).toBeInTheDocument()
    })

    it('affiche un placeholder personnalisé', () => {
      renderWithProviders(<MessageInput {...defaultProps} placeholder="Tapez ici..." />)
      expect(screen.getByPlaceholderText('Tapez ici...')).toBeInTheDocument()
    })

    it('affiche le bouton envoyer désactivé quand le champ est vide', () => {
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.getByRole('button', { name: /envoyer le message/i })).toBeDisabled()
    })

    it('affiche le bouton joindre un fichier', () => {
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.getByRole('button', { name: /joindre un fichier/i })).toBeInTheDocument()
    })

    it('affiche le bouton saisie vocale', () => {
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.getByRole('button', { name: /saisie vocale/i })).toBeInTheDocument()
    })

    it('affiche l\'indication clavier', () => {
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.getByText(/entrée pour envoyer/i)).toBeInTheDocument()
    })
  })

  describe('Saisie et envoi', () => {
    it('active le bouton envoyer quand du texte est saisi', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MessageInput {...defaultProps} />)

      await user.type(screen.getByPlaceholderText('Écrivez un message...'), 'Bonjour')

      expect(screen.getByRole('button', { name: /envoyer le message/i })).not.toBeDisabled()
    })

    it('envoie le message au clic sur le bouton envoyer', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderWithProviders(<MessageInput {...defaultProps} onSend={onSend} />)

      await user.type(screen.getByPlaceholderText('Écrivez un message...'), 'Bonjour')
      await user.click(screen.getByRole('button', { name: /envoyer le message/i }))

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith('Bonjour', undefined)
      })
    })

    it('vide le textarea après envoi', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderWithProviders(<MessageInput {...defaultProps} onSend={onSend} />)

      const textarea = screen.getByPlaceholderText('Écrivez un message...')
      await user.type(textarea, 'Bonjour')
      await user.click(screen.getByRole('button', { name: /envoyer le message/i }))

      await waitFor(() => {
        expect(textarea).toHaveValue('')
      })
    })

    it('envoie avec Entrée (sans Shift)', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderWithProviders(<MessageInput {...defaultProps} onSend={onSend} />)

      const textarea = screen.getByPlaceholderText('Écrivez un message...')
      await user.type(textarea, 'Bonjour')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith('Bonjour', undefined)
      })
    })

    it('ne trimme pas les espaces internes mais trimme les extrémités', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderWithProviders(<MessageInput {...defaultProps} onSend={onSend} />)

      await user.type(screen.getByPlaceholderText('Écrivez un message...'), '  Bonjour  ')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith('Bonjour', undefined)
      })
    })

    it('n\'envoie pas un message vide ou constitué uniquement d\'espaces', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderWithProviders(<MessageInput {...defaultProps} onSend={onSend} />)

      await user.type(screen.getByPlaceholderText('Écrivez un message...'), '   ')
      await user.keyboard('{Enter}')

      expect(onSend).not.toHaveBeenCalled()
    })
  })

  describe('Indicateur de saisie (typing)', () => {
    it('appelle onTyping(true) quand l\'utilisateur tape', async () => {
      const onTyping = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(<MessageInput {...defaultProps} onTyping={onTyping} />)

      await user.type(screen.getByPlaceholderText('Écrivez un message...'), 'A')

      expect(onTyping).toHaveBeenCalledWith(true)
    })

    it('appelle onTyping(false) lors de l\'envoi', async () => {
      const onTyping = vi.fn()
      const onSend = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderWithProviders(<MessageInput {...defaultProps} onSend={onSend} onTyping={onTyping} />)

      await user.type(screen.getByPlaceholderText('Écrivez un message...'), 'Salut')
      onTyping.mockClear()
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(onTyping).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('État désactivé', () => {
    it('désactive le textarea quand disabled=true', () => {
      renderWithProviders(<MessageInput {...defaultProps} disabled />)
      expect(screen.getByPlaceholderText('Écrivez un message...')).toBeDisabled()
    })

    it('désactive les boutons quand disabled=true', () => {
      renderWithProviders(<MessageInput {...defaultProps} disabled />)
      expect(screen.getByRole('button', { name: /joindre un fichier/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /envoyer le message/i })).toBeDisabled()
    })
  })

  describe('Saisie vocale', () => {
    it('affiche le label "Saisie vocale" quand non active', () => {
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Saisie vocale' })).toBeInTheDocument()
    })

    it('affiche le label "Arrêter la saisie vocale" quand active', () => {
      mockSpeechRecognition.isListening = true
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.getByRole('button', { name: /arrêter la saisie vocale/i })).toBeInTheDocument()
    })

    it('affiche le badge REC quand la reconnaissance est active', () => {
      mockSpeechRecognition.isListening = true
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.getByText('REC')).toBeInTheDocument()
    })

    it('n\'affiche pas le badge REC quand inactive', () => {
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.queryByText('REC')).not.toBeInTheDocument()
    })

    it('appelle startListening au clic sur le bouton micro', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MessageInput {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Saisie vocale' }))

      expect(mockSpeechRecognition.startListening).toHaveBeenCalled()
    })

    it('appelle stopListening au clic quand déjà en écoute', async () => {
      mockSpeechRecognition.isListening = true
      const user = userEvent.setup()
      renderWithProviders(<MessageInput {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /arrêter la saisie vocale/i }))

      expect(mockSpeechRecognition.stopListening).toHaveBeenCalled()
      expect(mockSpeechRecognition.reset).toHaveBeenCalled()
    })

    it('affiche l\'erreur vocale quand présente', () => {
      mockSpeechRecognition.error = 'Micro non disponible'
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.getByRole('alert')).toHaveTextContent('Micro non disponible')
    })

    it('n\'affiche pas d\'erreur quand pas d\'erreur vocale', () => {
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('change le placeholder quand en écoute', () => {
      mockSpeechRecognition.isListening = true
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.getByPlaceholderText('Parlez maintenant...')).toBeInTheDocument()
    })

    it('affiche le texte d\'aide vocale quand en écoute', () => {
      mockSpeechRecognition.isListening = true
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.getByText(/parlez.*cliquez sur le micro/i)).toBeInTheDocument()
    })
  })

  describe('Compteur de caractères', () => {
    it('n\'affiche pas le compteur pour un texte court', () => {
      renderWithProviders(<MessageInput {...defaultProps} />)
      expect(screen.queryByText(/\/2000/)).not.toBeInTheDocument()
    })

    it('affiche le compteur quand le texte dépasse 500 caractères', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MessageInput {...defaultProps} />)

      const longText = 'a'.repeat(501)
      await user.type(screen.getByPlaceholderText('Écrivez un message...'), longText)

      expect(screen.getByText('501/2000')).toBeInTheDocument()
    })
  })
})
