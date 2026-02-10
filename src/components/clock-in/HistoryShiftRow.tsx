import { memo, useMemo } from 'react'
import { Flex, Box, Text, Badge } from '@chakra-ui/react'
import { calculateNightHours, calculateShiftDuration } from '@/lib/compliance'
import { sanitizeText } from '@/lib/sanitize'
import { formatHours } from './utils'
import type { Shift } from '@/types'

export const HistoryShiftRow = memo(function HistoryShiftRow({ shift }: { shift: Shift }) {
  const durationMin = calculateShiftDuration(shift.startTime, shift.endTime, shift.breakDuration)
  const nightHours = useMemo(() => {
    try {
      return calculateNightHours(new Date(shift.date), shift.startTime, shift.endTime)
    } catch {
      return 0
    }
  }, [shift.date, shift.startTime, shift.endTime])

  return (
    <Flex
      p={3}
      bg="gray.50"
      borderRadius="md"
      borderWidth="1px"
      borderColor="gray.100"
      justify="space-between"
      align="center"
    >
      <Flex align="center" gap={3}>
        <Box
          w="4px"
          h="36px"
          borderRadius="full"
          bg="green.400"
          flexShrink={0}
        />
        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {shift.startTime} - {shift.endTime}
          </Text>
          <Flex align="center" gap={2} mt={0.5}>
            <Text fontSize="xs" color="gray.500">
              {formatHours(durationMin / 60)}
              {shift.breakDuration > 0 && ` (pause ${shift.breakDuration}min)`}
            </Text>
            {nightHours > 0 && (
              <Badge
                size="sm"
                colorPalette={shift.hasNightAction ? 'purple' : 'gray'}
                variant="subtle"
              >
                <span aria-hidden="true">🌙 </span>
                {nightHours.toFixed(1)}h {shift.hasNightAction ? '(acte)' : '(présence)'}
              </Badge>
            )}
          </Flex>
        </Box>
      </Flex>
      {shift.tasks.length > 0 && (
        <Text fontSize="xs" color="gray.400" maxW="120px" truncate textAlign="right">
          {shift.tasks.slice(0, 2).map(sanitizeText).join(', ')}
        </Text>
      )}
    </Flex>
  )
})
