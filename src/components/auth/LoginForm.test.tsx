import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { LoginForm } from './LoginForm'

// Mock useAuth
const mockSignIn = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isLoading: false,
    error: null,
  }),
}))

// Mock useSearchParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams()],
  }
})

// Wrapper pour les tests
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>{ui}</BrowserRouter>
    </ChakraProvider>
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignIn.mockResolvedValue({ success: true })
  })

  describe('Rendu initial', () => {
    it('devrait afficher le titre "Connexion"', () => {
      renderWithProviders(<LoginForm />)

      expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument()
    })

    it('devrait afficher le champ email', () => {
      renderWithProviders(<LoginForm />)

      expect(screen.getByPlaceholderText(/votre@email.fr/i)).toBeInTheDocument()
    })

    it('devrait afficher le champ mot de passe', () => {
      renderWithProviders(<LoginForm />)

      expect(screen.getByPlaceholderText(/votre mot de passe/i)).toBeInTheDocument()
    })

    it('devrait afficher le bouton de connexion', () => {
      renderWithProviders(<LoginForm />)

      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
    })

    it('devrait afficher le lien mot de passe oublié', () => {
      renderWithProviders(<LoginForm />)

      expect(screen.getByText(/mot de passe oublié/i)).toBeInTheDocument()
    })

    it('devrait afficher le lien vers inscription', () => {
      renderWithProviders(<LoginForm />)

      expect(screen.getByText(/créer un compte/i)).toBeInTheDocument()
    })
  })

  describe('Soumission du formulaire', () => {
    it('devrait appeler signIn avec les bonnes données', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm />)

      const emailInput = screen.getByPlaceholderText(/votre@email.fr/i)
      const passwordInput = screen.getByPlaceholderText(/votre mot de passe/i)
      const submitButton = screen.getByRole('button', { name: /se connecter/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123',
        })
      })
    })

    it('ne devrait pas soumettre si le formulaire est invalide', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /se connecter/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).not.toHaveBeenCalled()
      })
    })
  })

  describe('Accessibilité', () => {
    it('devrait avoir un lien skip vers le formulaire', () => {
      renderWithProviders(<LoginForm />)

      const skipLink = screen.getByText(/aller au formulaire de connexion/i)
      expect(skipLink).toBeInTheDocument()
    })

    it('devrait avoir un formulaire avec un ID', () => {
      renderWithProviders(<LoginForm />)

      const form = document.getElementById('login-form')
      expect(form).toBeInTheDocument()
    })

    it('devrait avoir des champs avec autocomplete approprié', () => {
      renderWithProviders(<LoginForm />)

      const emailInput = screen.getByPlaceholderText(/votre@email.fr/i)
      const passwordInput = screen.getByPlaceholderText(/votre mot de passe/i)

      expect(emailInput).toHaveAttribute('autocomplete', 'email')
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })
  })
})
