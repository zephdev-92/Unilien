import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generatePayslipPdf } from './payslipPdfGenerator'
import type { PayslipData, CotisationsResult } from './types'

// ── Mock react-pdf renderer ────────────────────────────────────────────────

vi.mock('./pdfReactRenderer', () => ({
  renderReactPdf: vi.fn(async () => 'data:application/pdf;base64,MOCK_PDF'),
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
    contractId: 'contract-1',
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
    isPchBeneficiary: false,
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('generatePayslipPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Résultat de base', () => {
    it('retourne success=true pour des données valides', async () => {
      const result = await generatePayslipPdf(makeData())
      expect(result.success).toBe(true)
    })

    it('retourne le bon mimeType', async () => {
      const result = await generatePayslipPdf(makeData())
      expect(result.mimeType).toBe('application/pdf')
    })

    it('retourne le contenu PDF depuis le renderer', async () => {
      const result = await generatePayslipPdf(makeData())
      expect(result.content).toBe('data:application/pdf;base64,MOCK_PDF')
    })
  })

  describe('Nom du fichier', () => {
    it('génère le bon filename pour "Curie" en janvier 2026', async () => {
      const result = await generatePayslipPdf(makeData())
      expect(result.filename).toBe('bulletin_curie_2026_01.pdf')
    })

    it('padde le mois avec un zéro (mois 3 → 03)', async () => {
      const result = await generatePayslipPdf(makeData({ month: 3 }))
      expect(result.filename).toBe('bulletin_curie_2026_03.pdf')
    })

    it('normalise les espaces dans le nom', async () => {
      const result = await generatePayslipPdf(makeData({ employeeLastName: 'De La Tour' }))
      expect(result.filename).toContain('de_la_tour')
    })
  })

  describe('Exonération patronale SS', () => {
    it('génère sans erreur avec isExemptPatronalSS=true', async () => {
      const result = await generatePayslipPdf(makeData({
        isExemptPatronalSS: true,
        cotisations: makeCotisations({ isExemptPatronalSS: true }),
      }))
      expect(result.success).toBe(true)
    })
  })

  describe('Avec lignes de cotisations', () => {
    it('génère sans erreur avec des lignes de cotisations', async () => {
      const result = await generatePayslipPdf(makeData({
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

    it('génère sans erreur avec des lignes exonérées', async () => {
      const result = await generatePayslipPdf(makeData({
        cotisations: makeCotisations({
          employerCotisations: [
            { label: 'SS patronale', base: 1788.76, rate: 0.128, amount: 0, isEmployer: true, exempted: true },
          ],
        }),
      }))
      expect(result.success).toBe(true)
    })
  })

  describe('Section PCH', () => {
    const pchData = {
      pchType: 'emploiDirect' as const,
      pchMonthlyHours: 60,
      pchElement1Rate: 19.34,
      pchEnvelopePch: 1160.40,
      pchTotalCost: 1788.76 + 420,
      pchResteACharge: Math.max(0, 2208.76 - 1160.40),
    }

    it('génère sans erreur avec isPchBeneficiary=true', async () => {
      const result = await generatePayslipPdf(makeData({
        isPchBeneficiary: true,
        pch: pchData,
      }))
      expect(result.success).toBe(true)
    })

    it('génère sans erreur avec pch absent', async () => {
      const result = await generatePayslipPdf(makeData({ isPchBeneficiary: true, pch: undefined }))
      expect(result.success).toBe(true)
    })

    it('génère sans erreur avec reste à charge nul', async () => {
      const result = await generatePayslipPdf(makeData({
        isPchBeneficiary: true,
        pch: { ...pchData, pchEnvelopePch: 9999, pchResteACharge: 0 },
      }))
      expect(result.success).toBe(true)
    })
  })

  describe('Gestion d\'erreur', () => {
    it('retourne success=false si le renderer échoue', async () => {
      const { renderReactPdf } = await import('./pdfReactRenderer')
      vi.mocked(renderReactPdf).mockRejectedValueOnce(new Error('Render failed'))

      const result = await generatePayslipPdf(makeData())
      expect(result.success).toBe(false)
      expect(result.error).toContain('Render failed')
    })
  })

  describe('Majorations', () => {
    it('génère sans erreur avec toutes les majorations', async () => {
      const result = await generatePayslipPdf(makeData({
        sundayMajoration: 18.75,
        holidayMajoration: 25,
        nightMajoration: 20.01,
        overtimeMajoration: 15,
        presenceResponsiblePay: 100,
        nightPresenceAllowance: 50,
      }))
      expect(result.success).toBe(true)
    })
  })
})
