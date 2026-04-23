import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { EmployeePayslipSection } from './EmployeePayslipSection'
import type { Payslip } from '@/types'

// ─── Mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/services/payslipStorageService', () => ({
  getPayslipsForEmployee: vi.fn(),
  getPayslipSignedUrl: vi.fn(),
}))

import { getPayslipsForEmployee, getPayslipSignedUrl } from '@/services/payslipStorageService'

const mockGetPayslipsForEmployee = vi.mocked(getPayslipsForEmployee)
const mockGetPayslipSignedUrl = vi.mocked(getPayslipSignedUrl)

// ─── Helpers ───────────────────────────────────────────────────────────

function makePayslip(overrides: Partial<Payslip> = {}): Payslip {
  return {
    id: 'p1',
    employerId: 'emp-1',
    employeeId: 'me',
    contractId: 'c-1',
    year: 2026,
    month: 3,
    periodLabel: null,
    grossPay: null,
    netPay: null,
    totalHours: null,
    pasRate: 0,
    isExemptPatronalSS: false,
    storagePath: 'emp-1/me/2026/03/bulletin.pdf',
    storageUrl: null,
    generatedAt: new Date('2026-04-05T10:00:00Z'),
    createdAt: new Date('2026-04-05T10:00:00Z'),
    ...overrides,
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe('EmployeePayslipSection', () => {
  beforeEach(() => {
    mockGetPayslipsForEmployee.mockReset()
    mockGetPayslipSignedUrl.mockReset()
  })

  it('affiche un état vide quand aucun bulletin', async () => {
    mockGetPayslipsForEmployee.mockResolvedValue([])

    renderWithProviders(<EmployeePayslipSection employeeId="me" />)

    await waitFor(() => {
      expect(screen.getByText(/aucun bulletin disponible/i)).toBeInTheDocument()
    })
  })

  it('affiche la liste des bulletins avec période et date de réception', async () => {
    mockGetPayslipsForEmployee.mockResolvedValue([
      makePayslip({ id: 'p1', year: 2026, month: 3 }),
      makePayslip({ id: 'p2', year: 2026, month: 2 }),
    ])

    renderWithProviders(<EmployeePayslipSection employeeId="me" />)

    await waitFor(() => {
      expect(screen.getByText('Mars 2026')).toBeInTheDocument()
    })
    expect(screen.getByText('Février 2026')).toBeInTheDocument()
    expect(screen.getByText(/2 bulletins archivés/i)).toBeInTheDocument()
  })

  it('affiche le filtre année si plusieurs années présentes', async () => {
    mockGetPayslipsForEmployee.mockResolvedValue([
      makePayslip({ id: 'p1', year: 2026, month: 3 }),
      makePayslip({ id: 'p2', year: 2025, month: 11 }),
    ])

    renderWithProviders(<EmployeePayslipSection employeeId="me" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/filtrer par année/i)).toBeInTheDocument()
    })
  })

  it('masque le filtre année quand une seule année', async () => {
    mockGetPayslipsForEmployee.mockResolvedValue([
      makePayslip({ id: 'p1', year: 2026, month: 3 }),
    ])

    renderWithProviders(<EmployeePayslipSection employeeId="me" />)

    await waitFor(() => {
      expect(screen.getByText('Mars 2026')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/filtrer par année/i)).not.toBeInTheDocument()
  })

  it('cache le bouton de téléchargement quand storagePath est null', async () => {
    mockGetPayslipsForEmployee.mockResolvedValue([
      makePayslip({ id: 'p1', storagePath: null }),
    ])

    renderWithProviders(<EmployeePayslipSection employeeId="me" />)

    await waitFor(() => {
      expect(screen.getByText('Mars 2026')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/télécharger le bulletin/i)).not.toBeInTheDocument()
  })
})
