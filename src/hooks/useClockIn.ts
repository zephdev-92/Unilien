import { useState, useEffect, useMemo, useCallback } from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { getShifts, updateShift } from '@/services/shiftService'
import { calculateNightHours, calculateShiftDuration } from '@/lib/compliance'
import { validateShift as checkCompliance } from '@/lib/compliance/complianceChecker'
import type { ShiftForValidation } from '@/lib/compliance/types'
import { logger } from '@/lib/logger'
import type { Shift } from '@/types'

export type ClockInStep = 'idle' | 'in-progress' | 'completing'

export interface HistoryStats {
  totalHours: number
  totalNightHours: number
  totalNightActionHours: number
  shiftCount: number
}

export function useClockIn(
  inProgressRef: React.RefObject<HTMLDivElement | null>,
  idleSectionRef: React.RefObject<HTMLDivElement | null>
) {
  const { profile } = useAuth()

  const [todayShifts, setTodayShifts] = useState<Shift[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [step, setStep] = useState<ClockInStep>('idle')
  const [hasNightAction, setHasNightAction] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [historyShifts, setHistoryShifts] = useState<Shift[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [historyDays, setHistoryDays] = useState(7)

  const loadAllShifts = useCallback(async () => {
    if (!profile) return

    setIsLoadingShifts(true)
    setIsLoadingHistory(true)
    try {
      const today = new Date()
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const historyStart = startOfDay(subDays(today, historyDays))

      const shifts = await getShifts(profile.id, 'employee', historyStart, endOfDay(tomorrow))

      const todayStr = format(today, 'yyyy-MM-dd')
      setTodayShifts(shifts.filter((s) => format(new Date(s.date), 'yyyy-MM-dd') === todayStr))
      setHistoryShifts(
        shifts.filter(
          (s) =>
            format(new Date(s.date), 'yyyy-MM-dd') !== todayStr && s.status === 'completed'
        )
      )
    } catch (err) {
      logger.error('Erreur chargement shifts:', err)
      setError('Impossible de charger les interventions')
    } finally {
      setIsLoadingShifts(false)
      setIsLoadingHistory(false)
    }
  }, [profile, historyDays])

  useEffect(() => {
    loadAllShifts()
  }, [loadAllShifts])

  const plannedShifts = useMemo(
    () => todayShifts.filter((s) => s.status === 'planned'),
    [todayShifts]
  )
  const completedShifts = useMemo(
    () => todayShifts.filter((s) => s.status === 'completed'),
    [todayShifts]
  )

  const historyByDay = useMemo(() => {
    const grouped = new Map<string, Shift[]>()
    for (const shift of historyShifts) {
      const dayKey = format(new Date(shift.date), 'yyyy-MM-dd')
      if (!grouped.has(dayKey)) grouped.set(dayKey, [])
      grouped.get(dayKey)!.push(shift)
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateStr, shifts]) => ({
        date: new Date(dateStr),
        dateStr,
        shifts: shifts.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }))
  }, [historyShifts])

  const historyStats: HistoryStats = useMemo(() => {
    let totalMinutes = 0
    let totalNightHours = 0
    let totalNightActionHours = 0
    let shiftCount = 0

    for (const shift of historyShifts) {
      const durationMin = calculateShiftDuration(shift.startTime, shift.endTime, shift.breakDuration)
      totalMinutes += durationMin
      shiftCount++

      const nightH = calculateNightHours(new Date(shift.date), shift.startTime, shift.endTime)
      if (nightH > 0) {
        totalNightHours += nightH
        if (shift.hasNightAction) totalNightActionHours += nightH
      }
    }

    return { totalHours: totalMinutes / 60, totalNightHours, totalNightActionHours, shiftCount }
  }, [historyShifts])

  const activeShift = useMemo(
    () => todayShifts.find((s) => s.id === activeShiftId),
    [todayShifts, activeShiftId]
  )

  const nightHoursForActive = useMemo(() => {
    if (!activeShift) return 0
    try {
      return calculateNightHours(
        new Date(activeShift.date),
        activeShift.startTime,
        activeShift.endTime
      )
    } catch {
      return 0
    }
  }, [activeShift])

  const hasNightHours = nightHoursForActive > 0

  const handleClockIn = (shift: Shift) => {
    setActiveShiftId(shift.id)
    setClockInTime(format(new Date(), 'HH:mm'))
    setStep('in-progress')
    setError(null)
    setSuccessMessage(null)
    setHasNightAction(shift.hasNightAction ?? false)
    setTimeout(() => inProgressRef.current?.focus(), 100)
  }

  const handleClockOut = async () => {
    if (!activeShift || !profile) return

    if (!clockInTime) {
      setError('Heure de début non enregistrée. Veuillez annuler et recommencer le pointage.')
      return
    }

    setStep('completing')
    setIsSubmitting(true)
    setError(null)

    try {
      const clockOutTime = format(new Date(), 'HH:mm')

      await updateShift(activeShift.id, {
        status: 'completed',
        startTime: clockInTime,
        endTime: clockOutTime,
        hasNightAction: hasNightHours ? hasNightAction : false,
      })

      let complianceWarnings = ''
      try {
        const completedShift: ShiftForValidation = {
          id: activeShift.id,
          contractId: activeShift.contractId,
          employeeId: profile.id,
          date: new Date(activeShift.date),
          startTime: clockInTime,
          endTime: clockOutTime,
          breakDuration: activeShift.breakDuration,
          hasNightAction: hasNightHours ? hasNightAction : false,
        }
        const otherShifts: ShiftForValidation[] = [
          ...todayShifts.filter((s) => s.id !== activeShift.id),
          ...historyShifts,
        ].map((s) => ({
          id: s.id,
          contractId: s.contractId,
          employeeId: profile.id,
          date: new Date(s.date),
          startTime: s.startTime,
          endTime: s.endTime,
          breakDuration: s.breakDuration,
          hasNightAction: s.hasNightAction,
        }))

        const result = checkCompliance(completedShift, otherShifts)
        if (result.warnings.length > 0) {
          complianceWarnings = ' ' + result.warnings.map((w) => w.message).join(' ')
        }
      } catch (err) {
        logger.error('Erreur validation conformité post clock-out:', err)
      }

      setSuccessMessage(
        `Intervention terminée à ${clockOutTime}. Durée effective enregistrée.${complianceWarnings}`
      )

      await loadAllShifts()

      setActiveShiftId(null)
      setClockInTime(null)
      setStep('idle')
      setHasNightAction(false)
      setTimeout(() => idleSectionRef.current?.focus(), 100)
    } catch (err) {
      logger.error('Erreur clock-out:', err)
      setError(err instanceof Error ? err.message : "Erreur lors de la fin de l'intervention")
      setStep('in-progress')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setActiveShiftId(null)
    setClockInTime(null)
    setStep('idle')
    setHasNightAction(false)
    setError(null)
    setTimeout(() => idleSectionRef.current?.focus(), 100)
  }

  return {
    profile,
    // State
    step,
    isLoadingShifts,
    isLoadingHistory,
    isSubmitting,
    error,
    successMessage,
    historyDays,
    setHistoryDays,
    // Shifts
    plannedShifts,
    completedShifts,
    historyByDay,
    historyStats,
    activeShift,
    clockInTime,
    hasNightAction,
    setHasNightAction,
    hasNightHours,
    nightHoursForActive,
    // Handlers
    handleClockIn,
    handleClockOut,
    handleCancel,
    // Refs forwarding
    inProgressRef,
    idleSectionRef,
  }
}
