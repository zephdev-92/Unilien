import { useMemo } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { startOfWeek, addDays, format, isToday } from 'date-fns'
import { getShiftDurationMinutes } from '@/lib/compliance'
import type { Shift } from '@/types'
import { formatHours } from './clockInUtils'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface WeeklySummaryProps {
  todayShifts: Shift[]
  historyShifts: Shift[]
  title?: string
  weeklyGoalHours?: number
}

export function WeeklySummary({ todayShifts, historyShifts, title, weeklyGoalHours }: WeeklySummaryProps) {
  const weekData = useMemo(() => {
    const allShifts = [...todayShifts, ...historyShifts].filter(
      (s) => s.status === 'completed'
    )
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

    const days = DAY_LABELS.map((label, i) => {
      const date = addDays(weekStart, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayShifts = allShifts.filter(
        (s) => format(new Date(s.date), 'yyyy-MM-dd') === dateStr
      )
      const totalMin = dayShifts.reduce(
        (acc, s) => acc + getShiftDurationMinutes(s),
        0
      )
      return { label, date, hours: totalMin / 60, isToday: isToday(date) }
    })

    const maxHours = Math.max(...days.map((d) => d.hours), 1)
    const totalHours = days.reduce((acc, d) => acc + d.hours, 0)

    return { days, maxHours, totalHours }
  }, [todayShifts, historyShifts])

  return (
    <Box
      bg="bg.surface"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="0 2px 8px rgba(78,100,120,.09)"
      overflow="hidden"
    >
      <Flex px={4} py={3} borderBottomWidth="1px" borderColor="border.default" align="center" justify="space-between">
        <Text fontFamily="heading" fontSize="md" fontWeight="700">{title || 'Semaine en cours'}</Text>
        {weeklyGoalHours != null && (
          <Flex
            as="span"
            px={3}
            py="4px"
            borderRadius="sm"
            fontSize="xs"
            fontWeight="600"
            bg="brand.subtle"
            color="brand.500"
          >
            {formatHours(weekData.totalHours)} / ~{weeklyGoalHours}h
          </Flex>
        )}
      </Flex>
      <Box p={4}>
        <Flex direction="column" gap={2} mb={4}>
          {weekData.days.map((day) => (
            <Flex key={day.label} align="center" gap={2}>
              <Text
                fontSize="xs"
                fontWeight="700"
                color={day.isToday ? 'brand.500' : 'text.muted'}
                w="28px"
                flexShrink={0}
              >
                {day.label}
              </Text>
              <Box flex={1} bg="border.default" borderRadius="full" h="8px">
                {day.hours > 0 && (
                  <Box
                    h="100%"
                    borderRadius="full"
                    bg={day.isToday ? 'accent.500' : 'brand.500'}
                    w={`${Math.max((day.hours / weekData.maxHours) * 100, 4)}%`}
                    maxW="100%"
                    transition="width 0.3s"
                    aria-label={`${day.label} : ${formatHours(day.hours)}`}
                  />
                )}
              </Box>
              <Text
                fontSize="xs"
                fontWeight="700"
                color="text.secondary"
                minW="28px"
                textAlign="right"
                flexShrink={0}
              >
                {day.hours > 0 ? formatHours(day.hours) : '—'}
              </Text>
            </Flex>
          ))}
        </Flex>

        <Flex
          justify="space-between"
          align="center"
          pt={3}
          borderTopWidth="1px"
          borderColor="border.default"
        >
          <Text fontSize="sm" color="text.muted">Total semaine</Text>
          <Text fontSize="sm" fontWeight="700">{formatHours(weekData.totalHours)}</Text>
        </Flex>
      </Box>
    </Box>
  )
}
