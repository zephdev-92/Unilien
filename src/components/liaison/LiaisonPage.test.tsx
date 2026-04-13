import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'
import { LiaisonPage } from './LiaisonPage'
import type { Conversation } from '@/types'

// ─── Mocks sous-composants ────────────────────────────────────────────────────

vi.mock('@/components/dashboard', () => ({
  DashboardLayout: ({
    children,
    title,
    topbarRight,
  }: {
    children: React.ReactNode
    title: string
    topbarRight?: React.ReactNode
  }) => (
    <div data-testid="dashboard-layout" data-title={title}>
      {topbarRight && <div data-testid="topbar-right">{topbarRight}</div>}
      {children}
    </div>
  ),
}))

vi.mock('./ConversationList', () => ({
  ConversationList: ({ conversations }: { conversations: Conversation[] }) => (
    <div data-testid="conversation-list" data-count={conversations.length}>
      {conversations.map((c) => (
        <div key={c.id} data-testid={`conv-item-${c.id}`}>{c.type}</div>
      ))}
    </div>
  ),
}))

vi.mock('./MessageBubble', () => ({
  MessageBubble: ({ message }: { message: { id: string; content: string } }) => (
    <div data-testid="message-bubble" data-message-id={message.id}>{message.content}</div>
  ),
}))

vi.mock('./MessageInput', () => ({
  MessageInput: () => <div data-testid="message-input" />,
}))

vi.mock('./NewConversationModal', () => ({
  NewConversationModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="new-conv-modal" /> : null,
}))

// ─── Mocks hooks ──────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseEmployerResolution = vi.fn()
vi.mock('@/hooks/useEmployerResolution', () => ({
  useEmployerResolution: () => mockUseEmployerResolution(),
}))

// ─── Mock Supabase (channel/subscribe pour realtime) ─────────────────────────

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}))

// ─── Mocks services ───────────────────────────────────────────────────────────

const mockGetConversations = vi.fn()
const mockEnsureTeamConversation = vi.fn()
const mockGetLiaisonMessages = vi.fn()
const mockMarkAllMessagesAsRead = vi.fn()
const mockSubscribeLiaisonMessages = vi.fn()
const mockSubscribeTypingIndicator = vi.fn()
const mockCreateLiaisonMessage = vi.fn()
const mockDeleteLiaisonMessage = vi.fn()
const mockGetOlderMessages = vi.fn()
const mockUploadAttachments = vi.fn()

vi.mock('@/services/liaisonService', () => ({
  getConversations: (...args: unknown[]) => mockGetConversations(...args),
  ensureTeamConversation: (...args: unknown[]) => mockEnsureTeamConversation(...args),
  getLiaisonMessages: (...args: unknown[]) => mockGetLiaisonMessages(...args),
  markAllMessagesAsRead: (...args: unknown[]) => mockMarkAllMessagesAsRead(...args),
  subscribeLiaisonMessages: (...args: unknown[]) => mockSubscribeLiaisonMessages(...args),
  subscribeTypingIndicator: (...args: unknown[]) => mockSubscribeTypingIndicator(...args),
  createLiaisonMessage: (...args: unknown[]) => mockCreateLiaisonMessage(...args),
  deleteLiaisonMessage: (...args: unknown[]) => mockDeleteLiaisonMessage(...args),
  getOlderMessages: (...args: unknown[]) => mockGetOlderMessages(...args),
}))

