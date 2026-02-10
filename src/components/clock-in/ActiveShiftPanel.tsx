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

interface ActiveShiftPanelProps {
  shift: Shift
  clockInTime: string
  nightHours: number
  hasNightAction: boolean
  onNightActionChange: (checked: boolean) => void
  onClockOut: () => void
  onCancel: () => void
  isSubmitting: boolean
  panelRef: React.RefObject<HTMLDivElement | null>
}

export function ActiveShiftPanel({
  shift,
  clockInTime,
  nightHours,
  hasNightAction,
  onNightActionChange,
  onClockOut,
  onCancel,
  isSubmitting,
  panelRef,
}: ActiveShiftPanelProps) {
  const hasNightHours = nightHours > 0

  return (
    <Box
      ref={panelRef}
      tabIndex={-1}
      bg="white"
      borderRadius="xl"
      borderWidth="2px"
      borderColor="blue.400"
      p={6}
      boxShadow="md"
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
        <Text fontWeight="bold" color="blue.700" fontSize="lg">
          Intervention en cours
        </Text>
      </Flex>

      <Stack gap={3}>
        <Flex justify="space-between" align="center">
          <Text color="gray.600">Début prévu</Text>
          <Text fontWeight="semibold">{shift.startTime}</Text>
        </Flex>
        <Flex justify="space-between" align="center">
          <Text color="gray.600">Fin prévue</Text>
          <Text fontWeight="semibold">{shift.endTime}</Text>
        </Flex>
        <Flex justify="space-between" align="center">
          <Text color="gray.600">Pointé à</Text>
          <Badge colorPalette="green" size="lg">{clockInTime}</Badge>
        </Flex>

        {shift.tasks.length > 0 && (
          <>
            <Separator />
            <Box>
              <Text fontSize="sm" color="gray.500" mb={2}>
                Tâches prévues
              </Text>
              <Stack gap={1}>
                {shift.tasks.map((task, i) => (
                  <Flex key={i} align="center" gap={2}>
                    <Box w="5px" h="5px" borderRadius="full" bg="blue.400" />
                    <Text fontSize="sm">{sanitizeText(task)}</Text>
                  </Flex>
                ))}
              </Stack>
            </Box>
          </>
        )}

        {/* Toggle action de nuit */}
        {hasNightHours && (
          <>
            <Separator />
            <Box
              p={4}
              bg="purple.50"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="purple.200"
            >
              <Text fontWeight="medium" color="purple.800" mb={1}>
                <span aria-hidden="true">🌙 </span>
                Heures de nuit : {nightHours.toFixed(1)}h
              </Text>
              <Text fontSize="sm" color="purple.600" mb={3}>
                La majoration +20% s'applique uniquement si vous effectuez un acte
                (soin, aide...) pendant la nuit.
              </Text>
              <Flex
                as="label"
                htmlFor="night-action-switch"
                justify="space-between"
                align="center"
                p={3}
                bg="white"
                borderRadius="md"
                cursor="pointer"
              >
                <Text fontSize="sm" fontWeight="medium" color="gray.700">
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
                {hasNightAction
                  ? 'Majoration nuit appliquée : +20%'
                  : 'Pas de majoration nuit'}
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
