import { Box, Flex, Text, Stack } from '@chakra-ui/react'
import type { AuxiliaryBreakdown } from '@/services/analyticsService'

interface AuxiliaryBreakdownWidgetProps {
  data: AuxiliaryBreakdown[]
}

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}

export function AuxiliaryBreakdownWidget({ data }: AuxiliaryBreakdownWidgetProps) {
  if (data.length === 0) {
    return (
      <Box
        bg="bg.surface"
        borderRadius="12px"
        borderWidth="1px"
        borderColor="border.default"
        p={6}
        boxShadow="sm"
      >
        <Text fontSize="lg" fontWeight="semibold" color="text.default" mb={4}>
          Repartition par auxiliaire
        </Text>
        <Text fontSize="sm" color="text.muted" textAlign="center" py={4}>
          Aucune donnee ce mois
        </Text>
      </Box>
    )
  }

  const totalHours = data.reduce((sum, a) => sum + a.hours, 0)
  const totalCost = data.reduce((sum, a) => sum + a.cost, 0)

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      p={6}
      boxShadow="sm"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold" color="text.default">
            Repartition par auxiliaire
          </Text>
          <Text fontSize="sm" color="text.muted">
            Mois en cours
          </Text>
        </Box>
        <Box
          color="brand.600"
          flexShrink={0}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </Box>
      </Flex>

      <Stack gap={0} divideY="1px" divideColor="border.default">
        {data.map((aux) => {
          const pct = totalHours > 0 ? (aux.hours / totalHours) * 100 : 0

          return (
            <Box key={aux.contractId} py={3}>
              <Flex justify="space-between" align="center" mb={2}>
                <Flex align="center" gap={2}>
                  <Flex
                    w={8}
                    h={8}
                    borderRadius="full"
                    bg="brand.subtle"
                    align="center"
                    justify="center"
                    flexShrink={0}
                  >
                    <Text fontSize="xs" fontWeight="bold" color="brand.600">
                      {aux.employeeName.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </Flex>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="text.default">
                      {aux.employeeName}
                    </Text>
                    <Text fontSize="xs" color="text.muted">
                      {aux.shiftsCount} intervention{aux.shiftsCount > 1 ? 's' : ''}
                    </Text>
                  </Box>
                </Flex>
                <Box textAlign="right">
                  <Text fontSize="sm" fontWeight="bold" color="text.default">
                    {aux.hours}h
                  </Text>
                  <Text fontSize="xs" color="text.muted">
                    {formatCurrency(aux.cost)}
                  </Text>
                </Box>
              </Flex>
              <Box h="6px" bg="bg.surface.hover" borderRadius="full" overflow="hidden">
                <Box h="100%" w={`${pct}%`} bg="brand.500" borderRadius="full" />
              </Box>
            </Box>
          )
        })}
      </Stack>

      {/* Total */}
      <Box borderTopWidth="2px" borderColor="border.default" pt={3} mt={1}>
        <Flex justify="space-between">
          <Text fontSize="sm" fontWeight="semibold" color="text.secondary">
            Total
          </Text>
          <Box textAlign="right">
            <Text fontSize="sm" fontWeight="bold" color="brand.600">
              {Math.round(totalHours * 10) / 10}h
            </Text>
            <Text fontSize="xs" color="text.muted">
              {formatCurrency(totalCost)}
            </Text>
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}
