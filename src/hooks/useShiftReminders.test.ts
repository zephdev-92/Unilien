import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock Supabase client
const mockFrom = vi.fn()

/**
 * Crée une chaine fluide de requête Supabase mockée.
 * Chaque méthode retourne la chaine elle-même ET l'objet
 * est "thenable" pour que `await` resolve le résultat final.
 */
function createChain(finalResult: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'gte', 'lte', 'in', 'order', 'limit']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Rendre la chaine awaitable (thenable)
  chain.then = (resolve: (v: unknown) => void) => resolve(finalResult)
  return chain
}

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

// Mock notificationService
const mockGetProfileName = vi.fn()
const mockCreateShiftReminderNotification = vi.fn()

vi.mock('@/services/notificationService', () => ({
  getProfileName: (...args: unknown[]) => mockGetProfileName(...args),
  createShiftReminderNotification: (...args: unknown[]) =>
    mockCreateShiftReminderNotification(...args),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { useShiftReminders } from './useShiftReminders'
import { logger } from '@/lib/logger'

describe('useShiftReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ne devrait rien faire si userId est undefined', () => {
    renderHook(() => useShiftReminders(undefined, 'employee'))

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('ne devrait rien faire si role est undefined', () => {
    renderHook(() => useShiftReminders('user-123', undefined))

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('ne devrait rien faire si le role n\'est pas employee', () => {
    renderHook(() => useShiftReminders('user-123', 'employer'))

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('devrait s\'exécuter une seule fois grâce à hasRun', async () => {
    const shiftsChain = createChain({ data: [], error: null })
    mockFrom.mockReturnValue(shiftsChain)

    const { rerender } = renderHook(
      ({ userId, role }) => useShiftReminders(userId, role),
      { initialProps: { userId: 'user-123', role: 'employee' } }
    )

    // Attendre que l'effet asynchrone s'exécute
    await vi.waitFor(() => {
      expect(mockFrom).toHaveBeenCalledTimes(1)
    })

    // Re-render avec les memes props
    rerender({ userId: 'user-123', role: 'employee' })

    // Ne devrait pas re-exécuter
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('devrait récupérer les shifts des prochaines 24h', async () => {
    const shiftsChain = createChain({ data: [], error: null })
    mockFrom.mockReturnValue(shiftsChain)

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('shifts')
    })

    expect(shiftsChain.select).toHaveBeenCalled()
    expect(shiftsChain.eq).toHaveBeenCalledWith('contract.employee_id', 'user-123')
    expect(shiftsChain.eq).toHaveBeenCalledWith('status', 'planned')
  })

  it('devrait ne rien faire si la requête shifts retourne une erreur', async () => {
    const shiftsChain = createChain({ data: null, error: new Error('DB error') })
    mockFrom.mockReturnValue(shiftsChain)

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockFrom).toHaveBeenCalledTimes(1)
    })

    // Ne devrait pas tenter de créer des rappels
    expect(mockGetProfileName).not.toHaveBeenCalled()
    expect(mockCreateShiftReminderNotification).not.toHaveBeenCalled()
  })

  it('devrait ne rien faire si aucun shift n\'est trouvé', async () => {
    const shiftsChain = createChain({ data: [], error: null })
    mockFrom.mockReturnValue(shiftsChain)

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockFrom).toHaveBeenCalledTimes(1)
    })

    expect(mockGetProfileName).not.toHaveBeenCalled()
  })

  it('devrait créer des rappels pour les shifts sans notification existante', async () => {
    const mockShifts = [
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

    // Premier appel : from('shifts') retourne les shifts
    const shiftsChain = createChain({ data: mockShifts, error: null })
    // Deuxième appel : from('notifications') retourne les notifs existantes
    const notifsChain = createChain({ data: [], error: null })

    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      callCount++
      if (table === 'shifts') return shiftsChain
      if (table === 'notifications') return notifsChain
      return shiftsChain
    })

    mockGetProfileName.mockResolvedValue('M. Martin')
    mockCreateShiftReminderNotification.mockResolvedValue(undefined)

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockCreateShiftReminderNotification).toHaveBeenCalledTimes(2)
    })

    expect(mockGetProfileName).toHaveBeenCalledWith('employer-1')
    expect(mockCreateShiftReminderNotification).toHaveBeenCalledWith(
      'user-123',
      'M. Martin',
      expect.any(Date),
      '09:00',
      'shift-1'
    )
    expect(mockCreateShiftReminderNotification).toHaveBeenCalledWith(
      'user-123',
      'M. Martin',
      expect.any(Date),
      '14:00',
      'shift-2'
    )
  })

  it('devrait ignorer les shifts déjà notifiés', async () => {
    const mockShifts = [
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

    const existingNotifs = [{ data: { shiftId: 'shift-1' } }]

    const shiftsChain = createChain({ data: mockShifts, error: null })
    const notifsChain = createChain({ data: existingNotifs, error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'shifts') return shiftsChain
      if (table === 'notifications') return notifsChain
      return shiftsChain
    })

    mockGetProfileName.mockResolvedValue('M. Martin')
    mockCreateShiftReminderNotification.mockResolvedValue(undefined)

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockCreateShiftReminderNotification).toHaveBeenCalledTimes(1)
    })

    // Seul shift-2 devrait recevoir un rappel
    expect(mockCreateShiftReminderNotification).toHaveBeenCalledWith(
      'user-123',
      'M. Martin',
      expect.any(Date),
      '14:00',
      'shift-2'
    )
  })

  it('devrait ignorer silencieusement les erreurs individuelles de création', async () => {
    const mockShifts = [
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

    const shiftsChain = createChain({ data: mockShifts, error: null })
    const notifsChain = createChain({ data: [], error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'shifts') return shiftsChain
      if (table === 'notifications') return notifsChain
      return shiftsChain
    })

    // Première création échoue, deuxième réussit
    mockGetProfileName
      .mockRejectedValueOnce(new Error('Profil introuvable'))
      .mockResolvedValueOnce('M. Martin')
    mockCreateShiftReminderNotification.mockResolvedValue(undefined)

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      // Le deuxième shift devrait quand même être traité
      expect(mockCreateShiftReminderNotification).toHaveBeenCalledTimes(1)
    })

    // Pas d'erreur logguée car c'est un catch silencieux
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('devrait logger les erreurs globales de la fonction', async () => {
    // Simuler une erreur au niveau global (pas dans la boucle)
    mockFrom.mockImplementation(() => {
      throw new Error('Erreur globale')
    })

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        'Erreur vérification rappels shifts:',
        expect.any(Error)
      )
    })
  })

  it('devrait ignorer les shifts sans contrat', async () => {
    const mockShifts = [
      {
        id: 'shift-1',
        date: '2025-06-15',
        start_time: '09:00',
        contract_id: 'contract-1',
        contract: undefined, // Pas de contrat
      },
    ]

    const shiftsChain = createChain({ data: mockShifts, error: null })
    const notifsChain = createChain({ data: [], error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'shifts') return shiftsChain
      if (table === 'notifications') return notifsChain
      return shiftsChain
    })

    renderHook(() => useShiftReminders('user-123', 'employee'))

    await vi.waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('notifications')
    })

    expect(mockGetProfileName).not.toHaveBeenCalled()
    expect(mockCreateShiftReminderNotification).not.toHaveBeenCalled()
  })
})
