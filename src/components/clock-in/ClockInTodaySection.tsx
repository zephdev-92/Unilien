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
      bg="bg.surface"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border.default"
      p={6}
      boxShadow="0 2px 8px rgba(78,100,120,.09)"
      _focus={{ outline: '2px solid', outlineColor: 'blue.400', outlineOffset: '2px' }}
    >
      <Text fontSize="lg" fontWeight="semibold" color="text.default" mb={4}>
        Interventions du jour
      </Text>

      {plannedShifts.length === 0 && completedShifts.length === 0 && (
        <Box p={6} textAlign="center">
          <Text fontSize="3xl" mb={2} aria-hidden="true">📭</Text>
          <Text color="text.muted">Aucune intervention prévue aujourd'hui</Text>
        </Box>
      )}

      {plannedShifts.length > 0 && (
        <Stack gap={3}>
          <Text fontSize="sm" fontWeight="medium" color="text.muted" textTransform="uppercase">
            À venir
          </Text>
          {plannedShifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} onClockIn={() => onClockIn(shift)} />
          ))}
        </Stack>
      )}

      {completedShifts.length > 0 && (
        <Stack gap={3} mt={plannedShifts.length > 0 ? 6 : 0}>
          <Text fontSize="sm" fontWeight="medium" color="text.muted" textTransform="uppercase">
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
