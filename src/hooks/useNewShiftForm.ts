import { useState, useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  newShiftSchema as shiftSchema,
  type NewShiftFormData as ShiftFormData,
  MANDATORY_BREAK_MINIMUM_MINUTES,
  MANDATORY_BREAK_THRESHOLD_MINUTES,
} from '@/lib/validation/shiftSchemas'
import { format, addDays } from 'date-fns'
import { createShift } from '@/services/shiftService'
import { useComplianceCheck } from '@/hooks/useComplianceCheck'
import { logger } from '@/lib/logger'
import { toaster } from '@/lib/toaster'
import type { ShiftType } from '@/types'
import { useShiftNightHours } from '@/hooks/useShiftNightHours'
import { useShiftRequalification } from '@/hooks/useShiftRequalification'
import { useShiftEffectiveHours } from '@/hooks/useShiftEffectiveHours'
import { useGuardSegments } from '@/hooks/useGuardSegments'
import { useShiftValidationData } from '@/hooks/useShiftValidationData'
import { suggestSegments, collapseSegments } from '@/lib/presence/suggestBreakdown'

const defaultFormValues = (defaultDate?: Date) => {
  const date = format(defaultDate ?? new Date(), 'yyyy-MM-dd')
  return {
    shiftType: 'effective' as const,
    date,
    endDate: date,
    startTime: '09:00',
    endTime: '12:00',
    breakDuration: 0,
    tasks: '',
    notes: '',
  }
}

interface UseNewShiftFormProps {
  isOpen: boolean
  employerId: string
  defaultDate?: Date
  onSuccess: () => void
  onClose: () => void
}

