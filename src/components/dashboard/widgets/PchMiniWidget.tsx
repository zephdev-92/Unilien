/**
 * Widget PCH mini (sidebar) — proto dashboard aidant
 * Version compacte : heures effectuées, quota, restant + barre de progression.
 */

import { useState, useEffect } from 'react'
import { Box, Flex, Text, Skeleton, Stack, Progress } from '@chakra-ui/react'
import { getEmployer } from '@/services/profileService'
import { getEmployerBudgetForecast } from '@/services/statsService'
import { logger } from '@/lib/logger'

interface PchMiniWidgetProps {
  employerId: string
}

export function PchMiniWidget({ employerId }: PchMiniWidgetProps) {
  const [data, setData] = useState<{
    completedHours: number
    monthlyHours: number
    remaining: number
    percent: number
    monthLabel: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!employerId) return
    let cancelled = false

    async function load() {
      try {
        const [employer, forecast] = await Promise.all([
          getEmployer(employerId),
          getEmployerBudgetForecast(employerId),
        ])

        if (cancelled) return

        if (!employer?.pchBeneficiary || !employer.pchMonthlyHours) {
          return
        }

        const completed = forecast.completedHours
        const monthly = employer.pchMonthlyHours
        const remaining = Math.max(0, monthly - completed)
        const percent = monthly > 0 ? Math.min(Math.round((completed / monthly) * 100), 100) : 0

        const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

        setData({
          completedHours: completed,
          monthlyHours: monthly,
          remaining,
          percent,
          monthLabel: month.charAt(0).toUpperCase() + month.slice(1),
        })
      } catch (err) {
        logger.error('PchMiniWidget — erreur:', err)
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
        <Flex px={4} py={3} borderBottomWidth="1px" borderColor="border.default" justify="space-between" align="center">
          <Skeleton h="16px" w="120px" />
          <Skeleton h="20px" w="70px" borderRadius="md" />
        </Flex>
        <Stack gap={2} p={4}>
          <Skeleton h="14px" />
          <Skeleton h="14px" />
          <Skeleton h="14px" />
          <Skeleton h="8px" borderRadius="full" mt={1} />
        </Stack>
      </Box>
    )
  }

  if (!data) return null

  return (
    <Box bg="bg.surface" borderRadius="12px" borderWidth="1.5px" borderColor="border.default" boxShadow="sm" overflow="hidden">
      <Flex px={4} py={3} borderBottomWidth="1px" borderColor="border.default" justify="space-between" align="center">
        <Text fontSize="15px" fontWeight="700" color="text.default">Enveloppe PCH</Text>
        <Text fontSize="xs" fontWeight="600" color="warm.500" bg="warm.50" px={2} py="2px" borderRadius="md">
          {data.monthLabel}
        </Text>
      </Flex>

      <Box p={4}>
        <Stack gap={2} mb={3}>
          <Flex justify="space-between">
            <Text fontSize="sm" color="text.muted">Heures effectuées</Text>
            <Text fontSize="sm" fontWeight="700" color="text.default">{data.completedHours}h</Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontSize="sm" color="text.muted">Quota mensuel</Text>
            <Text fontSize="sm" color="text.default">{data.monthlyHours}h</Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontSize="sm" color="text.muted">Restant</Text>
            <Text fontSize="sm" fontWeight="700" color="warm.500">{data.remaining}h</Text>
          </Flex>
        </Stack>

        <Progress.Root value={data.percent} colorPalette="yellow" size="sm">
          <Progress.Track borderRadius="full">
            <Progress.Range css={{ background: 'var(--chakra-colors-warm-500)' }} />
          </Progress.Track>
        </Progress.Root>
      </Box>
    </Box>
  )
}
