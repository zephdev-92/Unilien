import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { logger } from '@/lib/logger'
import { createCaregiverContract } from '@/services/contractService'
import { PCH_RATES } from '@/types'
import {
  caregiverContractSchema,
  type CaregiverContractFormData,
} from '@/lib/validation/caregiverContractSchema'
import type { CaregiverWithProfile } from '@/services/caregiverService'
import type { CaregiverContractStatus } from '@/types'

interface UseNewCaregiverContractFormOptions {
  employerId: string
  caregivers: CaregiverWithProfile[]
  defaultCaregiverId?: string
  onSuccess: () => void
}

export function useNewCaregiverContractForm({
  employerId,
  caregivers,
  defaultCaregiverId,
  onSuccess,
}: UseNewCaregiverContractFormOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<CaregiverContractFormData>({
    resolver: zodResolver(caregiverContractSchema),
    defaultValues: {
      caregiverId: defaultCaregiverId || '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      weeklyHours: 10,
      caregiverStatus: 'active',
      pchHourlyRate: PCH_RATES.active,
    },
  })

  // Pré-sélectionner l'aidant quand defaultCaregiverId change
  useEffect(() => {
    if (defaultCaregiverId) {
      form.setValue('caregiverId', defaultCaregiverId)
    }
  }, [defaultCaregiverId, form])

  const watchStatus = form.watch('caregiverStatus')
  const watchHours = form.watch('weeklyHours')
  const watchRate = form.watch('pchHourlyRate')

  const isVoluntary = watchStatus === 'voluntary'
  const statusRate = watchStatus === 'full_time' ? PCH_RATES.full_time : PCH_RATES.active

  const caregiverOptions = caregivers.map((c) => ({
    value: c.profileId,
    label: `${c.profile.firstName} ${c.profile.lastName}`,
  }))

  const monthlyEstimate = useMemo(() => {
    return ((watchHours || 0) * 4.33 * (watchRate || 0)).toFixed(2)
  }, [watchHours, watchRate])

  const reset = () => {
    setSubmitError(null)
    form.reset()
  }

  const onSubmit = async (data: CaregiverContractFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await createCaregiverContract(employerId, data.caregiverId, {
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        weeklyHours: data.weeklyHours,
        pchHourlyRate: data.caregiverStatus === 'voluntary' ? 0 : (data.pchHourlyRate || 0),
        caregiverStatus: data.caregiverStatus as CaregiverContractStatus,
      })

      onSuccess()
    } catch (error) {
      logger.error('Erreur création contrat aidant PCH:', error)
      setSubmitError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    form,
    isSubmitting,
    submitError,
    caregiverOptions,
    isVoluntary,
    statusRate,
    monthlyEstimate,
    reset,
    onSubmit,
  }
}
