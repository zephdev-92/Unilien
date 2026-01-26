/**
 * Tableau de bord de conformité complet
 * Vue d'ensemble par employé et par semaine
 */

import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Flex,
  Text,
  Heading,
  Avatar,
  Badge,
  Spinner,
  Center,
  Progress,
  HStack,
  Table,
  Card,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import {
  getWeeklyComplianceOverview,
  getComplianceHistory,
  type WeeklyComplianceOverview,
  type EmployeeComplianceStatus,
} from '@/services/complianceService'
import { addDays, subDays } from 'date-fns'
import { ComplianceHelp } from './ComplianceHelp'

interface ComplianceDashboardProps {
  employerId: string
}

export function ComplianceDashboard({ employerId }: ComplianceDashboardProps) {
  const [overview, setOverview] = useState<WeeklyComplianceOverview | null>(null)
  const [history, setHistory] = useState<
    Array<{
      weekStart: Date
      weekLabel: string
      compliant: number
      warnings: number
      critical: number
    }>
  >([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (employerId) {
      loadData()
    }
  }, [employerId, selectedDate])

  async function loadData() {
    setIsLoading(true)
    try {
      const [overviewData, historyData] = await Promise.all([
        getWeeklyComplianceOverview(employerId, selectedDate),
        getComplianceHistory(employerId, 4),
      ])
      setOverview(overviewData)
      setHistory(historyData)
    } finally {
      setIsLoading(false)
    }
  }

  function navigateWeek(direction: 'prev' | 'next') {
    setSelectedDate((prev) =>
      direction === 'prev' ? subDays(prev, 7) : addDays(prev, 7)
    )
  }

  if (isLoading) {
    return (
      <Center py={12}>
        <Stack align="center" gap={4}>
          <Spinner size="xl" color="brand.500" />
          <Text color="gray.600">Chargement des données de conformité...</Text>
        </Stack>
      </Center>
    )
  }

  if (showHelp) {
    return (
      <Box>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">Aide - Règles de conformité</Heading>
          <AccessibleButton onClick={() => setShowHelp(false)}>
            Retour au tableau de bord
          </AccessibleButton>
        </Flex>
        <ComplianceHelp />
      </Box>
    )
  }

  return (
    <Stack gap={6}>
      {/* En-tête */}
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Conformité</Heading>
          <Text color="gray.600">
            Suivi du respect des règles du Code du travail
          </Text>
        </Box>
        <HStack gap={2}>
          <AccessibleButton
            variant="outline"
            size="sm"
            onClick={() => setShowHelp(true)}
          >
            Aide
          </AccessibleButton>
          <AccessibleButton
            variant="solid"
            colorPalette="blue"
            size="sm"
            onClick={loadData}
          >
            Actualiser
          </AccessibleButton>
        </HStack>
      </Flex>

      {/* Navigation semaine */}
      <Card.Root>
        <Card.Body>
          <Flex justify="space-between" align="center">
            <AccessibleButton
              variant="ghost"
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              ← Semaine précédente
            </AccessibleButton>
            <Text fontWeight="semibold">{overview?.weekLabel}</Text>
            <AccessibleButton
              variant="ghost"
              size="sm"
              onClick={() => navigateWeek('next')}
              disabled={
                !!(overview &&
                overview.weekEnd >= new Date())
              }
            >
              Semaine suivante →
            </AccessibleButton>
          </Flex>
        </Card.Body>
      </Card.Root>

      {/* Résumé global */}
      {overview && (
        <Box
          display="grid"
          gridTemplateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }}
          gap={4}
        >
          <StatCard
            label="Total auxiliaires"
            value={overview.summary.totalEmployees}
            icon="👥"
          />
          <StatCard
            label="Conformes"
            value={overview.summary.compliant}
            icon="✓"
            colorPalette="green"
          />
          <StatCard
            label="Alertes"
            value={overview.summary.warnings}
            icon="⚠️"
            colorPalette="orange"
          />
          <StatCard
            label="Critiques"
            value={overview.summary.critical}
            icon="🚫"
            colorPalette="red"
          />
        </Box>
      )}

      {/* Graphique historique */}
      {history.length > 0 && (
        <Card.Root>
          <Card.Body>
            <Text fontWeight="semibold" mb={4}>
              Historique des 4 dernières semaines
            </Text>
            <HistoryChart history={history} />
          </Card.Body>
        </Card.Root>
      )}

      {/* Tableau détaillé par employé */}
      {overview && overview.employees.length > 0 && (
        <Card.Root>
          <Card.Body>
            <Text fontWeight="semibold" mb={4}>
              Détail par auxiliaire
            </Text>
            <EmployeeTable employees={overview.employees} />
          </Card.Body>
        </Card.Root>
      )}

      {/* Message si pas d'employés */}
      {overview && overview.employees.length === 0 && (
        <Card.Root>
          <Card.Body>
            <Center py={8}>
              <Stack align="center" gap={3}>
                <Text fontSize="4xl">👥</Text>
                <Text color="gray.600">Aucun auxiliaire actif</Text>
                <Text fontSize="sm" color="gray.500">
                  Ajoutez des auxiliaires pour voir leur conformité
                </Text>
              </Stack>
            </Center>
          </Card.Body>
        </Card.Root>
      )}
    </Stack>
  )
}

