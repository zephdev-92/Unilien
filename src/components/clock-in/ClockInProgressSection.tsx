import {
  Box,
  Stack,
  Flex,
  Text,
  Badge,
  Separator,
  Switch,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { sanitizeText } from '@/lib/sanitize'
import type { Shift } from '@/types'
import { formatTime } from './clockInUtils'
import { formatHoursCompact } from '@/lib/formatHours'

interface ClockInProgressSectionProps {
  activeShift: Shift
  clockInTime: string
  hasNightHours: boolean
  nightHoursForActive: number
  hasNightAction: boolean
  isSubmitting: boolean
  onNightActionChange: (checked: boolean) => void
  onClockOut: () => void
  onCancel: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function ClockInProgressSection({
  activeShift,
  clockInTime,
  hasNightHours,
  nightHoursForActive,
  hasNightAction,
  isSubmitting,
  onNightActionChange,
  onClockOut,
  onCancel,
  containerRef,
}: ClockInProgressSectionProps) {
  return (
    <Box
      ref={containerRef}
      tabIndex={-1}
      bg="bg.surface"
      borderRadius="xl"
      borderWidth="2px"
      borderColor="blue.400"
      p={6}
      boxShadow="0 4px 16px rgba(78,100,120,.12)"
      _focus={{ outline: '2px solid', outlineColor: 'blue.400', outlineOffset: '2px' }}
    >
      <Flex role="status" aria-live="polite" align="center" gap={2} mb={4}>
        <Box
          aria-hidden="true"
          w="12px"
          h="12px"
          borderRadius="full"
          bg="green.500"
          css={{
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 },
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          }}
        />
        <Text fontWeight="bold" color="brand.700" fontSize="lg">
          Intervention en cours
        </Text>
      </Flex>

      <Stack gap={3}>
        <Flex justify="space-between" align="center">
          <Text color="text.muted">Début prévu</Text>
          <Text fontWeight="semibold">{formatTime(activeShift.startTime)}</Text>
        </Flex>
        <Flex justify="space-between" align="center">
          <Text color="text.muted">Fin prévue</Text>
          <Text fontWeight="semibold">{formatTime(activeShift.endTime)}</Text>
        </Flex>
        <Flex justify="space-between" align="center">
          <Text color="text.muted">Pointé à</Text>
          <Badge colorPalette="green" size="lg">{clockInTime}</Badge>
        </Flex>

        {activeShift.tasks.length > 0 && (
          <>
            <Separator />
            <Box>
              <Text fontSize="sm" color="text.muted" mb={2}>
                Tâches prévues
              </Text>
              <Stack gap={1}>
                {activeShift.tasks.map((task, i) => (
                  <Flex key={i} align="center" gap={2}>
                    <Box w="5px" h="5px" borderRadius="full" bg="blue.400" />
                    <Text fontSize="sm">{sanitizeText(task)}</Text>
                  </Flex>
                ))}
              </Stack>
            </Box>
          </>
        )}

        {hasNightHours && (
          <>
            <Separator />
            <Box p={4} bg="purple.50" borderRadius="12px" borderWidth="1px" borderColor="purple.200">
              <Text fontWeight="medium" color="purple.800" mb={1}>
                <span aria-hidden="true">🌙 </span>
                Heures de nuit : {formatHoursCompact(nightHoursForActive)}
              </Text>
              <Text fontSize="sm" color="purple.600" mb={3}>
                La majoration +20% s'applique uniquement si vous effectuez un acte (soin,
                aide...) pendant la nuit.
              </Text>
              <Flex
                as="label"
                htmlFor="night-action-switch"
                justify="space-between"
                align="center"
                p={3}
                bg="bg.surface"
                borderRadius="10px"
                cursor="pointer"
              >
                <Text fontSize="sm" fontWeight="medium" color="text.secondary">
                  J'effectue un acte cette nuit
                </Text>
                <Switch.Root
                  checked={hasNightAction}
                  onCheckedChange={(e) => onNightActionChange(e.checked)}
                >
                  <Switch.HiddenInput id="night-action-switch" />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </Flex>
              <Text
                aria-live="polite"
                fontSize="xs"
                color={hasNightAction ? 'green.600' : 'gray.500'}
                mt={2}
              >
                {hasNightAction ? 'Majoration nuit appliquée : +20%' : 'Pas de majoration nuit'}
              </Text>
            </Box>
          </>
        )}

        <Separator />

        <Flex gap={3}>
          <AccessibleButton
            colorPalette="red"
            flex={1}
            onClick={onClockOut}
            loading={isSubmitting}
          >
            Terminer l'intervention
          </AccessibleButton>
          <AccessibleButton
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            accessibleLabel="Annuler le pointage en cours"
          >
            Annuler
          </AccessibleButton>
        </Flex>
      </Stack>
    </Box>
  )
}
