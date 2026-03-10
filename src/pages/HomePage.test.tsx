import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { HomePage } from './HomePage'

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('HomePage', () => {
  describe('Navigation', () => {
    it('affiche le logo Unilien', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByAltText('Unilien')).toBeInTheDocument()
    })

    it('affiche les liens ancres de navigation (nav + footer)', () => {
      renderWithProviders(<HomePage />)
      // Nav + footer = liens dupliques
      expect(screen.getAllByText(/^fonctionnalites$/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/^tarifs$/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/^faq$/i).length).toBeGreaterThanOrEqual(1)
    })

    it('affiche le lien de connexion et le bouton essai gratuit', () => {
      renderWithProviders(<HomePage />)
      const connexionLinks = screen.getAllByRole('link', { name: /connexion/i })
      expect(connexionLinks.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByRole('link', { name: /^essai gratuit$/i })).toBeInTheDocument()
    })
  })

  describe('Section Hero', () => {
    it('affiche le message de risque legal', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/planning illegal peut vous couter/i)).toBeInTheDocument()
    })

    it('affiche le montant "8 000 euros" en emphase', () => {
      renderWithProviders(<HomePage />)
      // Apparait dans hero (em) + stats → au moins 2
      expect(screen.getAllByText('8 000 euros').length).toBeGreaterThanOrEqual(1)
    })

    it('affiche le CTA "Essayer gratuitement 14 jours"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByRole('link', { name: /essayer gratuitement 14 jours/i })).toBeInTheDocument()
    })

    it('affiche les items de reassurance', () => {
      renderWithProviders(<HomePage />)
      // "Aucune carte bancaire" apparait dans hero + CTA banner
      expect(screen.getAllByText(/aucune carte bancaire requise/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/wcag aaa/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/juriste specialise/i).length).toBeGreaterThanOrEqual(1)
    })

    it('affiche le mockup bouclier juridique', () => {
      renderWithProviders(<HomePage />)
      // Bouclier apparait dans hero + conformite
      expect(screen.getAllByText(/repos 11h non respecte/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Section Chiffres cles', () => {
    it('affiche les 4 statistiques', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('280 000')).toBeInTheDocument()
      expect(screen.getByText('2 000+')).toBeInTheDocument()
      expect(screen.getByText('-40 %')).toBeInTheDocument()
      // "8 000 euros" apparait aussi dans le hero
      expect(screen.getAllByText('8 000 euros').length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Section Problemes', () => {
    it('affiche les 3 pain points', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/peur de faire une erreur/i)).toBeInTheDocument()
      expect(screen.getByText(/excel est inutilisable/i)).toBeInTheDocument()
      expect(screen.getByText(/mon planning est legal/i)).toBeInTheDocument()
    })
  })

  describe('Section Fonctionnalites', () => {
    it('affiche le titre "Tout ce dont vous avez besoin"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/tout ce dont vous avez besoin/i)).toBeInTheDocument()
    })

    it('affiche les 6 feature cards', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Planning intelligent')).toBeInTheDocument()
      // "Bouclier IDCC 3239" est aussi un titre de feature card
      expect(screen.getAllByText(/bouclier idcc 3239/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Calcul de paie automatique')).toBeInTheDocument()
      // "Cahier de liaison" apparait aussi dans la section tarifs
      expect(screen.getAllByText('Cahier de liaison').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Notifications multi-canal')).toBeInTheDocument()
      expect(screen.getByText('Tableaux de bord PCH')).toBeInTheDocument()
    })
  })

  describe('Section Conformite', () => {
    it('affiche le titre du bouclier juridique', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/ce n'est pas juste un agenda/i)).toBeInTheDocument()
    })

    it('affiche les alertes IDCC 3239', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getAllByText(/pause 20 min/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/planning de la semaine/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Section Tarifs', () => {
    it('affiche les 3 plans tarifaires', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Gratuit')).toBeInTheDocument()
      expect(screen.getByText('Essentiel')).toBeInTheDocument()
      expect(screen.getByText('Pro')).toBeInTheDocument()
    })

    it('affiche les prix', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('9,90')).toBeInTheDocument()
      expect(screen.getByText('24,90')).toBeInTheDocument()
    })

    it('affiche le badge "Le plus populaire"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Le plus populaire')).toBeInTheDocument()
    })
  })

  describe('Section FAQ', () => {
    it('affiche "Questions frequentes"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/questions frequentes/i)).toBeInTheDocument()
    })

    it('affiche les questions FAQ', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/qu'est-ce que la convention/i)).toBeInTheDocument()
      expect(screen.getByText(/vraiment accessible/i)).toBeInTheDocument()
      expect(screen.getByText(/donnees sont-elles securisees/i)).toBeInTheDocument()
    })

    it('deplie une question au clic', async () => {
      const user = userEvent.setup()
      renderWithProviders(<HomePage />)

      const faqButton = screen.getByText(/qu'est-ce que la convention/i).closest('button')!
      expect(faqButton).toHaveAttribute('aria-expanded', 'false')

      await user.click(faqButton)
      expect(faqButton).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText(/particuliers employeurs et de l'emploi a domicile/i)).toBeInTheDocument()
    })
  })

  describe('Section Temoignages', () => {
    it('affiche "Ils nous font confiance"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/ils nous font confiance/i)).toBeInTheDocument()
    })

    it('affiche les 3 temoignages', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Claire Fontaine')).toBeInTheDocument()
      expect(screen.getByText('Jean-Dominique Moreau')).toBeInTheDocument()
      expect(screen.getByText('Sophie Martin')).toBeInTheDocument()
    })
  })

  describe('CTA & Footer', () => {
    it('affiche le CTA final "Protegez-vous"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/protegez-vous/i)).toBeInTheDocument()
    })

    it('affiche le footer avec categories', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Produit')).toBeInTheDocument()
      expect(screen.getByText('Legal')).toBeInTheDocument()
      expect(screen.getByText('Support')).toBeInTheDocument()
    })

    it('affiche les liens legaux', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Mentions legales')).toBeInTheDocument()
      expect(screen.getByText('Politique de confidentialite')).toBeInTheDocument()
      expect(screen.getByText('CGU')).toBeInTheDocument()
      expect(screen.getByText('RGPD')).toBeInTheDocument()
    })

    it('affiche le copyright avec l\'annee en cours', () => {
      renderWithProviders(<HomePage />)
      const year = new Date().getFullYear().toString()
      expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
    })

    it('affiche le lien de contact', () => {
      renderWithProviders(<HomePage />)
      const contactLinks = screen.getAllByRole('link', { name: /contact/i })
      expect(contactLinks.length).toBeGreaterThanOrEqual(1)
    })
  })
})
