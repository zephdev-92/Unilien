import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { HomePage } from './HomePage'

// ─── Tests (landing v4 « moderne ») ──────────────────────────────────────────

describe('HomePage', () => {
  describe('Navigation', () => {
    it('affiche le logo Unilien', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getAllByAltText('Unilien').length).toBeGreaterThanOrEqual(1)
    })

    it('affiche les liens ancres de navigation', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getAllByText(/^produit$/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/^tarifs$/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/^faq$/i).length).toBeGreaterThanOrEqual(1)
    })

    it('affiche le lien de connexion et le bouton essai gratuit', () => {
      renderWithProviders(<HomePage />)
      // Liens dupliqués entre la nav desktop et le menu mobile (panneau inert tant qu'il est fermé)
      expect(screen.getAllByRole('link', { name: /se connecter/i }).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByRole('link', { name: /^essai gratuit$/i }).length).toBeGreaterThanOrEqual(1)
    })

    it('ouvre et ferme le menu mobile via le bouton burger', async () => {
      const user = userEvent.setup()
      renderWithProviders(<HomePage />)

      const burger = screen.getByRole('button', { name: /ouvrir le menu/i })
      expect(burger).toHaveAttribute('aria-expanded', 'false')

      await user.click(burger)
      const burgerOpen = screen.getByRole('button', { name: /fermer le menu/i })
      expect(burgerOpen).toHaveAttribute('aria-expanded', 'true')

      await user.click(burgerOpen)
      expect(screen.getByRole('button', { name: /ouvrir le menu/i })).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('Section Hero', () => {
    it('affiche le titre principal', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getAllByText(/l'emploi à domicile/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/enfin serein/i)).toBeInTheDocument()
    })

    it('affiche le CTA "Essayer gratuitement" et la réassurance', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByRole('link', { name: /essayer gratuitement/i })).toBeInTheDocument()
      expect(screen.getAllByText(/sans carte bancaire/i).length).toBeGreaterThanOrEqual(1)
    })

    it('affiche le mockup planning avec alerte de pause', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/planning de la semaine/i)).toBeInTheDocument()
      expect(screen.getByText(/pause 20 min manquante/i)).toBeInTheDocument()
    })
  })

  describe('Section Produit (bento)', () => {
    it('affiche le titre de section', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/réuni au même endroit/i)).toBeInTheDocument()
    })

    it('affiche les cellules de fonctionnalités', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Le copilote conformité')).toBeInTheDocument()
      expect(screen.getByText('Planning intelligent')).toBeInTheDocument()
      expect(screen.getByText('Récap des heures Cesu')).toBeInTheDocument()
      expect(screen.getByText('Tableau PCH')).toBeInTheDocument()
    })
  })

  describe('Section Pour qui (personas)', () => {
    it('affiche les deux profils', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/vous pilotez votre propre équipe/i)).toBeInTheDocument()
      expect(screen.getByText(/vous accompagnez un proche/i)).toBeInTheDocument()
    })
  })

  describe('Section Témoignages', () => {
    it('affiche le titre et les trois témoignages', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Témoignages')).toBeInTheDocument()
      expect(screen.getByText('Sophie M., 41 ans')).toBeInTheDocument()
      expect(screen.getByText('Jean-Dominique M., 38 ans')).toBeInTheDocument()
      // « Sébastien B., 35 ans » apparaît aussi dans le badge persona
      expect(screen.getAllByText('Sébastien B., 35 ans').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Section Tarifs', () => {
    it('affiche le plan Essentiel et son prix', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Essentiel')).toBeInTheDocument()
      expect(screen.getByText('9,90')).toBeInTheDocument()
    })

    it('affiche les features du plan', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Auxiliaires illimités')).toBeInTheDocument()
      expect(screen.getByText(/copilote conformité idcc 3239 inclus/i)).toBeInTheDocument()
    })
  })

  describe('Section Comment ça marche', () => {
    it('affiche les trois étapes', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Créez votre espace')).toBeInTheDocument()
      expect(screen.getByText("Le copilote s'active")).toBeInTheDocument()
      expect(screen.getByText('Vous reprenez votre temps')).toBeInTheDocument()
    })
  })

  describe('Section FAQ', () => {
    it('affiche "Questions fréquentes" et les questions', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/questions fréquentes/i)).toBeInTheDocument()
      expect(screen.getByText(/qu'est-ce que la convention idcc 3239/i)).toBeInTheDocument()
      expect(screen.getByText(/mes données sont-elles bien protégées/i)).toBeInTheDocument()
    })

    it('affiche la réponse de la première question (ouverte par défaut)', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/convention collective qui encadre l'emploi à/i)).toBeInTheDocument()
    })
  })

  describe('CTA & Footer', () => {
    it('affiche les deux CTA', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/reprenez votre dimanche/i)).toBeInTheDocument()
      expect(screen.getByText(/prêt à reprendre du temps/i)).toBeInTheDocument()
    })

    it('affiche le footer avec catégories', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Légal')).toBeInTheDocument()
      expect(screen.getByText('Support')).toBeInTheDocument()
      expect(screen.getAllByText(/^produit$/i).length).toBeGreaterThanOrEqual(1)
    })

    it('affiche les liens légaux', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Mentions légales')).toBeInTheDocument()
      expect(screen.getByText('CGU')).toBeInTheDocument()
      expect(screen.getByText('RGPD')).toBeInTheDocument()
    })

    it('affiche le copyright', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/2026 Unilien/i)).toBeInTheDocument()
    })
  })
})
