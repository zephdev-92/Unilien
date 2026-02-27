import { useReducer, useEffect } from 'react'
import { getContractsForEmployer, type ContractWithEmployee } from '@/services/contractService'
import { getShifts } from '@/services/shiftService'
import { getAbsencesForEmployer } from '@/services/absenceService'
import { logger } from '@/lib/logger'
import type { ShiftForValidation, AbsenceForValidation } from '@/lib/compliance'

type State = {
  contracts: ContractWithEmployee[]
  existingShifts: ShiftForValidation[]
  approvedAbsences: AbsenceForValidation[]
  isLoadingContracts: boolean
}

type Action =
  | { type: 'LOAD_START' }
  | { type: 'CONTRACTS_LOADED'; contracts: ContractWithEmployee[] }
  | { type: 'SHIFTS_LOADED'; shifts: ShiftForValidation[] }
  | { type: 'ABSENCES_LOADED'; absences: AbsenceForValidation[] }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoadingContracts: true }
    case 'CONTRACTS_LOADED':
      return { ...state, contracts: action.contracts, isLoadingContracts: false }
    case 'SHIFTS_LOADED':
      return { ...state, existingShifts: action.shifts }
    case 'ABSENCES_LOADED':
      return { ...state, approvedAbsences: action.absences }
  }
}

const initialState: State = {
  contracts: [],
  existingShifts: [],
  approvedAbsences: [],
  isLoadingContracts: true,
}

/**
 * Charge les contrats, les interventions existantes et les absences approuvées
 * nécessaires à la validation de conformité d'un nouveau shift.
 */
export function useShiftValidationData({
  isOpen,
  employerId,
  defaultDate,
}: {
  isOpen: boolean
  employerId: string
  defaultDate?: Date
}) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!isOpen || !employerId) return

    dispatch({ type: 'LOAD_START' })

    getContractsForEmployer(employerId)
      .then((contracts) => dispatch({ type: 'CONTRACTS_LOADED', contracts }))
      .catch(() => dispatch({ type: 'CONTRACTS_LOADED', contracts: [] }))

    const centerDate = defaultDate || new Date()
    // ±4 semaines autour de la date cible : suffisant pour toutes les règles IDCC 3239
    // (repos hebdomadaire 35h, heures semaine, repos journalier 11h, nuits consécutives).
    const startDate = new Date(centerDate)
    startDate.setDate(startDate.getDate() - 28)
    const endDate = new Date(centerDate)
    endDate.setDate(endDate.getDate() + 28)

    getShifts(employerId, 'employer', startDate, endDate)
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

    getAbsencesForEmployer(employerId)
      .then((absences) => {
        const approved: AbsenceForValidation[] = absences
          .filter((a) => a.status === 'approved')
          .map((a) => ({
            id: a.id,
            employeeId: a.employeeId,
            absenceType: a.absenceType,
            startDate: new Date(a.startDate),
            endDate: new Date(a.endDate),
            status: a.status,
          }))
        dispatch({ type: 'ABSENCES_LOADED', absences: approved })
      })
      .catch((err) => logger.error('Erreur chargement absences:', err))
  }, [isOpen, employerId, defaultDate])

  return {
    contracts: state.contracts,
    existingShifts: state.existingShifts,
    approvedAbsences: state.approvedAbsences,
    isLoadingContracts: state.isLoadingContracts,
  }
}
