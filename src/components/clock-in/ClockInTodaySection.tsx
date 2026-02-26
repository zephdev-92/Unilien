import { Box, Stack, Text } from '@chakra-ui/react'
import type { Shift } from '@/types'
import { ShiftCard } from './ShiftCard'

interface ClockInTodaySectionProps {
  plannedShifts: Shift[]
  completedShifts: Shift[]
  onClockIn: (shift: Shift) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function ClockInTodaySection({
  plannedShifts,
  completedShifts,
  onClockIn,
  containerRef,
}: ClockInTodaySectionProps) {
  return (
    <Box
      ref={containerRef}
      tabIndex={-1}
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
      boxShadow="sm"
      _focus={{ outline: '2px solid', outlineColor: 'blue.400', outlineOffset: '2px' }}
    >
      <Text fontSize="lg" fontWeight="semibold" color="gray.900" mb={4}>
        Interventions du jour
      </Text>

      {plannedShifts.length === 0 && completedShifts.length === 0 && (
        <Box p={6} textAlign="center">
          <Text fontSize="3xl" mb={2} aria-hidden="true">📭</Text>
          <Text color="gray.500">Aucune intervention prévue aujourd'hui</Text>
        </Box>
      )}

      {plannedShifts.length > 0 && (
        <Stack gap={3}>
          <Text fontSize="sm" fontWeight="medium" color="gray.500" textTransform="uppercase">
            À venir
          </Text>
          {plannedShifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} onClockIn={() => onClockIn(shift)} />
          ))}
        </Stack>
      )}

      {completedShifts.length > 0 && (
        <Stack gap={3} mt={plannedShifts.length > 0 ? 6 : 0}>
          <Text fontSize="sm" fontWeight="medium" color="gray.500" textTransform="uppercase">
            Terminées
          </Text>
          {completedShifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} completed />
          ))}
        </Stack>
      )}
    </Box>
  )
}
