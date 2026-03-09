import { useMemo } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { format, isToday, isFuture } from 'date-fns'
import { fr } from 'date-fns/locale'
import { calculateShiftDuration } from '@/lib/compliance'
import type { Shift, Absence, Contract } from '@/types'

interface PlanningStatsBarProps {
  shifts: Shift[]
  absences: Absence[]
  contract?: Contract | null
}

export function PlanningStatsBar({ shifts, absences, contract }: PlanningStatsBarProps) {
  const stats = useMemo(() => {
    const completed = shifts.filter((s) => s.status === 'completed')
    const totalMinutes = completed.reduce(
      (acc, s) => acc + calculateShiftDuration(s.startTime, s.endTime, s.breakDuration),
      0
    )
    const totalHours = totalMinutes / 60
    const weeklyHours = contract?.weeklyHours || 0

    const approvedAbsences = absences.filter((a) => a.status === 'approved').length

    return {
      totalHours,
      weeklyHours,
      shiftCount: shifts.length,
      completedCount: completed.length,
      absenceCount: approvedAbsences,
    }
  }, [shifts, absences, contract])

  return (
    <Flex
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={4}
      gap={6}
      flexWrap="wrap"
      justify="space-around"
    >
      <StatItem
        label="Heures effectuées"
        value={`${stats.totalHours.toFixed(1)}h`}
        sub={stats.weeklyHours > 0 ? `/ ${stats.weeklyHours}h contrat` : undefined}
        progress={stats.weeklyHours > 0 ? stats.totalHours / stats.weeklyHours : undefined}
      />
      <StatItem
        label="Interventions"
        value={String(stats.shiftCount)}
        sub={`${stats.completedCount} terminée${stats.completedCount > 1 ? 's' : ''}`}
      />
      <StatItem
        label="Congés"
        value={String(stats.absenceCount)}
        sub="approuvé(s)"
      />
    </Flex>
  )
}

function StatItem({
  label,
  value,
  sub,
  progress,
}: {
  label: string
  value: string
  sub?: string
  progress?: number
}) {
  return (
    <Box textAlign="center" minW="100px">
      <Text fontSize="xs" color="gray.500" fontWeight="medium">
        {label}
      </Text>
      <Text fontSize="xl" fontWeight="bold" color="gray.900">
        {value}
      </Text>
      {sub && (
        <Text fontSize="xs" color="gray.500">
          {sub}
        </Text>
      )}
      {progress !== undefined && (
        <Box mt={1} bg="gray.100" borderRadius="full" h="4px" overflow="hidden">
          <Box
            h="100%"
            borderRadius="full"
            bg={progress > 1 ? 'red.400' : progress > 0.8 ? 'orange.400' : 'blue.400'}
            w={`${Math.min(progress * 100, 100)}%`}
          />
        </Box>
      )}
    </Box>
  )
}

/** Chip "Prochaine intervention" pour la barre de navigation */
export function NextShiftChip({ shifts }: { shifts: Shift[] }) {
  const nextShift = useMemo(() => {
    const now = new Date()
    const upcoming = shifts
      .filter((s) => s.status === 'planned')
      .filter((s) => {
        const shiftDate = new Date(s.date)
        if (isFuture(shiftDate)) return true
        if (isToday(shiftDate)) {
          const [h, m] = s.startTime.split(':').map(Number)
          const startTime = new Date(shiftDate)
          startTime.setHours(h, m, 0, 0)
          return startTime > now
        }
        return false
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        if (dateA !== dateB) return dateA - dateB
        return a.startTime.localeCompare(b.startTime)
      })

    return upcoming[0] || null
  }, [shifts])

  if (!nextShift) return null

  const shiftDate = new Date(nextShift.date)
  const dateLabel = isToday(shiftDate)
    ? "Aujourd'hui"
    : format(shiftDate, 'EEE d', { locale: fr })

  return (
    <Flex
      align="center"
      gap={2}
      px={3}
      py={1.5}
      bg="blue.50"
      borderRadius="full"
      borderWidth="1px"
      borderColor="blue.200"
    >
      <Text fontSize="xs" color="blue.600" fontWeight="medium">
        Prochaine : {dateLabel} à {nextShift.startTime.slice(0, 5)}
      </Text>
    </Flex>
  )
}
