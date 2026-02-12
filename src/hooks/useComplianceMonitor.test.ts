import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock complianceService
const mockGetWeeklyComplianceOverview = vi.fn()

vi.mock('@/services/complianceService', () => ({
  getWeeklyComplianceOverview: (...args: unknown[]) =>
    mockGetWeeklyComplianceOverview(...args),
}))

// Mock notificationService
const mockCreateComplianceWarningNotification = vi.fn()
const mockCreateComplianceCriticalNotification = vi.fn()

vi.mock('@/services/notificationService', () => ({
  createComplianceWarningNotification: (...args: unknown[]) =>
    mockCreateComplianceWarningNotification(...args),
  createComplianceCriticalNotification: (...args: unknown[]) =>
    mockCreateComplianceCriticalNotification(...args),
  COMPLIANCE_THRESHOLDS: {
    WEEKLY_HOURS_WARNING: 44,
    WEEKLY_HOURS_CRITICAL: 48,
    DAILY_HOURS_WARNING: 8,
    DAILY_HOURS_CRITICAL: 10,
    WEEKLY_REST_MINIMUM: 35,
    DAILY_REST_MINIMUM: 11,
  },
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

import { useComplianceMonitor } from './useComplianceMonitor'
import type { UseComplianceMonitorOptions } from './useComplianceMonitor'
import { logger } from '@/lib/logger'

// ============================================
// HELPERS
// ============================================

function createBaseEmployee(overrides = {}) {
  return {
    employeeId: 'emp-1',
    employeeName: 'Jean Dupont',
    contractId: 'contract-1',
    weeklyHours: 35,
    currentWeekHours: 30,
    remainingWeeklyHours: 18,
    remainingDailyHours: 5,
    weeklyRestStatus: { longestRest: 40, isCompliant: true },
    alerts: [] as Array<{ type: string; severity: string; message: string }>,
    status: 'ok' as const,
    ...overrides,
  }
}

function createOverviewWith(employees: ReturnType<typeof createBaseEmployee>[]) {
  return {
    weekStart: new Date('2026-02-09'),
    weekEnd: new Date('2026-02-15'),
    weekLabel: 'Semaine du 9 au 15 février 2026',
    employees,
    summary: {
      totalEmployees: employees.length,
      compliant: employees.filter((e) => e.status === 'ok').length,
      warnings: employees.filter((e) => e.status === 'warning').length,
      critical: employees.filter((e) => e.status === 'critical').length,
    },
  }
}

function renderMonitor(overrides: Partial<UseComplianceMonitorOptions> = {}) {
  const defaultOptions: UseComplianceMonitorOptions = {
    employerId: 'employer-1',
    userId: 'user-1',
    enabled: true,
    pollingInterval: 5 * 60 * 1000,
    ...overrides,
  }
  return renderHook(
    (props: UseComplianceMonitorOptions) => useComplianceMonitor(props),
    { initialProps: defaultOptions }
  )
}

/**
 * Flush les micro-tasks (Promises) en avançant les timers de 0ms.
 * Permet aux callbacks asynchrones déclenchées par useEffect de se résoudre.
 */
async function flushPromises() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

// ============================================
// TESTS
// ============================================

describe('useComplianceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockGetWeeklyComplianceOverview.mockResolvedValue(
      createOverviewWith([createBaseEmployee()])
    )
    mockCreateComplianceWarningNotification.mockResolvedValue(null)
    mockCreateComplianceCriticalNotification.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ------------------------------------------
  // 1. Ne fait rien si employerId est null
  // ------------------------------------------
  it('ne fait rien si employerId est null', async () => {
    renderMonitor({ employerId: null })

    await flushPromises()

    expect(mockGetWeeklyComplianceOverview).not.toHaveBeenCalled()
  })

  // ------------------------------------------
  // 2. Ne fait rien si userId est null
  // ------------------------------------------
  it('ne fait rien si userId est null', async () => {
    renderMonitor({ userId: null })

    await flushPromises()

    expect(mockGetWeeklyComplianceOverview).not.toHaveBeenCalled()
  })

  // ------------------------------------------
  // 3. Ne fait rien si enabled est false
  // ------------------------------------------
  it('ne fait rien si enabled est false', async () => {
    renderMonitor({ enabled: false })

    await flushPromises()

    expect(mockGetWeeklyComplianceOverview).not.toHaveBeenCalled()
  })

  // ------------------------------------------
  // 4. Appelle getWeeklyComplianceOverview au montage si enabled
  // ------------------------------------------
  it('appelle getWeeklyComplianceOverview au montage si enabled', async () => {
    renderMonitor()

    await flushPromises()

    expect(mockGetWeeklyComplianceOverview).toHaveBeenCalledTimes(1)
    expect(mockGetWeeklyComplianceOverview).toHaveBeenCalledWith('employer-1')
  })

  // ------------------------------------------
  // 5. Crée une notification critique pour heures hebdo >= 48h
  // ------------------------------------------
  it('crée une notification critique pour heures hebdomadaires >= 48h', async () => {
    const employee = createBaseEmployee({
      currentWeekHours: 50,
      status: 'critical',
    })
    mockGetWeeklyComplianceOverview.mockResolvedValue(
      createOverviewWith([employee])
    )

    renderMonitor()

    await flushPromises()

    expect(mockCreateComplianceCriticalNotification).toHaveBeenCalledWith(
      'user-1',
      'Jean Dupont',
      'weekly_hours',
      50,
      48,
      expect.any(Date)
    )

    // Pas de warning car le seuil critique prime (else if)
    expect(mockCreateComplianceWarningNotification).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'weekly_hours',
      expect.anything(),
      expect.anything(),
      expect.anything()
    )
  })

  // ------------------------------------------
  // 6. Crée une notification warning pour heures hebdo >= 44h (mais < 48h)
  // ------------------------------------------
  it('crée une notification warning pour heures hebdomadaires >= 44h', async () => {
    const employee = createBaseEmployee({
      currentWeekHours: 45,
      status: 'warning',
    })
    mockGetWeeklyComplianceOverview.mockResolvedValue(
      createOverviewWith([employee])
    )

    renderMonitor()

    await flushPromises()

    expect(mockCreateComplianceWarningNotification).toHaveBeenCalledWith(
      'user-1',
      'Jean Dupont',
      'weekly_hours',
      45,
      44,
      expect.any(Date)
    )

    expect(mockCreateComplianceCriticalNotification).not.toHaveBeenCalled()
  })

  // ------------------------------------------
  // 7. Crée une notification critique pour heures quotidiennes (remainingDailyHours <= 0)
  // ------------------------------------------
  it('crée une notification critique pour heures quotidiennes épuisées (remainingDailyHours <= 0)', async () => {
    const employee = createBaseEmployee({
      remainingDailyHours: 0,
      status: 'critical',
    })
    mockGetWeeklyComplianceOverview.mockResolvedValue(
      createOverviewWith([employee])
    )

    renderMonitor()

    await flushPromises()

    expect(mockCreateComplianceCriticalNotification).toHaveBeenCalledWith(
      'user-1',
      'Jean Dupont',
      'daily_hours',
      10, // DAILY_HOURS_CRITICAL (10) - remainingDailyHours (0) = 10
      10,
      expect.any(Date)
    )
  })

  // ------------------------------------------
  // 8. Crée une notification warning pour heures quotidiennes (remainingDailyHours <= 2)
  // ------------------------------------------
  it('crée une notification warning pour heures quotidiennes proches du max (remainingDailyHours <= 2)', async () => {
    const employee = createBaseEmployee({
      remainingDailyHours: 1.5,
      status: 'warning',
    })
    mockGetWeeklyComplianceOverview.mockResolvedValue(
      createOverviewWith([employee])
    )

    renderMonitor()

    await flushPromises()

    expect(mockCreateComplianceWarningNotification).toHaveBeenCalledWith(
      'user-1',
      'Jean Dupont',
      'daily_hours',
      8.5, // DAILY_HOURS_CRITICAL (10) - remainingDailyHours (1.5) = 8.5
      8,   // DAILY_HOURS_WARNING
      expect.any(Date)
    )
  })

  // ------------------------------------------
  // 9. Crée une notification critique pour repos hebdomadaire non conforme
  // ------------------------------------------
  it('crée une notification critique pour repos hebdomadaire non conforme', async () => {
    const employee = createBaseEmployee({
      weeklyRestStatus: { longestRest: 28, isCompliant: false },
      status: 'critical',
    })
    mockGetWeeklyComplianceOverview.mockResolvedValue(
      createOverviewWith([employee])
    )

    renderMonitor()

    await flushPromises()

    expect(mockCreateComplianceCriticalNotification).toHaveBeenCalledWith(
      'user-1',
      'Jean Dupont',
      'weekly_rest',
      28,
      35, // WEEKLY_REST_MINIMUM
      expect.any(Date)
    )
  })

  // ------------------------------------------
  // 10. Crée une notification critique pour repos quotidien (alert daily_rest)
  // ------------------------------------------
  it('crée une notification critique pour alerte repos quotidien', async () => {
    const employee = createBaseEmployee({
      alerts: [
        { type: 'daily_rest', severity: 'critical', message: 'Repos insuffisant' },
      ],
      status: 'critical',
    })
    mockGetWeeklyComplianceOverview.mockResolvedValue(
      createOverviewWith([employee])
    )

    renderMonitor()

    await flushPromises()

    expect(mockCreateComplianceCriticalNotification).toHaveBeenCalledWith(
      'user-1',
      'Jean Dupont',
      'daily_rest',
      0,
      11, // DAILY_REST_MINIMUM
      expect.any(Date)
    )
  })

  // ------------------------------------------
  // 11. Ne recrée pas une notification déjà trackée (déduplication)
  // ------------------------------------------
  it('ne recrée pas une notification déjà trackée dans la fenêtre de 1h', async () => {
    const employee = createBaseEmployee({
      currentWeekHours: 50,
      status: 'critical',
    })
    mockGetWeeklyComplianceOverview.mockResolvedValue(
      createOverviewWith([employee])
    )

    const POLLING = 10_000
    renderMonitor({ pollingInterval: POLLING })

    // Premier appel au montage : doit notifier
    await flushPromises()
    expect(mockCreateComplianceCriticalNotification).toHaveBeenCalledTimes(1)

    // Avancer de 10s pour déclencher le polling (dans la fenêtre de 1h)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLLING)
    })

    // Le service a été appelé une seconde fois mais la notification n'a pas été recréée
    expect(mockGetWeeklyComplianceOverview).toHaveBeenCalledTimes(2)
    expect(mockCreateComplianceCriticalNotification).toHaveBeenCalledTimes(1)
  })

  // ------------------------------------------
  // 12. Renotifie après 1h (timestamp expiré)
  // ------------------------------------------
  it('renotifie après expiration du délai de 1 heure', async () => {
    const employee = createBaseEmployee({
      currentWeekHours: 50,
      status: 'critical',
    })
    mockGetWeeklyComplianceOverview.mockResolvedValue(
      createOverviewWith([employee])
    )

    const ONE_HOUR = 60 * 60 * 1000
    const POLLING = 30_000

    renderMonitor({ pollingInterval: POLLING })

    // Premier appel au montage
    await flushPromises()
    expect(mockCreateComplianceCriticalNotification).toHaveBeenCalledTimes(1)

    // Avancer d'un peu plus d'une heure en pas de POLLING
    const steps = Math.ceil((ONE_HOUR + 1000) / POLLING)
    for (let i = 0; i < steps; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLLING)
      })
    }

    // Le timestamp est expiré, la notification doit avoir été recréée
    expect(mockCreateComplianceCriticalNotification).toHaveBeenCalledTimes(2)
  })

  // ------------------------------------------
  // 13. Gère les erreurs de getWeeklyComplianceOverview
  // ------------------------------------------
  it('gère les erreurs de getWeeklyComplianceOverview et les logue', async () => {
    const error = new Error('Erreur réseau')
    mockGetWeeklyComplianceOverview.mockRejectedValue(error)

    renderMonitor()

    await flushPromises()

    expect(logger.error).toHaveBeenCalledWith(
      'Erreur surveillance conformité:',
      error
    )

    // Aucune notification ne doit avoir été créée
    expect(mockCreateComplianceCriticalNotification).not.toHaveBeenCalled()
    expect(mockCreateComplianceWarningNotification).not.toHaveBeenCalled()
  })

  // ------------------------------------------
  // 14. Polling : appelle checkCompliance à l'intervalle configuré
  // ------------------------------------------
  it('appelle checkCompliance à chaque intervalle de polling configuré', async () => {
    const POLLING = 60_000 // 1 minute

    renderMonitor({ pollingInterval: POLLING })

    // Premier appel immédiat au montage
    await flushPromises()
    expect(mockGetWeeklyComplianceOverview).toHaveBeenCalledTimes(1)

    // Avancer d'un intervalle de polling
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLLING)
    })
    expect(mockGetWeeklyComplianceOverview).toHaveBeenCalledTimes(2)

    // Avancer d'un second intervalle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLLING)
    })
    expect(mockGetWeeklyComplianceOverview).toHaveBeenCalledTimes(3)
  })
})
