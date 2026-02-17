/**
 * Résumé de rémunération avec majorations
 * Affiche le détail du calcul de paie pour une intervention
 */

import {
  Box,
  Stack,
  Flex,
  Text,
  Separator,
  Collapsible,
} from '@chakra-ui/react'
import type { ComputedPay } from '@/types'
import { formatCurrency, getPayBreakdown } from '@/lib/compliance'

interface PaySummaryProps {
  pay: ComputedPay
  hourlyRate: number
  durationHours: number
  showDetails?: boolean
  compact?: boolean
}

export function PaySummary({
  pay,
  hourlyRate,
  durationHours,
  showDetails = true,
  compact = false,
}: PaySummaryProps) {
  const hasMajorations =
    pay.sundayMajoration > 0 ||
    pay.holidayMajoration > 0 ||
    pay.nightMajoration > 0 ||
    pay.overtimeMajoration > 0 ||
    pay.presenceResponsiblePay > 0 ||
    pay.nightPresenceAllowance > 0

  if (compact) {
    return (
      <Flex justify="space-between" align="center" p={2} bg="gray.50" borderRadius="md">
        <Text fontSize="sm" color="gray.600">
          {durationHours.toFixed(1)}h × {formatCurrency(hourlyRate)}
          {hasMajorations && ' + majorations'}
        </Text>
        <Text fontWeight="bold" color="brand.600">
          {formatCurrency(pay.totalPay)}
        </Text>
      </Flex>
    )
  }

  const breakdown = getPayBreakdown(pay)

  return (
    <Box
      bg="gray.50"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      overflow="hidden"
    >
      {/* En-tête avec total */}
      <Box p={4} bg="brand.50" borderBottomWidth="1px" borderColor="brand.100">
        <Flex justify="space-between" align="center">
          <Text fontWeight="medium" color="gray.700">
            Rémunération estimée
          </Text>
          <Text fontSize="xl" fontWeight="bold" color="brand.600">
            {formatCurrency(pay.totalPay)}
          </Text>
        </Flex>
        <Text fontSize="sm" color="gray.500" mt={1}>
          {durationHours.toFixed(1)} heures × {formatCurrency(hourlyRate)}/h
        </Text>
      </Box>

      {/* Détails des majorations */}
      {showDetails && hasMajorations && (
        <Collapsible.Root defaultOpen>
          <Collapsible.Trigger asChild>
            <Box
              as="button"
              w="full"
              p={3}
              textAlign="left"
              borderBottomWidth="1px"
              borderColor="gray.200"
              _hover={{ bg: 'gray.100' }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'brand.500',
                outlineOffset: '-2px',
              }}
            >
              <Flex justify="space-between" align="center">
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Détail des majorations
                </Text>
                <Text fontSize="sm" color="brand.600">
                  +{formatCurrency(pay.totalPay - pay.basePay)}
                </Text>
              </Flex>
            </Box>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Stack gap={0} p={4}>
              {breakdown.map((item, index) => (
                <PayLineItem
                  key={index}
                  label={item.label}
                  amount={item.amount}
                  percentage={item.percentage}
                  isBase={index === 0}
                />
              ))}

              <Separator my={2} />

              <Flex justify="space-between" align="center" pt={1}>
                <Text fontWeight="bold" color="gray.800">
                  Total brut
                </Text>
                <Text fontWeight="bold" color="brand.600">
                  {formatCurrency(pay.totalPay)}
                </Text>
              </Flex>
            </Stack>
          </Collapsible.Content>
        </Collapsible.Root>
      )}

      {/* Message si pas de majorations */}
      {showDetails && !hasMajorations && (
        <Box p={4}>
          <Text fontSize="sm" color="gray.500">
            Pas de majoration applicable pour cette intervention.
          </Text>
        </Box>
      )}
    </Box>
  )
}

// Ligne de détail
function PayLineItem({
  label,
  amount,
  percentage,
  isBase,
}: {
  label: string
  amount: number
  percentage?: number
  isBase?: boolean
}) {
  return (
    <Flex justify="space-between" align="center" py={1}>
      <Text fontSize="sm" color={isBase ? 'gray.700' : 'gray.600'}>
        {label}
        {percentage !== undefined && (
          <Text as="span" color="gray.400" ml={1}>
            (+{percentage}%)
          </Text>
        )}
      </Text>
      <Text
        fontSize="sm"
        fontWeight={isBase ? 'medium' : 'normal'}
        color={isBase ? 'gray.700' : 'green.600'}
      >
        {isBase ? formatCurrency(amount) : `+${formatCurrency(amount)}`}
      </Text>
    </Flex>
  )
}

/**
 * Indicateur de majoration compact
 */
export function MajorationIndicator({ pay }: { pay: ComputedPay }) {
  const majorations: Array<{ label: string; icon: string }> = []

  if (pay.sundayMajoration > 0) {
    majorations.push({ label: 'Dimanche +30%', icon: '📅' })
  }
  if (pay.holidayMajoration > 0) {
    majorations.push({ label: 'Jour férié', icon: '🎉' })
  }
  if (pay.nightMajoration > 0) {
    majorations.push({ label: 'Heures de nuit', icon: '🌙' })
  }
  if (pay.overtimeMajoration > 0) {
    majorations.push({ label: 'Heures sup', icon: '⏰' })
  }
  if (pay.presenceResponsiblePay > 0) {
    majorations.push({ label: 'Présence jour', icon: '👁' })
  }
  if (pay.nightPresenceAllowance > 0) {
    majorations.push({ label: 'Présence nuit', icon: '🛏' })
  }

  if (majorations.length === 0) return null

  return (
    <Flex gap={2} flexWrap="wrap">
      {majorations.map((m) => (
        <Box
          key={m.label}
          bg="green.50"
          color="green.700"
          px={2}
          py={0.5}
          borderRadius="full"
          fontSize="xs"
        >
          <Text>
            {m.icon} {m.label}
          </Text>
        </Box>
      ))}
    </Flex>
  )
}

export default PaySummary
