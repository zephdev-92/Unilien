/**
 * Validation de l'amplitude maximale de garde
 * Règle : Le cumul travail effectif + présence responsable ne peut pas dépasser 24h
 * Convention Collective IDCC 3239
 */

import type { ShiftForValidation, RuleValidationResult } from '../types'
import { COMPLIANCE_RULES, COMPLIANCE_MESSAGES } from '../types'
import { createDateTime, getShiftEndDateTime } from '../utils'

const MAX_GUARD_AMPLITUDE_HOURS = 24

// Seuil de gap pour considérer deux interventions comme faisant partie de la même garde
const MAX_CHAIN_GAP_HOURS = 2

function isPresenceType(shift: ShiftForValidation): boolean {
  return shift.shiftType === 'presence_day' || shift.shiftType === 'presence_night'
}

interface ShiftWithDates {
  shift: ShiftForValidation
  start: Date
  end: Date
  isPresence: boolean
}

/**
 * Valide que l'amplitude totale d'une garde (enchaînement effectif + présence)
 * ne dépasse pas 24h
 */
export function validateGuardAmplitude(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[]
): RuleValidationResult {
  // Récupérer les interventions du même employé (hors celle en édition)
  const employeeShifts = existingShifts.filter((s) => {
    if (newShift.id && s.id === newShift.id) return false
    return s.employeeId === newShift.employeeId
  })

  // Construire la liste avec dates calculées
  const allShifts: ShiftWithDates[] = [...employeeShifts, newShift].map((s) => ({
    shift: s,
    start: createDateTime(s.date, s.startTime),
    end: getShiftEndDateTime(s.date, s.startTime, s.endTime),
    isPresence: isPresenceType(s),
  }))

  // Trier par heure de début
  allShifts.sort((a, b) => a.start.getTime() - b.start.getTime())

  // Construire les chaînes d'interventions connectées
  // Deux interventions sont chaînées si :
  // - Le gap entre elles est <= MAX_CHAIN_GAP_HOURS
  // - ET au moins l'une des deux est de type présence responsable
  const chains: ShiftWithDates[][] = []
  let currentChain: ShiftWithDates[] = [allShifts[0]]

  for (let i = 1; i < allShifts.length; i++) {
    const prev = currentChain[currentChain.length - 1]
    const curr = allShifts[i]
    const gapHours = (curr.start.getTime() - prev.end.getTime()) / (1000 * 60 * 60)

    // Chaîner si les interventions sont proches ET qu'une présence est impliquée
    const isChained = gapHours <= MAX_CHAIN_GAP_HOURS && (prev.isPresence || curr.isPresence)

    if (isChained) {
      currentChain.push(curr)
    } else {
      chains.push(currentChain)
      currentChain = [curr]
    }
  }
  chains.push(currentChain)

  // Trouver la chaîne contenant la nouvelle intervention
  const guardChain = chains.find((chain) =>
    chain.some((item) => item.shift === newShift)
  )

  if (guardChain && guardChain.length > 1) {
    const chainStart = guardChain[0].start
    const chainEnd = guardChain[guardChain.length - 1].end
    const amplitude = (chainEnd.getTime() - chainStart.getTime()) / (1000 * 60 * 60)

    if (amplitude > MAX_GUARD_AMPLITUDE_HOURS) {
      return {
        valid: false,
        code: COMPLIANCE_RULES.GUARD_MAX_AMPLITUDE,
        rule: COMPLIANCE_MESSAGES.GUARD_MAX_AMPLITUDE.rule,
        message: COMPLIANCE_MESSAGES.GUARD_MAX_AMPLITUDE.error(amplitude),
        details: {
          amplitude: Math.round(amplitude * 10) / 10,
          maximumAllowed: MAX_GUARD_AMPLITUDE_HOURS,
          chainLength: guardChain.length,
        },
      }
    }
  }

  return {
    valid: true,
    code: COMPLIANCE_RULES.GUARD_MAX_AMPLITUDE,
    rule: COMPLIANCE_MESSAGES.GUARD_MAX_AMPLITUDE.rule,
  }
}
