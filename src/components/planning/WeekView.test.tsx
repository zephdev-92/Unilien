import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { addDays, startOfWeek } from 'date-fns'
import { renderWithProviders } from '@/test/helpers'
import { createMockShift } from '@/test/fixtures'
import { WeekView } from './WeekView'
import type { Absence } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Semaine fixe : lundi 17 février 2026
const WEEK_START = new Date('2026-02-16T00:00:00') // Lundi

function weekStart(): Date {
  return startOfWeek(WEEK_START, { weekStartsOn: 1 })
}

function makeShiftOnDay(dayOffset: number, overrides = {}) {
  const date = addDays(weekStart(), dayOffset)
  return createMockShift({
    id: `shift-day-${dayOffset}`,
    date,
    startTime: '09:00',
    endTime: '17:00',
    ...overrides,
  })
}

function makeAbsence(dayOffset: number, overrides: Partial<Absence> = {}): Absence {
  const date = addDays(weekStart(), dayOffset)
  return {
    id: `absence-${dayOffset}`,
    employeeId: 'employee-1',
    absenceType: 'sick',
    startDate: date,
    endDate: date,
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  }
}

const defaultProps = {
  weekStart: weekStart(),
  shifts: [],
  userRole: 'employer' as const,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WeekView', () => {
  describe('En-têtes des jours', () => {
    it('affiche 7 colonnes de jours', () => {
      renderWithProviders(<WeekView {...defaultProps} />)
      // Les jours de la semaine (lun → dim) en format court français
      // date-fns en fr : lun., mar., mer., jeu., ven., sam., dim.
      const dayHeaders = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
      dayHeaders.forEach((day) => {
        const els = screen.getAllByText(new RegExp(day, 'i'))
        expect(els.length).toBeGreaterThan(0)
      })
    })

    it('affiche les numéros de jours', () => {
      renderWithProviders(<WeekView {...defaultProps} />)
      // Semaine du 16 au 22 fév. 2026
      ;['16', '17', '18', '19', '20', '21', '22'].forEach((n) => {
        // getAllByText car les chiffres peuvent apparaître dans d'autres contextes
        expect(screen.getAllByText(n).length).toBeGreaterThan(0)
      })
    })
  })

  describe('Jours vides', () => {
    it('affiche "Aucune intervention" pour chaque jour sans shift', () => {
      renderWithProviders(<WeekView {...defaultProps} />)
      const empties = screen.getAllByText(/aucune intervention/i)
      expect(empties).toHaveLength(7)
    })
  })

  describe('Affichage des shifts', () => {
    it('affiche un shift dans le bon jour (lundi)', () => {
      const shift = makeShiftOnDay(0, { startTime: '08:00', endTime: '16:00' })
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      expect(screen.getByText('08:00 - 16:00')).toBeInTheDocument()
    })

    it('affiche le badge de statut "Planifié"', () => {
      const shift = makeShiftOnDay(0, { status: 'planned' })
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      expect(screen.getByText('Planifié')).toBeInTheDocument()
    })

    it('affiche le badge "Terminé" pour un shift completed', () => {
      const shift = makeShiftOnDay(0, { status: 'completed' })
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      expect(screen.getByText('Terminé')).toBeInTheDocument()
    })

    it('affiche le badge "Annulé" pour un shift cancelled', () => {
      const shift = makeShiftOnDay(0, { status: 'cancelled' })
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      expect(screen.getByText('Annulé')).toBeInTheDocument()
    })

    it('affiche les tâches (max 2)', () => {
      const shift = makeShiftOnDay(1, {
        tasks: ['Aide au lever', 'Préparation repas', 'Toilette'],
      })
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      expect(screen.getByText(/aide au lever, préparation repas \+1/i)).toBeInTheDocument()
    })

    it('réduit le texte "Aucune intervention" aux jours avec shift', () => {
      const shift = makeShiftOnDay(0) // Lundi
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      // 6 jours sans shift restants
      const empties = screen.getAllByText(/aucune intervention/i)
      expect(empties).toHaveLength(6)
    })
  })

  describe('Shifts multi-jours (passage minuit)', () => {
    it('affiche le shift sur son jour de départ avec les horaires complets', () => {
      // Shift de nuit : 22:00 → 06:00 (passe minuit)
      const shift = makeShiftOnDay(0, { startTime: '22:00', endTime: '06:00' })
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      expect(screen.getByText('22:00 - 06:00')).toBeInTheDocument()
    })

    it('affiche "Suite" et "...HH:MM" sur le jour suivant', () => {
      const shift = makeShiftOnDay(0, { startTime: '22:00', endTime: '06:00' })
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      expect(screen.getByText('...06:00')).toBeInTheDocument()
      expect(screen.getByText('Suite')).toBeInTheDocument()
    })

    it('ne crée pas de continuation pour un shift normal (fin > début)', () => {
      const shift = makeShiftOnDay(0, { startTime: '09:00', endTime: '17:00' })
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      expect(screen.queryByText('Suite')).not.toBeInTheDocument()
    })

    it('crée une continuation pour un shift exactement 24h (09:00→09:00)', () => {
      const shift = makeShiftOnDay(0, { startTime: '09:00', endTime: '09:00' })
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      expect(screen.getByText('Suite')).toBeInTheDocument()
    })
  })

  describe('Absences', () => {
    it('affiche le type d\'absence (Maladie)', () => {
      const absence = makeAbsence(1, { absenceType: 'sick' })
      renderWithProviders(<WeekView {...defaultProps} absences={[absence]} />)
      expect(screen.getByText('Maladie')).toBeInTheDocument()
    })

    it('affiche le badge de statut de l\'absence (En attente)', () => {
      const absence = makeAbsence(1, { status: 'pending' })
      renderWithProviders(<WeekView {...defaultProps} absences={[absence]} />)
      expect(screen.getByText('En attente')).toBeInTheDocument()
    })

    it('affiche "Approuvée" pour une absence approved', () => {
      const absence = makeAbsence(1, { status: 'approved' })
      renderWithProviders(<WeekView {...defaultProps} absences={[absence]} />)
      expect(screen.getByText('Approuvée')).toBeInTheDocument()
    })

    it('affiche la raison si présente', () => {
      const absence = makeAbsence(1, { reason: 'Grippe saisonnière' })
      renderWithProviders(<WeekView {...defaultProps} absences={[absence]} />)
      expect(screen.getByText('Grippe saisonnière')).toBeInTheDocument()
    })

    it('affiche une absence multi-jours sur tous les jours couverts', () => {
      const absence = makeAbsence(1, {
        startDate: addDays(weekStart(), 1), // Mardi
        endDate: addDays(weekStart(), 3),   // Jeudi
      })
      renderWithProviders(<WeekView {...defaultProps} absences={[absence]} />)
      // "Maladie" apparaît 3 fois (mardi, mercredi, jeudi)
      const labels = screen.getAllByText('Maladie')
      expect(labels).toHaveLength(3)
    })
  })

  describe('Callbacks', () => {
    it('appelle onShiftClick quand on clique sur un shift', () => {
      const onShiftClick = vi.fn()
      const shift = makeShiftOnDay(0)
      renderWithProviders(
        <WeekView {...defaultProps} shifts={[shift]} onShiftClick={onShiftClick} />
      )
      const card = screen.getByText('09:00 - 17:00').closest('[role="button"]')!
      fireEvent.click(card)
      expect(onShiftClick).toHaveBeenCalledWith(shift)
    })

    it('appelle onShiftClick avec Enter', () => {
      const onShiftClick = vi.fn()
      const shift = makeShiftOnDay(0)
      renderWithProviders(
        <WeekView {...defaultProps} shifts={[shift]} onShiftClick={onShiftClick} />
      )
      const card = screen.getByText('09:00 - 17:00').closest('[role="button"]')!
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(onShiftClick).toHaveBeenCalledWith(shift)
    })

    it('appelle onShiftClick avec Espace', () => {
      const onShiftClick = vi.fn()
      const shift = makeShiftOnDay(0)
      renderWithProviders(
        <WeekView {...defaultProps} shifts={[shift]} onShiftClick={onShiftClick} />
      )
      const card = screen.getByText('09:00 - 17:00').closest('[role="button"]')!
      fireEvent.keyDown(card, { key: ' ' })
      expect(onShiftClick).toHaveBeenCalledWith(shift)
    })

    it('ne réagit pas aux autres touches', () => {
      const onShiftClick = vi.fn()
      const shift = makeShiftOnDay(0)
      renderWithProviders(
        <WeekView {...defaultProps} shifts={[shift]} onShiftClick={onShiftClick} />
      )
      const card = screen.getByText('09:00 - 17:00').closest('[role="button"]')!
      fireEvent.keyDown(card, { key: 'Escape' })
      expect(onShiftClick).not.toHaveBeenCalled()
    })

    it('appelle onAbsenceClick quand on clique sur une absence', () => {
      const onAbsenceClick = vi.fn()
      const absence = makeAbsence(2)
      renderWithProviders(
        <WeekView {...defaultProps} absences={[absence]} onAbsenceClick={onAbsenceClick} />
      )
      const card = screen.getByText('Maladie').closest('[role="button"]')!
      fireEvent.click(card)
      expect(onAbsenceClick).toHaveBeenCalledWith(absence)
    })

    it('appelle onAbsenceClick avec Enter sur une absence', () => {
      const onAbsenceClick = vi.fn()
      const absence = makeAbsence(3)
      renderWithProviders(
        <WeekView {...defaultProps} absences={[absence]} onAbsenceClick={onAbsenceClick} />
      )
      const card = screen.getByText('Maladie').closest('[role="button"]')!
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(onAbsenceClick).toHaveBeenCalledWith(absence)
    })

    it('appelle onAbsenceClick avec Espace sur une absence', () => {
      const onAbsenceClick = vi.fn()
      const absence = makeAbsence(4)
      renderWithProviders(
        <WeekView {...defaultProps} absences={[absence]} onAbsenceClick={onAbsenceClick} />
      )
      const card = screen.getByText('Maladie').closest('[role="button"]')!
      fireEvent.keyDown(card, { key: ' ' })
      expect(onAbsenceClick).toHaveBeenCalledWith(absence)
    })

    it("ne lève pas d'erreur si onShiftClick est absent", () => {
      const shift = makeShiftOnDay(0)
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      const card = screen.getByText('09:00 - 17:00').closest('[role="button"]')!
      expect(() => fireEvent.click(card)).not.toThrow()
    })
  })

  describe('Accessibilité', () => {
    it('les ShiftCards ont role="button" et tabIndex=0', () => {
      const shift = makeShiftOnDay(0)
      renderWithProviders(<WeekView {...defaultProps} shifts={[shift]} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      expect(buttons[0]).toHaveAttribute('tabindex', '0')
    })
  })
})
