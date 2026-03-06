import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Flex,
  Text,
  Avatar,
  Badge,
  Skeleton,
  Stack,
  Table,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import {
  SHIFT_STATUS_COLORS,
  SHIFT_STATUS_LABELS,
  SHIFT_TYPE_LABELS,
} from '@/lib/constants/statusMaps'
import type { Shift } from '@/types'

interface TodayShift {
  id: string
  startTime: string
  endTime: string
  shiftType: Shift['shiftType']
  status: Shift['status']
  employeeFirstName: string
  employeeLastName: string
  employeeAvatarUrl?: string
}

interface TodayPlanningWidgetProps {
  employerId: string
}

const SHIFT_TYPE_COLORS: Record<Shift['shiftType'], string> = {
  effective: 'blue',
  presence_day: 'purple',
  presence_night: 'purple',
  guard_24h: 'orange',
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function TodayPlanningWidget({ employerId }: TodayPlanningWidgetProps) {
  const [shifts, setShifts] = useState<TodayShift[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!employerId) return

    let cancelled = false

    async function loadTodayShifts() {
      try {
        const today = new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
          .from('shifts')
          .select(`
            id,
            start_time,
            end_time,
            shift_type,
            status,
            contract:contracts!inner(
              employer_id,
              employee:profiles!contracts_employee_id_fkey(
                first_name,
                last_name,
                avatar_url
              )
            )
          `)
          .eq('date', today)
          .eq('contract.employer_id', employerId)
          .order('start_time', { ascending: true })

        if (error) {
          logger.error('Erreur chargement planning du jour:', error)
          return
        }

        if (!cancelled && data) {
          const mapped: TodayShift[] = data.map((row: Record<string, unknown>) => {
            const contract = row.contract as Record<string, unknown> | null
            const employee = contract?.employee as Record<string, unknown> | null
            return {
              id: row.id as string,
              startTime: row.start_time as string,
              endTime: row.end_time as string,
              shiftType: row.shift_type as Shift['shiftType'],
              status: row.status as Shift['status'],
              employeeFirstName: (employee?.first_name as string) ?? '',
              employeeLastName: (employee?.last_name as string) ?? '',
              employeeAvatarUrl: employee?.avatar_url as string | undefined,
            }
          })
          setShifts(mapped)
        }
      } catch (err) {
        logger.error('Erreur planning du jour:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadTodayShifts()

    return () => {
      cancelled = true
    }
  }, [employerId])

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const capitalizedToday = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="sm"
      overflow="hidden"
    >
      <Flex justify="space-between" align="center" p={6} pb={4}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold" color="gray.900">
            Planning du jour
          </Text>
          <Text fontSize="sm" color="gray.500">
            {capitalizedToday}
          </Text>
        </Box>
        <AccessibleButton
          variant="ghost"
          size="sm"
          asChild
          accessibleLabel="Voir tout le planning"
        >
          <RouterLink to="/planning">Voir tout</RouterLink>
        </AccessibleButton>
      </Flex>

      {isLoading ? (
        <Stack gap={0} px={6} pb={6}>
          {[1, 2, 3].map((i) => (
            <Flex key={i} align="center" gap={3} py={3} borderTopWidth={i > 1 ? '1px' : 0} borderColor="gray.100">
              <Skeleton borderRadius="full" height="32px" width="32px" />
              <Skeleton height="14px" width="120px" />
              <Box flex={1} />
              <Skeleton height="14px" width="90px" />
              <Skeleton height="20px" width="80px" borderRadius="full" />
              <Skeleton height="20px" width="60px" borderRadius="full" />
            </Flex>
          ))}
        </Stack>
      ) : shifts.length === 0 ? (
        <Box textAlign="center" py={10} px={6}>
          <Box mb={3} color="gray.400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36" style={{ margin: '0 auto' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="12" y1="15" x2="12" y2="19" />
              <line x1="10" y1="17" x2="14" y2="17" />
            </svg>
          </Box>
          <Text fontWeight="medium" color="gray.700" mb={1}>
            Aucune intervention aujourd'hui
          </Text>
          <Text fontSize="sm" color="gray.500" mb={4}>
            Planifiez une intervention pour la voir apparaitre ici.
          </Text>
          <Flex gap={2} justify="center" flexWrap="wrap">
            <AccessibleButton size="sm" colorPalette="brand" asChild accessibleLabel="Planifier une intervention">
              <RouterLink to="/planning">Planifier une intervention</RouterLink>
            </AccessibleButton>
            <AccessibleButton size="sm" variant="ghost" asChild accessibleLabel="Voir l'equipe">
              <RouterLink to="/equipe">Voir l'equipe</RouterLink>
            </AccessibleButton>
          </Flex>
        </Box>
      ) : (
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader pl={6}>Employe</Table.ColumnHeader>
                <Table.ColumnHeader>Horaires</Table.ColumnHeader>
                <Table.ColumnHeader>Type</Table.ColumnHeader>
                <Table.ColumnHeader pr={6}>Statut</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {shifts.map((shift) => (
                <Table.Row
                  key={shift.id}
                  cursor="pointer"
                  _hover={{ bg: 'gray.50' }}
                  transition="background 0.15s"
                  asChild
                >
                  <RouterLink to={`/planning?shift=${shift.id}`} style={{ display: 'table-row' }}>
                    <Table.Cell pl={6}>
                      <Flex align="center" gap={2}>
                        <Avatar.Root size="xs">
                          <Avatar.Fallback name={getInitials(shift.employeeFirstName, shift.employeeLastName)} />
                          {shift.employeeAvatarUrl && <Avatar.Image src={shift.employeeAvatarUrl} />}
                        </Avatar.Root>
                        <Text fontWeight="medium" fontSize="sm">
                          {shift.employeeFirstName} {shift.employeeLastName}
                        </Text>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" whiteSpace="nowrap">
                        {shift.startTime} - {shift.endTime}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        colorPalette={SHIFT_TYPE_COLORS[shift.shiftType]}
                        variant="subtle"
                        fontSize="xs"
                      >
                        {SHIFT_TYPE_LABELS[shift.shiftType]}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell pr={6}>
                      <Badge
                        colorPalette={SHIFT_STATUS_COLORS[shift.status]}
                        variant="subtle"
                        fontSize="xs"
                      >
                        {SHIFT_STATUS_LABELS[shift.status]}
                      </Badge>
                    </Table.Cell>
                  </RouterLink>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Box>
  )
}

export default TodayPlanningWidget
