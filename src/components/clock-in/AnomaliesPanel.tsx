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
        <Text fontFamily="heading" fontSize="md" fontWeight="700">Anomalies détectées</Text>
      </Box>
      <Box p={4}>
        {anomalies.length === 0 ? (
          <Text fontSize="sm" color="#3D5166">Aucune anomalie détectée.</Text>
        ) : (
          <Stack gap={3}>
            {anomalies.map((anomaly) => (
              <Flex
                key={anomaly.id}
                align="center"
                gap={2.5}
                px={3}
                py={2.5}
                borderRadius="md"
                borderLeftWidth="3px"
                borderLeftColor={anomaly.severity === 'danger' ? '#991B1B' : '#3D5166'}
                bg={anomaly.severity === 'danger' ? '#FEF2F2' : '#EDF1F5'}
                color={anomaly.severity === 'danger' ? '#991B1B' : '#3D5166'}
              >
                <Box flexShrink={0} mt="1px">
                  {anomaly.severity === 'danger' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16} aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16} aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  )}
                </Box>
                <Text fontSize="sm" fontWeight="500">{anomaly.message}</Text>
              </Flex>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  )
}
