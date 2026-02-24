import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { PaySummary, MajorationIndicator } from './PaySummary'
import type { ComputedPay } from '@/types'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makePay(overrides: Partial<ComputedPay> = {}): ComputedPay {
  return {
    basePay: 80,
    sundayMajoration: 0,
    holidayMajoration: 0,
    nightMajoration: 0,
    overtimeMajoration: 0,
    presenceResponsiblePay: 0,
    nightPresenceAllowance: 0,
    totalPay: 80,
    ...overrides,
  }
}

// Paie simple sans majorations
const paySimple = makePay()

// Paie avec majoration dimanche
const paySunday = makePay({
  sundayMajoration: 24,
  totalPay: 104,
})

// Paie avec toutes les majorations
const payFull = makePay({
  sundayMajoration: 24,
  holidayMajoration: 48,
  nightMajoration: 16,
  overtimeMajoration: 10,
  presenceResponsiblePay: 20,
  nightPresenceAllowance: 5,
  totalPay: 203,
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PaySummary', () => {
  describe('Mode compact', () => {
    it('affiche la durée × taux horaire', () => {
      renderWithProviders(
        <PaySummary pay={paySimple} hourlyRate={10} durationHours={8} compact />
      )
      expect(screen.getByText(/8\.0h × 10,00 €/)).toBeInTheDocument()
    })

    it('affiche le total pay en mode compact', () => {
      renderWithProviders(
        <PaySummary pay={paySimple} hourlyRate={10} durationHours={8} compact />
      )
      expect(screen.getByText('80,00 €')).toBeInTheDocument()
    })

    it('affiche "+ majorations" si des majorations existent', () => {
      renderWithProviders(
        <PaySummary pay={paySunday} hourlyRate={10} durationHours={8} compact />
      )
      expect(screen.getByText(/\+ majorations/)).toBeInTheDocument()
    })

    it('n\'affiche pas "+ majorations" si aucune majoration', () => {
      renderWithProviders(
        <PaySummary pay={paySimple} hourlyRate={10} durationHours={8} compact />
      )
      expect(screen.queryByText(/\+ majorations/)).not.toBeInTheDocument()
    })
  })

  describe('Mode normal — en-tête', () => {
    it('affiche "Rémunération estimée"', () => {
      renderWithProviders(
        <PaySummary pay={paySimple} hourlyRate={10} durationHours={8} />
      )
      expect(screen.getByText('Rémunération estimée')).toBeInTheDocument()
    })

    it('affiche le total pay', () => {
      renderWithProviders(
        <PaySummary pay={paySimple} hourlyRate={10} durationHours={8} />
      )
      // "80,00 €" peut apparaître plusieurs fois (en-tête + total du tableau)
      const amounts = screen.getAllByText('80,00 €')
      expect(amounts.length).toBeGreaterThan(0)
    })

    it('affiche la description des heures (ex: 8.0 heures × taux/h)', () => {
      renderWithProviders(
        <PaySummary pay={paySimple} hourlyRate={12.5} durationHours={8} />
      )
      expect(screen.getByText(/8\.0 heures × 12,50 €\/h/)).toBeInTheDocument()
    })

    it('affiche le texte "Garde 24h" pour shiftType=guard_24h', () => {
      renderWithProviders(
        <PaySummary pay={paySimple} hourlyRate={10} durationHours={24} shiftType="guard_24h" />
      )
      expect(screen.getByText(/Garde 24h/)).toBeInTheDocument()
    })

    it('affiche une description heures normales si shiftType non guard_24h', () => {
      renderWithProviders(
        <PaySummary pay={paySimple} hourlyRate={10} durationHours={8} shiftType="effective" />
      )
      expect(screen.getByText(/8\.0 heures × 10,00 €\/h/)).toBeInTheDocument()
    })
  })

  describe('Mode normal — pas de majorations', () => {
    it('affiche "Pas de majoration applicable" si showDetails=true et aucune majoration', () => {
      renderWithProviders(
        <PaySummary pay={paySimple} hourlyRate={10} durationHours={8} showDetails />
      )
      expect(screen.getByText(/Pas de majoration applicable/)).toBeInTheDocument()
    })

    it('n\'affiche pas la section détail si showDetails=false', () => {
      renderWithProviders(
        <PaySummary pay={paySimple} hourlyRate={10} durationHours={8} showDetails={false} />
      )
      expect(screen.queryByText(/Pas de majoration applicable/)).not.toBeInTheDocument()
    })
  })

  describe('Mode normal — avec majorations', () => {
    it('affiche "Détail des majorations" si hasMajorations et showDetails=true', () => {
      renderWithProviders(
        <PaySummary pay={paySunday} hourlyRate={10} durationHours={8} showDetails />
      )
      expect(screen.getByText('Détail des majorations')).toBeInTheDocument()
    })

    it('affiche "Détail de la rémunération" pour guard_24h avec majorations', () => {
      renderWithProviders(
        <PaySummary pay={paySunday} hourlyRate={10} durationHours={24} showDetails shiftType="guard_24h" />
      )
      expect(screen.getByText('Détail de la rémunération')).toBeInTheDocument()
    })

    it('affiche "Salaire de base" dans le détail', () => {
      renderWithProviders(
        <PaySummary pay={paySunday} hourlyRate={10} durationHours={8} showDetails />
      )
      expect(screen.getByText('Salaire de base')).toBeInTheDocument()
    })

    it('affiche "Majoration dimanche" dans le détail si sundayMajoration > 0', () => {
      renderWithProviders(
        <PaySummary pay={paySunday} hourlyRate={10} durationHours={8} showDetails />
      )
      expect(screen.getByText('Majoration dimanche')).toBeInTheDocument()
    })

    it('affiche "Total brut" dans le détail', () => {
      renderWithProviders(
        <PaySummary pay={paySunday} hourlyRate={10} durationHours={8} showDetails />
      )
      expect(screen.getByText('Total brut')).toBeInTheDocument()
    })

    it('n\'affiche pas la section détail si showDetails=false même avec majorations', () => {
      renderWithProviders(
        <PaySummary pay={paySunday} hourlyRate={10} durationHours={8} showDetails={false} />
      )
      expect(screen.queryByText('Détail des majorations')).not.toBeInTheDocument()
    })
  })
})

