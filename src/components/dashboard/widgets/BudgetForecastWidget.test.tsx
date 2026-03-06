import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { BudgetForecastWidget } from './BudgetForecastWidget'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetEmployerBudgetForecast = vi.fn()
vi.mock('@/services/statsService', () => ({
  getEmployerBudgetForecast: (...args: unknown[]) => mockGetEmployerBudgetForecast(...args),
}))

const mockGetEmployer = vi.fn()
vi.mock('@/services/profileService', () => ({
  getEmployer: (...args: unknown[]) => mockGetEmployer(...args),
}))

vi.mock('@/lib/pch/pchTariffs', () => ({
  calcEnveloppePch: vi.fn(() => 1200),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ── Tests ────────────────────────────────────────────────────────────────────

const baseForecast = {
  completedHours: 60,
  plannedHours: 40,
  projectedHours: 100,
  avgHourlyRate: 14,
  projectedCostGross: 1400,
  projectedCostWithCharges: 1988,
}

describe('BudgetForecastWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetEmployer.mockResolvedValue(null)
  })

  it('affiche les skeletons pendant le chargement', () => {
    mockGetEmployerBudgetForecast.mockReturnValue(new Promise(() => {}))
    const { container } = renderWithProviders(
      <BudgetForecastWidget employerId="emp-1" />
    )
    const skeletons = container.querySelectorAll('[class*="chakra-skeleton"], [data-status]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('ne rend rien si projectedHours est 0', async () => {
    mockGetEmployerBudgetForecast.mockResolvedValue({
      ...baseForecast,
      completedHours: 0,
      plannedHours: 0,
      projectedHours: 0,
      projectedCostGross: 0,
      projectedCostWithCharges: 0,
    })
    const { container } = renderWithProviders(
      <BudgetForecastWidget employerId="emp-1" />
    )
    await waitFor(() => {
      const skeletons = container.querySelectorAll('[class*="chakra-skeleton"], [data-status]')
      expect(skeletons.length).toBe(0)
    })
    expect(screen.queryByText('Projection budget')).not.toBeInTheDocument()
  })

  it('affiche les heures effectuees et planifiees', async () => {
    mockGetEmployerBudgetForecast.mockResolvedValue(baseForecast)
    renderWithProviders(<BudgetForecastWidget employerId="emp-1" />)

    await waitFor(() => {
      expect(screen.getByText('60h')).toBeInTheDocument()
      expect(screen.getByText('40h')).toBeInTheDocument()
      expect(screen.getByText('100h')).toBeInTheDocument()
    })
  })

  it('affiche le titre "Projection budget"', async () => {
    mockGetEmployerBudgetForecast.mockResolvedValue(baseForecast)
    renderWithProviders(<BudgetForecastWidget employerId="emp-1" />)

    await waitFor(() => {
      expect(screen.getByText('Projection budget')).toBeInTheDocument()
    })
  })

  it('ne rend rien si employeur PCH beneficiaire', async () => {
    mockGetEmployerBudgetForecast.mockResolvedValue(baseForecast)
    mockGetEmployer.mockResolvedValue({
      pchBeneficiary: true,
      pchType: 'emploiDirect',
      pchMonthlyHours: 60,
    })
    const { container } = renderWithProviders(
      <BudgetForecastWidget employerId="emp-1" />
    )
    await waitFor(() => {
      const skeletons = container.querySelectorAll('[class*="chakra-skeleton"], [data-status]')
      expect(skeletons.length).toBe(0)
    })
    expect(screen.queryByText('Projection budget')).not.toBeInTheDocument()
  })

  it('n\'affiche pas la section PCH si non beneficiaire', async () => {
    mockGetEmployerBudgetForecast.mockResolvedValue(baseForecast)
    mockGetEmployer.mockResolvedValue({ pchBeneficiary: false })
    renderWithProviders(<BudgetForecastWidget employerId="emp-1" />)

    await waitFor(() => {
      expect(screen.getByText('Projection budget')).toBeInTheDocument()
    })
    expect(screen.queryByText('vs enveloppe PCH')).not.toBeInTheDocument()
  })
})
