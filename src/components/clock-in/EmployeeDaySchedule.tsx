import { Box, Flex, Text } from '@chakra-ui/react'
import { getShiftDurationMinutes } from '@/lib/compliance'
import type { Shift } from '@/types'
import { formatTime, formatHours } from './clockInUtils'

interface EmployeeDayScheduleProps {
  todayShifts: Shift[]
}

function statusPill(status: string) {
  if (status === 'completed') {
    return { label: 'Terminé', bg: 'accent.50', color: 'accent.700' }
  }
  if (status === 'planned') {
    return { label: 'À venir', bg: 'warm.50', color: 'warm.600' }
  }
  return { label: 'En cours', bg: 'warm.50', color: 'warm.600' }
}

export function EmployeeDaySchedule({ todayShifts }: EmployeeDayScheduleProps) {
  const sorted = [...todayShifts].sort((a, b) => a.startTime.localeCompare(b.startTime))

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
        <Text fontFamily="heading" fontSize="md" fontWeight="700">Interventions du jour</Text>
      </Box>
      <Box p={4}>
        {sorted.length === 0 ? (
          <Text fontSize="sm" color="text.muted">Aucune intervention prévue.</Text>
        ) : (
          <Flex direction="column" gap={3}>
            {sorted.map((shift, idx) => {
              const pill = statusPill(shift.status)
              const durationMin = getShiftDurationMinutes(shift)
              const isActive = shift.status !== 'completed' && shift.status !== 'planned'

              return (
                <Box key={shift.id}>
                  {idx > 0 && <Box h="1px" bg="border.default" mb={3} />}
                  <Flex gap={3} align="flex-start">
                    <Box flexShrink={0} textAlign="right" minW="44px">
                      <Text fontSize="11px" fontWeight="700" color={isActive ? 'accent.500' : 'brand.500'}>
                        {formatTime(shift.startTime)}
                      </Text>
                      <Text fontSize="11px" color="text.muted">
                        {formatTime(shift.endTime)}
                      </Text>
                    </Box>
                    <Box flex={1} minW={0}>
                      <Text fontSize="sm" fontWeight="600">
                        {shift.tasks?.length ? shift.tasks[0] : 'Intervention'}
                      </Text>
                      <Text fontSize="12px" color="text.muted">
                        {shift.employeeName || 'Employeur'} · {formatHours(durationMin / 60)}
                      </Text>
                    </Box>
                    <Flex
                      as="span"
                      flexShrink={0}
                      px="10px"
                      py="3px"
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="700"
                      bg={pill.bg}
                      color={pill.color}
                    >
                      {pill.label}
                    </Flex>
                  </Flex>
                </Box>
              )
            })}
          </Flex>
        )}
      </Box>
    </Box>
  )
}
