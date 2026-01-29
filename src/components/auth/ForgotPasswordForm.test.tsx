import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { ForgotPasswordForm } from './ForgotPasswordForm'

// Mock useAuth
const mockResetPassword = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    resetPassword: mockResetPassword,
    isLoading: false,
    error: null,
  }),
}))

// Wrapper pour les tests
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>{ui}</BrowserRouter>
    </ChakraProvider>
  )
}

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResetPassword.mockResolvedValue({ success: true })
  })

  describe('Rendu initial', () => {
    it('devrait afficher le titre "Mot de passe oublié"', () => {
      renderWithProviders(<ForgotPasswordForm />)

      expect(screen.getByRole('heading', { name: /mot de passe oublié/i })).toBeInTheDocument()
    })

    it('devrait afficher la description', () => {
      renderWithProviders(<ForgotPasswordForm />)

      expect(screen.getByText(/entrez votre email pour recevoir un lien/i)).toBeInTheDocument()
    })

    it('devrait afficher le champ email', () => {
      renderWithProviders(<ForgotPasswordForm />)

      expect(screen.getByPlaceholderText(/votre@email.fr/i)).toBeInTheDocument()
    })

    it('devrait afficher le bouton d\'envoi', () => {
      renderWithProviders(<ForgotPasswordForm />)

      expect(screen.getByRole('button', { name: /envoyer le lien/i })).toBeInTheDocument()
    })

    it('devrait afficher le lien retour à la connexion', () => {
      renderWithProviders(<ForgotPasswordForm />)

      expect(screen.getByText(/retour à la connexion/i)).toBeInTheDocument()
    })
  })

  describe('Soumission du formulaire', () => {
    it('devrait appeler resetPassword avec l\'email', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ForgotPasswordForm />)

      const emailInput = screen.getByPlaceholderText(/votre@email.fr/i)
      const submitButton = screen.getByRole('button', { name: /envoyer le lien/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test@example.com')
      })
    })

    it('ne devrait pas soumettre avec un email invalide', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ForgotPasswordForm />)

      const submitButton = screen.getByRole('button', { name: /envoyer le lien/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockResetPassword).not.toHaveBeenCalled()
      })
    })
  })

  describe('Message de succès', () => {
    it('devrait afficher un message de succès après envoi', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockResolvedValue({ success: true })
      renderWithProviders(<ForgotPasswordForm />)

      const emailInput = screen.getByPlaceholderText(/votre@email.fr/i)
      const submitButton = screen.getByRole('button', { name: /envoyer le lien/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/si un compte existe avec cette adresse/i)).toBeInTheDocument()
      })
    })

    it('devrait masquer le formulaire après succès', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockResolvedValue({ success: true })
      renderWithProviders(<ForgotPasswordForm />)

      const emailInput = screen.getByPlaceholderText(/votre@email.fr/i)
      const submitButton = screen.getByRole('button', { name: /envoyer le lien/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/votre@email.fr/i)).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /envoyer le lien/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Gestion des erreurs', () => {
    it('ne devrait pas afficher le message de succès en cas d\'échec', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockResolvedValue({ success: false, error: 'Erreur serveur' })
      renderWithProviders(<ForgotPasswordForm />)

      const emailInput = screen.getByPlaceholderText(/votre@email.fr/i)
      const submitButton = screen.getByRole('button', { name: /envoyer le lien/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText(/si un compte existe avec cette adresse/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibilité', () => {
    it('devrait avoir l\'autocomplete email', () => {
      renderWithProviders(<ForgotPasswordForm />)

      const emailInput = screen.getByPlaceholderText(/votre@email.fr/i)
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })
  })
})
