import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile, createMockShift } from '@/test/fixtures'
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

  describe('Greeting pour différents rôles', () => {
    it('affiche le greeting pour le rôle employer', () => {
      renderWithProviders(<WelcomeCard profile={createMockProfile({ role: 'employer', firstName: 'Pierre' })} />)
      expect(screen.getByText(/Pierre/)).toBeInTheDocument()
    })

    it('affiche le greeting pour le rôle employee', () => {
      renderWithProviders(<WelcomeCard profile={createMockProfile({ role: 'employee', firstName: 'Marie' })} />)
      expect(screen.getByText(/Marie/)).toBeInTheDocument()
    })

    it('affiche le greeting pour le rôle caregiver', () => {
      renderWithProviders(<WelcomeCard profile={createMockProfile({ role: 'caregiver', firstName: 'Luc' })} />)
      expect(screen.getByText(/Luc/)).toBeInTheDocument()
    })
  })

  describe('Eyebrow date', () => {
    it('affiche la date du jour formatée', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 2, 6, 10, 0, 0)) // 6 mars 2026
      renderWithProviders(<WelcomeCard profile={createMockProfile()} />)
      expect(screen.getByText(/vendredi 6 mars 2026/i)).toBeInTheDocument()
    })
  })

  describe('Chips contextuels', () => {
    it('affiche le chip prochaine intervention quand nextShift est fourni', () => {
      vi.useFakeTimers()
      const today = new Date(2026, 2, 6, 10, 0, 0)
      vi.setSystemTime(today)
      const shift = createMockShift({ date: today, startTime: '14:00' })
      renderWithProviders(
        <WelcomeCard profile={createMockProfile()} nextShift={shift} />
      )
      expect(screen.getByText(/Prochaine intervention à 14:00/)).toBeInTheDocument()
    })

    it('affiche "Demain" quand le shift est le lendemain', () => {
      vi.useFakeTimers()
      const today = new Date(2026, 2, 6, 10, 0, 0)
      vi.setSystemTime(today)
      const tomorrow = new Date(2026, 2, 7)
      const shift = createMockShift({ date: tomorrow, startTime: '09:00' })
      renderWithProviders(
        <WelcomeCard profile={createMockProfile()} nextShift={shift} />
      )
      expect(screen.getByText(/Demain à 09:00/)).toBeInTheDocument()
    })

    it('affiche le badge anomalies quand complianceAlertCount > 0', () => {
      renderWithProviders(
        <WelcomeCard profile={createMockProfile()} complianceAlertCount={3} />
      )
      expect(screen.getByText(/3 anomalies détectées/)).toBeInTheDocument()
    })

    it('n\'affiche pas le badge anomalies si complianceAlertCount est 0', () => {
      renderWithProviders(
        <WelcomeCard profile={createMockProfile()} complianceAlertCount={0} />
      )
      expect(screen.queryByText(/anomalie/)).not.toBeInTheDocument()
    })
  })

  describe('CTA Planning', () => {
    it('affiche le lien "Voir le planning du jour" en permanence', () => {
      renderWithProviders(<WelcomeCard profile={createMockProfile()} />)
      expect(screen.getByText(/Voir le planning du jour/)).toBeInTheDocument()
    })
  })

  describe('Skeleton loading', () => {
    it('affiche le skeleton quand loading=true', () => {
      const { container } = renderWithProviders(
        <WelcomeCard profile={createMockProfile()} loading={true} />
      )
      // Chakra Skeleton renders with class containing "skeleton" or the chakra-skeleton data attr
      const skeletons = container.querySelectorAll('[class*="chakra-skeleton"], [data-status]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('n\'affiche pas le greeting en mode skeleton', () => {
      renderWithProviders(
        <WelcomeCard profile={createMockProfile({ firstName: 'Sophie' })} loading={true} />
      )
      expect(screen.queryByText(/Sophie/)).not.toBeInTheDocument()
    })
  })
})
