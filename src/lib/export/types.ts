/**
 * Types pour l'export des déclarations CESU
 */

// Format d'export
export type ExportFormat = 'csv' | 'pdf' | 'summary'

// Données d'un employé pour la déclaration
export interface EmployeeDeclarationData {
  employeeId: string
  firstName: string
  lastName: string
  contractId: string
  contractType: 'CDI' | 'CDD'
  hourlyRate: number
  // Heures du mois
  totalHours: number
  normalHours: number
  sundayHours: number
  holidayHours: number
  nightHours: number
  overtimeHours: number
  // Rémunération
  basePay: number
  sundayMajoration: number
  holidayMajoration: number
  nightMajoration: number
  overtimeMajoration: number
  totalGrossPay: number
  // Détails des interventions
  shiftsCount: number
  shiftsDetails: ShiftDeclarationDetail[]
}

// Détail d'une intervention pour la déclaration
export interface ShiftDeclarationDetail {
  date: Date
  startTime: string
  endTime: string
  breakDuration: number
  effectiveHours: number
  isSunday: boolean
  isHoliday: boolean
  nightHours: number
  pay: number
}

// Données complètes de déclaration mensuelle
export interface MonthlyDeclarationData {
  // Période
  year: number
  month: number // 1-12
  periodLabel: string // "Janvier 2024"
  // Employeur
  employerId: string
  employerFirstName: string
  employerLastName: string
  employerAddress: string
  cesuNumber?: string
  // Employés
  employees: EmployeeDeclarationData[]
  // Totaux
  totalHours: number
  totalGrossPay: number
  totalEmployees: number
  // Métadonnées
  generatedAt: Date
}

// Options de génération
export interface ExportOptions {
  format: ExportFormat
  year: number
  month: number
  employeeIds?: string[] // Si vide, tous les employés
  includeDetails?: boolean
}

// Résultat de l'export
export interface ExportResult {
  success: boolean
  filename: string
  content: string // Contenu CSV ou base64 pour PDF
  mimeType: string
  error?: string
}

// Mapping des mois en français
export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
] as const

// Obtenir le libellé du mois
export function getMonthLabel(year: number, month: number): string {
  return `${MONTHS_FR[month - 1]} ${year}`
}
