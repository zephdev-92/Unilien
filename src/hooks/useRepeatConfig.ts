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

export function useRepeatConfig(baseDate?: Date): RepeatConfigState {
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false)
  const [frequency, setFrequency] = useState<RepeatFrequency>('weekly')
  // Pré-cocher le jour de la semaine du shift source
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(() =>
    baseDate ? [baseDate.getDay()] : []
  )
  const [intervalDays, setIntervalDays] = useState(7)
  const [repeatCount, setRepeatCount] = useState<number | undefined>(4)
  const [endDate, setEndDate] = useState('')

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
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
