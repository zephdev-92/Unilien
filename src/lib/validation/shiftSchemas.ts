import { z } from 'zod'

export const SHIFT_TYPE_VALUES = ['effective', 'presence_day', 'presence_night', 'guard_24h'] as const

const shiftBaseFields = {
  date: z.string().min(1, 'La date est requise'),
  startTime: z.string().min(1, "L'heure de début est requise"),
  endTime: z.string().min(1, "L'heure de fin est requise"),
  breakDuration: z.coerce.number().min(0, 'La pause ne peut pas être négative').default(0),
  tasks: z.string().optional(),
  notes: z.string().optional(),
}

/** Schema used by ShiftDetailModal (editing an existing shift). */
export const shiftDetailSchema = z.object({
  ...shiftBaseFields,
  status: z.enum(['planned', 'completed', 'cancelled', 'absent']),
}).refine((data) => data.startTime !== data.endTime, {
  message: "L'heure de fin doit être différente de l'heure de début",
  path: ['endTime'],
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
})

export type ShiftDetailFormData = z.infer<typeof shiftDetailSchema>
export type NewShiftFormData = z.infer<typeof newShiftSchema>
