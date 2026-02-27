import { useMemo } from 'react'
import { Box, Flex, Text, Badge } from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { calculateNightHours } from '@/lib/compliance'
import { sanitizeText } from '@/lib/sanitize'
import type { Shift } from '@/types'
import { formatTime } from './clockInUtils'

/**
 * Carte d'une intervention
 */
export function ShiftCard({
  shift,
  onClockIn,
  completed = false,
}: {
  shift: Shift
  onClockIn?: () => void
  completed?: boolean
}) {
  const nightHours = useMemo(() => {
    try {
      return calculateNightHours(
        new Date(shift.date),
        shift.startTime,
        shift.endTime
      )
    } catch {
      return 0
    }
  }, [shift.date, shift.startTime, shift.endTime])

  return (
    <Box
      p={4}
      bg={completed ? 'gray.50' : 'white'}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={completed ? 'gray.200' : 'blue.200'}
      borderLeftWidth="4px"
      borderLeftColor={completed ? 'green.400' : 'blue.400'}
    >
      <Flex justify="space-between" align="start">
        <Box>
          <Text fontSize="lg" fontWeight="semibold" color={completed ? 'gray.600' : 'gray.900'}>
            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
          </Text>
          {shift.tasks.length > 0 && (
            <Text fontSize="sm" color="gray.500" mt={1}>
              {shift.tasks.slice(0, 2).map(sanitizeText).join(', ')}
              {shift.tasks.length > 2 && ` +${shift.tasks.length - 2}`}
            </Text>
          )}
          {nightHours > 0 && (
            <Flex align="center" gap={1} mt={1}>
              <Text fontSize="xs" color="purple.600">
                <span aria-hidden="true">🌙 </span>
                {nightHours.toFixed(1)}h de nuit
                {shift.hasNightAction ? ' (acte)' : ' (présence)'}
              </Text>
            </Flex>
          )}
        </Box>
        <Flex align="center" gap={2}>
          {completed ? (
            <Badge colorPalette="green">Terminée</Badge>
          ) : (
            onClockIn && (
              <AccessibleButton
                colorPalette="blue"
                size="sm"
                onClick={onClockIn}
              >
                Pointer
              </AccessibleButton>
            )
          )}
        </Flex>
      </Flex>
    </Box>
  )
}
