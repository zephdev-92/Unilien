import { useMemo } from 'react'
import { Box, Stack, Flex, Text } from '@chakra-ui/react'
import { calculateShiftDuration } from '@/lib/compliance'
import type { Shift } from '@/types'

interface Anomaly {
  id: string
  severity: 'danger' | 'info'
  message: string
}

interface AnomaliesPanelProps {
  todayShifts: Shift[]
  historyShifts: Shift[]
}

export function AnomaliesPanel({ todayShifts, historyShifts }: AnomaliesPanelProps) {
  const anomalies = useMemo(() => {
    const result: Anomaly[] = []
    const allShifts = [...todayShifts, ...historyShifts]

    for (const shift of allShifts) {
      if (shift.status !== 'completed') continue

      // Shift long sans pause
      const durationMin = calculateShiftDuration(
        shift.startTime,
        shift.endTime,
        shift.breakDuration
      )
      if (durationMin > 360 && shift.breakDuration === 0) {
        result.push({
          id: `no-break-${shift.id}`,
          severity: 'danger',
          message: `${Math.floor(durationMin / 60)}h${String(durationMin % 60).padStart(2, '0')} sans pause`,
        })
      }

      // Fin manquante (shift planned mais pas d'endTime cohérent)
      if (shift.status === 'completed' && shift.endTime === shift.startTime) {
        result.push({
          id: `missing-end-${shift.id}`,
          severity: 'info',
          message: "Fin d'heure identique au début",
        })
      }
    }

    // Shift planned non pointé (passé)
    for (const shift of todayShifts) {
      if (shift.status === 'planned') {
        const [h, m] = shift.endTime.split(':').map(Number)
        const endDate = new Date()
        endDate.setHours(h, m, 0, 0)
        if (endDate < new Date()) {
          result.push({
            id: `not-clocked-${shift.id}`,
            severity: 'info',
            message: `Intervention ${shift.startTime.slice(0, 5)}–${shift.endTime.slice(0, 5)} non pointée`,
          })
        }
      }
    }

    return result
  }, [todayShifts, historyShifts])

  if (anomalies.length === 0) return null

  return (
    <Box
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      p={5}
      boxShadow="sm"
    >
      <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
        Anomalies détectées
      </Text>

      <Stack gap={2.5}>
        {anomalies.map((anomaly) => (
          <Flex
            key={anomaly.id}
            align="center"
            gap={2.5}
            p={3}
            borderRadius="md"
            bg={anomaly.severity === 'danger' ? 'red.50' : 'blue.50'}
            borderWidth="1px"
            borderColor={anomaly.severity === 'danger' ? 'red.200' : 'blue.200'}
          >
            <Text flexShrink={0} aria-hidden="true">
              {anomaly.severity === 'danger' ? '⚠️' : 'ℹ️'}
            </Text>
            <Text
              fontSize="sm"
              color={anomaly.severity === 'danger' ? 'red.700' : 'blue.700'}
            >
              {anomaly.message}
            </Text>
          </Flex>
        ))}
      </Stack>
    </Box>
  )
}
