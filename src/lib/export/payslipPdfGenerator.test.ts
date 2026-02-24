import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generatePayslipPdf } from './payslipPdfGenerator'
import type { PayslipData, CotisationsResult } from './types'

// ── Mock jsPDF (vi.hoisted car vi.mock est hissé avant les variables) ──────────

const { mockDoc } = vi.hoisted(() => {
  const mockDoc = {
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setLineWidth: vi.fn(),
    setPage: vi.fn(),
    text: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    addPage: vi.fn(),
    output: vi.fn().mockReturnValue('data:application/pdf;base64,MOCK_PDF'),
    internal: {
      pageSize: {
        getWidth: vi.fn().mockReturnValue(210),
        getHeight: vi.fn().mockReturnValue(297),
      },
      getNumberOfPages: vi.fn().mockReturnValue(1),
    },
  }
  return { mockDoc }
})

vi.mock('jspdf', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: vi.fn(function(this: any) { Object.assign(this, mockDoc) }),
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCotisations(overrides: Partial<CotisationsResult> = {}): CotisationsResult {
  return {
    passMonthly: 3666,
    smicMonthly: 1801.8,
    grossPay: 1200,
    employeeCotisations: [],
    totalEmployeeDeductions: 240,
    employerCotisations: [],
    totalEmployerContributions: 420,
    netImposable: 960,
    pasAmount: 72,
    netAPayer: 888,
    pasRate: 0.075,
    isExemptPatronalSS: false,
    ...overrides,
  }
}

function makeData(overrides: Partial<PayslipData> = {}): PayslipData {
  return {
    year: 2026,
    month: 1,
    periodLabel: 'Janvier 2026',
    employerId: 'employer-1',
    employerFirstName: 'Paul',
    employerLastName: 'Durand',
    employerAddress: '12 rue de la Paix, 75001 Paris',
    employeeId: 'employee-1',
    employeeFirstName: 'Marie',
    employeeLastName: 'Curie',
    contractType: 'CDI',
    hourlyRate: 12.5,
    weeklyHours: 35,
    totalHours: 151.67,
    normalHours: 140,
    sundayHours: 5,
    holidayHours: 0,
    nightHours: 6.67,
    overtimeHours: 0,
    basePay: 1750,
    sundayMajoration: 18.75,
    holidayMajoration: 0,
    nightMajoration: 20.01,
    overtimeMajoration: 0,
    presenceResponsiblePay: 0,
    nightPresenceAllowance: 0,
    totalGrossPay: 1788.76,
    shiftsCount: 20,
    cotisations: makeCotisations({ grossPay: 1788.76 }),
    generatedAt: new Date('2026-01-31T12:00:00'),
    isExemptPatronalSS: false,
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('generatePayslipPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDoc.output.mockReturnValue('data:application/pdf;base64,MOCK_PDF')
  })

  describe('Résultat de base', () => {
    it('retourne success=true pour des données valides', () => {
      const result = generatePayslipPdf(makeData())
      expect(result.success).toBe(true)
    })

    it('retourne le bon mimeType', () => {
      const result = generatePayslipPdf(makeData())
      expect(result.mimeType).toBe('application/pdf')
    })

    it('retourne le contenu PDF depuis output()', () => {
      const result = generatePayslipPdf(makeData())
      expect(result.content).toBe('data:application/pdf;base64,MOCK_PDF')
    })

    it('appelle doc.output avec "datauristring"', () => {
      generatePayslipPdf(makeData())
      expect(mockDoc.output).toHaveBeenCalledWith('datauristring')
    })
  })

  describe('Nom du fichier', () => {
    it('génère le bon filename pour "Curie" en janvier 2026', () => {
      const result = generatePayslipPdf(makeData())
      expect(result.filename).toBe('bulletin_curie_2026_01.pdf')
    })

    it('padde le mois avec un zéro (mois 3 → 03)', () => {
      const result = generatePayslipPdf(makeData({ month: 3 }))
      expect(result.filename).toBe('bulletin_curie_2026_03.pdf')
    })

    it('normalise les espaces dans le nom (nom avec espace → underscore)', () => {
      const result = generatePayslipPdf(makeData({ employeeLastName: 'De La Tour' }))
      expect(result.filename).toContain('de_la_tour')
    })
  })

  describe('Contenu dessiné', () => {
    it('appelle setFillColor au moins une fois', () => {
      generatePayslipPdf(makeData())
      expect(mockDoc.setFillColor).toHaveBeenCalled()
    })

    it('appelle text au moins une fois', () => {
      generatePayslipPdf(makeData())
      expect(mockDoc.text).toHaveBeenCalled()
    })

    it('inclut le nom de l\'employé dans les appels text', () => {
      generatePayslipPdf(makeData())
      const textCalls = mockDoc.text.mock.calls.map((call: unknown[]) => String(call[0]))
      const allText = textCalls.join(' ')
      expect(allText).toContain('Marie Curie')
    })

    it('inclut le nom de l\'employeur dans les appels text', () => {
      generatePayslipPdf(makeData())
      const textCalls = mockDoc.text.mock.calls.map((call: unknown[]) => String(call[0]))
      const allText = textCalls.join(' ')
      expect(allText).toContain('Paul Durand')
    })
  })

  describe('Exonération patronale SS', () => {
    it('génère sans erreur avec isExemptPatronalSS=true', () => {
      const result = generatePayslipPdf(makeData({
        isExemptPatronalSS: true,
        cotisations: makeCotisations({ isExemptPatronalSS: true }),
      }))
      expect(result.success).toBe(true)
    })
  })

  describe('Avec lignes de cotisations', () => {
    it('génère sans erreur avec des lignes de cotisations', () => {
      const result = generatePayslipPdf(makeData({
        cotisations: makeCotisations({
          employeeCotisations: [
            { label: 'CSG déductible', base: 1788.76, rate: 0.068, amount: 121.64, isEmployer: false },
          ],
          employerCotisations: [
            { label: 'URSSAF', base: 1788.76, rate: 0.13, amount: 232.54, isEmployer: true },
          ],
        }),
      }))
      expect(result.success).toBe(true)
    })

    it('génère sans erreur avec des lignes exonérées', () => {
      const result = generatePayslipPdf(makeData({
        cotisations: makeCotisations({
          employerCotisations: [
            { label: 'SS patronale', base: 1788.76, rate: 0.128, amount: 0, isEmployer: true, exempted: true },
          ],
        }),
      }))
      expect(result.success).toBe(true)
    })
  })

  describe('Gestion d\'erreur', () => {
    it('retourne success=false si output lance une erreur', () => {
      mockDoc.output.mockImplementation(() => {
        throw new Error('PDF generation failed')
      })
      const result = generatePayslipPdf(makeData())
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('retourne le message d\'erreur dans result.error', () => {
      mockDoc.output.mockImplementation(() => {
        throw new Error('jsPDF crashed')
      })
      const result = generatePayslipPdf(makeData())
      expect(result.error).toContain('jsPDF crashed')
    })
  })
})
