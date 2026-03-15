import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { DateNavigator } from '../DateNavigator'
import type { Shift } from '@/types'

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
  computedPay: {
    basePay: 0, sundayMajoration: 0, holidayMajoration: 0,
    nightMajoration: 0, overtimeMajoration: 0, presenceResponsiblePay: 0,
    nightPresenceAllowance: 0, totalPay: 0,
  },
  validatedByEmployer: false,
  validatedByEmployee: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('DateNavigator', () => {
  it('renders 8 day buttons', () => {
    renderWithProviders(
      <DateNavigator
        selectedDate={new Date()}
        onDateChange={vi.fn()}
        shifts={[]}
      />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(8)
  })

  it('today is selected by default', () => {
    renderWithProviders(
      <DateNavigator
        selectedDate={new Date()}
        onDateChange={vi.fn()}
        shifts={[]}
      />
    )

    const buttons = screen.getAllByRole('button')
    const todayButton = buttons[buttons.length - 1]
    expect(todayButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onDateChange when a day is clicked', () => {
    const onDateChange = vi.fn()
    renderWithProviders(
      <DateNavigator
        selectedDate={new Date()}
        onDateChange={onDateChange}
        shifts={[]}
      />
    )

    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(onDateChange).toHaveBeenCalledTimes(1)
    expect(onDateChange).toHaveBeenCalledWith(expect.any(Date))
  })

  it('shows pending indicator for past days with planned shifts', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const pastShift: Shift = {
      ...baseShift,
      id: 'past-shift',
      date: yesterday,
      status: 'planned',
    }

    renderWithProviders(
      <DateNavigator
        selectedDate={new Date()}
        onDateChange={vi.fn()}
        shifts={[pastShift]}
      />
    )

    // The button for yesterday should mention "heures à valider" in aria-label
    const yesterdayButton = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('aria-label')?.includes('heures à valider')
    )
    expect(yesterdayButton).toBeTruthy()
  })

  it('marks today button with aria label containing "aujourd\'hui"', () => {
    renderWithProviders(
      <DateNavigator
        selectedDate={new Date()}
        onDateChange={vi.fn()}
        shifts={[]}
      />
    )

    const todayButton = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('aria-label')?.includes("aujourd'hui")
    )
    expect(todayButton).toBeTruthy()
  })
})
