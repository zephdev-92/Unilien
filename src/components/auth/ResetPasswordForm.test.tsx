import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { ResetPasswordForm } from './ResetPasswordForm'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetSession = vi.fn()
const mockUpdateUser = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockUnsubscribe = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      updateUser: (data: unknown) => mockUpdateUser(data),
      onAuthStateChange: (cb: unknown) => {
        mockOnAuthStateChange(cb)
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
      },
    },
  },
}))

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Par défaut : session valide
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    mockUpdateUser.mockResolvedValue({ error: null })
    mockOnAuthStateChange.mockReturnValue(undefined)
  })

  describe('État de chargement initial', () => {
    it('affiche "Vérification en cours..." tant que la session n\'est pas résolue', async () => {
      // La session ne se résout pas immédiatement → état null
      mockGetSession.mockReturnValue(new Promise(() => {})) // promesse infinie
      renderWithProviders(<ResetPasswordForm />)
      expect(screen.getByText(/vérification en cours/i)).toBeInTheDocument()
    })
  })

  describe('Session invalide', () => {
    it('affiche l\'erreur de lien invalide si session=null', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      renderWithProviders(<ResetPasswordForm />)
      await waitFor(() => {
        expect(screen.getByText(/lien de réinitialisation est invalide/i)).toBeInTheDocument()
      })
    })

    it('affiche le lien "Demander un nouveau lien"', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      renderWithProviders(<ResetPasswordForm />)
      await waitFor(() => {
        expect(screen.getByText(/demander un nouveau lien/i)).toBeInTheDocument()
      })
    })
  })

  describe('Formulaire (session valide)', () => {
    it('affiche le titre "Nouveau mot de passe"', async () => {
      renderWithProviders(<ResetPasswordForm />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /nouveau mot de passe/i })).toBeInTheDocument()
      })
    })

    it('affiche les champs mot de passe et confirmation', async () => {
      renderWithProviders(<ResetPasswordForm />)
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/minimum 8 caractères/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/retapez votre mot de passe/i)).toBeInTheDocument()
      })
    })

    it('affiche le bouton "Modifier le mot de passe"', async () => {
      renderWithProviders(<ResetPasswordForm />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /modifier le mot de passe/i })).toBeInTheDocument()
      })
    })

    it('affiche une erreur si les mots de passe ne correspondent pas', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ResetPasswordForm />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/minimum 8 caractères/i)).toBeInTheDocument()
      })

      const passwordInput = screen.getByPlaceholderText(/minimum 8 caractères/i)
      const confirmInput = screen.getByPlaceholderText(/retapez votre mot de passe/i)

      await user.type(passwordInput, 'MonMotDePasse123')
      await user.type(confirmInput, 'AutreMotDePasse')
      await user.tab() // trigger blur validation

      // On clique sur submit
      await user.click(screen.getByRole('button', { name: /modifier le mot de passe/i }))

      await waitFor(() => {
        expect(screen.getByText(/ne correspondent pas/i)).toBeInTheDocument()
      })
    })

    it('appelle updateUser avec le nouveau mot de passe', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ResetPasswordForm />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/minimum 8 caractères/i)).toBeInTheDocument()
      })

      const passwordInput = screen.getByPlaceholderText(/minimum 8 caractères/i)
      const confirmInput = screen.getByPlaceholderText(/retapez votre mot de passe/i)

      await user.type(passwordInput, 'NouveauMdp2026!')
      await user.type(confirmInput, 'NouveauMdp2026!')
      await user.click(screen.getByRole('button', { name: /modifier le mot de passe/i }))

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NouveauMdp2026!' })
      })
    })

    it('affiche le message de succès après modification réussie', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ResetPasswordForm />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/minimum 8 caractères/i)).toBeInTheDocument()
      })

      const passwordInput = screen.getByPlaceholderText(/minimum 8 caractères/i)
      const confirmInput = screen.getByPlaceholderText(/retapez votre mot de passe/i)

      await user.type(passwordInput, 'NouveauMdp2026!')
      await user.type(confirmInput, 'NouveauMdp2026!')
      await user.click(screen.getByRole('button', { name: /modifier le mot de passe/i }))

      await waitFor(() => {
        expect(screen.getByText(/mot de passe a été modifié avec succès/i)).toBeInTheDocument()
      })
    })

    it('affiche une erreur si updateUser échoue', async () => {
      mockUpdateUser.mockResolvedValue({ error: new Error('Token expiré') })
      const user = userEvent.setup()
      renderWithProviders(<ResetPasswordForm />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/minimum 8 caractères/i)).toBeInTheDocument()
      })

      const passwordInput = screen.getByPlaceholderText(/minimum 8 caractères/i)
      const confirmInput = screen.getByPlaceholderText(/retapez votre mot de passe/i)

      await user.type(passwordInput, 'NouveauMdp2026!')
      await user.type(confirmInput, 'NouveauMdp2026!')
      await user.click(screen.getByRole('button', { name: /modifier le mot de passe/i }))

      await waitFor(() => {
        expect(screen.getByText(/token expiré/i)).toBeInTheDocument()
      })
    })
  })

  describe('Toggle visibilité mot de passe', () => {
    it('bascule la visibilité du mot de passe au clic sur l\'icône', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ResetPasswordForm />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/minimum 8 caractères/i)).toBeInTheDocument()
      })

      const toggleButton = screen.getByRole('button', { name: /afficher le mot de passe/i })
      await user.click(toggleButton)

      expect(screen.getByRole('button', { name: /masquer le mot de passe/i })).toBeInTheDocument()
    })
  })
})
