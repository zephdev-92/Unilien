import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { MessageBubble } from './MessageBubble'
import type { LiaisonMessageWithSender } from '@/types'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/sanitize', () => ({
  sanitizeText: (text: string) => text,
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<LiaisonMessageWithSender> = {}): LiaisonMessageWithSender {
  return {
    id: 'msg-1',
    employerId: 'emp-1',
    senderId: 'user-1',
    senderRole: 'employee',
    content: 'Bonjour, comment ça va ?',
    attachments: [],
    isEdited: false,
    readBy: ['user-1'],
    createdAt: new Date(),
    updatedAt: new Date(),
    sender: {
      firstName: 'Jean',
      lastName: 'Martin',
    },
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('MessageBubble', () => {
  describe('Contenu du message', () => {
    it('affiche le contenu du message', () => {
      renderWithProviders(
        <MessageBubble message={makeMessage()} isOwnMessage={false} />
      )
      expect(screen.getByText('Bonjour, comment ça va ?')).toBeInTheDocument()
    })

    it('affiche "(modifié)" si isEdited=true', () => {
      renderWithProviders(
        <MessageBubble message={makeMessage({ isEdited: true })} isOwnMessage={false} />
      )
      expect(screen.getByText('(modifié)')).toBeInTheDocument()
    })

    it('n\'affiche pas "(modifié)" si isEdited=false', () => {
      renderWithProviders(
        <MessageBubble message={makeMessage({ isEdited: false })} isOwnMessage={false} />
      )
      expect(screen.queryByText('(modifié)')).not.toBeInTheDocument()
    })
  })

  describe('Message d\'un autre utilisateur', () => {
    it('affiche le nom de l\'expéditeur', () => {
      renderWithProviders(
        <MessageBubble message={makeMessage()} isOwnMessage={false} />
      )
      expect(screen.getByText('Jean Martin')).toBeInTheDocument()
    })

    it('affiche le badge "Auxiliaire" pour le rôle employee', () => {
      renderWithProviders(
        <MessageBubble message={makeMessage({ senderRole: 'employee' })} isOwnMessage={false} />
      )
      expect(screen.getByText('Auxiliaire')).toBeInTheDocument()
    })

    it('affiche le badge "Employeur" pour le rôle employer', () => {
      renderWithProviders(
        <MessageBubble message={makeMessage({ senderRole: 'employer' })} isOwnMessage={false} />
      )
      expect(screen.getByText('Employeur')).toBeInTheDocument()
    })

    it('affiche le badge "Aidant" pour le rôle caregiver', () => {
      renderWithProviders(
        <MessageBubble message={makeMessage({ senderRole: 'caregiver' })} isOwnMessage={false} />
      )
      expect(screen.getByText('Aidant')).toBeInTheDocument()
    })

    it('affiche "Utilisateur" si sender absent', () => {
      renderWithProviders(
        <MessageBubble message={makeMessage({ sender: undefined })} isOwnMessage={false} />
      )
      expect(screen.getByText('Utilisateur')).toBeInTheDocument()
    })
  })

  describe('Message propre (isOwnMessage=true)', () => {
    it('n\'affiche pas le nom de l\'expéditeur', () => {
      renderWithProviders(
        <MessageBubble message={makeMessage()} isOwnMessage={true} />
      )
      expect(screen.queryByText('Jean Martin')).not.toBeInTheDocument()
    })

    it('affiche "✓" si non lu (readBy contient seulement l\'expéditeur)', () => {
      renderWithProviders(
        <MessageBubble
          message={makeMessage({ senderId: 'user-1', readBy: ['user-1'] })}
          isOwnMessage={true}
        />
      )
      // Seul "✓" affiché (pas "✓✓" pour non-lu)
      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('affiche "✓✓" si lu (readBy contient d\'autres utilisateurs)', () => {
      renderWithProviders(
        <MessageBubble
          message={makeMessage({ senderId: 'user-1', readBy: ['user-1', 'user-2'] })}
          isOwnMessage={true}
        />
      )
      expect(screen.getByText('✓✓')).toBeInTheDocument()
    })
  })

  describe('Formatage de la date', () => {
    it('affiche l\'heure HH:mm pour un message d\'aujourd\'hui', () => {
      const now = new Date()
      const message = makeMessage({ createdAt: now })
      renderWithProviders(
        <MessageBubble message={message} isOwnMessage={false} />
      )
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      expect(screen.getByText(`${hours}:${minutes}`)).toBeInTheDocument()
    })

    it('affiche "Hier HH:mm" pour un message d\'hier', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(14, 30, 0, 0)
      const message = makeMessage({ createdAt: yesterday })
      renderWithProviders(
        <MessageBubble message={message} isOwnMessage={false} />
      )
      expect(screen.getByText('Hier 14:30')).toBeInTheDocument()
    })
  })

  describe('Menu d\'actions (messages propres)', () => {
    it('affiche le bouton options si isOwnMessage et onEdit fourni', () => {
      renderWithProviders(
        <MessageBubble
          message={makeMessage()}
          isOwnMessage={true}
          onEdit={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /options du message/i })).toBeInTheDocument()
    })

    it('n\'affiche pas le bouton options si !isOwnMessage', () => {
      renderWithProviders(
        <MessageBubble
          message={makeMessage()}
          isOwnMessage={false}
          onEdit={vi.fn()}
        />
      )
      expect(screen.queryByRole('button', { name: /options du message/i })).not.toBeInTheDocument()
    })

    it('n\'affiche pas le bouton options si ni onEdit ni onDelete', () => {
      renderWithProviders(
        <MessageBubble message={makeMessage()} isOwnMessage={true} />
      )
      expect(screen.queryByRole('button', { name: /options du message/i })).not.toBeInTheDocument()
    })
  })
})
