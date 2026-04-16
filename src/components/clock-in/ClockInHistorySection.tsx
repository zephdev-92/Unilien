import { useMemo } from 'react'
import { Box, Flex, Text, Badge, Stack, Center, Spinner } from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { calculateNightHours, getShiftDurationMinutes } from '@/lib/compliance'
import { sanitizeText } from '@/lib/sanitize'
import { formatHoursCompact } from '@/lib/formatHours'
import type { Shift } from '@/types'
import { formatTime, formatDayLabel, formatHours } from './clockInUtils'

/**
 * Item de statistique compact
 */
function StatItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Flex align="center" gap={2} minW="120px">
      <Text fontSize="lg" aria-hidden="true">{icon}</Text>
      <Box>
        <Text fontSize="lg" fontWeight="bold" color="brand.700" lineHeight="1.2">
          {value}
        </Text>
        <Text fontSize="xs" color="brand.600">
          {label}
        </Text>
      </Box>
    </Flex>
  )
}

/**
 * Ligne d'intervention dans l'historique
 */
function HistoryShiftRow({ shift }: { shift: Shift }) {
  const durationMin = getShiftDurationMinutes(shift)
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
      bg="bg.page"
      borderRadius="10px"
      borderWidth="1px"
      borderColor="border.default"
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
          <Text fontSize="sm" fontWeight="semibold" color="text.default">
            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
          </Text>
          <Flex align="center" gap={2} mt={0.5}>
            <Text fontSize="xs" color="text.muted">
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
                {formatHoursCompact(nightHours)} {shift.hasNightAction ? '(acte)' : '(présence)'}
              </Badge>
            )}
          </Flex>
        </Box>
      </Flex>
      {shift.tasks.length > 0 && (
        <Text fontSize="xs" color="text.muted" maxW="120px" truncate textAlign="right">
          {shift.tasks.slice(0, 2).map(sanitizeText).join(', ')}
        </Text>
      )}
    </Flex>
  )
}

/**
 * Section historique des heures
 */
export function HistorySection({
  historyByDay,
  historyStats,
  historyDays,
  setHistoryDays,
  isLoading,
}: {
  historyByDay: { date: Date; dateStr: string; shifts: Shift[] }[]
  historyStats: {
    totalHours: number
    totalNightHours: number
    totalNightActionHours: number
    shiftCount: number
  }
  historyDays: number
  setHistoryDays: (days: number) => void
  isLoading: boolean
}) {
  return (
    <Box
      bg="bg.surface"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border.default"
      p={6}
      boxShadow="0 2px 8px rgba(78,100,120,.09)"
    >
      {/* En-tête historique */}
      <Flex justify="space-between" align="center" mb={4}>
        <Flex align="center" gap={2}>
          <Text fontSize="lg" aria-hidden="true">📊</Text>
          <Text fontSize="lg" fontWeight="semibold" color="text.default">
            Historique des heures
          </Text>
        </Flex>
        <Flex gap={1} role="group" aria-label="Période d'historique">
          {[7, 14, 30].map((days) => (
            <AccessibleButton
              key={days}
              size="xs"
              variant={historyDays === days ? 'solid' : 'outline'}
              colorPalette={historyDays === days ? 'blue' : 'gray'}
              onClick={() => setHistoryDays(days)}
              aria-pressed={historyDays === days}
              accessibleLabel={`Afficher les ${days} derniers jours`}
            >
              {days}j
            </AccessibleButton>
          ))}
        </Flex>
      </Flex>

      {/* Récapitulatif */}
      {!isLoading && historyStats.shiftCount > 0 && (
        <Box
          p={4}
          bg="brand.subtle"
          borderRadius="12px"
          borderWidth="1px"
          borderColor="blue.100"
          mb={4}
        >
          <Flex wrap="wrap" gap={4}>
            <StatItem
              label="Total heures"
              value={formatHours(historyStats.totalHours)}
              icon="⏱️"
            />
            <StatItem
              label="Interventions"
              value={String(historyStats.shiftCount)}
              icon="📋"
            />
            {historyStats.totalNightHours > 0 && (
              <StatItem
                label="Heures de nuit"
                value={formatHours(historyStats.totalNightHours)}
                icon="🌙"
              />
            )}
            {historyStats.totalNightActionHours > 0 && (
              <StatItem
                label="Nuit (acte)"
                value={formatHours(historyStats.totalNightActionHours)}
                icon="💊"
              />
            )}
          </Flex>
        </Box>
      )}

      {/* Loading */}
      {isLoading && (
        <Center py={6} role="status" aria-label="Chargement de l'historique">
          <Spinner size="md" />
        </Center>
      )}

      {/* Aucun historique */}
      {!isLoading && historyStats.shiftCount === 0 && (
        <Box p={6} textAlign="center">
          <Text fontSize="3xl" mb={2} aria-hidden="true">📭</Text>
          <Text color="text.muted">
            Aucune intervention terminée sur les {historyDays} derniers jours
          </Text>
        </Box>
      )}

      {/* Liste par jour */}
      {!isLoading && historyByDay.length > 0 && (
        <Stack gap={4}>
          {historyByDay.map(({ date, dateStr, shifts }) => {
            const dayTotalMin = shifts.reduce(
              (acc, s) => acc + getShiftDurationMinutes(s),
              0
            )
            return (
              <Box key={dateStr}>
                <Flex justify="space-between" align="center" mb={2}>
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color="text.muted"
                    textTransform="capitalize"
                  >
                    {formatDayLabel(date)}
                  </Text>
                  <Badge colorPalette="gray" size="sm">
                    {formatHours(dayTotalMin / 60)}
                  </Badge>
                </Flex>
                <Stack gap={2}>
                  {shifts.map((shift) => (
                    <HistoryShiftRow key={shift.id} shift={shift} />
                  ))}
                </Stack>
              </Box>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
