import type { Shift } from '@/types'

export type ClockInStep = 'idle' | 'in-progress' | 'completing'

export interface HistoryDay {
  date: Date
  dateStr: string
  shifts: Shift[]
}

export interface HistoryStats {
  totalHours: number
  totalNightHours: number
  totalNightActionHours: number
  shiftCount: number
}
