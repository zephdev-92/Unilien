import { Box, Stack, Flex, Text, Separator } from '@chakra-ui/react'
import type { ShiftType } from '@/types'

interface ShiftHoursSummaryProps {
  shiftType: ShiftType
  durationHours: number
  effectiveHoursComputed: number | null | undefined
  nightHoursCount: number
  nightInterventionsCount: number
  hasNightHours: boolean
  isRequalified: boolean
}

export function ShiftHoursSummary({
  shiftType,
  durationHours,
  effectiveHoursComputed,
  nightHoursCount,
  nightInterventionsCount,
  hasNightHours,
  isRequalified,
}: ShiftHoursSummaryProps) {
  if (shiftType === 'effective' || shiftType === 'guard_24h' || durationHours <= 0) {
    return null
  }

  return (
    <Box
      p={4}
      bg="bg.page"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
    >
      <Text fontWeight="medium" color="text.secondary" mb={2} fontSize="sm">
        Récapitulatif heures
      </Text>
      <Stack gap={1}>
        {shiftType === 'presence_day' && (
          <>
            <Flex justify="space-between">
              <Text fontSize="sm" color="text.muted">Présence responsable</Text>
              <Text fontSize="sm">{durationHours.toFixed(1)}h</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontSize="sm" color="text.muted">Équivalent travail (×2/3)</Text>
              <Text fontSize="sm" fontWeight="medium">{effectiveHoursComputed?.toFixed(1) ?? '—'}h</Text>
            </Flex>
          </>
        )}
        {shiftType === 'presence_night' && (
          <>
            <Flex justify="space-between">
              <Text fontSize="sm" color="text.muted">Présence de nuit</Text>
              <Text fontSize="sm">{durationHours.toFixed(1)}h</Text>
            </Flex>
            {isRequalified && (
              <Flex justify="space-between">
                <Text fontSize="sm" color="orange.700" fontWeight="medium">Requalifié travail effectif</Text>
                <Text fontSize="sm" fontWeight="bold" color="orange.700">{durationHours.toFixed(1)}h</Text>
              </Flex>
            )}
            {nightInterventionsCount > 0 && hasNightHours && (
              <Flex justify="space-between">
                <Text fontSize="sm" color="text.muted">Majoration nuit (+20%)</Text>
                <Text fontSize="sm">{nightHoursCount.toFixed(1)}h</Text>
              </Flex>
            )}
          </>
        )}
        <Separator my={1} />
        <Flex justify="space-between">
          <Text fontSize="sm" fontWeight="bold" color="text.default">Total travail effectif</Text>
          <Text fontSize="sm" fontWeight="bold" color="text.default">
            {shiftType === 'presence_day'
              ? `${effectiveHoursComputed?.toFixed(1) ?? '—'}h`
              : isRequalified
                ? `${durationHours.toFixed(1)}h`
                : '—'
            }
          </Text>
        </Flex>
      </Stack>
    </Box>
  )
}
