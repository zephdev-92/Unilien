/**
 * Widget de conformité pour le tableau de bord
 * Vue rapide du statut de conformité de l'équipe
 */

import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Stack,
  Flex,
  Text,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import {
  getWeeklyComplianceOverview,
  type WeeklyComplianceOverview,
  type EmployeeComplianceStatus,
} from '@/services/complianceService'

interface ComplianceWidgetProps {
  employerId: string
}

export function ComplianceWidget({ employerId }: ComplianceWidgetProps) {
  const [overview, setOverview] = useState<WeeklyComplianceOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!employerId) return

    let cancelled = false

    const loadData = async () => {
      try {
        const data = await getWeeklyComplianceOverview(employerId)
        if (!cancelled) {
          setOverview(data)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [employerId])

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
        <Text fontSize="lg" fontWeight="semibold" color="gray.900">
          Conformité
        </Text>
        <RouterLink to="/conformite">
          <AccessibleButton size="sm" variant="ghost" colorPalette="blue">
            Tout voir
          </AccessibleButton>
        </RouterLink>
      </Flex>

      {isLoading ? (
        <Center py={8}>
          <Spinner size="lg" color="brand.500" />
        </Center>
      ) : !overview || overview.employees.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text fontSize="3xl" mb={2}>
            📊
          </Text>
          <Text color="gray.600">Aucun auxiliaire actif</Text>
        </Box>
      ) : (
        <Stack gap={4}>
          {/* Liste d'alertes */}
          <AlertSummaryList employees={overview.employees} />

          {/* Semaine en cours */}
          <Text fontSize="xs" color="gray.500" textAlign="center">
            {overview.weekLabel}
          </Text>
        </Stack>
      )}
    </Box>
  )
}

function AlertSummaryList({ employees }: { employees: EmployeeComplianceStatus[] }) {
  const allAlerts = employees.flatMap((emp) =>
    emp.alerts.map((alert) => ({
      ...alert,
      employeeName: emp.employeeName,
    }))
  )

  // Sort: critical first, then warning
  allAlerts.sort((a, b) => {
    const order = { critical: 0, warning: 1 }
    return order[a.severity] - order[b.severity]
  })

  const alertColors: Record<string, { bg: string; border: string; icon: string }> = {
    critical: { bg: 'red.50', border: 'red.400', icon: 'red.600' },
    warning: { bg: 'orange.50', border: 'orange.400', icon: 'orange.600' },
  }

  if (allAlerts.length === 0) {
    return (
      <Flex
        align="center"
        gap={3}
        p={3}
        bg="green.50"
        borderRadius="md"
        borderLeftWidth={3}
        borderLeftColor="green.400"
        role="status"
      >
        <Box color="green.600" flexShrink={0}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </Box>
        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="green.800">
            Convention respectee
          </Text>
          <Text fontSize="xs" color="green.700">
            Planning de la semaine conforme.
          </Text>
        </Box>
      </Flex>
    )
  }

  return (
    <Stack gap={2}>
      {allAlerts.slice(0, 3).map((alert, i) => {
        const colors = alertColors[alert.severity]
        return (
          <Flex
            key={i}
            align="center"
            gap={3}
            p={3}
            bg={colors.bg}
            borderRadius="md"
            borderLeftWidth={3}
            borderLeftColor={colors.border}
            role="alert"
          >
            <Box color={colors.icon} flexShrink={0}>
              {alert.severity === 'critical' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </Box>
            <Box minW={0}>
              <Text fontSize="sm" fontWeight="semibold" color="gray.900" truncate>
                {alert.message}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {alert.employeeName}
              </Text>
            </Box>
          </Flex>
        )
      })}
    </Stack>
  )
}

export default ComplianceWidget
