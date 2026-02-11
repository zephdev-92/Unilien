/**
 * Hook pour la validation de conformité en temps réel
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ComplianceResult, ComputedPay } from '@/types'
import {
  validateShift,
  quickValidate,
  calculateShiftPay,
  calculateShiftDuration,
  type ShiftForValidation,
  type ContractForCalculation,
  type AbsenceForValidation,
} from '@/lib/compliance'
import { logger } from '@/lib/logger'

interface UseComplianceCheckOptions {
  // Intervention à valider
  shift: {
    contractId: string
    employeeId: string
    date: Date | null
    startTime: string
    endTime: string
    breakDuration: number
    hasNightAction?: boolean
  } | null

  // Contrat pour le calcul de paie
  contract: {
    weeklyHours: number
    hourlyRate: number
  } | null

  // Interventions existantes pour comparaison
  existingShifts: ShiftForValidation[]

  // Absences approuvées pour validation de conflit
  approvedAbsences?: AbsenceForValidation[]

  // ID de l'intervention en cours d'édition (pour exclusion)
  editingShiftId?: string

  // Délai avant validation (debounce)
  debounceMs?: number
}

interface UseComplianceCheckResult {
  // Résultat de la validation
  complianceResult: ComplianceResult | null

  // Calcul de la paie
  computedPay: ComputedPay | null

  // Durée calculée en heures
  durationHours: number

  // États
  isValidating: boolean
  isValid: boolean
  hasErrors: boolean
  hasWarnings: boolean

  // Actions
  revalidate: () => void
}

export function useComplianceCheck({
  shift,
  contract,
  existingShifts,
  approvedAbsences = [],
  editingShiftId,
  debounceMs = 300,
}: UseComplianceCheckOptions): UseComplianceCheckResult {
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null)
  const [computedPay, setComputedPay] = useState<ComputedPay | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Construire l'objet shift pour validation
  const shiftForValidation: ShiftForValidation | null = useMemo(() => {
    if (!shift || !shift.date || !shift.startTime || !shift.endTime) {
      return null
    }

    return {
      id: editingShiftId,
      contractId: shift.contractId,
      employeeId: shift.employeeId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: shift.breakDuration || 0,
      hasNightAction: shift.hasNightAction,
    }
  }, [shift, editingShiftId])

  // Calculer la durée
  const durationHours = useMemo(() => {
    if (!shift?.startTime || !shift?.endTime) return 0

    try {
      const minutes = calculateShiftDuration(
        shift.startTime,
        shift.endTime,
        shift.breakDuration || 0
      )
      return minutes / 60
    } catch {
      return 0
    }
  }, [shift?.startTime, shift?.endTime, shift?.breakDuration])

  // Fonction de validation
  const validate = useCallback(() => {
    if (!shiftForValidation) {
      setComplianceResult(null)
      setComputedPay(null)
      return
    }

    setIsValidating(true)

    try {
      // Validation de conformité
      const result = validateShift(shiftForValidation, existingShifts, approvedAbsences)
      setComplianceResult(result)

      // Calcul de la paie si contrat fourni
      if (contract) {
        const contractForCalc: ContractForCalculation = {
          id: shiftForValidation.contractId,
          weeklyHours: contract.weeklyHours,
          hourlyRate: contract.hourlyRate,
        }

        const pay = calculateShiftPay(
          shiftForValidation,
          contractForCalc,
          existingShifts
        )
        setComputedPay(pay)
      }
    } catch (error) {
      logger.error('Erreur validation conformité:', error)
      setComplianceResult({
        valid: false,
        errors: [
          {
            code: 'VALIDATION_ERROR',
            message: 'Erreur lors de la validation',
            rule: 'Validation système',
            blocking: false,
          },
        ],
        warnings: [],
      })
    } finally {
      setIsValidating(false)
    }
  }, [shiftForValidation, existingShifts, approvedAbsences, contract])

  // Validation avec debounce
  useEffect(() => {
    const timer = setTimeout(validate, debounceMs)
    return () => clearTimeout(timer)
  }, [validate, debounceMs])

  // États dérivés
  const isValid = complianceResult?.valid ?? true
  const hasErrors = (complianceResult?.errors.length ?? 0) > 0
  const hasWarnings = (complianceResult?.warnings.length ?? 0) > 0

  return {
    complianceResult,
    computedPay,
    durationHours,
    isValidating,
    isValid,
    hasErrors,
    hasWarnings,
    revalidate: validate,
  }
}

/**
 * Hook simplifié pour validation rapide
 */
export function useQuickValidation(
  shift: ShiftForValidation | null,
  existingShifts: ShiftForValidation[]
): {
  canCreate: boolean
  blockingErrors: string[]
} {
  return useMemo(() => {
    if (!shift) {
      return { canCreate: true, blockingErrors: [] }
    }

    return quickValidate(shift, existingShifts)
  }, [shift, existingShifts])
}

export default useComplianceCheck
