import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// ─── Mocks services ───────────────────────────────────────────────────────────

const mockGetUpcomingShiftsForEmployee = vi.fn()

vi.mock('@/services/shiftService', () => ({
  getUpcomingShiftsForEmployee: (...args: unknown[]) =>
    mockGetUpcomingShiftsForEmployee(...args),
}))

const mockGetAlreadyNotifiedShiftIds = vi.fn()
const mockGetProfileName = vi.fn()
const mockCreateShiftReminderNotification = vi.fn()

vi.mock('@/services/notificationService', () => ({
  getAlreadyNotifiedShiftIds: (...args: unknown[]) =>
    mockGetAlreadyNotifiedShiftIds(...args),
  createShiftReminderNotification: (...args: unknown[]) =>
    mockCreateShiftReminderNotification(...args),
}))

vi.mock('@/services/profileService', () => ({
  getProfileName: (...args: unknown[]) => mockGetProfileName(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { useShiftReminders } from './useShiftReminders'
import { logger } from '@/lib/logger'

// ─── Données mock ─────────────────────────────────────────────────────────────

const MOCK_SHIFTS = [
  {
    id: 'shift-1',
    date: '2025-06-15',
    start_time: '09:00',
    contract_id: 'contract-1',
    contract: { employer_id: 'employer-1', employee_id: 'user-123' },
  },
  {
    id: 'shift-2',
    date: '2025-06-15',
    start_time: '14:00',
    contract_id: 'contract-1',
    contract: { employer_id: 'employer-1', employee_id: 'user-123' },
  },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useShiftReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUpcomingShiftsForEmployee.mockResolvedValue([])
    mockGetAlreadyNotifiedShiftIds.mockResolvedValue(new Set())
  })

  it('ne devrait rien faire si userId est undefined', () => {
    renderHook(() => useShiftReminders(undefined, 'employee'))

    expect(mockGetUpcomingShiftsForEmployee).not.toHaveBeenCalled()
  })

  it('ne devrait rien faire si role est undefined', () => {
    renderHook(() => useShiftReminders('user-123', undefined))

    expect(mockGetUpcomingShiftsForEmployee).not.toHaveBeenCalled()
  })

  it("ne devrait rien faire si le role n'est pas employee", () => {
    renderHook(() => useShiftReminders('user-123', 'employer'))

    expect(mockGetUpcomingShiftsForEmployee).not.toHaveBeenCalled()
  })

  it("devrait s'exécuter une seule fois grâce à hasRun", async () => {
    const { rerender } = renderHook(
      ({ userId, role }) => useShiftReminders(userId, role),
      { initialProps: { userId: 'user-123', role: 'employee' } }
    )

    await vi.waitFor(() => {
      expect(mockGetUpcomingShiftsForEmployee).toHaveBeenCalledTimes(1)
    })

    // Re-render — ne devrait pas re-exécuter
    rerender({ userId: 'user-123', role: 'employee' })
    expect(mockGetUpcomingShiftsForEmployee).toHaveBeenCalledTimes(1)
  })

  it('devrait appeler getUpcomingShiftsForEmployee avec les dates correctes', async () => {
    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockGetUpcomingShiftsForEmployee).toHaveBeenCalledWith(
        'user-123',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      )
    })
  })

  it("devrait ne rien faire si aucun shift n'est trouvé", async () => {
    mockGetUpcomingShiftsForEmployee.mockResolvedValue([])

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockGetUpcomingShiftsForEmployee).toHaveBeenCalledTimes(1)
    })

    expect(mockGetProfileName).not.toHaveBeenCalled()
    expect(mockGetAlreadyNotifiedShiftIds).not.toHaveBeenCalled()
  })

  it('devrait créer des rappels pour les shifts sans notification existante', async () => {
    mockGetUpcomingShiftsForEmployee.mockResolvedValue(MOCK_SHIFTS)
    mockGetAlreadyNotifiedShiftIds.mockResolvedValue(new Set())
    mockGetProfileName.mockResolvedValue('M. Martin')
    mockCreateShiftReminderNotification.mockResolvedValue(undefined)

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockCreateShiftReminderNotification).toHaveBeenCalledTimes(2)
    })

    expect(mockGetProfileName).toHaveBeenCalledWith('employer-1')
    expect(mockCreateShiftReminderNotification).toHaveBeenCalledWith(
      'user-123', 'M. Martin', expect.any(Date), '09:00', 'shift-1'
    )
    expect(mockCreateShiftReminderNotification).toHaveBeenCalledWith(
      'user-123', 'M. Martin', expect.any(Date), '14:00', 'shift-2'
    )
  })

  it('devrait ignorer les shifts déjà notifiés', async () => {
    mockGetUpcomingShiftsForEmployee.mockResolvedValue(MOCK_SHIFTS)
    mockGetAlreadyNotifiedShiftIds.mockResolvedValue(new Set(['shift-1']))
    mockGetProfileName.mockResolvedValue('M. Martin')
    mockCreateShiftReminderNotification.mockResolvedValue(undefined)

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockCreateShiftReminderNotification).toHaveBeenCalledTimes(1)
    })

    // Seul shift-2 reçoit un rappel
    expect(mockCreateShiftReminderNotification).toHaveBeenCalledWith(
      'user-123', 'M. Martin', expect.any(Date), '14:00', 'shift-2'
    )
  })

  it('devrait ignorer silencieusement les erreurs individuelles de création', async () => {
    mockGetUpcomingShiftsForEmployee.mockResolvedValue(MOCK_SHIFTS)
    mockGetAlreadyNotifiedShiftIds.mockResolvedValue(new Set())
    mockGetProfileName
      .mockRejectedValueOnce(new Error('Profil introuvable'))
      .mockResolvedValueOnce('M. Martin')
    mockCreateShiftReminderNotification.mockResolvedValue(undefined)

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockCreateShiftReminderNotification).toHaveBeenCalledTimes(1)
    })

    // Erreur silencieuse — pas de logger.error
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('devrait logger les erreurs globales de la fonction', async () => {
    mockGetUpcomingShiftsForEmployee.mockRejectedValue(new Error('Erreur globale'))

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        'Erreur vérification rappels shifts:',
        expect.any(Error)
      )
    })
  })

  it('devrait ignorer les shifts sans contrat', async () => {
    const shiftsWithNoContract = [
      {
        id: 'shift-1',
        date: '2025-06-15',
        start_time: '09:00',
        contract_id: 'contract-1',
        contract: null,
      },
    ]
    mockGetUpcomingShiftsForEmployee.mockResolvedValue(shiftsWithNoContract)
    mockGetAlreadyNotifiedShiftIds.mockResolvedValue(new Set())

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockGetAlreadyNotifiedShiftIds).toHaveBeenCalledTimes(1)
    })

    expect(mockGetProfileName).not.toHaveBeenCalled()
    expect(mockCreateShiftReminderNotification).not.toHaveBeenCalled()
  })
})
