import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { RetroactiveEntryForm } from '../RetroactiveEntryForm'
import type { Shift } from '@/types'

const computedPay = {
  basePay: 0, sundayMajoration: 0, holidayMajoration: 0,
  nightMajoration: 0, overtimeMajoration: 0, presenceResponsiblePay: 0,
  nightPresenceAllowance: 0, totalPay: 0,
}

const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)

const plannedShift: Shift = {
  id: 'shift-1',
  contractId: 'contract-1',
  date: yesterday,
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

const completedShift: Shift = {
  ...plannedShift,
  id: 'shift-2',
  status: 'completed',
  lateEntry: true,
}

describe('RetroactiveEntryForm', () => {
  it('renders the date label', () => {
    renderWithProviders(
      <RetroactiveEntryForm
        shifts={[plannedShift]}
        selectedDate={yesterday}
        onValidate={vi.fn()}
        isSubmitting={false}
      />
    )

    expect(screen.getByText(/Valider mes horaires du/)).toBeInTheDocument()
  })

  it('pre-fills time inputs from planned shift', () => {
    renderWithProviders(
      <RetroactiveEntryForm
        shifts={[plannedShift]}
        selectedDate={yesterday}
        onValidate={vi.fn()}
        isSubmitting={false}
      />
    )

    const startInput = screen.getByLabelText('Heure de début') as HTMLInputElement
    const endInput = screen.getByLabelText('Heure de fin') as HTMLInputElement
    expect(startInput.value).toBe('09:00')
    expect(endInput.value).toBe('17:00')
  })

  it('calls onValidate with correct params on submit', async () => {
    const onValidate = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(
      <RetroactiveEntryForm
        shifts={[plannedShift]}
        selectedDate={yesterday}
        onValidate={onValidate}
        isSubmitting={false}
      />
    )

    fireEvent.click(screen.getByText('Valider mes horaires'))

    await waitFor(() => {
      expect(onValidate).toHaveBeenCalledWith('shift-1', '09:00', '17:00')
    })
  })

  it('shows validation error when startTime >= endTime', async () => {
    renderWithProviders(
      <RetroactiveEntryForm
        shifts={[plannedShift]}
        selectedDate={yesterday}
        onValidate={vi.fn()}
        isSubmitting={false}
      />
    )

    const startInput = screen.getByLabelText('Heure de début') as HTMLInputElement
    fireEvent.change(startInput, { target: { value: '18:00' } })
    fireEvent.click(screen.getByText('Valider mes horaires'))

    expect(await screen.findByText(/heure de début doit être antérieure/i)).toBeInTheDocument()
  })

  it('renders completed shifts as read-only with Terminé badge', () => {
    renderWithProviders(
      <RetroactiveEntryForm
        shifts={[completedShift]}
        selectedDate={yesterday}
        onValidate={vi.fn()}
        isSubmitting={false}
      />
    )

    expect(screen.getByText('Terminé')).toBeInTheDocument()
    expect(screen.getByText('Rétroactif')).toBeInTheDocument()
    expect(screen.queryByText('Valider mes horaires')).not.toBeInTheDocument()
  })

  it('shows empty state when no shifts', () => {
    renderWithProviders(
      <RetroactiveEntryForm
        shifts={[]}
        selectedDate={yesterday}
        onValidate={vi.fn()}
        isSubmitting={false}
      />
    )

    expect(screen.getByText(/Aucune intervention prévue/)).toBeInTheDocument()
  })
})
