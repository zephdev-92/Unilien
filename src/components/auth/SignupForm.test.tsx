import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { SignupForm } from './SignupForm'

// Mock useAuth
const mockSignUp = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    isLoading: false,
    error: null,
  }),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignUp.mockResolvedValue({ success: true })
  })

  describe('Rendu initial', () => {
    it('devrait afficher le titre "Créer un compte"', () => {
      renderWithProviders(<SignupForm />)

      expect(screen.getByRole('heading', { name: /créer un compte/i })).toBeInTheDocument()
    })

    it('devrait afficher le sélecteur de type de compte', () => {
      renderWithProviders(<SignupForm />)

      expect(screen.getByText(/sélectionnez votre profil/i)).toBeInTheDocument()
    })

    it('devrait afficher les champs prénom et nom', () => {
      renderWithProviders(<SignupForm />)

      expect(screen.getByPlaceholderText(/votre prénom/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/votre nom/i)).toBeInTheDocument()
    })

    it('devrait afficher le champ email', () => {
      renderWithProviders(<SignupForm />)

      expect(screen.getByPlaceholderText(/votre@email.fr/i)).toBeInTheDocument()
    })

    it('devrait afficher le champ téléphone (optionnel)', () => {
      renderWithProviders(<SignupForm />)

      expect(screen.getByPlaceholderText(/06 12 34 56 78/i)).toBeInTheDocument()
    })

    it('devrait afficher les champs mot de passe', () => {
      renderWithProviders(<SignupForm />)

      expect(screen.getByPlaceholderText(/créez un mot de passe sécurisé/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/confirmez votre mot de passe/i)).toBeInTheDocument()
    })

    it('devrait afficher le bouton de création', () => {
      renderWithProviders(<SignupForm />)

      expect(screen.getByRole('button', { name: /créer mon compte/i })).toBeInTheDocument()
    })

    it('devrait afficher le lien vers connexion', () => {
      renderWithProviders(<SignupForm />)

      expect(screen.getByText(/se connecter/i)).toBeInTheDocument()
    })
  })

  describe('Accessibilité', () => {
    it('devrait avoir un lien skip vers le formulaire', () => {
      renderWithProviders(<SignupForm />)

      const skipLink = screen.getByText(/aller au formulaire d'inscription/i)
      expect(skipLink).toBeInTheDocument()
    })

    it('devrait avoir les bons attributs autocomplete sur les champs', () => {
      renderWithProviders(<SignupForm />)

      expect(screen.getByPlaceholderText(/votre prénom/i)).toHaveAttribute('autocomplete', 'given-name')
      expect(screen.getByPlaceholderText(/votre nom/i)).toHaveAttribute('autocomplete', 'family-name')
      expect(screen.getByPlaceholderText(/votre@email.fr/i)).toHaveAttribute('autocomplete', 'email')
      expect(screen.getByPlaceholderText(/06 12 34 56 78/i)).toHaveAttribute('autocomplete', 'tel')
    })
  })

  describe('Soumission du formulaire', () => {
    it('devrait avoir un formulaire avec ID', () => {
      renderWithProviders(<SignupForm />)

      const form = document.getElementById('signup-form')
      expect(form).toBeInTheDocument()
    })
  })
})
