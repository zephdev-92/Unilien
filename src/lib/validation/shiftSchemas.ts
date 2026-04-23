import { z } from 'zod'

export const SHIFT_TYPE_VALUES = ['effective', 'presence_day', 'presence_night', 'guard_24h'] as const

/**
 * Pause légale — Art. L3121-16 du Code du travail.
 * Au-delà de 6 h de travail effectif : 20 min de pause minimum obligatoires.
 */
export const MANDATORY_BREAK_THRESHOLD_MINUTES = 6 * 60
export const MANDATORY_BREAK_MINIMUM_MINUTES = 20

const shiftBaseFields = {
  date: z.string().min(1, 'La date est requise'),
  startTime: z.string().min(1, "L'heure de début est requise"),
  endTime: z.string().min(1, "L'heure de fin est requise"),
  breakDuration: z.coerce.number().min(0, 'La pause ne peut pas être négative').default(0),
  tasks: z.string().optional(),
  notes: z.string().optional(),
}

/** Durée totale d'un shift en minutes, en tenant compte d'un passage de minuit. */
function shiftDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) return 0
  const startTotal = sh * 60 + sm
  let endTotal = eh * 60 + em
  if (endTotal <= startTotal) endTotal += 24 * 60
  return endTotal - startTotal
}

function breakRuleRefine(data: { startTime: string; endTime: string; breakDuration: number; shiftType?: string }) {
  // La règle des 20 min s'applique au travail effectif simple. La garde 24h
  // est validée segment par segment via useGuardSegments / validateBreak.
  if (data.shiftType === 'guard_24h') return true
  const duration = shiftDurationMinutes(data.startTime, data.endTime)
  if (duration <= MANDATORY_BREAK_THRESHOLD_MINUTES) return true
  return (data.breakDuration ?? 0) >= MANDATORY_BREAK_MINIMUM_MINUTES
}

const breakRuleMessage = `Pause de ${MANDATORY_BREAK_MINIMUM_MINUTES} min minimum obligatoire au-delà de 6 h (art. L3121-16).`

/** Schema used by ShiftDetailModal (editing an existing shift). */
export const shiftDetailSchema = z.object({
  ...shiftBaseFields,
  status: z.enum(['planned', 'completed', 'cancelled', 'absent']),
}).refine((data) => data.startTime !== data.endTime, {
  message: "L'heure de fin doit être différente de l'heure de début",
  path: ['endTime'],
}).refine(breakRuleRefine, {
  message: breakRuleMessage,
  path: ['breakDuration'],
})

/** Schema used by NewShiftModal (creating a shift). */
export const newShiftSchema = z.object({
  ...shiftBaseFields,
  contractId: z.string().min(1, 'Veuillez sélectionner un auxiliaire'),
  shiftType: z.enum(SHIFT_TYPE_VALUES).default('effective'),
}).refine((data) => {
  // Pour guard_24h : endTime = startTime = 24h, c'est intentionnel
  if (data.shiftType === 'guard_24h') return true
  return data.startTime !== data.endTime
}, {
  message: "L'heure de fin doit être différente de l'heure de début",
  path: ['endTime'],
}).refine(breakRuleRefine, {
  message: breakRuleMessage,
  path: ['breakDuration'],
})

export type ShiftDetailFormData = z.infer<typeof shiftDetailSchema>
export type NewShiftFormData = z.infer<typeof newShiftSchema>
