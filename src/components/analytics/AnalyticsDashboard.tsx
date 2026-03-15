import { useState, useEffect } from 'react'
import { Stack, Grid, GridItem, Box, Text, Flex, Skeleton, SimpleGrid } from '@chakra-ui/react'
import {
  getEmployerAnalytics,
  getEmployeeAnalytics,
  type AnalyticsSummary,
} from '@/services/analyticsService'
import { AnalyticsSummaryCards } from './AnalyticsSummaryCards'
import { MonthlyChart } from './MonthlyChart'
import { AuxiliaryBreakdownWidget } from './AuxiliaryBreakdownWidget'
import { PresenceRateWidget } from './PresenceRateWidget'
import { logger } from '@/lib/logger'

interface AnalyticsDashboardProps {
  profileId: string
  role: 'employer' | 'employee'
  employerId?: string
}

type Period = 3 | 6 | 12

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 3, label: '3 mois' },
  { value: 6, label: '6 mois' },
  { value: 12, label: '12 mois' },
]

export function AnalyticsDashboard({ profileId, role, employerId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>(6)

  const effectiveId = role === 'employer' ? (employerId ?? profileId) : profileId

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const result = role === 'employer'
          ? await getEmployerAnalytics(effectiveId, period)
          : await getEmployeeAnalytics(effectiveId, period)

        if (!cancelled) setData(result)
      } catch (err) {
        logger.error('Erreur chargement analytics:', err)
        if (!cancelled) setError('Erreur lors du chargement des statistiques')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [effectiveId, role, period])

  if (isLoading) {
    return (
      <Stack gap={6}>
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Box key={i} bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" p={4} boxShadow="sm">
              <Skeleton height="40px" width="40px" borderRadius="12px" mb={3} />
              <Skeleton height="28px" width="50%" mb={2} />
              <Skeleton height="14px" width="80%" mb={1} />
              <Skeleton height="12px" width="60%" />
            </Box>
          ))}
        </SimpleGrid>
        <Skeleton height="280px" borderRadius="12px" />
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
          <Skeleton height="300px" borderRadius="12px" />
          <Skeleton height="300px" borderRadius="12px" />
        </SimpleGrid>
      </Stack>
    )
  }

  if (error) {
    return (
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" p={8} boxShadow="sm" textAlign="center">
        <Text color="text.muted">{error}</Text>
      </Box>
    )
  }

  if (!data) return null

  return (
    <Stack gap={6}>
      {/* Period selector */}
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold" color="text.default">
            {role === 'employer' ? 'Statistiques employeur' : 'Mes statistiques'}
          </Text>
          <Text fontSize="sm" color="text.muted">
            Vue detaillee sur {period} mois
          </Text>
        </Box>
        <Flex gap={1} bg="bg.surface.hover" borderRadius="12px" p={1}>
          {PERIOD_OPTIONS.map((opt) => (
            <Box
              as="button"
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              px={3}
              py={1.5}
              borderRadius="10px"
              fontSize="sm"
              fontWeight="medium"
              bg={period === opt.value ? 'white' : 'transparent'}
              color={period === opt.value ? 'brand.600' : 'text.muted'}
              boxShadow={period === opt.value ? 'sm' : 'none'}
              transition="all 0.15s"
              _hover={{ color: 'brand.600' }}
              css={{
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                },
              }}
            >
              {opt.label}
            </Box>
          ))}
        </Flex>
      </Flex>

      {/* Summary cards */}
      <AnalyticsSummaryCards data={data} isEmployer={role === 'employer'} />

      {/* Charts */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        <GridItem>
          <MonthlyChart
            data={data.monthlyData}
            metric="hours"
            title="Heures par mois"
          />
        </GridItem>
        <GridItem>
          <MonthlyChart
            data={data.monthlyData}
            metric="cost"
            title={role === 'employer' ? 'Cout par mois' : 'Revenu par mois'}
          />
        </GridItem>
      </Grid>

      {/* Bottom row */}
      <Grid templateColumns={{ base: '1fr', lg: role === 'employer' ? '1fr 340px' : '1fr' }} gap={6}>
        {role === 'employer' && (
          <GridItem>
            <AuxiliaryBreakdownWidget data={data.auxiliaryBreakdown} />
          </GridItem>
        )}
        <GridItem>
          <PresenceRateWidget data={data.presenceRates} />
        </GridItem>
      </Grid>
    </Stack>
  )
}
