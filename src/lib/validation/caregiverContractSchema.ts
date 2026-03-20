import { z } from 'zod'
import { PCH_RATES } from '@/types'

export const caregiverContractSchema = z
  .object({
    caregiverId: z.string().min(1, 'Veuillez sélectionner un aidant'),
    startDate: z.string().min(1, 'La date de début est requise'),
    endDate: z.string().optional(),
    weeklyHours: z.coerce
      .number()
      .min(1, 'Minimum 1 heure')
      .max(48, 'Maximum 48 heures par semaine'),
    caregiverStatus: z.enum(['active', 'full_time', 'voluntary']),
    pchHourlyRate: z.coerce.number().min(0).optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true
      return new Date(data.endDate) >= new Date(data.startDate)
    },
    {
      message: 'La date de fin ne peut pas être antérieure à la date de début',
      path: ['endDate'],
    }
  )

export type CaregiverContractFormData = z.infer<typeof caregiverContractSchema>

export { PCH_RATES }
