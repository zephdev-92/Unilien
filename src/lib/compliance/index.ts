/**
 * Module de conformité juridique - Unilien
 * Convention Collective IDCC 3239 - Particuliers Employeurs
 *
 * Ce module valide les interventions selon les règles du Code du travail
 * et de la Convention Collective applicable aux auxiliaires de vie.
 */

// Types
export type {
  ShiftForValidation,
  ContractForCalculation,
  RuleValidationResult,
  ComplianceRuleCode,
} from './types'

export {
  COMPLIANCE_RULES,
  COMPLIANCE_MESSAGES,
  getFrenchPublicHolidays,
  isPublicHoliday,
  isSunday,
  isNightHours,
} from './types'

// Utilitaires
export {
  timeToMinutes,
  minutesToTime,
  calculateShiftDuration,
  createDateTime,
  getShiftEndDateTime,
  hoursBetween,
  getWeekStart,
  getWeekEnd,
  calculateNightHours,
  formatDate,
  formatTimeRange,
  calculateMinStartTime,
  shiftsOverlap,
  groupShiftsByDay,
  calculateTotalHours,
} from './utils'

// Validations individuelles
export {
  validateDailyRest,
  validateDailyRestBothWays,
  findPreviousShift,
  findNextShift,
} from './rules/validateDailyRest'

export {
  validateBreak,
  getRecommendedBreak,
} from './rules/validateBreak'

export {
  validateWeeklyHours,
  getRemainingWeeklyHours,
} from './rules/validateWeeklyHours'

export {
  validateDailyHours,
  getRemainingDailyHours,
} from './rules/validateDailyHours'

export {
  validateOverlap,
  findOverlappingShifts,
} from './rules/validateOverlap'

export {
  validateAbsenceConflict,
  type AbsenceForValidation,
} from './rules/validateAbsenceConflict'

export {
  validateWeeklyRest,
  getWeeklyRestStatus,
} from './rules/validateWeeklyRest'

// Validation complète
export {
  validateShift,
  quickValidate,
  getComplianceSummary,
  suggestAlternatives,
} from './complianceChecker'

// Calcul de paie
export {
  calculateShiftPay,
  calculateMonthlyEstimate,
  formatCurrency,
  getPayBreakdown,
} from './calculatePay'
