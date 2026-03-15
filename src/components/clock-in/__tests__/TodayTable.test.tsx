import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { TodayTable } from '../TodayTable'
import type { Shift } from '@/types'

const computedPay = {
  basePay: 0, sundayMajoration: 0, holidayMajoration: 0,
  nightMajoration: 0, overtimeMajoration: 0, presenceResponsiblePay: 0,
  nightPresenceAllowance: 0, totalPay: 0,
}

const baseShift: Shift = {
  id: 'shift-1',
  contractId: 'contract-1',
  date: new Date(),
  startTime: '09:00',
  endTime: '17:00',
  breakDuration: 0,
  tasks: [],
  shiftType: 'effective',
  isRequalified: false,
  status: 'planned',
  computedPay,
  validatedByEmployer: false,
  validatedByEmployee: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('TodayTable', () => {
  it('shows today title by default', () => {
    renderWithProviders(
      <TodayTable
        plannedShifts={[baseShift]}
        completedShifts={[]}
        userRole="employee"
        onClockIn={vi.fn()}
      />
    )

    expect(screen.getByText("Mes heures d'aujourd'hui")).toBeInTheDocument()
  })

  it('shows dynamic title for past date', () => {
    const pastDate = new Date(2026, 2, 14) // 14 mars 2026
    renderWithProviders(
      <TodayTable
        plannedShifts={[baseShift]}
        completedShifts={[]}
        userRole="employee"
        selectedDate={pastDate}
        onClockIn={vi.fn()}
      />
    )

    expect(screen.getByText(/Mes heures du/)).toBeInTheDocument()
    expect(screen.getByText(/14 mars/)).toBeInTheDocument()
  })

  it('hides Pointer button for past dates', () => {
    const pastDate = new Date(2026, 2, 14)
    renderWithProviders(
      <TodayTable
        plannedShifts={[baseShift]}
        completedShifts={[]}
        userRole="employee"
        selectedDate={pastDate}
        onClockIn={vi.fn()}
      />
    )

    expect(screen.queryByText('Pointer')).not.toBeInTheDocument()
  })

  it('shows Pointer button for today', () => {
    renderWithProviders(
      <TodayTable
        plannedShifts={[baseShift]}
        completedShifts={[]}
        userRole="employee"
        onClockIn={vi.fn()}
      />
    )

    expect(screen.getByText('Pointer')).toBeInTheDocument()
  })

  it('shows Rétroactif badge for late entry shifts', () => {
    const lateShift: Shift = {
      ...baseShift,
      status: 'completed',
      lateEntry: true,
    }

    renderWithProviders(
      <TodayTable
        plannedShifts={[]}
        completedShifts={[lateShift]}
        userRole="employee"
        onClockIn={vi.fn()}
      />
    )

    expect(screen.getByText('Rétroactif')).toBeInTheDocument()
  })

  it('does not show Rétroactif badge for normal shifts', () => {
    const normalShift: Shift = {
      ...baseShift,
      status: 'completed',
    }

    renderWithProviders(
      <TodayTable
        plannedShifts={[]}
        completedShifts={[normalShift]}
        userRole="employee"
        onClockIn={vi.fn()}
      />
    )

    expect(screen.queryByText('Rétroactif')).not.toBeInTheDocument()
  })
})
