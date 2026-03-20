import { useState, useEffect } from 'react'
import { Box, Stack, Flex, Text, Skeleton, Progress } from '@chakra-ui/react'
import {
  getEmployerBudgetForecast,
  type BudgetForecast,
} from '@/services/statsService'
import { getEmployer } from '@/services/profileService'
import { calcEnveloppePch } from '@/lib/pch/pchTariffs'
import { logger } from '@/lib/logger'

interface BudgetForecastWidgetProps {
  employerId: string
}

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}

export function BudgetForecastWidget({ employerId }: BudgetForecastWidgetProps) {
  const [forecast, setForecast] = useState<BudgetForecast | null>(null)
  const [pchEnvelope, setPchEnvelope] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!employerId) return

    let cancelled = false

    async function load() {
      try {
        const [fc, employer] = await Promise.all([
          getEmployerBudgetForecast(employerId),
          getEmployer(employerId),
        ])

        if (cancelled) return

        setForecast(fc)

        if (employer?.pchBeneficiary && employer.pchType && employer.pchMonthlyHours) {
          setPchEnvelope(calcEnveloppePch(employer.pchMonthlyHours, employer.pchType))
        }
      } catch (err) {
        logger.error('BudgetForecastWidget — erreur:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [employerId])

  if (isLoading) {
    return (
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1.5px" borderColor="border.default" boxShadow="sm" overflow="hidden">
        <Box px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Skeleton height="16px" width="50%" />
        </Box>
        <Stack gap={3} p={4}>
          <Skeleton height="14px" />
          <Skeleton height="14px" />
          <Skeleton height="8px" borderRadius="full" />
          <Skeleton height="14px" />
        </Stack>
      </Box>
    )
  }

  // Ne pas afficher si PCH bénéficiaire (le PchEnvelopeWidget prend le relais)
  if (!forecast || forecast.projectedHours === 0 || pchEnvelope !== null) {
    return null
  }

  const pchBalance = pchEnvelope !== null ? pchEnvelope - forecast.projectedCostWithCharges : null
  const pchRatio = pchEnvelope && pchEnvelope > 0
    ? Math.min(forecast.projectedCostWithCharges / pchEnvelope, 1)
    : null
  const pchPercent = pchRatio !== null ? Math.round(pchRatio * 100) : null
  const isOverBudget = pchBalance !== null && pchBalance < 0

  const progressColor = isOverBudget ? 'red' : (pchPercent !== null && pchPercent >= 90) ? 'orange' : 'blue'

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1.5px"
      borderColor={isOverBudget ? 'red.200' : 'border.default'}
      boxShadow="sm"
      overflow="hidden"
    >
      <Flex
        justify="space-between"
        align="center"
        px={4}
        py={3}
        borderBottomWidth="1px"
        borderColor="border.default"
      >
        <Box>
          <Text fontSize="15px" fontWeight="700" color="text.default">
            Projection budget
          </Text>
          <Text fontSize="xs" color="text.muted" mt="2px">
            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
          </Text>
        </Box>
        <Box
          color={isOverBudget ? 'red.600' : 'brand.500'}
          flexShrink={0}
        >
          <Text fontSize="xl" fontWeight="800" lineHeight="1">€</Text>
        </Box>
      </Flex>

      <Stack gap={3} p={4}>
        <Flex justify="space-between">
          <Text fontSize="sm" color="text.muted">Heures effectuées</Text>
          <Text fontSize="sm" fontWeight="medium">{forecast.completedHours}h</Text>
        </Flex>
        <Flex justify="space-between">
          <Text fontSize="sm" color="text.muted">Heures planifiées</Text>
          <Text fontSize="sm" fontWeight="medium">{forecast.plannedHours}h</Text>
        </Flex>

        <Box borderTopWidth="1px" borderColor="border.default" pt={3}>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="sm" fontWeight="700" color="text.default">
              Total projeté
            </Text>
            <Text fontSize="sm" fontWeight="800" color="brand.600">
              {forecast.projectedHours}h
            </Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontSize="sm" color="text.muted">Coût projeté (charges incl.)</Text>
            <Text fontSize="sm" fontWeight="800" color={isOverBudget ? 'red.600' : 'text.default'}>
              {formatCurrency(forecast.projectedCostWithCharges)}
            </Text>
          </Flex>
        </Box>

        {pchEnvelope !== null && pchPercent !== null && (
          <Box borderTopWidth="1px" borderColor="border.default" pt={3}>
            <Flex justify="space-between" mb={2}>
              <Text fontSize="xs" color="text.muted">vs enveloppe PCH</Text>
              <Text fontSize="xs" fontWeight="medium" color={isOverBudget ? 'red.600' : 'text.secondary'}>
                {pchPercent}%
              </Text>
            </Flex>
            <Progress.Root value={pchPercent} colorPalette={progressColor} size="sm">
              <Progress.Track borderRadius="full">
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            <Flex justify="space-between" mt={2}>
              <Text fontSize="sm" fontWeight="medium" color="text.secondary">
                {isOverBudget ? 'Dépassement estimé' : 'Marge restante'}
              </Text>
              <Text
                fontSize="sm"
                fontWeight="800"
                color={isOverBudget ? 'red.600' : 'green.600'}
              >
                {isOverBudget
                  ? formatCurrency(Math.abs(pchBalance!))
                  : formatCurrency(pchBalance!)}
              </Text>
            </Flex>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

export default BudgetForecastWidget