export function useNewShiftForm({
  isOpen,
  employerId,
  defaultDate,
  onSuccess,
  onClose,
}: UseNewShiftFormProps) {
  const { contracts, existingShifts, approvedAbsences, isLoadingContracts } = useShiftValidationData({
    isOpen,
    employerId,
    defaultDate,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false)
  const [hasNightAction, setHasNightAction] = useState(false)
  const [nightInterventionsCount, setNightInterventionsCount] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: defaultFormValues(defaultDate),
  })

  const watchedValues = useWatch({ control })
  const { startTime, endTime, date } = watchedValues

  const {
    guardSegments,
    setGuardSegments,
    addGuardSegment,
    removeGuardSegment,
    updateGuardSegmentEnd,
    updateGuardSegmentType,
    updateGuardSegmentBreak,
  } = useGuardSegments(endTime)

  // Agenda : la date de fin suit les horaires (fin ≤ début → lendemain, 24h max)
  // et le découpage est re-suggéré à chaque changement de bornes.
  useEffect(() => {
    if (!date || !startTime || !endTime) return
    const end = endTime <= startTime ? addDays(new Date(`${date}T00:00`), 1) : new Date(`${date}T00:00`)
    setValue('endDate', format(end, 'yyyy-MM-dd'), { shouldValidate: true })
  }, [date, startTime, endTime, setValue])

  useEffect(() => {
    if (startTime && endTime) setGuardSegments(suggestSegments(startTime, endTime))
  }, [startTime, endTime, setGuardSegments])

  // Ce qui sera stocké : type + segments éventuels (cf. collapseSegments)
  const { shiftType, guardSegments: savedSegments } = useMemo(
    () => (startTime && endTime && guardSegments.length
      ? collapseSegments(guardSegments, startTime, endTime)
      : { shiftType: 'effective' as ShiftType, guardSegments: undefined }),
    [guardSegments, startTime, endTime],
  )
  const isSegmentedShift = !!savedSegments
  const hasNightPresence = shiftType === 'presence_night' || shiftType === 'guard_24h'
    || !!savedSegments?.some((seg) => seg.type === 'presence_night')

  useEffect(() => {
    setValue('shiftType', shiftType)
    setValue('segmented', isSegmentedShift)
    if (!hasNightPresence) setNightInterventionsCount(0)
    if (shiftType !== 'effective' || isSegmentedShift) setHasNightAction(false)
  }, [shiftType, isSegmentedShift, hasNightPresence, setValue])

  const selectedContract = useMemo(() => {
    return contracts.find((c) => c.id === watchedValues.contractId)
  }, [contracts, watchedValues.contractId])

  // Intervention découpée : breakDuration = somme des pauses des segments effectifs
  useEffect(() => {
    if (savedSegments) {
      const totalBreak = savedSegments.reduce((sum, seg) =>
        seg.type === 'effective' ? sum + (seg.breakMinutes ?? 0) : sum, 0)
      setValue('breakDuration', totalBreak)
    }
  }, [savedSegments, setValue])

  // Auto-bump de la pause à 20 min quand la durée dépasse 6 h (art. L3121-16).
  // Skip si découpée : règle gérée segment par segment via useGuardSegments.
  useEffect(() => {
    if (isSegmentedShift) return
    if (!watchedValues.startTime || !watchedValues.endTime) return
    const [sh, sm] = watchedValues.startTime.split(':').map(Number)
    const [eh, em] = watchedValues.endTime.split(':').map(Number)
    if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) return
    const startTotal = sh * 60 + sm
    let endTotal = eh * 60 + em
    if (endTotal <= startTotal) endTotal += 24 * 60
    const durationMinutes = endTotal - startTotal
    const current = watchedValues.breakDuration ?? 0
    if (durationMinutes > MANDATORY_BREAK_THRESHOLD_MINUTES && current < MANDATORY_BREAK_MINIMUM_MINUTES) {
      setValue('breakDuration', MANDATORY_BREAK_MINIMUM_MINUTES, { shouldValidate: true })
    }
  }, [isSegmentedShift, watchedValues.startTime, watchedValues.endTime, watchedValues.breakDuration, setValue])

  const { nightHoursCount, hasNightHours } = useShiftNightHours({
    startTime: watchedValues.startTime,
    endTime: watchedValues.endTime,
    date: watchedValues.date,
  })

  const { isRequalified } = useShiftRequalification({ shiftType, nightInterventionsCount })

  const { effectiveHoursComputed } = useShiftEffectiveHours({
    startTime: watchedValues.startTime,
    endTime: watchedValues.endTime,
    breakDuration: watchedValues.breakDuration || 0,
    shiftType,
    isRequalified,
    guardSegments: savedSegments,
  })

  const shiftForCompliance = useMemo(() => {
    if (!watchedValues.contractId || !watchedValues.date || !watchedValues.startTime || !watchedValues.endTime) {
      return null
    }
    const contract = contracts.find((c) => c.id === watchedValues.contractId)
    if (!contract) return null

    return {
      contractId: watchedValues.contractId,
      employeeId: contract.employeeId || contract.caregiverId,
      date: new Date(watchedValues.date),
      startTime: watchedValues.startTime,
      endTime: watchedValues.endTime,
      breakDuration: watchedValues.breakDuration || 0,
      hasNightAction: shiftType === 'effective' && !isSegmentedShift && hasNightHours ? hasNightAction : undefined,
      shiftType,
      nightInterventionsCount: hasNightPresence ? nightInterventionsCount : undefined,
      guardSegments: savedSegments,
    }
  }, [watchedValues, contracts, hasNightHours, hasNightAction, shiftType, isSegmentedShift, hasNightPresence, nightInterventionsCount, savedSegments])

  const {
    complianceResult,
    computedPay,
    durationHours,
    isValidating,
    hasErrors,
    hasWarnings,
  } = useComplianceCheck({
    shift: shiftForCompliance,
    contract: selectedContract
      ? { weeklyHours: selectedContract.weeklyHours, hourlyRate: selectedContract.hourlyRate }
      : null,
    existingShifts,
    approvedAbsences,
  })

  // Reset du formulaire à l'ouverture
  useEffect(() => {
    if (isOpen) {
      reset(defaultFormValues(defaultDate))
      setSubmitError(null)
      setAcknowledgeWarnings(false)
      setHasNightAction(false)
      setNightInterventionsCount(0)
    }
  }, [isOpen, defaultDate, reset])

  const onSubmit = async (data: ShiftFormData) => {
    if (hasErrors) {
      setSubmitError('Veuillez corriger les erreurs de conformité avant de continuer.')
      return
    }
    if (hasWarnings && !acknowledgeWarnings) {
      setSubmitError('Veuillez prendre connaissance des avertissements ou cliquez sur "Continuer quand même".')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await createShift(data.contractId, {
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        breakDuration: data.breakDuration,
        tasks: data.tasks ? data.tasks.split('\n').filter(Boolean) : [],
        notes: data.notes || undefined,
        hasNightAction: shiftType === 'effective' && !isSegmentedShift && hasNightHours ? hasNightAction : undefined,
        shiftType,
        nightInterventionsCount: hasNightPresence ? nightInterventionsCount : undefined,
        isRequalified,
        effectiveHours: effectiveHoursComputed ?? undefined,
        guardSegments: savedSegments,
      })

      toaster.success({ title: 'Intervention créée avec succès' })
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Erreur création intervention:', error)
      setSubmitError(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const contractOptions = contracts.map((contract) => {
    if (contract.caregiver) {
      return {
        value: contract.id,
        label: `${contract.caregiver.firstName} ${contract.caregiver.lastName} (Aidant PCH)`,
      }
    }
    return {
      value: contract.id,
      label: contract.employee
        ? `${contract.employee.firstName} ${contract.employee.lastName}`
        : `Contrat ${contract.id.slice(0, 8)}`,
    }
  })

  const isSubmitDisabled =
    isLoadingContracts ||
    contracts.length === 0 ||
    hasErrors ||
    isValidating ||
    (hasWarnings && !acknowledgeWarnings)

  return {
    // form
    register,
    handleSubmit,
    control,
    setValue,
    errors,
    watchedValues,
    // state
    isSubmitting,
    submitError,
    acknowledgeWarnings,
    setAcknowledgeWarnings,
    hasNightAction,
    setHasNightAction,
    shiftType,
    isSegmentedShift,
    savedSegments,
    hasNightPresence,
    nightInterventionsCount,
    setNightInterventionsCount,
    // guard segments
    guardSegments,
    addGuardSegment,
    removeGuardSegment,
    updateGuardSegmentEnd,
    updateGuardSegmentType,
    updateGuardSegmentBreak,
    // computed
    selectedContract,
    nightHoursCount,
    hasNightHours,
    isRequalified,
    effectiveHoursComputed,
    // compliance
    complianceResult,
    computedPay,
    durationHours,
    isValidating,
    hasErrors,
    hasWarnings,
    // contracts
    contracts,
    isLoadingContracts,
    contractOptions,
    // validation data (for repeat preview)
    existingShifts,
    approvedAbsences,
    // submit
    onSubmit,
    isSubmitDisabled,
  }
}
