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
  Avatar,
  Spinner,
  Center,
  Progress,
  HStack,
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
    if (employerId) {
      setIsLoading(true)
      getWeeklyComplianceOverview(employerId)
        .then(setOverview)
        .finally(() => setIsLoading(false))
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
        <RouterLink to="/compliance">
          <AccessibleButton size="sm" variant="ghost" colorPalette="blue">
            Détails
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
          {/* Résumé visuel */}
          <ComplianceSummaryBar summary={overview.summary} />

          {/* Semaine en cours */}
          <Text fontSize="xs" color="gray.500" textAlign="center">
            {overview.weekLabel}
          </Text>

          {/* Liste des employés avec alertes */}
          <Stack gap={2}>
            {overview.employees
              .sort((a, b) => {
                const order = { critical: 0, warning: 1, ok: 2 }
                return order[a.status] - order[b.status]
              })
              .slice(0, 4)
              .map((employee) => (
                <EmployeeComplianceRow key={employee.employeeId} employee={employee} />
              ))}
          </Stack>

          {overview.employees.length > 4 && (
            <Text fontSize="sm" color="gray.500" textAlign="center">
              +{overview.employees.length - 4} autre
              {overview.employees.length - 4 > 1 ? 's' : ''}
            </Text>
          )}
        </Stack>
      )}
    </Box>
  )
}

function ComplianceSummaryBar({
  summary,
}: {
  summary: WeeklyComplianceOverview['summary']
}) {
  const total = summary.totalEmployees
  if (total === 0) return null

  const okPercent = (summary.compliant / total) * 100
  const warningPercent = (summary.warnings / total) * 100
  const criticalPercent = (summary.critical / total) * 100

  return (
    <Box>
      <Flex gap={1} mb={2} h={3} borderRadius="full" overflow="hidden">
        {okPercent > 0 && (
          <Box bg="green.400" w={`${okPercent}%`} transition="width 0.3s" />
        )}
        {warningPercent > 0 && (
          <Box bg="orange.400" w={`${warningPercent}%`} transition="width 0.3s" />
        )}
        {criticalPercent > 0 && (
          <Box bg="red.400" w={`${criticalPercent}%`} transition="width 0.3s" />
        )}
      </Flex>
      <Flex justify="space-between" fontSize="xs" color="gray.600">
        <HStack gap={3}>
          <Flex align="center" gap={1}>
            <Box w={2} h={2} borderRadius="full" bg="green.400" />
            <Text>{summary.compliant} OK</Text>
          </Flex>
          {summary.warnings > 0 && (
            <Flex align="center" gap={1}>
              <Box w={2} h={2} borderRadius="full" bg="orange.400" />
              <Text>{summary.warnings} alerte{summary.warnings > 1 ? 's' : ''}</Text>
            </Flex>
          )}
          {summary.critical > 0 && (
            <Flex align="center" gap={1}>
              <Box w={2} h={2} borderRadius="full" bg="red.400" />
              <Text>{summary.critical} critique{summary.critical > 1 ? 's' : ''}</Text>
            </Flex>
          )}
        </HStack>
      </Flex>
    </Box>
  )
}

function EmployeeComplianceRow({ employee }: { employee: EmployeeComplianceStatus }) {
  const statusColors = {
    ok: 'green',
    warning: 'orange',
    critical: 'red',
  }

  const statusIcons = {
    ok: '✓',
    warning: '⚠️',
    critical: '🚫',
  }

  // Calcul du pourcentage d'heures utilisées (sur 48h max)
  const hoursPercent = Math.min((employee.currentWeekHours / 48) * 100, 100)

  return (
    <Box
      p={3}
      bg="gray.50"
      borderRadius="md"
      borderLeftWidth={3}
      borderLeftColor={`${statusColors[employee.status]}.400`}
    >
      <Flex align="center" gap={3}>
        <Avatar.Root size="sm">
          <Avatar.Fallback name={employee.employeeName} />
          {employee.avatarUrl && <Avatar.Image src={employee.avatarUrl} />}
        </Avatar.Root>

        <Box flex={1} minW={0}>
          <Flex align="center" gap={2}>
            <Text fontWeight="medium" fontSize="sm" truncate>
              {employee.employeeName}
            </Text>
            <Text fontSize="xs" aria-hidden="true">
              {statusIcons[employee.status]}
            </Text>
          </Flex>

          {/* Barre de progression des heures */}
          <Box mt={1}>
            <Progress.Root
              value={hoursPercent}
              size="xs"
              colorPalette={
                hoursPercent > 92 ? 'red' : hoursPercent > 83 ? 'orange' : 'blue'
              }
            >
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            <Flex justify="space-between" mt={0.5}>
              <Text fontSize="xs" color="gray.500">
                {employee.currentWeekHours}h / 48h
              </Text>
              <Text fontSize="xs" color="gray.500">
                Reste {employee.remainingWeeklyHours}h
              </Text>
            </Flex>
          </Box>
        </Box>
      </Flex>

      {/* Alertes */}
      {employee.alerts.length > 0 && (
        <Box mt={2}>
          {employee.alerts.slice(0, 2).map((alert, i) => (
            <Text
              key={i}
              fontSize="xs"
              color={alert.severity === 'critical' ? 'red.600' : 'orange.600'}
              mt={1}
            >
              {alert.message}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default ComplianceWidget
