import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { PushPermissionBanner } from './PushPermissionBanner'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockSubscribe = vi.fn()
const mockUsePushNotifications = vi.fn()

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => mockUsePushNotifications(),
}))

function mockPush(overrides = {}) {
  mockUsePushNotifications.mockReturnValue({
    isSupported: true,
    isConfigured: true,
    permission: 'default',
    isSubscribed: false,
    isLoading: false,
    error: null,
    subscribe: mockSubscribe,
    ...overrides,
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PushPermissionBanner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockSubscribe.mockResolvedValue(true)
    mockPush()
  })

  describe('Conditions de masquage', () => {
    it('retourne null si push non supporté', () => {
      mockPush({ isSupported: false })
      const { container } = renderWithProviders(<PushPermissionBanner userId="user-1" />)
      expect(container).toBeEmptyDOMElement()
    })

    it('retourne null si VAPID non configuré', () => {
      mockPush({ isConfigured: false })
      const { container } = renderWithProviders(<PushPermissionBanner userId="user-1" />)
      expect(container).toBeEmptyDOMElement()
    })

    it('retourne null si déjà abonné', () => {
      mockPush({ isSubscribed: true })
      const { container } = renderWithProviders(<PushPermissionBanner userId="user-1" />)
      expect(container).toBeEmptyDOMElement()
    })

    it('retourne null si permission refusée (denied)', () => {
      mockPush({ permission: 'denied' })
      const { container } = renderWithProviders(<PushPermissionBanner userId="user-1" />)
      expect(container).toBeEmptyDOMElement()
    })

    it('retourne null si le bandeau a été rejeté (localStorage)', () => {
      localStorage.setItem('unilien_push_banner_dismissed', 'true')
      const { container } = renderWithProviders(<PushPermissionBanner userId="user-1" />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('Rendu visible', () => {
    it('affiche le titre "Activer les notifications"', () => {
      renderWithProviders(<PushPermissionBanner userId="user-1" />)
      expect(screen.getByText(/activer les notifications/i)).toBeInTheDocument()
    })

    it('affiche le bouton "Activer"', () => {
      renderWithProviders(<PushPermissionBanner userId="user-1" />)
      expect(screen.getByRole('button', { name: /activer/i })).toBeInTheDocument()
    })

    it('affiche le bouton "Plus tard"', () => {
      renderWithProviders(<PushPermissionBanner userId="user-1" />)
      expect(screen.getByRole('button', { name: /plus tard/i })).toBeInTheDocument()
    })

    it('a le role="alert" pour accessibilité', () => {
      renderWithProviders(<PushPermissionBanner userId="user-1" />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('affiche le message d\'erreur si error fourni', () => {
      mockPush({ error: 'Erreur d\'activation' })
      renderWithProviders(<PushPermissionBanner userId="user-1" />)
      expect(screen.getByText("Erreur d'activation")).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('appelle subscribe au clic sur "Activer"', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PushPermissionBanner userId="user-1" />)
      await user.click(screen.getByRole('button', { name: /activer/i }))
      expect(mockSubscribe).toHaveBeenCalledOnce()
    })

    it('appelle onSubscribed si subscribe retourne true', async () => {
      const user = userEvent.setup()
      const onSubscribed = vi.fn()
      mockSubscribe.mockResolvedValue(true)
      renderWithProviders(<PushPermissionBanner userId="user-1" onSubscribed={onSubscribed} />)
      await user.click(screen.getByRole('button', { name: /activer/i }))
      // Attendre la résolution de la promesse
      await vi.waitFor(() => {
        expect(onSubscribed).toHaveBeenCalledOnce()
      })
    })

    it('masque le bandeau au clic sur "Plus tard"', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PushPermissionBanner userId="user-1" />)
      await user.click(screen.getByRole('button', { name: /plus tard/i }))
      expect(screen.queryByText(/activer les notifications/i)).not.toBeInTheDocument()
    })

    it('persiste le rejet dans localStorage au clic sur "Plus tard"', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PushPermissionBanner userId="user-1" />)
      await user.click(screen.getByRole('button', { name: /plus tard/i }))
      expect(localStorage.getItem('unilien_push_banner_dismissed')).toBe('true')
    })

    it('appelle onDismiss au clic sur "Plus tard"', async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()
      renderWithProviders(<PushPermissionBanner userId="user-1" onDismiss={onDismiss} />)
      await user.click(screen.getByRole('button', { name: /plus tard/i }))
      expect(onDismiss).toHaveBeenCalledOnce()
    })
  })
})
