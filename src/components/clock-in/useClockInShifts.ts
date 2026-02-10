import { useState, useEffect, useMemo, useCallback } from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { getShifts } from '@/services/shiftService'
import { calculateNightHours, calculateShiftDuration } from '@/lib/compliance'
import { logger } from '@/lib/logger'
import type { Shift } from '@/types'
import type { HistoryDay, HistoryStats } from './types'

export function useClockInShifts(profileId: string | undefined) {
  const [todayShifts, setTodayShifts] = useState<Shift[]>([])
  const [historyShifts, setHistoryShifts] = useState<Shift[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [historyDays, setHistoryDays] = useState(7)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadAllShifts = useCallback(async () => {
    if (!profileId) return

    setIsLoadingShifts(true)
    setIsLoadingHistory(true)
    setLoadError(null)
    try {
      const today = new Date()
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const historyStart = startOfDay(subDays(today, historyDays))

      const shifts = await getShifts(profileId, 'employee', historyStart, endOfDay(tomorrow))

      const todayStr = format(today, 'yyyy-MM-dd')
      setTodayShifts(
        shifts.filter((s) => format(new Date(s.date), 'yyyy-MM-dd') === todayStr)
      )
      setHistoryShifts(
        shifts.filter(
          (s) =>
            format(new Date(s.date), 'yyyy-MM-dd') !== todayStr &&
            s.status === 'completed'
        )
      )
    } catch (err) {
      logger.error('Erreur chargement shifts:', err)
      setLoadError('Impossible de charger les interventions')
    } finally {
      setIsLoadingShifts(false)
      setIsLoadingHistory(false)
    }
  }, [profileId, historyDays])

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

  const historyByDay = useMemo<HistoryDay[]>(() => {
    const grouped = new Map<string, Shift[]>()
    for (const shift of historyShifts) {
      const dayKey = format(new Date(shift.date), 'yyyy-MM-dd')
      if (!grouped.has(dayKey)) {
        grouped.set(dayKey, [])
      }
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

  const historyStats = useMemo<HistoryStats>(() => {
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
        if (shift.hasNightAction) {
          totalNightActionHours += nightH
        }
      }
    }

    return {
      totalHours: totalMinutes / 60,
      totalNightHours,
      totalNightActionHours,
      shiftCount,
    }
  }, [historyShifts])

  return {
    todayShifts,
    historyShifts,
    plannedShifts,
    completedShifts,
    historyByDay,
    historyStats,
    isLoadingShifts,
    isLoadingHistory,
    historyDays,
    setHistoryDays,
    loadError,
    loadAllShifts,
  }
}
