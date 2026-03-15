import { Box, Flex, Text } from '@chakra-ui/react'
import { calculateShiftDuration } from '@/lib/compliance'
import type { Shift } from '@/types'
import { formatTime, formatHours } from './clockInUtils'

interface EmployeeDayScheduleProps {
  todayShifts: Shift[]
}

function statusPill(status: string) {
  if (status === 'completed') {
    return { label: 'Terminé', bg: '#EFF4DC', color: '#3A5210' }
  }
  if (status === 'planned') {
    return { label: 'À venir', bg: '#F2EDE5', color: '#4A3D2B' }
  }
  return { label: 'En cours', bg: '#F2EDE5', color: '#4A3D2B' }
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
              const durationMin = shift.status === 'completed'
                ? calculateShiftDuration(shift.startTime, shift.endTime, shift.breakDuration)
                : calculateShiftDuration(shift.startTime, shift.endTime, 0)
              const isActive = shift.status !== 'completed' && shift.status !== 'planned'

              return (
                <Box key={shift.id}>
                  {idx > 0 && <Box h="1px" bg="border.default" mb={3} />}
                  <Flex gap={3} align="flex-start">
                    <Box flexShrink={0} textAlign="right" minW="44px">
                      <Text fontSize="11px" fontWeight="700" color={isActive ? '#9BB23B' : '#3D5166'}>
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
