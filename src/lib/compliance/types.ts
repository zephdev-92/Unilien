/**
 * Types pour le module de conformité juridique
 * Convention Collective IDCC 3239 - Particuliers Employeurs
 */

// Intervention simplifiée pour validation
export interface ShiftForValidation {
  id?: string
  contractId: string
  employeeId: string
  date: Date
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  breakDuration: number // minutes
}

// Contrat simplifié pour calculs
export interface ContractForCalculation {
  id: string
  weeklyHours: number
  hourlyRate: number
}

// Résultat de validation d'une règle
export interface RuleValidationResult {
  valid: boolean
  code: string
  rule: string
  message?: string
  details?: Record<string, unknown>
}

// Codes des règles de conformité
export const COMPLIANCE_RULES = {
  DAILY_REST: 'DAILY_REST',
  WEEKLY_REST: 'WEEKLY_REST',
  MANDATORY_BREAK: 'MANDATORY_BREAK',
  WEEKLY_MAX_HOURS: 'WEEKLY_MAX_HOURS',
  DAILY_MAX_HOURS: 'DAILY_MAX_HOURS',
  SHIFT_OVERLAP: 'SHIFT_OVERLAP',
} as const

export type ComplianceRuleCode = (typeof COMPLIANCE_RULES)[keyof typeof COMPLIANCE_RULES]

// Messages d'erreur en français
export const COMPLIANCE_MESSAGES = {
  DAILY_REST: {
    error: (hours: number, minHour: string) =>
      `Repos quotidien insuffisant : ${hours.toFixed(1)}h au lieu de 11h minimum. ` +
      `L'intervention ne peut pas commencer avant ${minHour}.`,
    rule: 'Repos quotidien minimum de 11h consécutives (Art. L3131-1 Code du travail)',
  },
  WEEKLY_REST: {
    error: (hours: number) =>
      `Repos hebdomadaire insuffisant : ${hours.toFixed(1)}h au lieu de 35h minimum.`,
    rule: 'Repos hebdomadaire minimum de 35h consécutives (Art. L3132-2 Code du travail)',
  },
  MANDATORY_BREAK: {
    warning: (duration: number, breakDuration: number) =>
      `Pause insuffisante : ${breakDuration} min pour une intervention de ${(duration / 60).toFixed(1)}h. ` +
      `Une pause de 20 min minimum est obligatoire au-delà de 6h de travail.`,
    rule: 'Pause de 20 min obligatoire après 6h de travail (Art. L3121-16 Code du travail)',
  },
  WEEKLY_MAX_HOURS: {
    error: (hours: number) =>
      `Durée maximale hebdomadaire dépassée : ${hours.toFixed(1)}h au lieu de 48h maximum.`,
    warning: (hours: number) =>
      `Attention : ${hours.toFixed(1)}h cette semaine (maximum recommandé : 44h).`,
    rule: 'Durée maximale de travail de 48h par semaine (Art. L3121-20 Code du travail)',
  },
  DAILY_MAX_HOURS: {
    error: (hours: number) =>
      `Durée maximale quotidienne dépassée : ${hours.toFixed(1)}h au lieu de 10h maximum.`,
    rule: 'Durée maximale de travail de 10h par jour (Art. L3121-18 Code du travail)',
  },
  SHIFT_OVERLAP: {
    error: (existingShift: string) =>
      `Chevauchement avec une intervention existante : ${existingShift}`,
    rule: 'Une seule intervention à la fois par auxiliaire',
  },
} as const

// Jours fériés français (à mettre à jour chaque année)
export function getFrenchPublicHolidays(year: number): Date[] {
  const holidays: Date[] = [
    new Date(year, 0, 1),   // 1er janvier - Jour de l'an
    new Date(year, 4, 1),   // 1er mai - Fête du travail
    new Date(year, 4, 8),   // 8 mai - Victoire 1945
    new Date(year, 6, 14),  // 14 juillet - Fête nationale
    new Date(year, 7, 15),  // 15 août - Assomption
    new Date(year, 10, 1),  // 1er novembre - Toussaint
    new Date(year, 10, 11), // 11 novembre - Armistice
    new Date(year, 11, 25), // 25 décembre - Noël
  ]

  // Pâques et jours dépendants (calcul algorithmique)
  const easter = calculateEaster(year)
  holidays.push(easter) // Dimanche de Pâques
  holidays.push(addDays(easter, 1)) // Lundi de Pâques
  holidays.push(addDays(easter, 39)) // Ascension
  holidays.push(addDays(easter, 50)) // Lundi de Pentecôte

  return holidays
}

// Calcul de la date de Pâques (algorithme de Butcher-Meeus)
function calculateEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month, day)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Vérifier si une date est un jour férié
export function isPublicHoliday(date: Date): boolean {
  const holidays = getFrenchPublicHolidays(date.getFullYear())
  return holidays.some(
    (holiday) =>
      holiday.getDate() === date.getDate() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getFullYear() === date.getFullYear()
  )
}

// Vérifier si une date est un dimanche
export function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

// Vérifier si des heures sont dans la plage de nuit (21h-6h)
export function isNightHours(startTime: string, endTime: string): boolean {
  const [startH] = startTime.split(':').map(Number)
  const [endH] = endTime.split(':').map(Number)

  // Heures de nuit : 21h-6h
  return startH >= 21 || startH < 6 || endH >= 21 || endH < 6 || endH <= startH
}
