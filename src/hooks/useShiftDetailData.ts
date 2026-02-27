/**
 * Hook pour charger les données contextuelles d'un shift (contrat + shifts existants).
 * Extrait de ShiftDetailModal pour isoler la responsabilité de chargement.
 */

import { useReducer, useEffect } from 'react'
import { format } from 'date-fns'
import type { Shift, UserRole, Contract } from '@/types'
import type { ShiftForValidation } from '@/lib/compliance'
import { getContractById } from '@/services/contractService'
import { getShifts } from '@/services/shiftService'
import { logger } from '@/lib/logger'
import type { ShiftDetailFormData } from '@/lib/validation/shiftSchemas'

// ─── State interne du hook ────────────────────────────────────────────────────

type DataState = {
  contract: Contract | null
  existingShifts: ShiftForValidation[]
  isLoadingContract: boolean
}

type DataAction =
  | { type: 'LOADING_START' }
  | { type: 'CONTRACT_LOADED'; contract: Contract | null }
  | { type: 'SHIFTS_LOADED'; shifts: ShiftForValidation[] }

const dataInitial: DataState = {
  contract: null,
  existingShifts: [],
  isLoadingContract: false,
}

function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'LOADING_START':
      return { contract: null, existingShifts: [], isLoadingContract: true }
    case 'CONTRACT_LOADED':
      return { ...state, contract: action.contract, isLoadingContract: false }
    case 'SHIFTS_LOADED':
      return { ...state, existingShifts: action.shifts }
  }
}

// ─── Interface publique ───────────────────────────────────────────────────────

interface UseShiftDetailDataProps {
  isOpen: boolean
  shift: Shift | null
  profileId: string
  userRole: UserRole
  onResetForm: (values: ShiftDetailFormData) => void
}

interface UseShiftDetailDataResult {
  contract: Contract | null
  existingShifts: ShiftForValidation[]
  isLoadingContract: boolean
}

export function useShiftDetailData({
  isOpen,
  shift,
  profileId,
  userRole,
  onResetForm,
}: UseShiftDetailDataProps): UseShiftDetailDataResult {
  const [data, dispatch] = useReducer(dataReducer, dataInitial)

  useEffect(() => {
    if (!isOpen || !shift) return

    dispatch({ type: 'LOADING_START' })

    getContractById(shift.contractId)
      .then((c) => dispatch({ type: 'CONTRACT_LOADED', contract: c }))
      .catch(() => dispatch({ type: 'CONTRACT_LOADED', contract: null }))

    // ±4 semaines : suffisant pour toutes les règles IDCC 3239
    const startDate = new Date(shift.date)
    startDate.setDate(startDate.getDate() - 28)
    const endDate = new Date(shift.date)
    endDate.setDate(endDate.getDate() + 28)

    getShifts(profileId, userRole, startDate, endDate)
      .then((shifts) => {
        const shiftsForValidation: ShiftForValidation[] = shifts.map((s) => ({
          id: s.id,
          contractId: s.contractId,
          employeeId: '',
          date: new Date(s.date),
          startTime: s.startTime,
          endTime: s.endTime,
          breakDuration: s.breakDuration,
          shiftType: s.shiftType,
        }))
        dispatch({ type: 'SHIFTS_LOADED', shifts: shiftsForValidation })
      })
      .catch((err) => logger.error('Erreur chargement shifts pour validation:', err))

    onResetForm({
      date: format(new Date(shift.date), 'yyyy-MM-dd'),
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: shift.breakDuration,
      tasks: shift.tasks.join('\n'),
      notes: shift.notes || '',
      status: shift.status,
    })
  }, [isOpen, shift, profileId, userRole, onResetForm])

  return data
}
