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

// Fonction utilitaire pour télécharger un fichier
export function downloadExport(result: { filename: string; content: string; mimeType: string }): void {
  // Ajouter BOM pour UTF-8 (support Excel français)
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
