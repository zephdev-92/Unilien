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
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" p={6} boxShadow="sm">
        <Skeleton height="18px" width="50%" mb={4} />
        <Stack gap={3}>
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
      borderWidth="1px"
      borderColor={isOverBudget ? 'red.200' : 'gray.200'}
      p={6}
      boxShadow="sm"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold" color="text.default">
            Projection budget
          </Text>
          <Text fontSize="sm" color="text.muted">
            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
          </Text>
        </Box>
        <Box
          color={isOverBudget ? 'red.600' : 'blue.600'}
          flexShrink={0}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        </Box>
      </Flex>

      <Stack gap={3}>
        <Flex justify="space-between">
          <Text fontSize="sm" color="text.muted">Heures effectuees</Text>
          <Text fontSize="sm" fontWeight="medium">{forecast.completedHours}h</Text>
        </Flex>
        <Flex justify="space-between">
          <Text fontSize="sm" color="text.muted">Heures planifiees</Text>
          <Text fontSize="sm" fontWeight="medium">{forecast.plannedHours}h</Text>
        </Flex>

        <Box borderTopWidth="1px" borderColor="border.default" pt={3}>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="sm" fontWeight="semibold" color="text.default">
              Total projete
            </Text>
            <Text fontSize="sm" fontWeight="bold" color="brand.600">
              {forecast.projectedHours}h
            </Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontSize="sm" color="text.muted">Cout projete (charges incl.)</Text>
            <Text fontSize="sm" fontWeight="bold" color={isOverBudget ? 'red.600' : 'gray.900'}>
              {formatCurrency(forecast.projectedCostWithCharges)}
            </Text>
          </Flex>
        </Box>

        {pchEnvelope !== null && pchPercent !== null && (
          <Box borderTopWidth="1px" borderColor="border.default" pt={3}>
            <Flex justify="space-between" mb={2}>
              <Text fontSize="xs" color="text.muted">vs enveloppe PCH</Text>
              <Text fontSize="xs" fontWeight="medium" color={isOverBudget ? 'red.600' : 'gray.600'}>
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
                {isOverBudget ? 'Depassement estime' : 'Marge restante'}
              </Text>
              <Text
                fontSize="sm"
                fontWeight="bold"
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
