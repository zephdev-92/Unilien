import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { HomePage } from './HomePage'

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('HomePage', () => {
  describe('Navigation', () => {
    it('affiche le logo Unilien', () => {
      renderWithProviders(<HomePage />)
      const logo = screen.getByAltText('Unilien')
      expect(logo).toBeInTheDocument()
    })

    it('affiche au moins un lien de connexion', () => {
      renderWithProviders(<HomePage />)
      // Plusieurs liens "Connexion" possibles (nav + footer)
      const connexionLinks = screen.getAllByRole('link', { name: /connexion/i })
      expect(connexionLinks.length).toBeGreaterThanOrEqual(1)
    })

    it('affiche le bouton \"S\'inscrire gratuitement\"', () => {
      renderWithProviders(<HomePage />)
      // renderWithProviders inclut BrowserRouter — les RouterLink fonctionnent
      expect(screen.getByRole('link', { name: /s'inscrire gratuitement/i })).toBeInTheDocument()
    })
  })

  describe('Section Hero', () => {
    it('affiche le titre principal', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/simplifiez la gestion de vos/i)).toBeInTheDocument()
    })

    it('affiche le sous-titre avec \"auxiliaires de vie\"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('auxiliaires de vie')).toBeInTheDocument()
    })

    it('affiche le bouton CTA \"Commencer gratuitement\"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByRole('link', { name: /commencer gratuitement/i })).toBeInTheDocument()
    })

    it('affiche \"Gratuit pour commencer\"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Gratuit pour commencer')).toBeInTheDocument()
    })
  })

  describe('Section Features', () => {
    it('affiche le titre \"Tout ce dont vous avez besoin\"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/tout ce dont vous avez besoin/i)).toBeInTheDocument()
    })

    it('affiche la feature \"Planning partagé\"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Planning partagé')).toBeInTheDocument()
    })

    it('affiche la feature \"Conformité légale\"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Conformité légale')).toBeInTheDocument()
    })
  })

  describe('Section Pour qui', () => {
    it('affiche \"Pour les particuliers employeurs\"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/pour les particuliers employeurs/i)).toBeInTheDocument()
    })

    it('affiche \"Pour les auxiliaires de vie\"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/pour les auxiliaires de vie/i)).toBeInTheDocument()
    })

    it('affiche les liens d\'inscription segmentés', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByRole('link', { name: /s'inscrire comme employeur/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /s'inscrire comme auxiliaire/i })).toBeInTheDocument()
    })
  })

  describe('Section Témoignages', () => {
    it('affiche \"Ils nous font confiance\"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/ils nous font confiance/i)).toBeInTheDocument()
    })

    it('affiche le témoignage de Marie D.', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText('Marie D.')).toBeInTheDocument()
    })
  })

  describe('Section CTA & Footer', () => {
    it('affiche \"Prêt à simplifier votre quotidien ?\"', () => {
      renderWithProviders(<HomePage />)
      expect(screen.getByText(/prêt à simplifier votre quotidien/i)).toBeInTheDocument()
    })

    it('affiche le lien de contact dans le footer', () => {
      renderWithProviders(<HomePage />)
      // Il y a plusieurs liens "Contact" (nav + footer)
      const contactLinks = screen.getAllByRole('link', { name: /contact/i })
      expect(contactLinks.length).toBeGreaterThanOrEqual(1)
    })

    it('affiche l\'année en cours dans le footer', () => {
      renderWithProviders(<HomePage />)
      const year = new Date().getFullYear().toString()
      expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
    })
  })
})
