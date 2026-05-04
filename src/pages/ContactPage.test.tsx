import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
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
    it('affiche le titre "Contactez-nous"', () => {
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

    it('affiche le titre du formulaire "Envoyez-nous un message"', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByText(/envoyez-nous un message/i)).toBeInTheDocument()
    })

    it('affiche le bouton "Envoyer le message"', () => {
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

    it('regroupe les sujets par catégorie (Utilisation / Compte / Autre)', () => {
      const { container } = renderWithProviders(<ContactPage />)
      const optgroups = container.querySelectorAll('optgroup')
      const labels = Array.from(optgroups).map((g) => g.getAttribute('label'))
      expect(labels).toEqual(['Utilisation', 'Compte', 'Autre'])
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

  describe('Pièce jointe', () => {
    it('affiche le bouton "Ajouter un fichier" et la contrainte de format', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByRole('button', { name: /ajouter un fichier/i })).toBeInTheDocument()
      expect(screen.getByText(/PDF, PNG ou JPG · 5 Mo max/i)).toBeInTheDocument()
    })

    it('accepte un PDF valide et affiche son nom', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ContactPage />)

      const fileInput = screen.getByLabelText(/pièce jointe/i) as HTMLInputElement
      const validFile = new File(['hello'], 'document.pdf', { type: 'application/pdf' })
      await user.upload(fileInput, validFile)

      expect(screen.getByText('document.pdf')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /retirer la pièce jointe/i })
      ).toBeInTheDocument()
    })

    it('rejette un format non supporté', async () => {
      const user = userEvent.setup({ applyAccept: false })
      renderWithProviders(<ContactPage />)

      const fileInput = screen.getByLabelText(/pièce jointe/i) as HTMLInputElement
      const invalidFile = new File(['data'], 'archive.zip', { type: 'application/zip' })
      await user.upload(fileInput, invalidFile)

      expect(screen.getByText(/format non supporté/i)).toBeInTheDocument()
      expect(screen.queryByText('archive.zip')).not.toBeInTheDocument()
    })

    it('rejette un fichier trop volumineux (> 5 Mo)', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ContactPage />)

      const fileInput = screen.getByLabelText(/pièce jointe/i) as HTMLInputElement
      // 6 Mo de données pour dépasser la limite
      const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'gros.pdf', {
        type: 'application/pdf',
      })
      await user.upload(fileInput, bigFile)

      expect(screen.getByText(/dépasse 5 Mo/i)).toBeInTheDocument()
      expect(screen.queryByText('gros.pdf')).not.toBeInTheDocument()
    })

    it('permet de retirer la pièce jointe ajoutée', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ContactPage />)

      const fileInput = screen.getByLabelText(/pièce jointe/i) as HTMLInputElement
      const validFile = new File(['hello'], 'photo.png', { type: 'image/png' })
      await user.upload(fileInput, validFile)

      expect(screen.getByText('photo.png')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /retirer la pièce jointe/i }))
      expect(screen.queryByText('photo.png')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /ajouter un fichier/i })).toBeInTheDocument()
    })
  })

  describe('Informations de contact', () => {
    it('affiche "Autres moyens de nous contacter"', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByText(/autres moyens de nous contacter/i)).toBeInTheDocument()
    })

    it('affiche l\'adresse email de contact', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByText('contact@unilien.app')).toBeInTheDocument()
    })

    it('affiche la section FAQ', () => {
      renderWithProviders(<ContactPage />)
      expect(screen.getByText('Questions fréquentes')).toBeInTheDocument()
    })
  })
})
