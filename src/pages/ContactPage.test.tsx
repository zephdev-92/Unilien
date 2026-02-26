import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { ContactPage } from './ContactPage'

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ContactPage', () => {
  describe('Navigation', () => {
    it('affiche le logo Unilien', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByText('Unilien')).toBeInTheDocument()
    })

    it('affiche au moins un lien de connexion', () => {
      renderWithProviders(<ContactPage />)
      const connexionLinks = screen.getAllByRole('link', { name: /connexion/i })
      expect(connexionLinks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Section hero', () => {
    it('affiche le titre \"Contactez-nous\"', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByText('Contactez-nous')).toBeInTheDocument()
    })

    it('affiche le sous-titre', () => {
      renderWithProviders(<ContactPage />)
      expect(
        screen.getByText(/notre équipe est là pour vous aider/i)
      ).toBeInTheDocument()
    })
  })

  describe('Formulaire de contact', () => {
    it('affiche le formulaire avec les champs Nom, Email, Sujet, Message', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByLabelText(/votre nom/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/votre email/i)).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /sujet/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/décrivez votre demande/i)).toBeInTheDocument()
    })

    it('affiche le titre du formulaire \"Envoyez-nous un message\"', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByText(/envoyez-nous un message/i)).toBeInTheDocument()
    })

    it('affiche le bouton \"Envoyer le message\"', () => {
      renderWithProviders(<ContactPage />)
      expect(
        screen.getByRole('button', { name: /envoyer le message/i })
      ).toBeInTheDocument()
    })

    it('affiche les options du select Sujet', () => {
      renderWithProviders(<ContactPage />)
      const sujetSelect = screen.getByRole('combobox', { name: /sujet/i })
      expect(sujetSelect).toContainHTML('Question générale')
      expect(sujetSelect).toContainHTML('Support technique')
      expect(sujetSelect).toContainHTML('Partenariat')
    })

    it('les champs de saisie acceptent du texte', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ContactPage />)

      const nameInput = screen.getByLabelText(/votre nom/i)
      await user.type(nameInput, 'Jean Dupont')
      expect(nameInput).toHaveValue('Jean Dupont')
    })

    it('le champ email accepte une adresse email', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ContactPage />)

      const emailInput = screen.getByLabelText(/votre email/i)
      await user.type(emailInput, 'jean@example.com')
      expect(emailInput).toHaveValue('jean@example.com')
    })
  })

  describe('Informations de contact', () => {
    it('affiche \"Autres moyens de nous contacter\"', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByText(/autres moyens de nous contacter/i)).toBeInTheDocument()
    })

    it('affiche l\'adresse email de contact', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByText('contact@unilien.fr')).toBeInTheDocument()
    })

    it('affiche la section FAQ', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByText('Questions fréquentes')).toBeInTheDocument()
    })
  })
})
