import { Box, Flex, Text } from '@chakra-ui/react'
import type { MonthlyData } from '@/services/analyticsService'

interface MonthlyChartProps {
  data: MonthlyData[]
  metric: 'hours' | 'cost'
  title: string
}

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}

export function MonthlyChart({ data, metric, title }: MonthlyChartProps) {
  if (data.length === 0) return null

  const values = data.map(d => metric === 'hours' ? d.totalHours : d.costWithCharges)
  const maxValue = Math.max(...values, 1)

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
        {title}
      </Text>
      <Text fontSize="sm" color="text.muted" mb={5}>
        {data.length} derniers mois
      </Text>

      {/* Bar chart */}
      <Flex align="flex-end" gap={2} h="180px" mb={3}>
        {data.map((d) => {
          const value = metric === 'hours' ? d.totalHours : d.costWithCharges
          const heightPct = maxValue > 0 ? (value / maxValue) * 100 : 0
          const completedPct = metric === 'hours' && d.totalHours > 0
            ? (d.hoursCompleted / d.totalHours) * 100
            : 100

          return (
            <Flex
              key={d.month}
              flex={1}
              direction="column"
              align="center"
              h="100%"
              justify="flex-end"
              title={`${d.label}: ${metric === 'hours' ? `${value}h` : formatCurrency(value)}`}
            >
              <Text fontSize="xs" fontWeight="semibold" color="text.secondary" mb={1}>
                {metric === 'hours' ? `${value}h` : `${Math.round(value / 1000)}k`}
              </Text>
              <Box
                w="100%"
                maxW="48px"
                h={`${Math.max(heightPct, 4)}%`}
                borderRadius="10px"
                overflow="hidden"
                position="relative"
                bg="brand.100"
              >
                <Box
                  position="absolute"
                  bottom={0}
                  left={0}
                  right={0}
                  h={`${completedPct}%`}
                  bg="brand.500"
                  borderRadius="10px"
                />
              </Box>
            </Flex>
          )
        })}
      </Flex>

      {/* Month labels */}
      <Flex gap={2}>
        {data.map((d) => {
          const shortLabel = d.label.slice(0, 3)
          return (
            <Flex key={d.month} flex={1} justify="center">
              <Text fontSize="xs" color="text.muted">
                {shortLabel}
              </Text>
            </Flex>
          )
        })}
      </Flex>

      {/* Legend */}
      {metric === 'hours' && (
        <Flex gap={4} mt={4} justify="center">
          <Flex align="center" gap={1}>
            <Box w={3} h={3} borderRadius="sm" bg="brand.500" />
            <Text fontSize="xs" color="text.muted">Effectuees</Text>
          </Flex>
          <Flex align="center" gap={1}>
            <Box w={3} h={3} borderRadius="sm" bg="brand.100" />
            <Text fontSize="xs" color="text.muted">Planifiees</Text>
          </Flex>
        </Flex>
      )}
    </Box>
  )
}
