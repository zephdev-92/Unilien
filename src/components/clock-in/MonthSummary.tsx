import { useMemo } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { calculateShiftDuration } from '@/lib/compliance'
import type { Shift } from '@/types'
import { formatHours } from './clockInUtils'

interface MonthSummaryProps {
  todayShifts: Shift[]
  historyShifts: Shift[]
  monthlyGoalHours?: number
}

export function MonthSummary({ todayShifts, historyShifts, monthlyGoalHours = 40 }: MonthSummaryProps) {
  const data = useMemo(() => {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const monthLabel = format(now, 'MMMM yyyy', { locale: fr })

    const allShifts = [...todayShifts, ...historyShifts].filter(
      (s) => {
        const d = new Date(s.date)
        return s.status === 'completed' && d >= monthStart && d <= monthEnd
      }
    )

    let totalMin = 0
    for (const s of allShifts) {
      totalMin += calculateShiftDuration(s.startTime, s.endTime, s.breakDuration)
    }

    const totalHours = totalMin / 60
    const pct = Math.min(Math.round((totalHours / monthlyGoalHours) * 100), 100)

    return {
      monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      totalHours,
      shiftCount: allShifts.length,
      pct,
    }
  }, [todayShifts, historyShifts, monthlyGoalHours])

  return (
    <Box
      bg="bg.surface"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="0 2px 8px rgba(78,100,120,.09)"
      overflow="hidden"
    >
      <Box px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <Text fontFamily="heading" fontSize="md" fontWeight="700">{data.monthLabel}</Text>
      </Box>
      <Box p={4}>
        <Flex direction="column" gap={0}>
          <Flex
            align="baseline"
            gap={4}
            py={3}
            borderBottomWidth="1px"
            borderColor="border.default"
            css={{ '&:first-of-type': { paddingTop: 0 } }}
          >
            <Text fontSize="xs" color="text.muted" fontWeight="500" minW="120px" flexShrink={0}>
              Heures effectuées
            </Text>
            <Text fontSize="sm" fontWeight="700">{formatHours(data.totalHours)}</Text>
          </Flex>

          <Flex
            align="baseline"
            gap={4}
            py={3}
            borderBottomWidth="1px"
            borderColor="border.default"
          >
            <Text fontSize="xs" color="text.muted" fontWeight="500" minW="120px" flexShrink={0}>
              Objectif mensuel
            </Text>
            <Text fontSize="sm" fontWeight="500">{monthlyGoalHours}h</Text>
          </Flex>

          <Flex
            align="baseline"
            gap={4}
            py={3}
            css={{ paddingBottom: 0 }}
          >
            <Text fontSize="xs" color="text.muted" fontWeight="500" minW="120px" flexShrink={0}>
              Interventions
            </Text>
            <Text fontSize="sm" fontWeight="500">{data.shiftCount}</Text>
          </Flex>
        </Flex>

        <Box mt={3}>
          <Box h="8px" bg="#D8E3ED" borderRadius="full" overflow="hidden">
            <Box
              h="100%"
              borderRadius="full"
              bg="#3D5166"
              w={`${Math.max(data.pct, 1)}%`}
              transition="width 0.6s ease"
              role="progressbar"
              aria-valuenow={data.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${data.pct} % des heures du mois effectuées`}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
