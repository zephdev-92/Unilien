/**
 * Hook pour les calculs métier d'un shift en cours d'édition.
 * Orchestre : heures de nuit, requalification, heures effectives, compliance.
 * Extrait de ShiftDetailModal pour isoler la responsabilité de calcul.
 */

import { useMemo } from 'react'
import { format } from 'date-fns'
import type { Shift, Contract, ComplianceResult, ComputedPay } from '@/types'
import type { ShiftForValidation } from '@/lib/compliance'
import type { ShiftDetailFormData } from '@/lib/validation/shiftSchemas'
import { useShiftNightHours } from '@/hooks/useShiftNightHours'
import { useShiftRequalification } from '@/hooks/useShiftRequalification'
import { useShiftEffectiveHours } from '@/hooks/useShiftEffectiveHours'
import { useComplianceCheck } from '@/hooks/useComplianceCheck'

interface UseShiftEditLogicProps {
  isEditing: boolean
  watchedValues: Partial<ShiftDetailFormData>
  shiftType: Shift['shiftType']
  hasNightAction: boolean
  nightInterventionsCount: number
  contract: Contract | null
  existingShifts: ShiftForValidation[]
  shift: Shift | null
}

export interface UseShiftEditLogicResult {
  nightHoursCount: number
  hasNightHours: boolean
  isRequalified: boolean
  effectiveHoursComputed: number | undefined
  complianceResult: ComplianceResult | null
  computedPay: ComputedPay | null
  durationHours: number
  isCheckingCompliance: boolean
  hasErrors: boolean
  hasWarnings: boolean
}

export function useShiftEditLogic({
  isEditing,
  watchedValues,
  shiftType,
  hasNightAction,
  nightInterventionsCount,
  contract,
  existingShifts,
  shift,
}: UseShiftEditLogicProps): UseShiftEditLogicResult {
  // Sources de données selon le mode édition/lecture
  const stForHooks = isEditing ? watchedValues.startTime : shift?.startTime
  const etForHooks = isEditing ? watchedValues.endTime : shift?.endTime
  const bdForHooks = isEditing
    ? (watchedValues.breakDuration || 0)
    : (shift?.breakDuration || 0)
  const dateForHooks = isEditing
    ? watchedValues.date
    : (shift ? format(new Date(shift.date), 'yyyy-MM-dd') : undefined)

  const { nightHoursCount, hasNightHours } = useShiftNightHours({
    startTime: stForHooks,
    endTime: etForHooks,
    date: dateForHooks,
  })

  const { isRequalified } = useShiftRequalification({ shiftType, nightInterventionsCount })

  const { effectiveHoursComputed } = useShiftEffectiveHours({
    startTime: stForHooks,
    endTime: etForHooks,
    breakDuration: bdForHooks,
    shiftType,
    isRequalified,
  })

  const shiftForCompliance = useMemo(() => {
    if (
      !isEditing ||
      !watchedValues.date ||
      !watchedValues.startTime ||
      !watchedValues.endTime ||
      !contract
    ) {
      return null
    }

    return {
      contractId: shift?.contractId || '',
      employeeId: contract.employeeId,
      date: new Date(watchedValues.date),
      startTime: watchedValues.startTime,
      endTime: watchedValues.endTime,
      breakDuration: watchedValues.breakDuration || 0,
      hasNightAction: shiftType === 'effective' && hasNightHours ? hasNightAction : undefined,
      shiftType,
      nightInterventionsCount:
        shiftType === 'presence_night' ? nightInterventionsCount : undefined,
    }
  }, [
    watchedValues,
    contract,
    shift,
    isEditing,
    hasNightHours,
    hasNightAction,
    shiftType,
    nightInterventionsCount,
  ])

  const {
    complianceResult,
    computedPay,
    durationHours,
    isValidating: isCheckingCompliance,
    hasErrors,
    hasWarnings,
  } = useComplianceCheck({
    shift: shiftForCompliance,
    contract: contract
      ? { weeklyHours: contract.weeklyHours, hourlyRate: contract.hourlyRate }
      : null,
    existingShifts: existingShifts.filter((s) => s.id !== shift?.id),
  })

  return {
    nightHoursCount,
    hasNightHours,
    isRequalified,
    effectiveHoursComputed,
    complianceResult,
    computedPay,
    durationHours,
    isCheckingCompliance,
    hasErrors,
    hasWarnings,
  }
}
