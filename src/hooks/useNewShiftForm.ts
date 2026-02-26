import { useState, useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { newShiftSchema as shiftSchema, type NewShiftFormData as ShiftFormData } from '@/lib/validation/shiftSchemas'
import { format } from 'date-fns'
import { createShift } from '@/services/shiftService'
import { useComplianceCheck } from '@/hooks/useComplianceCheck'
import { logger } from '@/lib/logger'
import type { ShiftType } from '@/types'
import { useShiftNightHours } from '@/hooks/useShiftNightHours'
import { useShiftRequalification } from '@/hooks/useShiftRequalification'
import { useShiftEffectiveHours } from '@/hooks/useShiftEffectiveHours'
import { useGuardSegments } from '@/hooks/useGuardSegments'
import { useShiftValidationData } from '@/hooks/useShiftValidationData'

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
  const {
    guardSegments,
    setGuardSegments,
    resetToDefaults: resetGuardSegments,
    addGuardSegment,
    removeGuardSegment,
    updateGuardSegmentEnd,
    updateGuardSegmentType,
    updateGuardSegmentBreak,
  } = useGuardSegments()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false)
  const [hasNightAction, setHasNightAction] = useState(false)
  const [shiftType, setShiftType] = useState<ShiftType>('effective')
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
    defaultValues: {
      shiftType: 'effective',
      date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '12:00',
      breakDuration: 0,
      tasks: '',
      notes: '',
    },
  })

  const watchedValues = useWatch({ control })

  const selectedContract = useMemo(() => {
    return contracts.find((c) => c.id === watchedValues.contractId)
  }, [contracts, watchedValues.contractId])

  // Pour guard_24h : endTime = startTime + synchroniser le premier segment
  useEffect(() => {
    if (shiftType === 'guard_24h' && watchedValues.startTime) {
      setValue('endTime', watchedValues.startTime)
      setGuardSegments(prev => {
        if (prev[0]?.startTime === watchedValues.startTime) return prev
        return [{ ...prev[0], startTime: watchedValues.startTime }, ...prev.slice(1)]
      })
    }
  }, [shiftType, watchedValues.startTime, setValue, setGuardSegments])

  // Pour guard_24h : synchroniser breakDuration avec la somme des pauses des segments effectifs
  useEffect(() => {
    if (shiftType === 'guard_24h') {
      const totalBreak = guardSegments.reduce((sum, seg) =>
        seg.type === 'effective' ? sum + (seg.breakMinutes ?? 0) : sum, 0)
      setValue('breakDuration', totalBreak)
    }
  }, [shiftType, guardSegments, setValue])

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
    guardSegments,
  })

  const shiftForCompliance = useMemo(() => {
    if (!watchedValues.contractId || !watchedValues.date || !watchedValues.startTime || !watchedValues.endTime) {
      return null
    }
    const contract = contracts.find((c) => c.id === watchedValues.contractId)
    if (!contract) return null

    return {
      contractId: watchedValues.contractId,
      employeeId: contract.employeeId,
      date: new Date(watchedValues.date),
      startTime: watchedValues.startTime,
      endTime: watchedValues.endTime,
      breakDuration: watchedValues.breakDuration || 0,
      hasNightAction: shiftType === 'effective' && hasNightHours ? hasNightAction : undefined,
      shiftType,
      nightInterventionsCount: (shiftType === 'presence_night' || shiftType === 'guard_24h') ? nightInterventionsCount : undefined,
      guardSegments: shiftType === 'guard_24h' ? guardSegments : undefined,
    }
  }, [watchedValues, contracts, hasNightHours, hasNightAction, shiftType, nightInterventionsCount, guardSegments])

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
      reset({
        date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '12:00',
        breakDuration: 0,
        tasks: '',
        notes: '',
      })
      setSubmitError(null)
      setAcknowledgeWarnings(false)
      setHasNightAction(false)
      setShiftType('effective')
      setNightInterventionsCount(0)
      resetGuardSegments()
    }
  }, [isOpen, defaultDate, reset, resetGuardSegments])

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
        hasNightAction: shiftType === 'effective' && hasNightHours ? hasNightAction : undefined,
        shiftType,
        nightInterventionsCount: (shiftType === 'presence_night' || shiftType === 'guard_24h') ? nightInterventionsCount : undefined,
        isRequalified,
        effectiveHours: effectiveHoursComputed ?? undefined,
        guardSegments: shiftType === 'guard_24h' ? guardSegments : undefined,
      })

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

  const contractOptions = contracts.map((contract) => ({
    value: contract.id,
    label: contract.employee
      ? `${contract.employee.firstName} ${contract.employee.lastName}`
      : `Contrat ${contract.id.slice(0, 8)}`,
  }))

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
    setShiftType,
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
    // submit
    onSubmit,
    isSubmitDisabled,
  }
}
