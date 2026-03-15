import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { ConversationList } from './ConversationList'
import type { Conversation } from '@/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeConv(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    employerId: 'emp-1',
    type: 'team',
    participantIds: ['u-1', 'u-2'],
    lastMessage: 'Dernier message',
    unreadCount: 0,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-07T09:00:00'),
    ...overrides,
  }
}

const teamConv = makeConv({ id: 'team-1', type: 'team' })
const privateConv1 = makeConv({
  id: 'priv-1',
  type: 'private',
  lastMessage: 'Bonjour',
  otherParticipant: { id: 'u-2', firstName: 'Marie', lastName: 'Dupont' },
})
const privateConv2 = makeConv({
  id: 'priv-2',
  type: 'private',
  lastMessage: 'Merci',
  otherParticipant: { id: 'u-3', firstName: 'Jean', lastName: 'Martin' },
})

const allConversations = [teamConv, privateConv1, privateConv2]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ConversationList', () => {
  const defaultProps = {
    conversations: allConversations,
    selectedId: null,
    onSelect: vi.fn(),
    currentUserId: 'u-1',
  }

  describe('Labels groupes', () => {
    it('affiche le label "Général" au-dessus de la conv équipe', () => {
      renderWithProviders(<ConversationList {...defaultProps} />)
      expect(screen.getByText('Général')).toBeInTheDocument()
    })

    it('affiche le label "Conversations" au-dessus des conv privées', () => {
      renderWithProviders(<ConversationList {...defaultProps} />)
      expect(screen.getByText('Conversations')).toBeInTheDocument()
    })

    it('affiche "Équipe" pour la conversation d\'équipe', () => {
      renderWithProviders(<ConversationList {...defaultProps} />)
      expect(screen.getByText('Équipe')).toBeInTheDocument()
    })
  })

  describe('Recherche conversations', () => {
    it('affiche le champ de recherche', () => {
      renderWithProviders(<ConversationList {...defaultProps} />)
      expect(screen.getByLabelText(/rechercher une conversation/i)).toBeInTheDocument()
    })

    it('filtre les conversations par nom', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ConversationList {...defaultProps} />)

      await user.type(screen.getByLabelText(/rechercher une conversation/i), 'Marie')

      expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
      expect(screen.queryByText('Jean Martin')).not.toBeInTheDocument()
    })

    it('affiche "Aucun résultat" si rien ne correspond', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ConversationList {...defaultProps} />)

      await user.type(screen.getByLabelText(/rechercher une conversation/i), 'zzzzz')

      expect(screen.getByText('Aucun résultat')).toBeInTheDocument()
    })

    it('filtre aussi par contenu du dernier message', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ConversationList {...defaultProps} />)

      await user.type(screen.getByLabelText(/rechercher une conversation/i), 'Bonjour')

      expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
      expect(screen.queryByText('Jean Martin')).not.toBeInTheDocument()
    })
  })

  describe('Conversations privées', () => {
    it('affiche les noms des participants', () => {
      renderWithProviders(<ConversationList {...defaultProps} />)
      expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
      expect(screen.getByText('Jean Martin')).toBeInTheDocument()
    })

    it('affiche "Aucune conversation privée" quand liste vide', () => {
      renderWithProviders(
        <ConversationList {...defaultProps} conversations={[teamConv]} />
      )
      expect(screen.getByText('Aucune conversation privée')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('appelle onSelect quand on clique sur une conversation', async () => {
      const onSelect = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(<ConversationList {...defaultProps} onSelect={onSelect} />)

      await user.click(screen.getByText('Marie Dupont'))

      expect(onSelect).toHaveBeenCalledWith(privateConv1)
    })

  })
})
