import { z } from 'zod'
import { calculateAcquiredFromMonths } from '@/lib/absence'

export const searchSchema = z.object({
  email: z.string().email('Adresse email invalide'),
})

export const contractSchema = z
  .object({
    contractType: z.enum(['CDI', 'CDD']),
    startDate: z.string().min(1, 'La date de début est requise'),
    endDate: z.string().optional(),
    weeklyHours: z.coerce
      .number()
      .min(1, 'Minimum 1 heure')
      .max(48, 'Maximum 48 heures par semaine'),
    hourlyRate: z.coerce
      .number()
      .min(11.65, 'Le taux horaire minimum est de 11,65€ (SMIC)')
      .max(100, 'Taux horaire maximum dépassé'),
    monthsWorked: z.coerce.number().min(0).max(12).optional(),
    initialTakenDays: z.coerce.number().min(0).max(30).optional(),
  })
  .refine(
    (data) => {
      if (data.contractType === 'CDD' && !data.endDate) return false
      return true
    },
    {
      message: 'La date de fin est requise pour un CDD',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true
      return new Date(data.endDate) >= new Date(data.startDate)
    },
    {
      message: 'La date de début ne peut pas être postérieure à la date de fin',
      path: ['startDate'],
    }
  )
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
  .refine(
    (data) => {
      if (data.monthsWorked === undefined || data.initialTakenDays === undefined) return true
      const acquired = calculateAcquiredFromMonths(data.monthsWorked)
      return data.initialTakenDays <= acquired
    },
    {
      message: 'Les jours pris ne peuvent pas dépasser les jours acquis',
      path: ['initialTakenDays'],
    }
  )

export type SearchFormData = z.infer<typeof searchSchema>
export type ContractFormData = z.infer<typeof contractSchema>
