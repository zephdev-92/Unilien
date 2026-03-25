import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useClockIn } from '../useClockIn'
import type { Shift } from '@/types'

// Mocks
const mockGetShifts = vi.fn()
const mockUpdateShift = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', role: 'employee', firstName: 'Jean', lastName: 'Dupont' },
  }),
}))

vi.mock('@/services/shiftService', () => ({
  getShifts: (...args: unknown[]) => mockGetShifts(...args),
  updateShift: (...args: unknown[]) => mockUpdateShift(...args),
}))

vi.mock('@/lib/compliance', () => ({
  calculateNightHours: vi.fn().mockReturnValue(0),
  calculateShiftDuration: vi.fn().mockReturnValue(480),
}))

vi.mock('@/lib/compliance/complianceChecker', () => ({
  validateShift: vi.fn().mockReturnValue({ warnings: [], errors: [] }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockToasterError = vi.fn()
const mockToasterSuccess = vi.fn()
vi.mock('@/lib/toaster', () => ({
  toaster: { error: (...args: unknown[]) => mockToasterError(...args), success: (...args: unknown[]) => mockToasterSuccess(...args) },
}))

const computedPay = {
  basePay: 0, sundayMajoration: 0, holidayMajoration: 0,
  nightMajoration: 0, overtimeMajoration: 0, presenceResponsiblePay: 0,
  nightPresenceAllowance: 0, totalPay: 0,
}

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
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
    ...overrides,
  }
}

describe('useClockIn — retroactive validation', () => {
  const inProgressRef = { current: null }
  const idleSectionRef = { current: null }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetShifts.mockResolvedValue([])
    mockUpdateShift.mockResolvedValue(undefined)
  })

  it('exposes selectedDate and isSelectedDateToday', async () => {
    const { result } = renderHook(() => useClockIn(inProgressRef, idleSectionRef))

    await waitFor(() => {
      expect(result.current.isLoadingShifts).toBe(false)
    })

    expect(result.current.selectedDate).toBeInstanceOf(Date)
    expect(result.current.isSelectedDateToday).toBe(true)
  })

  it('setSelectedDate updates selectedDateShifts', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const yesterdayShift = makeShift({
      id: 'yesterday-shift',
      date: yesterday,
      status: 'planned',
    })

    mockGetShifts.mockResolvedValue([yesterdayShift])

    const { result } = renderHook(() => useClockIn(inProgressRef, idleSectionRef))

    await waitFor(() => {
      expect(result.current.isLoadingShifts).toBe(false)
    })

    act(() => {
      result.current.setSelectedDate(yesterday)
    })

    expect(result.current.isSelectedDateToday).toBe(false)
    expect(result.current.selectedDateShifts).toHaveLength(1)
    expect(result.current.selectedDateShifts[0].id).toBe('yesterday-shift')
  })

  it('handleRetroactiveValidation calls updateShift with lateEntry: true', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const shift = makeShift({
      id: 'retro-shift',
      date: yesterday,
      status: 'planned',
    })

    mockGetShifts.mockResolvedValue([shift])

    const { result } = renderHook(() => useClockIn(inProgressRef, idleSectionRef))

    await waitFor(() => {
      expect(result.current.isLoadingShifts).toBe(false)
    })

    // handleRetroactiveValidation calls loadAllShifts internally, so we
    // don't await the full promise — we just trigger it and check the call
    act(() => {
      result.current.handleRetroactiveValidation('retro-shift', '09:00', '17:00')
    })

    await waitFor(() => {
      expect(mockUpdateShift).toHaveBeenCalledWith('retro-shift', {
        status: 'completed',
        startTime: '09:00',
        endTime: '17:00',
        lateEntry: true,
      })
    })
  })

  it('handleRetroactiveValidation rejects already completed shifts', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const shift = makeShift({
      id: 'completed-shift',
      date: yesterday,
      status: 'completed',
    })

    mockGetShifts.mockResolvedValue([shift])

    const { result } = renderHook(() => useClockIn(inProgressRef, idleSectionRef))

    await waitFor(() => {
      expect(result.current.isLoadingShifts).toBe(false)
    })

    act(() => {
      result.current.handleRetroactiveValidation('completed-shift', '09:00', '17:00')
    })

    await waitFor(() => {
      expect(mockToasterError).toHaveBeenCalledWith({ title: 'Cette intervention est déjà validée' })
    })

    expect(mockUpdateShift).not.toHaveBeenCalled()
  })

  it('handleRetroactiveValidation rejects shifts older than 7 days', async () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 10)

    const shift = makeShift({
      id: 'old-shift',
      date: oldDate,
      status: 'planned',
    })

    mockGetShifts.mockResolvedValue([shift])

    const { result } = renderHook(() => useClockIn(inProgressRef, idleSectionRef))

    await waitFor(() => {
      expect(result.current.isLoadingShifts).toBe(false)
    })

    act(() => {
      result.current.handleRetroactiveValidation('old-shift', '09:00', '17:00')
    })

    await waitFor(() => {
      expect(mockToasterError).toHaveBeenCalledWith({ title: 'La saisie rétroactive est limitée à 7 jours' })
    })

    expect(mockUpdateShift).not.toHaveBeenCalled()
  })
})
