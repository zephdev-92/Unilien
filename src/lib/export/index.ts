/**
 * Module d'export des déclarations CESU
 */

// Types
export type {
  ExportFormat,
  EmployeeDeclarationData,
  ShiftDeclarationDetail,
  MonthlyDeclarationData,
  ExportOptions,
  ExportResult,
} from './types'

export { MONTHS_FR, getMonthLabel } from './types'

// Service de données
export { getMonthlyDeclarationData } from './declarationService'

// Générateurs
export { generateCesuCsv, generateCesuSummary } from './cesuGenerator'
export { generateCesuPdf } from './cesuPdfGenerator'

// ─── Bulletin de paie ────────────────────────────────────────────────────────
export type { PayslipData, CotisationsResult, CotisationLine } from './types'
export { calculateCotisations, PASS_MONTHLY_2025, SMIC_MONTHLY_2025 } from './cotisationsCalculator'
export { getPayslipData } from './payslipService'
export { generatePayslipPdf } from './payslipPdfGenerator'

// Fonction utilitaire pour télécharger un fichier
export function downloadExport(result: { filename: string; content: string; mimeType: string }): void {
  // Pour les PDF (data URI), ouvrir directement
  if (result.mimeType === 'application/pdf' && result.content.startsWith('data:')) {
    const link = document.createElement('a')
    link.href = result.content
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return
  }

  // Pour les autres formats (CSV, TXT), ajouter BOM pour UTF-8
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + result.content], { type: result.mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
