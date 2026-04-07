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
      expect(screen.getAllByAltText('Unilien').length).toBeGreaterThanOrEqual(1)
    })

    it('affiche les liens ancres de navigation (nav + footer)', () => {
      renderWithProviders(<HomePage />)
      // Nav + footer = liens dupliques
      expect(screen.getAllByText(/^fonctionnalit[ée]s$/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/^tarifs$/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/^faq$/i).length).toBeGreaterThanOrEqual(1)
    })

    it('affiche le lien de connexion et le bouton essai gratuit', () => {
      renderWithProviders(<HomePage />)
      const connectLinks = screen.getAllByRole('link', { name: /se connecter/i })
      expect(connectLinks.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByRole('link', { name: /^essai gratuit$/i })).toBeInTheDocument()
    })
  })

  describe('Section Hero', () => {
    it('affiche le titre principal', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/g[ée]rez vos auxiliaires/i)).toBeInTheDocument()
    })

    it('affiche le CTA "Essayer gratuitement 30 jours"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByRole('link', { name: /essayer gratuitement 30 jours/i })).toBeInTheDocument()
    })

    it('affiche les items de reassurance', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getAllByText(/aucune carte bancaire/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/accessible et simplifi[ée]/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/conforme idcc 3239/i).length).toBeGreaterThanOrEqual(1)
    })

    it('affiche le mockup bouclier juridique', () => {
      renderWithProviders(<HomePage />)
      // Bouclier apparait dans hero + conformite
      expect(screen.getAllByText(/repos 11h non respect[ée]/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Section Chiffres cles', () => {
    it('affiche les 4 statistiques', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('280 000')).toBeInTheDocument()
      expect(screen.getByText('2 000+')).toBeInTheDocument()
      expect(screen.getByText('-40 %')).toBeInTheDocument()
      expect(screen.getByText('8 000 €')).toBeInTheDocument()
    })
  })

  describe('Section Problemes', () => {
    it('affiche les 3 pain points', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/je veux [êe]tre s[ûu]r de bien faire/i)).toBeInTheDocument()
      expect(screen.getByText(/mes outils ne sont pas adapt[ée]s/i)).toBeInTheDocument()
      expect(screen.getByText(/je manque de visibilit[ée]/i)).toBeInTheDocument()
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
      expect(screen.getByText('Bouclier juridique')).toBeInTheDocument()
      expect(screen.getByText('Calcul de paie automatique')).toBeInTheDocument()
      expect(screen.getAllByText('Cahier de liaison').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('Tableaux PCH')).toBeInTheDocument()
    })
  })

  describe('Section Conformite', () => {
    it('affiche le titre de la section conformite', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/une protection automatique/i)).toBeInTheDocument()
    })

    it('affiche les alertes IDCC 3239', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getAllByText(/pause 20 min/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/planning de la semaine/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Section Tarifs', () => {
    it('affiche le plan Essentiel', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Essentiel')).toBeInTheDocument()
    })

    it('affiche le prix et le badge essai', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('9,90 €')).toBeInTheDocument()
      expect(screen.getByText('30 jours offerts')).toBeInTheDocument()
    })

    it('affiche les features du plan Essentiel', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Auxiliaires illimités')).toBeInTheDocument()
      expect(screen.getByText('Bulletins de paie PDF')).toBeInTheDocument()
      expect(screen.getByText('Conformité IDCC 3239 automatique')).toBeInTheDocument()
    })
  })

  describe('Section FAQ', () => {
    it('affiche "Questions frequentes"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/questions fr[ée]quentes/i)).toBeInTheDocument()
    })

    it('affiche les questions FAQ', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/qu.est-ce que la convention/i)).toBeInTheDocument()
      // "vraiment accessible" apparait dans FAQ + temoignage
      expect(screen.getAllByText(/vraiment accessible/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/donn[ée]es sont-elles s[ée]curis[ée]es/i)).toBeInTheDocument()
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
    it('affiche le CTA final', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/simplifiez votre quotidien/i)).toBeInTheDocument()
    })

    it('affiche le footer avec categories', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Produit')).toBeInTheDocument()
      expect(screen.getByText('Légal')).toBeInTheDocument()
      expect(screen.getByText('Support')).toBeInTheDocument()
    })

    it('affiche les liens legaux', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Mentions légales')).toBeInTheDocument()
      expect(screen.getByText('Politique de confidentialité')).toBeInTheDocument()
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