function StatCard({
  label,
  value,
  icon,
  colorPalette = 'gray',
}: {
  label: string
  value: number
  icon: string
  colorPalette?: 'green' | 'orange' | 'red' | 'gray'
}) {
  const bgColors = {
    green: 'green.50',
    orange: 'orange.50',
    red: 'red.50',
    gray: 'gray.50',
  }
  const textColors = {
    green: 'green.700',
    orange: 'orange.700',
    red: 'red.700',
    gray: 'gray.700',
  }

  return (
    <Card.Root bg={bgColors[colorPalette]}>
      <Card.Body>
        <Flex align="center" gap={3}>
          <Text fontSize="2xl" aria-hidden="true">
            {icon}
          </Text>
          <Box>
            <Text fontSize="2xl" fontWeight="bold" color={textColors[colorPalette]}>
              {value}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {label}
            </Text>
          </Box>
        </Flex>
      </Card.Body>
    </Card.Root>
  )
}

function HistoryChart({
  history,
}: {
  history: Array<{
    weekStart: Date
    weekLabel: string
    compliant: number
    warnings: number
    critical: number
  }>
}) {
  const maxTotal = Math.max(...history.map((h) => h.compliant + h.warnings + h.critical), 1)

  return (
    <Flex gap={4} justify="space-around" align="flex-end" h={120}>
      {history.map((week, i) => {
        const total = week.compliant + week.warnings + week.critical
        const height = total > 0 ? (total / maxTotal) * 100 : 5

        return (
          <Stack key={i} align="center" gap={2}>
            <Box position="relative" h={100} w={12}>
              <Stack
                position="absolute"
                bottom={0}
                w="full"
                h={`${height}%`}
                gap={0}
                borderRadius="md"
                overflow="hidden"
              >
                {week.critical > 0 && (
                  <Box
                    bg="red.400"
                    h={`${(week.critical / total) * 100}%`}
                  />
                )}
                {week.warnings > 0 && (
                  <Box
                    bg="orange.400"
                    h={`${(week.warnings / total) * 100}%`}
                  />
                )}
                {week.compliant > 0 && (
                  <Box
                    bg="green.400"
                    h={`${(week.compliant / total) * 100}%`}
                  />
                )}
              </Stack>
            </Box>
            <Text fontSize="xs" color="gray.600">
              {week.weekLabel}
            </Text>
          </Stack>
        )
      })}
    </Flex>
  )
}

function EmployeeTable({ employees }: { employees: EmployeeComplianceStatus[] }) {
  // Trier par statut (critiques en premier)
  const sorted = [...employees].sort((a, b) => {
    const order = { critical: 0, warning: 1, ok: 2 }
    return order[a.status] - order[b.status]
  })

  return (
    <Box overflowX="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Auxiliaire</Table.ColumnHeader>
            <Table.ColumnHeader>Statut</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Heures semaine</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Reste (48h)</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Reste (10h/j)</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Repos hebdo</Table.ColumnHeader>
            <Table.ColumnHeader>Alertes</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sorted.map((employee) => (
            <Table.Row key={employee.employeeId}>
              <Table.Cell>
                <HStack gap={2}>
                  <Avatar.Root size="xs">
                    <Avatar.Fallback name={employee.employeeName} />
                    {employee.avatarUrl && <Avatar.Image src={employee.avatarUrl} />}
                  </Avatar.Root>
                  <Text fontWeight="medium">{employee.employeeName}</Text>
                </HStack>
              </Table.Cell>
              <Table.Cell>
                <StatusBadge status={employee.status} />
              </Table.Cell>
              <Table.Cell textAlign="right">
                <HStack justify="flex-end" gap={2}>
                  <Progress.Root
                    value={(employee.currentWeekHours / 48) * 100}
                    size="xs"
                    w={16}
                    colorPalette={
                      employee.currentWeekHours > 44
                        ? employee.currentWeekHours > 48
                          ? 'red'
                          : 'orange'
                        : 'blue'
                    }
                  >
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                  <Text fontSize="sm">{employee.currentWeekHours}h</Text>
                </HStack>
              </Table.Cell>
              <Table.Cell textAlign="right">
                <Text
                  fontSize="sm"
                  color={employee.remainingWeeklyHours <= 4 ? 'red.600' : undefined}
                >
                  {employee.remainingWeeklyHours}h
                </Text>
              </Table.Cell>
              <Table.Cell textAlign="right">
                <Text
                  fontSize="sm"
                  color={employee.remainingDailyHours <= 2 ? 'orange.600' : undefined}
                >
                  {employee.remainingDailyHours}h
                </Text>
              </Table.Cell>
              <Table.Cell textAlign="right">
                <HStack justify="flex-end" gap={1}>
                  <Text
                    fontSize="sm"
                    color={
                      employee.weeklyRestStatus.isCompliant ? 'green.600' : 'red.600'
                    }
                  >
                    {employee.weeklyRestStatus.longestRest}h
                  </Text>
                  {employee.weeklyRestStatus.isCompliant ? (
                    <Text color="green.500" aria-label="Conforme">
                      ✓
                    </Text>
                  ) : (
                    <Text color="red.500" aria-label="Non conforme">
                      ✗
                    </Text>
                  )}
                </HStack>
              </Table.Cell>
              <Table.Cell>
                {employee.alerts.length > 0 ? (
                  <Stack gap={1}>
                    {employee.alerts.map((alert, i) => (
                      <Text
                        key={i}
                        fontSize="xs"
                        color={
                          alert.severity === 'critical' ? 'red.600' : 'orange.600'
                        }
                      >
                        {alert.message}
                      </Text>
                    ))}
                  </Stack>
                ) : (
                  <Text fontSize="xs" color="gray.400">
                    -
                  </Text>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}

function StatusBadge({ status }: { status: 'ok' | 'warning' | 'critical' }) {
  const config = {
    ok: { label: 'Conforme', colorPalette: 'green' as const },
    warning: { label: 'Attention', colorPalette: 'orange' as const },
    critical: { label: 'Critique', colorPalette: 'red' as const },
  }

  return (
    <Badge colorPalette={config[status].colorPalette} variant="subtle">
      {config[status].label}
    </Badge>
  )
}

export default ComplianceDashboard