vi.mock('@/services/attachmentService', () => ({
  uploadAttachments: (...args: unknown[]) => mockUploadAttachments(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const employerProfile = createMockProfile({ id: 'employer-1', role: 'employer' })

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-team',
    type: 'team',
    employerId: 'employer-1',
    participantIds: [],
    unreadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const defaultResolution = {
  resolvedEmployerId: 'employer-1',
  caregiverPermissions: null,
  isResolving: false,
  accessDenied: false,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LiaisonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ profile: employerProfile, isInitialized: true })
    mockUseEmployerResolution.mockReturnValue(defaultResolution)
    mockEnsureTeamConversation.mockResolvedValue(undefined)
    mockGetConversations.mockResolvedValue([])
    mockGetLiaisonMessages.mockResolvedValue({ messages: [], hasMore: false })
    mockMarkAllMessagesAsRead.mockResolvedValue(undefined)
    mockSubscribeLiaisonMessages.mockReturnValue(() => undefined)
    mockSubscribeTypingIndicator.mockReturnValue({ setTyping: vi.fn(), unsubscribe: vi.fn() })
  })

  // ── États de chargement ────────────────────────────────────────────────────

  describe('États de chargement', () => {
    it('affiche le titre "Messagerie" dans le DashboardLayout', async () => {
      renderWithProviders(<LiaisonPage />)
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-layout')).toHaveAttribute('data-title', 'Messagerie')
      })
    })

    it('affiche l\'écran de chargement pendant la résolution employeur', () => {
      mockUseEmployerResolution.mockReturnValue({ ...defaultResolution, isResolving: true })
      renderWithProviders(<LiaisonPage />)
      expect(screen.queryByTestId('conversation-list')).not.toBeInTheDocument()
    })

    it('affiche l\'écran de chargement quand le profil est absent', () => {
      mockUseAuth.mockReturnValue({ profile: null, isInitialized: false })
      renderWithProviders(<LiaisonPage />)
      expect(screen.queryByTestId('conversation-list')).not.toBeInTheDocument()
    })
  })

  // ── Accès refusé ──────────────────────────────────────────────────────────

  describe('Accès refusé', () => {
    it('affiche le message d\'accès refusé', async () => {
      const caregiverProfile = createMockProfile({ id: 'cg-1', role: 'caregiver' })
      mockUseAuth.mockReturnValue({ profile: caregiverProfile, isInitialized: true })
      mockUseEmployerResolution.mockReturnValue({ ...defaultResolution, accessDenied: true })
      renderWithProviders(<LiaisonPage />)
      await waitFor(() => {
        expect(screen.getByText('Accès non autorisé')).toBeInTheDocument()
      })
    })
  })

  // ── Liste des conversations ────────────────────────────────────────────────

  describe('Liste des conversations', () => {
    it('charge et affiche les conversations', async () => {
      const teamConv = makeConversation({ id: 'team-1', type: 'team' })
      const privateConv = makeConversation({ id: 'priv-1', type: 'private' })
      mockGetConversations.mockResolvedValue([teamConv, privateConv])
      renderWithProviders(<LiaisonPage />)
      await waitFor(() => {
        expect(screen.getByTestId('conversation-list')).toHaveAttribute('data-count', '2')
      })
    })

    it('appelle getConversations avec le bon employerId', async () => {
      renderWithProviders(<LiaisonPage />)
      await waitFor(() => {
        expect(mockGetConversations).toHaveBeenCalledWith('employer-1', 'employer-1')
      })
    })

    it('appelle ensureTeamConversation au chargement', async () => {
      renderWithProviders(<LiaisonPage />)
      await waitFor(() => {
        expect(mockEnsureTeamConversation).toHaveBeenCalledWith('employer-1')
      })
    })

    it('sélectionne automatiquement la conversation équipe', async () => {
      const teamConv = makeConversation({ id: 'team-1', type: 'team' })
      mockGetConversations.mockResolvedValue([teamConv])
      mockGetLiaisonMessages.mockResolvedValue({ messages: [], hasMore: false })
      renderWithProviders(<LiaisonPage />)
      await waitFor(() => {
        // La conv équipe est auto-sélectionnée → getLiaisonMessages est appelé
        expect(mockGetLiaisonMessages).toHaveBeenCalledWith('team-1')
      })
    })
  })

  // ── Thread de messages — état vide ────────────────────────────────────────

  describe('Thread — aucun message', () => {
    it('affiche "Sélectionnez une conversation" quand aucune conv choisie', async () => {
      // Pas de conv équipe → aucune sélection auto
      mockGetConversations.mockResolvedValue([])
      renderWithProviders(<LiaisonPage />)
      await waitFor(() => {
        expect(screen.getByText('Sélectionnez une conversation')).toBeInTheDocument()
      })
    })

    it('affiche "Aucun message" quand la conv est sélectionnée mais vide', async () => {
      const teamConv = makeConversation({ id: 'team-1', type: 'team' })
      mockGetConversations.mockResolvedValue([teamConv])
      mockGetLiaisonMessages.mockResolvedValue({ messages: [], hasMore: false })
      renderWithProviders(<LiaisonPage />)
      await waitFor(() => {
        expect(screen.getByText('Aucun message')).toBeInTheDocument()
      })
    })
  })

  // ── Input message ─────────────────────────────────────────────────────────

  describe('Input message', () => {
    it('affiche MessageInput pour un employeur', async () => {
      const teamConv = makeConversation({ id: 'team-1', type: 'team' })
      mockGetConversations.mockResolvedValue([teamConv])
      renderWithProviders(<LiaisonPage />)
      await waitFor(() => {
        expect(screen.getByTestId('message-input')).toBeInTheDocument()
      })
    })

    it('affiche le message d\'absence de permission pour un aidant sans écriture', async () => {
      const caregiverProfile = createMockProfile({ id: 'cg-1', role: 'caregiver' })
      mockUseAuth.mockReturnValue({ profile: caregiverProfile, isInitialized: true })
      mockUseEmployerResolution.mockReturnValue({
        ...defaultResolution,
        caregiverPermissions: { canViewLiaison: true, canWriteLiaison: false },
      })
      const teamConv = makeConversation({ id: 'team-1', type: 'team' })
      mockGetConversations.mockResolvedValue([teamConv])
      renderWithProviders(<LiaisonPage />)
      await waitFor(() => {
        expect(
          screen.getByText("Vous n'avez pas la permission d'envoyer des messages.")
        ).toBeInTheDocument()
      })
    })
  })

  // ── Realtime ──────────────────────────────────────────────────────────────

  describe('Realtime subscription', () => {
    it('s\'abonne aux messages realtime au chargement', async () => {
      const { supabase } = await import('@/lib/supabase/client')
      renderWithProviders(<LiaisonPage />)
      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith(expect.stringContaining('unread-employer-1'))
      })
    })
  })
})
