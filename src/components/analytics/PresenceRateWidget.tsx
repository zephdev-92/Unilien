import { Box, Flex, Text, SimpleGrid } from '@chakra-ui/react'
import type { PresenceRate } from '@/services/analyticsService'

interface PresenceRateWidgetProps {
  data: PresenceRate[]
}

function RateCircle({ rate }: { rate: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (rate / 100) * circumference
  const color = rate >= 90 ? 'var(--chakra-colors-green-500)' : rate >= 70 ? 'var(--chakra-colors-orange-500)' : 'var(--chakra-colors-red-500)'

  return (
    <Box position="relative" display="inline-flex" alignItems="center" justifyContent="center">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle
          cx="45"
          cy="45"
          r={radius}
          fill="none"
          stroke="var(--chakra-colors-gray-100)"
          strokeWidth="6"
        />
        <circle
          cx="45"
          cy="45"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <Box position="absolute" textAlign="center">
        <Text fontSize="xl" fontWeight="bold" color="text.default" lineHeight={1}>
          {rate}%
        </Text>
      </Box>
    </Box>
  )
}

export function PresenceRateWidget({ data }: PresenceRateWidgetProps) {
  if (data.length === 0) return null

  // Taux moyen
  const avgRate = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + d.rate, 0) / data.length)
    : 0

  // Dernier mois
  const current = data[data.length - 1]

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      p={6}
      boxShadow="sm"
    >
      <Text fontSize="lg" fontWeight="semibold" color="text.default" mb={1}>
        Taux de presence
      </Text>
      <Text fontSize="sm" color="text.muted" mb={5}>
        Interventions realisees vs annulees/absences
      </Text>

      <Flex justify="center" mb={5}>
        <RateCircle rate={current?.rate ?? 0} />
      </Flex>

      <Text fontSize="sm" fontWeight="medium" color="text.secondary" textAlign="center" mb={4}>
        {current?.label ?? ''} — {current?.completed ?? 0} realisee{(current?.completed ?? 0) > 1 ? 's' : ''} sur {current?.total ?? 0}
      </Text>

      {/* Mini trend */}
      <SimpleGrid columns={Math.min(data.length, 6)} gap={1}>
        {data.map((d) => {
          const bg = d.rate >= 90 ? 'green.400' : d.rate >= 70 ? 'orange.400' : 'red.400'
          return (
            <Box key={d.month} textAlign="center" title={`${d.label}: ${d.rate}%`}>
              <Box
                h="4px"
                bg={bg}
                borderRadius="full"
                mb={1}
              />
              <Text fontSize="10px" color="text.muted">
                {d.label.slice(0, 3)}
              </Text>
            </Box>
          )
        })}
      </SimpleGrid>

      <Text fontSize="xs" color="text.muted" textAlign="center" mt={3}>
        Moyenne {data.length} mois : {avgRate}%
      </Text>
    </Box>
  )
}
