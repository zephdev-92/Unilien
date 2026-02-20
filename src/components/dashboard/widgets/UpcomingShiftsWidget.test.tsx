import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockShift } from '@/test/fixtures'
import { UpcomingShiftsWidget } from './UpcomingShiftsWidget'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeShift(dateOffset = 0, overrides = {}) {
  const date = new Date()
  date.setDate(date.getDate() + dateOffset)
  return createMockShift({ id: `shift-offset-${dateOffset}`, date, ...overrides })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UpcomingShiftsWidget', () => {
  describe('État loading', () => {
    it('affiche le spinner et le message de chargement', () => {
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[]} loading userRole="employer" />
      )
      expect(screen.getByText(/chargement du planning/i)).toBeInTheDocument()
    })

    it("n'affiche pas le titre en mode loading", () => {
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[]} loading userRole="employer" />
      )
      expect(screen.queryByText('Prochaines interventions')).not.toBeInTheDocument()
    })
  })

  describe('Titre selon le rôle', () => {
    it('affiche "Prochaines interventions" pour employer', () => {
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[]} userRole="employer" />
      )
      expect(screen.getByText('Prochaines interventions')).toBeInTheDocument()
    })

    it('affiche "Mon planning" pour employee', () => {
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[]} userRole="employee" />
      )
      expect(screen.getByText('Mon planning')).toBeInTheDocument()
    })

    it('affiche "Mon planning" pour caregiver', () => {
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[]} userRole="caregiver" />
      )
      expect(screen.getByText('Mon planning')).toBeInTheDocument()
    })
  })

  describe('Liste vide', () => {
    it('affiche le message "Aucune intervention prévue"', () => {
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[]} userRole="employer" />
      )
      expect(screen.getByText(/aucune intervention prévue/i)).toBeInTheDocument()
    })
  })

  describe('Affichage des shifts', () => {
    it('affiche au maximum 3 shifts même si plus sont fournis', () => {
      const shifts = [
        makeShift(0),
        makeShift(1),
        makeShift(2),
        makeShift(3),
        makeShift(4),
      ]
      renderWithProviders(
        <UpcomingShiftsWidget shifts={shifts} userRole="employer" />
      )
      // 3 shifts affichés → 3 horaires
      const timeTexts = screen.getAllByText(/09:00 - 17:00/)
      expect(timeTexts).toHaveLength(3)
    })

    it('affiche les horaires du shift', () => {
      const shift = makeShift(0, { startTime: '08:00', endTime: '14:00' })
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[shift]} userRole="employer" />
      )
      expect(screen.getByText('08:00 - 14:00')).toBeInTheDocument()
    })

    it("affiche les tâches (max 2, avec overflow '+N')", () => {
      const shift = makeShift(0, {
        tasks: ['Aide au lever', 'Préparation repas', 'Toilette'],
      })
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[shift]} userRole="employer" />
      )
      expect(screen.getByText(/aide au lever, préparation repas \+1/i)).toBeInTheDocument()
    })

    it('affiche les tâches sans overflow si ≤ 2', () => {
      const shift = makeShift(0, { tasks: ['Aide au lever', 'Préparation repas'] })
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[shift]} userRole="employer" />
      )
      expect(screen.getByText('Aide au lever, Préparation repas')).toBeInTheDocument()
    })
  })

  describe('Formatage des dates', () => {
    it('affiche "Aujourd\'hui" pour un shift du jour', () => {
      const shift = makeShift(0)
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[shift]} userRole="employer" />
      )
      expect(screen.getByText("Aujourd'hui")).toBeInTheDocument()
    })

    it('affiche "Demain" pour un shift du lendemain', () => {
      const shift = makeShift(1)
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[shift]} userRole="employer" />
      )
      expect(screen.getByText('Demain')).toBeInTheDocument()
    })

    it('affiche la date complète pour un shift dans 2+ jours', () => {
      const shift = makeShift(5)
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[shift]} userRole="employer" />
      )
      // La date doit être au format français longue (ex: "samedi 25 février")
      const dateEl = screen.getByText(/\w+ \d+ \w+/i)
      expect(dateEl).toBeInTheDocument()
    })
  })

  describe('Badges de statut', () => {
    it.each([
      ['planned', 'Planifié'],
      ['completed', 'Terminé'],
      ['cancelled', 'Annulé'],
      ['absent', 'Absent'],
    ] as const)('affiche le badge "%s"', (status, label) => {
      const shift = makeShift(0, { status })
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[shift]} userRole="employer" />
      )
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  describe('Lien "Voir tout"', () => {
    it('affiche le lien Voir tout pointant vers /planning', () => {
      renderWithProviders(
        <UpcomingShiftsWidget shifts={[]} userRole="employer" />
      )
      const link = screen.getByRole('link', { name: /voir tout le planning/i })
      expect(link).toHaveAttribute('href', '/planning')
    })
  })
})
