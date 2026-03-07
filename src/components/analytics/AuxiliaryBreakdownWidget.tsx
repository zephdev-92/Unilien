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
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
        boxShadow="sm"
      >
        <Text fontSize="lg" fontWeight="semibold" color="gray.900" mb={4}>
          Repartition par auxiliaire
        </Text>
        <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
          Aucune donnee ce mois
        </Text>
      </Box>
    )
  }

  const totalHours = data.reduce((sum, a) => sum + a.hours, 0)
  const totalCost = data.reduce((sum, a) => sum + a.cost, 0)

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
      boxShadow="sm"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold" color="gray.900">
            Repartition par auxiliaire
          </Text>
          <Text fontSize="sm" color="gray.500">
            Mois en cours
          </Text>
        </Box>
        <Box
          color="blue.600"
          flexShrink={0}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </Box>
      </Flex>

      <Stack gap={0} divideY="1px" divideColor="gray.100">
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
                    bg="blue.50"
                    align="center"
                    justify="center"
                    flexShrink={0}
                  >
                    <Text fontSize="xs" fontWeight="bold" color="blue.600">
                      {aux.employeeName.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </Flex>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.800">
                      {aux.employeeName}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {aux.shiftsCount} intervention{aux.shiftsCount > 1 ? 's' : ''}
                    </Text>
                  </Box>
                </Flex>
                <Box textAlign="right">
                  <Text fontSize="sm" fontWeight="bold" color="gray.900">
                    {aux.hours}h
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatCurrency(aux.cost)}
                  </Text>
                </Box>
              </Flex>
              <Box h="6px" bg="gray.100" borderRadius="full" overflow="hidden">
                <Box h="100%" w={`${pct}%`} bg="blue.500" borderRadius="full" />
              </Box>
            </Box>
          )
        })}
      </Stack>

      {/* Total */}
      <Box borderTopWidth="2px" borderColor="gray.200" pt={3} mt={1}>
        <Flex justify="space-between">
          <Text fontSize="sm" fontWeight="semibold" color="gray.700">
            Total
          </Text>
          <Box textAlign="right">
            <Text fontSize="sm" fontWeight="bold" color="brand.600">
              {Math.round(totalHours * 10) / 10}h
            </Text>
            <Text fontSize="xs" color="gray.500">
              {formatCurrency(totalCost)}
            </Text>
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}
