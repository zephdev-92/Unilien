/**
 * Widget Semaine en cours — proto dashboard aidant
 * Affiche un résumé visuel des heures jour par jour pour la semaine en cours.
 */

import { useState, useEffect } from 'react'
import { Box, Flex, Text, Skeleton, Stack } from '@chakra-ui/react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface DayData {
  label: string
  hours: number
  isToday: boolean
}

interface WeekSummaryWidgetProps {
  userId: string
  /** Color for the "today" bar */
  accentColor?: string
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getWeekRange(): { start: Date; end: Date } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

function formatHours(h: number): string {
  if (h === 0) return '—'
  const hours = Math.floor(h)
  const mins = Math.round((h - hours) * 60)
  if (mins === 0) return `${hours}h`
  return `${hours}h${mins < 10 ? '0' : ''}${mins}`
}

export function WeekSummaryWidget({ userId, accentColor = 'var(--chakra-colors-warm-500)' }: WeekSummaryWidgetProps) {
  const [days, setDays] = useState<DayData[]>([])
  const [total, setTotal] = useState(0)
  const [planned, setPlanned] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      try {
        const { start, end } = getWeekRange()
        const startStr = start.toISOString().slice(0, 10)
        const endStr = end.toISOString().slice(0, 10)
        const todayStr = new Date().toISOString().slice(0, 10)

        const { data, error } = await supabase
          .from('shifts')
          .select('date, start_time, end_time, status')
          .or(`employee_id.eq.${userId},employer_id.eq.${userId}`)
          .gte('date', startStr)
          .lte('date', endStr)

        if (error) {
          logger.error('WeekSummaryWidget — erreur:', error)
          return
        }

        if (cancelled) return

        // Map shifts to days
        const dayMap = new Map<string, number>()
        let totalH = 0
        let plannedH = 0

        for (const shift of data ?? []) {
          const [sh, sm] = (shift.start_time as string).split(':').map(Number)
          const [eh, em] = (shift.end_time as string).split(':').map(Number)
          const hours = (eh * 60 + em - sh * 60 - sm) / 60
          if (hours <= 0) continue
          const prev = dayMap.get(shift.date as string) ?? 0
          dayMap.set(shift.date as string, prev + hours)
          totalH += hours
          if (shift.status === 'planned' || shift.status === 'pending') plannedH += hours
        }

        // Build 7 days
        const result: DayData[] = []
        const weekStart = new Date(start)
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart)
          d.setDate(weekStart.getDate() + i)
          const dateStr = d.toISOString().slice(0, 10)
          result.push({
            label: DAY_LABELS[i],
            hours: dayMap.get(dateStr) ?? 0,
            isToday: dateStr === todayStr,
          })
        }

        setDays(result)
        setTotal(totalH)
        setPlanned(plannedH)
      } catch (err) {
        logger.error('WeekSummaryWidget — erreur:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const maxHours = Math.max(...days.map((d) => d.hours), 4)

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="sm"
      overflow="hidden"
    >
      <Flex justify="space-between" align="center" px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <Text fontSize="15px" fontWeight="700" color="text.default">
          Semaine en cours
        </Text>
        <Text fontSize="xs" fontWeight="600" color="text.muted" bg="bg.page" px={2} py="2px" borderRadius="md">
          {formatHours(total)} / ~{formatHours(total + planned)} prévues
        </Text>
      </Flex>

      <Box p={4}>
        {isLoading ? (
          <Stack gap={3}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Flex key={i} align="center" gap={3}>
                <Skeleton w="28px" h="14px" />
                <Skeleton flex={1} h="10px" borderRadius="full" />
                <Skeleton w="32px" h="14px" />
              </Flex>
            ))}
          </Stack>
        ) : (
          <>
            <Stack gap={2}>
              {days.map((day) => (
                <Flex key={day.label} align="center" gap={3}>
                  <Text
                    fontSize="xs"
                    fontWeight={day.isToday ? '700' : '500'}
                    color={day.isToday ? 'text.default' : 'text.muted'}
                    w="28px"
                    flexShrink={0}
                  >
                    {day.label}
                  </Text>
                  <Box flex={1} h="10px" bg="bg.page" borderRadius="full" overflow="hidden">
                    {day.hours > 0 && (
                      <Box
                        h="100%"
                        w={`${Math.min((day.hours / maxHours) * 100, 100)}%`}
                        bg={day.isToday ? accentColor : 'brand.500'}
                        borderRadius="full"
                        transition="width 0.3s ease"
                      />
                    )}
                  </Box>
                  <Text
                    fontSize="xs"
                    fontWeight={day.hours > 0 ? '600' : '400'}
                    color={day.hours > 0 ? 'text.default' : 'text.muted'}
                    w="36px"
                    textAlign="right"
                    flexShrink={0}
                  >
                    {day.hours > 0 ? formatHours(day.hours) : '—'}
                  </Text>
                </Flex>
              ))}
            </Stack>

            <Flex
              justify="space-between"
              align="center"
              mt={3}
              pt={3}
              borderTopWidth="1px"
              borderColor="border.default"
            >
              <Text fontSize="sm" color="text.muted">Total semaine</Text>
              <Text fontSize="sm" fontWeight="700" color="text.default">{formatHours(total)}</Text>
            </Flex>
          </>
        )}
      </Box>
    </Box>
  )
}
