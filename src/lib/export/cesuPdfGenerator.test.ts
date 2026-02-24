import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateCesuPdf } from './cesuPdfGenerator'
import type { MonthlyDeclarationData, EmployeeDeclarationData } from './types'

// ── Mock jsPDF (vi.hoisted car vi.mock est hissé avant les variables) ──────────

const { mockDoc } = vi.hoisted(() => {
  const mockDoc = {
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setLineWidth: vi.fn(),
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
    },
  }
  return { mockDoc }
})

vi.mock('jspdf', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: vi.fn(function(this: any) { Object.assign(this, mockDoc) }),
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
    mockDoc.output.mockReturnValue('data:application/pdf;base64,MOCK_PDF')
  })

  describe('Résultat de base', () => {
    it('retourne success=true pour des données valides', () => {
      const result = generateCesuPdf(makeData())
      expect(result.success).toBe(true)
    })

    it('retourne le bon mimeType', () => {
      const result = generateCesuPdf(makeData())
      expect(result.mimeType).toBe('application/pdf')
    })

    it('retourne un filename au format cesu_YYYY_MM.pdf', () => {
      const result = generateCesuPdf(makeData({ year: 2026, month: 3 }))
      expect(result.filename).toBe('cesu_2026_03.pdf')
    })

    it('padde le mois avec un zéro (mois 1 → 01)', () => {
      const result = generateCesuPdf(makeData({ year: 2026, month: 1 }))
      expect(result.filename).toBe('cesu_2026_01.pdf')
    })

    it('retourne le contenu PDF depuis output()', () => {
      const result = generateCesuPdf(makeData())
      expect(result.content).toBe('data:application/pdf;base64,MOCK_PDF')
    })

    it('appelle doc.output avec "datauristring"', () => {
      generateCesuPdf(makeData())
      expect(mockDoc.output).toHaveBeenCalledWith('datauristring')
    })
  })

  describe('Contenu dessiné', () => {
    it('appelle setFillColor au moins une fois', () => {
      generateCesuPdf(makeData())
      expect(mockDoc.setFillColor).toHaveBeenCalled()
    })

    it('appelle text au moins une fois', () => {
      generateCesuPdf(makeData())
      expect(mockDoc.text).toHaveBeenCalled()
    })

    it('inclut le nom de l\'employeur dans les appels text', () => {
      generateCesuPdf(makeData())
      const textCalls = mockDoc.text.mock.calls.map((call: unknown[]) => String(call[0]))
      const allText = textCalls.join(' ')
      expect(allText).toContain('Paul Durand')
    })
  })

  describe('Avec numéro CESU', () => {
    it('accepte un cesuNumber optionnel', () => {
      const result = generateCesuPdf(makeData({ cesuNumber: 'CESU-12345' }))
      expect(result.success).toBe(true)
    })

    it('inclut le numéro CESU dans les appels text', () => {
      generateCesuPdf(makeData({ cesuNumber: 'CESU-12345' }))
      const textCalls = mockDoc.text.mock.calls.map((call: unknown[]) => String(call[0]))
      const allText = textCalls.join(' ')
      expect(allText).toContain('CESU-12345')
    })
  })

  describe('Avec plusieurs employés (pagination)', () => {
    it('accepte plusieurs employés', () => {
      const data = makeData({
        employees: [
          makeEmployee(),
          makeEmployee({ employeeId: 'emp-2', firstName: 'Albert', lastName: 'Einstein' }),
        ],
        totalEmployees: 2,
      })
      const result = generateCesuPdf(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Gestion d\'erreur', () => {
    it('retourne success=false si output lance une erreur', () => {
      mockDoc.output.mockImplementation(() => {
        throw new Error('PDF generation failed')
      })
      const result = generateCesuPdf(makeData())
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('retourne le message d\'erreur dans result.error', () => {
      mockDoc.output.mockImplementation(() => {
        throw new Error('PDF generation failed')
      })
      const result = generateCesuPdf(makeData())
      expect(result.error).toContain('PDF generation failed')
    })
  })
})
