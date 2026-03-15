import { useState, useMemo } from 'react'
import { generateRepeatDates, type RepeatFrequency } from '@/lib/shifts/repeatDates'

export interface RepeatConfigState {
  isRepeatEnabled: boolean
  frequency: RepeatFrequency
  daysOfWeek: number[]
  intervalDays: number
  repeatCount: number | undefined
  endDate: string
  generatedDates: Date[]
  // Actions
  setIsRepeatEnabled: (v: boolean) => void
  setFrequency: (f: RepeatFrequency) => void
  toggleDayOfWeek: (day: number) => void
  setIntervalDays: (n: number) => void
  setRepeatCount: (n: number | undefined) => void
  setEndDate: (d: string) => void
}

export function useRepeatConfig(baseDate?: Date, initialEnabled = false): RepeatConfigState {
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(initialEnabled)
  const [frequency, setFrequency] = useState<RepeatFrequency>('weekly')
  const [intervalDays, setIntervalDays] = useState(7)
  const [repeatCount, setRepeatCount] = useState<number | undefined>(4)
  const [endDate, setEndDate] = useState('')

  // L'override stocke les jours sélectionnés manuellement + le jour UTC de base
  // auquel il correspond. Si baseDate change de jour, l'override est ignoré.
  const [override, setOverride] = useState<{ baseDay: number; days: number[] } | null>(null)

  const currentBaseDay = baseDate?.getUTCDay()

  // Si l'override est valide pour le jour actuel, l'utiliser ; sinon dériver de baseDate
  const daysOfWeek = useMemo(() => {
    if (override !== null && override.baseDay === currentBaseDay) {
      return override.days
    }
    if (currentBaseDay !== undefined) return [currentBaseDay]
    return []
  }, [override, currentBaseDay])

  const toggleDayOfWeek = (day: number) => {
    const next = daysOfWeek.includes(day)
      ? daysOfWeek.filter((d) => d !== day)
      : [...daysOfWeek, day]
    setOverride({ baseDay: currentBaseDay ?? -1, days: next })
  }

  const generatedDates = useMemo(() => {
    if (!isRepeatEnabled || !baseDate) return []

    return generateRepeatDates({
      startDate: baseDate,
      frequency,
      daysOfWeek: frequency === 'weekly' ? daysOfWeek : undefined,
      intervalDays: frequency === 'custom' ? intervalDays : undefined,
      repeatCount: endDate ? undefined : repeatCount,
      endDate: endDate ? new Date(endDate) : undefined,
    })
  }, [isRepeatEnabled, baseDate, frequency, daysOfWeek, intervalDays, repeatCount, endDate])

  return {
    isRepeatEnabled,
    frequency,
    daysOfWeek,
    intervalDays,
    repeatCount,
    endDate,
    generatedDates,
    setIsRepeatEnabled,
    setFrequency,
    toggleDayOfWeek,
    setIntervalDays,
    setRepeatCount,
    setEndDate,
  }
}
