import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { ComplianceHelp } from './ComplianceHelp'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ComplianceHelp', () => {
  describe('En-tête', () => {
    it('affiche le titre "Bouclier Juridique"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByRole('heading', { name: /bouclier juridique/i })).toBeInTheDocument()
    })

    it('mentionne la convention collective IDCC 3239', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByText(/IDCC 3239/)).toBeInTheDocument()
    })
  })

  describe('Règles de temps de travail', () => {
    it('affiche la section "Règles de temps de travail"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByRole('heading', { name: /règles de temps de travail/i })).toBeInTheDocument()
    })

    it('affiche la règle "Repos quotidien"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByRole('heading', { name: /repos quotidien/i })).toBeInTheDocument()
    })

    it('affiche la limite "Minimum 11h consécutives"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByText(/11h consécutives/i)).toBeInTheDocument()
    })

    it('affiche la règle "Repos hebdomadaire"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByRole('heading', { name: /repos hebdomadaire/i })).toBeInTheDocument()
    })

    it('affiche la règle "Durée quotidienne maximale"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByRole('heading', { name: /durée quotidienne maximale/i })).toBeInTheDocument()
    })

    it('affiche la règle "Durée hebdomadaire maximale"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByRole('heading', { name: /durée hebdomadaire maximale/i })).toBeInTheDocument()
    })

    it('affiche la règle "Pause obligatoire"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByRole('heading', { name: /pause obligatoire/i })).toBeInTheDocument()
    })

    it('affiche la règle "Chevauchement"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByRole('heading', { name: /chevauchement/i })).toBeInTheDocument()
    })
  })

  describe('Majorations de salaire', () => {
    it('affiche la section "Majorations de salaire"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByRole('heading', { name: /majorations de salaire/i })).toBeInTheDocument()
    })

    it('affiche la majoration dimanche +30%', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByText('+30%')).toBeInTheDocument()
    })

    it('affiche la majoration jour férié habituel +60%', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByText('+60%')).toBeInTheDocument()
    })

    it('affiche la majoration nuit +20%', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByText('+20%')).toBeInTheDocument()
    })
  })

  describe('Jours fériés', () => {
    it('affiche la section "Jours fériés"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByRole('heading', { name: /jours fériés/i })).toBeInTheDocument()
    })

    it('liste le 1er janvier', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByText(/1er janvier/i)).toBeInTheDocument()
    })

    it('liste le 25 décembre', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByText(/25 décembre/i)).toBeInTheDocument()
    })
  })

  describe('Avertissement légal', () => {
    it('affiche le message "Besoin d\'aide ?"', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByText(/besoin d'aide/i)).toBeInTheDocument()
    })

    it('précise que le module est à titre informatif', () => {
      renderWithProviders(<ComplianceHelp />)
      expect(screen.getByText(/titre informatif/i)).toBeInTheDocument()
    })
  })
})
