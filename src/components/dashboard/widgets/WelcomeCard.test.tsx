import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'
import { WelcomeCard } from './WelcomeCard'

// ── Helpers ────────────────────────────────────────────────────────────────────

function setHour(hour: number) {
  const now = new Date()
  now.setHours(hour, 0, 0, 0)
  vi.setSystemTime(now)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('WelcomeCard', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Salutation selon l\'heure', () => {
    it('affiche "Bonne nuit" entre minuit et 4h59', () => {
      vi.useFakeTimers()
      setHour(2)
      renderWithProviders(<WelcomeCard profile={createMockProfile({ firstName: 'Sophie' })} />)
      expect(screen.getByText(/bonne nuit, Sophie/i)).toBeInTheDocument()
    })

    it('affiche "Bonne nuit" à 4h59 (limite)', () => {
      vi.useFakeTimers()
      setHour(4)
      renderWithProviders(<WelcomeCard profile={createMockProfile({ firstName: 'Luc' })} />)
      expect(screen.getByText(/bonne nuit, Luc/i)).toBeInTheDocument()
    })

    it('affiche "Bonjour" à 5h (début de la journée)', () => {
      vi.useFakeTimers()
      setHour(5)
      renderWithProviders(<WelcomeCard profile={createMockProfile({ firstName: 'Marc' })} />)
      expect(screen.getByText(/bonjour, Marc/i)).toBeInTheDocument()
    })

    it('affiche "Bonjour" entre 5h et 11h59', () => {
      vi.useFakeTimers()
      setHour(9)
      renderWithProviders(<WelcomeCard profile={createMockProfile({ firstName: 'Jean' })} />)
      expect(screen.getByText(/bonjour, Jean/i)).toBeInTheDocument()
    })

    it('affiche "Bon après-midi" à 12h', () => {
      vi.useFakeTimers()
      setHour(12)
      renderWithProviders(<WelcomeCard profile={createMockProfile({ firstName: 'Alice' })} />)
      expect(screen.getByText(/bon après-midi, Alice/i)).toBeInTheDocument()
    })

    it('affiche "Bon après-midi" entre 12h et 17h59', () => {
      vi.useFakeTimers()
      setHour(15)
      renderWithProviders(<WelcomeCard profile={createMockProfile({ firstName: 'Marie' })} />)
      expect(screen.getByText(/bon après-midi, Marie/i)).toBeInTheDocument()
    })

    it('affiche "Bonsoir" à 18h', () => {
      vi.useFakeTimers()
      setHour(18)
      renderWithProviders(<WelcomeCard profile={createMockProfile({ firstName: 'Paul' })} />)
      expect(screen.getByText(/bonsoir, Paul/i)).toBeInTheDocument()
    })

    it('affiche "Bonsoir" à 23h', () => {
      vi.useFakeTimers()
      setHour(23)
      renderWithProviders(<WelcomeCard profile={createMockProfile({ firstName: 'Nadia' })} />)
      expect(screen.getByText(/bonsoir, Nadia/i)).toBeInTheDocument()
    })
  })

  describe('Labels de rôle', () => {
    it('affiche "Employeur" pour le rôle employer', () => {
      renderWithProviders(<WelcomeCard profile={createMockProfile({ role: 'employer' })} />)
      expect(screen.getByText(/Employeur/)).toBeInTheDocument()
    })

    it('affiche "Auxiliaire de vie" pour le rôle employee', () => {
      renderWithProviders(<WelcomeCard profile={createMockProfile({ role: 'employee' })} />)
      expect(screen.getByText(/Auxiliaire de vie/)).toBeInTheDocument()
    })

    it('affiche "Aidant familial" pour le rôle caregiver', () => {
      renderWithProviders(<WelcomeCard profile={createMockProfile({ role: 'caregiver' })} />)
      expect(screen.getByText(/Aidant familial/)).toBeInTheDocument()
    })
  })

  describe('Descriptions de rôle', () => {
    it('affiche la description employeur', () => {
      renderWithProviders(<WelcomeCard profile={createMockProfile({ role: 'employer' })} />)
      expect(screen.getByText(/Gérez vos auxiliaires/)).toBeInTheDocument()
    })

    it('affiche la description auxiliaire', () => {
      renderWithProviders(<WelcomeCard profile={createMockProfile({ role: 'employee' })} />)
      expect(screen.getByText(/Consultez votre planning/)).toBeInTheDocument()
    })

    it('affiche la description aidant', () => {
      renderWithProviders(<WelcomeCard profile={createMockProfile({ role: 'caregiver' })} />)
      expect(screen.getByText(/Suivez les soins/)).toBeInTheDocument()
    })
  })
})
