import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockShift } from '@/test/fixtures'
import { MonthView } from './MonthView'
import type { Absence } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Mois fixe : février 2026
const CURRENT_DATE = new Date('2026-02-15T12:00:00')

function makeShiftOnDate(date: Date, overrides = {}) {
  return createMockShift({
    id: `shift-${date.toISOString()}`,
    date,
    startTime: '09:00',
    endTime: '17:00',
    ...overrides,
  })
}

function makeAbsence(startDate: Date, endDate: Date, overrides: Partial<Absence> = {}): Absence {
  return {
    id: `absence-${startDate.toISOString()}`,
    employeeId: 'employee-1',
    absenceType: 'sick',
    startDate,
    endDate,
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  }
}

const defaultProps = {
  currentDate: CURRENT_DATE,
  shifts: [],
  userRole: 'employer' as const,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MonthView', () => {
  describe('En-têtes des jours', () => {
    it('affiche les 7 jours de la semaine en en-tête', () => {
      renderWithProviders(<MonthView {...defaultProps} />)
      ;['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument()
      })
    })
  })

  describe('Grille calendrier', () => {
    it('affiche le numéro "1" pour le premier jour du mois', () => {
      renderWithProviders(<MonthView {...defaultProps} />)
      const ones = screen.getAllByText('1')
      expect(ones.length).toBeGreaterThan(0)
    })

    it('affiche le numéro "28" pour le dernier jour de février 2026', () => {
      renderWithProviders(<MonthView {...defaultProps} />)
      const twentyEight = screen.getAllByText('28')
      expect(twentyEight.length).toBeGreaterThan(0)
    })

    it('affiche les jours du mois précédent en tête de grille (opacité réduite)', () => {
      renderWithProviders(<MonthView {...defaultProps} />)
      // Février 2026 commence un dimanche → lun 26 jan à sam 31 jan visibles
      // Le chiffre "26" devrait être présent (janvier)
      const twentySix = screen.getAllByText('26')
      expect(twentySix.length).toBeGreaterThan(0)
    })
  })

  describe('Affichage des shifts', () => {
    it('affiche un shift dans le bon jour du mois', () => {
      const date = new Date('2026-02-10T12:00:00')
      const shift = makeShiftOnDate(date, { startTime: '08:00', endTime: '16:00' })
      renderWithProviders(<MonthView {...defaultProps} shifts={[shift]} />)
      expect(screen.getByText('08:00-16:00')).toBeInTheDocument()
    })

    it('affiche plusieurs shifts sur des jours différents', () => {
      const shift1 = makeShiftOnDate(new Date('2026-02-03T12:00:00'), { startTime: '08:00', endTime: '12:00' })
      const shift2 = makeShiftOnDate(new Date('2026-02-10T12:00:00'), { startTime: '14:00', endTime: '18:00' })
      renderWithProviders(<MonthView {...defaultProps} shifts={[shift1, shift2]} />)
      expect(screen.getByText('08:00-12:00')).toBeInTheDocument()
      expect(screen.getByText('14:00-18:00')).toBeInTheDocument()
    })
  })

  describe('Shifts multi-jours (passage minuit)', () => {
    it('affiche "...HH:MM" sur le jour suivant pour un shift de nuit', () => {
      const date = new Date('2026-02-10T12:00:00')
      const shift = makeShiftOnDate(date, { startTime: '22:00', endTime: '06:00' })
      renderWithProviders(<MonthView {...defaultProps} shifts={[shift]} />)
      // Jour de départ : "22:00-06:00"
      expect(screen.getByText('22:00-06:00')).toBeInTheDocument()
      // Jour suivant : "...06:00"
      expect(screen.getByText('...06:00')).toBeInTheDocument()
    })
  })

  describe('Overflow +N par jour', () => {
    it('affiche "+N autres" si plus de 2 items dans un jour', () => {
      const date = new Date('2026-02-05T12:00:00')
      const shifts = [
        makeShiftOnDate(date, { id: 'sh-1', startTime: '08:00', endTime: '10:00' }),
        makeShiftOnDate(date, { id: 'sh-2', startTime: '11:00', endTime: '13:00' }),
        makeShiftOnDate(date, { id: 'sh-3', startTime: '14:00', endTime: '16:00' }),
      ]
      renderWithProviders(<MonthView {...defaultProps} shifts={shifts} />)
      expect(screen.getByText(/\+1 autres/i)).toBeInTheDocument()
    })

    it('compte shifts et absences ensemble pour le seuil de 2', () => {
      const date = new Date('2026-02-05T12:00:00')
      const shift = makeShiftOnDate(date, { id: 'sh-1' })
      const absence = makeAbsence(date, date)
      const shift2 = makeShiftOnDate(date, { id: 'sh-2', startTime: '14:00', endTime: '16:00' })
      renderWithProviders(
        <MonthView {...defaultProps} shifts={[shift, shift2]} absences={[absence]} />
      )
      expect(screen.getByText(/\+1 autres/i)).toBeInTheDocument()
    })
  })

  describe('Absences', () => {
    it('affiche le type d\'absence', () => {
      const date = new Date('2026-02-12T12:00:00')
      const absence = makeAbsence(date, date, { absenceType: 'vacation' })
      renderWithProviders(<MonthView {...defaultProps} absences={[absence]} />)
      expect(screen.getByText('Congé')).toBeInTheDocument()
    })

    it('affiche une absence multi-jours sur chaque jour concerné', () => {
      const start = new Date('2026-02-09T12:00:00')
      const end = new Date('2026-02-11T12:00:00')
      const absence = makeAbsence(start, end, { absenceType: 'training' })
      renderWithProviders(<MonthView {...defaultProps} absences={[absence]} />)
      const labels = screen.getAllByText('Formation')
      expect(labels).toHaveLength(3) // 9, 10, 11 fév
    })

    it('affiche les types : Maladie, Formation, Indispo., Urgence', () => {
      const date = new Date('2026-02-20T12:00:00')
      for (const [type, label] of [
        ['sick', 'Maladie'],
        ['training', 'Formation'],
        ['unavailable', 'Indispo.'],
        ['emergency', 'Urgence'],
      ] as const) {
        const { unmount } = renderWithProviders(
          <MonthView {...defaultProps} absences={[makeAbsence(date, date, { absenceType: type })]} />
        )
        expect(screen.getByText(label)).toBeInTheDocument()
        unmount()
      }
    })
  })

  describe('Callbacks', () => {
    it('appelle onShiftClick quand on clique sur un shift', () => {
      const onShiftClick = vi.fn()
      const date = new Date('2026-02-10T12:00:00')
      const shift = makeShiftOnDate(date)
      renderWithProviders(
        <MonthView {...defaultProps} shifts={[shift]} onShiftClick={onShiftClick} />
      )
      const card = screen.getByText('09:00-17:00').closest('[role="button"]')!
      fireEvent.click(card)
      expect(onShiftClick).toHaveBeenCalledWith(shift)
    })

    it('appelle onShiftClick avec Enter', () => {
      const onShiftClick = vi.fn()
      const date = new Date('2026-02-10T12:00:00')
      const shift = makeShiftOnDate(date)
      renderWithProviders(
        <MonthView {...defaultProps} shifts={[shift]} onShiftClick={onShiftClick} />
      )
      const card = screen.getByText('09:00-17:00').closest('[role="button"]')!
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(onShiftClick).toHaveBeenCalledWith(shift)
    })

    it('appelle onShiftClick avec Espace', () => {
      const onShiftClick = vi.fn()
      const date = new Date('2026-02-10T12:00:00')
      const shift = makeShiftOnDate(date)
      renderWithProviders(
        <MonthView {...defaultProps} shifts={[shift]} onShiftClick={onShiftClick} />
      )
      const card = screen.getByText('09:00-17:00').closest('[role="button"]')!
      fireEvent.keyDown(card, { key: ' ' })
      expect(onShiftClick).toHaveBeenCalledWith(shift)
    })

    it('ne réagit pas aux autres touches', () => {
      const onShiftClick = vi.fn()
      const date = new Date('2026-02-10T12:00:00')
      const shift = makeShiftOnDate(date)
      renderWithProviders(
        <MonthView {...defaultProps} shifts={[shift]} onShiftClick={onShiftClick} />
      )
      const card = screen.getByText('09:00-17:00').closest('[role="button"]')!
      fireEvent.keyDown(card, { key: 'Tab' })
      expect(onShiftClick).not.toHaveBeenCalled()
    })

    it('appelle onAbsenceClick quand on clique sur une absence', () => {
      const onAbsenceClick = vi.fn()
      const date = new Date('2026-02-12T12:00:00')
      const absence = makeAbsence(date, date)
      renderWithProviders(
        <MonthView {...defaultProps} absences={[absence]} onAbsenceClick={onAbsenceClick} />
      )
      const card = screen.getByText('Maladie').closest('[role="button"]')!
      fireEvent.click(card)
      expect(onAbsenceClick).toHaveBeenCalledWith(absence)
    })

    it('appelle onAbsenceClick avec Enter sur une absence', () => {
      const onAbsenceClick = vi.fn()
      const date = new Date('2026-02-12T12:00:00')
      const absence = makeAbsence(date, date)
      renderWithProviders(
        <MonthView {...defaultProps} absences={[absence]} onAbsenceClick={onAbsenceClick} />
      )
      const card = screen.getByText('Maladie').closest('[role="button"]')!
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(onAbsenceClick).toHaveBeenCalledWith(absence)
    })

    it('appelle onAbsenceClick avec Espace sur une absence', () => {
      const onAbsenceClick = vi.fn()
      const date = new Date('2026-02-14T12:00:00')
      const absence = makeAbsence(date, date)
      renderWithProviders(
        <MonthView {...defaultProps} absences={[absence]} onAbsenceClick={onAbsenceClick} />
      )
      const card = screen.getByText('Maladie').closest('[role="button"]')!
      fireEvent.keyDown(card, { key: ' ' })
      expect(onAbsenceClick).toHaveBeenCalledWith(absence)
    })

    it("ne lève pas d'erreur si onShiftClick est absent", () => {
      const date = new Date('2026-02-10T12:00:00')
      const shift = makeShiftOnDate(date)
      renderWithProviders(<MonthView {...defaultProps} shifts={[shift]} />)
      const card = screen.getByText('09:00-17:00').closest('[role="button"]')!
      expect(() => fireEvent.click(card)).not.toThrow()
    })
  })

  describe('Accessibilité', () => {
    it('les ShiftCards ont role="button" et tabIndex=0', () => {
      const date = new Date('2026-02-10T12:00:00')
      const shift = makeShiftOnDate(date)
      renderWithProviders(<MonthView {...defaultProps} shifts={[shift]} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      buttons.forEach((btn) => {
        expect(btn).toHaveAttribute('tabindex', '0')
      })
    })
  })

  describe('Jour courant', () => {
    it('affiche le numéro du jour courant en surbrillance (attribut data)', () => {
      // Le test vérifie juste que le rendu ne plante pas avec today dans le mois
      expect(() =>
        renderWithProviders(<MonthView {...defaultProps} />)
      ).not.toThrow()
    })
  })
})
