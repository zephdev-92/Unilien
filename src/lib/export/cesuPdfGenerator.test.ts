import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateCesuPdf } from './cesuPdfGenerator'
import type { MonthlyDeclarationData, EmployeeDeclarationData } from './types'

// ── Mock react-pdf renderer ────────────────────────────────────────────────

vi.mock('./pdfReactRenderer', () => ({
  renderReactPdf: vi.fn(async () => 'data:application/pdf;base64,MOCK_PDF'),
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEmployee(overrides: Partial<EmployeeDeclarationData> = {}): EmployeeDeclarationData {
  return {
    employeeId: 'emp-1',
    firstName: 'Marie',
    lastName: 'Curie',
    contractId: 'contract-1',
    contractType: 'CDI',
    hourlyRate: 12.5,
    totalHours: 40,
    normalHours: 35,
    sundayHours: 3,
    holidayHours: 0,
    nightHours: 2,
    overtimeHours: 5,
    basePay: 437.5,
    sundayMajoration: 11.25,
    holidayMajoration: 0,
    nightMajoration: 5,
    overtimeMajoration: 15.625,
    totalGrossPay: 469.375,
    shiftsCount: 8,
    shiftsDetails: [],
    ...overrides,
  }
}

function makeData(overrides: Partial<MonthlyDeclarationData> = {}): MonthlyDeclarationData {
  return {
    year: 2026,
    month: 1,
    periodLabel: 'Janvier 2026',
    employerId: 'employer-1',
    employerFirstName: 'Paul',
    employerLastName: 'Durand',
    employerAddress: '12 rue de la Paix, 75001 Paris',
    employees: [makeEmployee()],
    totalHours: 40,
    totalGrossPay: 469.375,
    totalEmployees: 1,
    generatedAt: new Date('2026-01-31T12:00:00'),
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('generateCesuPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Résultat de base', () => {
    it('retourne success=true pour des données valides', async () => {
      const result = await generateCesuPdf(makeData())
      expect(result.success).toBe(true)
    })

    it('retourne le bon mimeType', async () => {
      const result = await generateCesuPdf(makeData())
      expect(result.mimeType).toBe('application/pdf')
    })

    it('retourne un filename au format cesu_YYYY_MM.pdf', async () => {
      const result = await generateCesuPdf(makeData({ year: 2026, month: 3 }))
      expect(result.filename).toBe('cesu_2026_03.pdf')
    })

    it('padde le mois avec un zéro (mois 1 → 01)', async () => {
      const result = await generateCesuPdf(makeData({ year: 2026, month: 1 }))
      expect(result.filename).toBe('cesu_2026_01.pdf')
    })

    it('retourne le contenu PDF depuis le renderer', async () => {
      const result = await generateCesuPdf(makeData())
      expect(result.content).toBe('data:application/pdf;base64,MOCK_PDF')
    })
  })

  describe('Avec numéro CESU', () => {
    it('accepte un cesuNumber optionnel', async () => {
      const result = await generateCesuPdf(makeData({ cesuNumber: 'CESU-12345' }))
      expect(result.success).toBe(true)
    })
  })

  describe('Avec plusieurs employés', () => {
    it('accepte plusieurs employés', async () => {
      const data = makeData({
        employees: [
          makeEmployee(),
          makeEmployee({ employeeId: 'emp-2', firstName: 'Albert', lastName: 'Einstein' }),
        ],
        totalEmployees: 2,
      })
      const result = await generateCesuPdf(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Gestion d\'erreur', () => {
    it('retourne success=false si le renderer échoue', async () => {
      const { renderReactPdf } = await import('./pdfReactRenderer')
      vi.mocked(renderReactPdf).mockRejectedValueOnce(new Error('Render failed'))

      const result = await generateCesuPdf(makeData())
      expect(result.success).toBe(false)
      expect(result.error).toContain('Render failed')
    })
  })
})