describe('MajorationIndicator', () => {
  it('retourne null si aucune majoration', () => {
    const { container } = renderWithProviders(<MajorationIndicator pay={paySimple} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche "Dimanche +30%" si sundayMajoration > 0', () => {
    renderWithProviders(<MajorationIndicator pay={makePay({ sundayMajoration: 24, totalPay: 104 })} />)
    expect(screen.getByText(/Dimanche \+30%/)).toBeInTheDocument()
  })

  it('affiche "Jour férié" si holidayMajoration > 0', () => {
    renderWithProviders(<MajorationIndicator pay={makePay({ holidayMajoration: 48, totalPay: 128 })} />)
    expect(screen.getByText(/Jour férié/)).toBeInTheDocument()
  })

  it('affiche "Heures de nuit" si nightMajoration > 0', () => {
    renderWithProviders(<MajorationIndicator pay={makePay({ nightMajoration: 16, totalPay: 96 })} />)
    expect(screen.getByText(/Heures de nuit/)).toBeInTheDocument()
  })

  it('affiche "Heures sup" si overtimeMajoration > 0', () => {
    renderWithProviders(<MajorationIndicator pay={makePay({ overtimeMajoration: 10, totalPay: 90 })} />)
    expect(screen.getByText(/Heures sup/)).toBeInTheDocument()
  })

  it('affiche "Présence jour" si presenceResponsiblePay > 0', () => {
    renderWithProviders(<MajorationIndicator pay={makePay({ presenceResponsiblePay: 20, totalPay: 100 })} />)
    expect(screen.getByText(/Présence jour/)).toBeInTheDocument()
  })

  it('affiche "Présence nuit" si nightPresenceAllowance > 0', () => {
    renderWithProviders(<MajorationIndicator pay={makePay({ nightPresenceAllowance: 5, totalPay: 85 })} />)
    expect(screen.getByText(/Présence nuit/)).toBeInTheDocument()
  })

  it('affiche plusieurs chips si plusieurs majorations actives', () => {
    renderWithProviders(<MajorationIndicator pay={payFull} />)
    expect(screen.getByText(/Dimanche \+30%/)).toBeInTheDocument()
    expect(screen.getByText(/Heures de nuit/)).toBeInTheDocument()
    expect(screen.getByText(/Heures sup/)).toBeInTheDocument()
  })
})
