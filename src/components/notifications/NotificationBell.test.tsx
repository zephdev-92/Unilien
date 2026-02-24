import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { NotificationBell } from './NotificationBell'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('NotificationBell', () => {
  describe('Sans notifications', () => {
    it('affiche le bouton "Notifications" si unreadCount=0', () => {
      renderWithProviders(<NotificationBell unreadCount={0} onClick={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
    })

    it('n\'affiche pas de badge si unreadCount=0', () => {
      renderWithProviders(<NotificationBell unreadCount={0} onClick={vi.fn()} />)
      // Le badge affiche le nombre, donc "0" ne devrait pas être un badge visible
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('annonce "Aucune nouvelle notification" pour les lecteurs d\'écran', () => {
      renderWithProviders(<NotificationBell unreadCount={0} onClick={vi.fn()} />)
      expect(screen.getByText(/Aucune nouvelle notification/)).toBeInTheDocument()
    })
  })

  describe('Avec notifications non lues', () => {
    it('affiche le badge avec le nombre de notifications', () => {
      renderWithProviders(<NotificationBell unreadCount={5} onClick={vi.fn()} />)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('affiche "1 notification non lue" dans l\'aria-label (singulier)', () => {
      renderWithProviders(<NotificationBell unreadCount={1} onClick={vi.fn()} />)
      expect(screen.getByRole('button', { name: /1 notification non lue/ })).toBeInTheDocument()
    })

    it('affiche "3 notifications non lues" dans l\'aria-label (pluriel)', () => {
      renderWithProviders(<NotificationBell unreadCount={3} onClick={vi.fn()} />)
      expect(screen.getByRole('button', { name: /3 notifications non lues/ })).toBeInTheDocument()
    })

    it('affiche "99+" si unreadCount > 99', () => {
      renderWithProviders(<NotificationBell unreadCount={150} onClick={vi.fn()} />)
      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('annonce le nombre de notifications non lues pour les lecteurs d\'écran', () => {
      renderWithProviders(<NotificationBell unreadCount={3} onClick={vi.fn()} />)
      expect(screen.getByText(/3 notifications non lues/)).toBeInTheDocument()
    })
  })

  describe('État chargement', () => {
    it('n\'affiche pas le badge si isLoading=true même avec des notifications', () => {
      renderWithProviders(<NotificationBell unreadCount={5} onClick={vi.fn()} isLoading />)
      // Badge masqué pendant le chargement
      expect(screen.queryByText('5')).not.toBeInTheDocument()
    })
  })

  describe('aria-expanded', () => {
    it('a aria-expanded=false par défaut', () => {
      renderWithProviders(<NotificationBell unreadCount={0} onClick={vi.fn()} />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
    })

    it('a aria-expanded=true si isOpen=true', () => {
      renderWithProviders(<NotificationBell unreadCount={0} onClick={vi.fn()} isOpen />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Interaction', () => {
    it('appelle onClick au clic', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      renderWithProviders(<NotificationBell unreadCount={0} onClick={onClick} />)
      await user.click(screen.getByRole('button'))
      expect(onClick).toHaveBeenCalledOnce()
    })
  })
})
