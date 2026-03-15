import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Flex,
  Text,
  Skeleton,
  Stack,
  Table,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { SHIFT_STATUS_LABELS, SHIFT_TYPE_LABELS } from '@/lib/constants/statusMaps'
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

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

/** Format "09:00:00" → "09:00" */
function formatTime(time: string): string {
  return time.slice(0, 5)
}

/** Proto tag colors by shift type */
const TAG_STYLES: Record<Shift['shiftType'], { bg: string; color: string }> = {
  effective: { bg: '#EDF1F5', color: '#3D5166' },
  presence_day: { bg: '#EFF4DC', color: '#3A5210' },
  presence_night: { bg: '#EFF4DC', color: '#3A5210' },
  guard_24h: { bg: '#F2EDE5', color: '#4A3D2B' },
}

/** Proto status-pill styles with dot color */
const STATUS_STYLES: Record<Shift['status'], { bg: string; color: string; dot: string }> = {
  planned: { bg: '#F2EDE5', color: '#4A3D2B', dot: '#5E5038' },
  completed: { bg: '#EFF4DC', color: '#3A5210', dot: '#9BB23B' },
  cancelled: { bg: '#F0F4F8', color: '#3D5166', dot: '#3D5166' },
  absent: { bg: '#FEF2F2', color: '#991B1B', dot: '#991B1B' },
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
              employee:employees!employee_id(
                profile:profiles!profile_id(
                  first_name,
                  last_name,
                  avatar_url
                )
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
            const profile = employee?.profile as Record<string, unknown> | null
            return {
              id: row.id as string,
              startTime: row.start_time as string,
              endTime: row.end_time as string,
              shiftType: row.shift_type as Shift['shiftType'],
              status: row.status as Shift['status'],
              employeeFirstName: (profile?.first_name as string) ?? '',
              employeeLastName: (profile?.last_name as string) ?? '',
              employeeAvatarUrl: profile?.avatar_url as string | undefined,
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
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="sm"
      overflow="hidden"
    >
      {/* Card header */}
      <Flex justify="space-between" align="center" px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <Box>
          <Text fontSize="15px" fontWeight="700" color="text.default">
            Planning du jour
          </Text>
          <Text fontSize="xs" color="text.muted">
            {capitalizedToday}
          </Text>
        </Box>
        <AccessibleButton
          variant="outline"
          size="sm"
          asChild
          accessibleLabel="Voir tout le planning"
        >
          <RouterLink to="/planning">Voir tout</RouterLink>
        </AccessibleButton>
      </Flex>

      {isLoading ? (
        <Stack gap={0} px={4} pb={4}>
          {[1, 2, 3].map((i) => (
            <Flex key={i} align="center" gap={3} py={3} borderTopWidth={i > 1 ? '1px' : 0} borderColor="border.default">
              <Skeleton borderRadius="full" height="28px" width="28px" />
              <Skeleton height="14px" width="120px" />
              <Box flex={1} />
              <Skeleton height="14px" width="90px" />
              <Skeleton height="20px" width="80px" borderRadius="10px" />
              <Skeleton height="20px" width="80px" borderRadius="full" />
            </Flex>
          ))}
        </Stack>
      ) : shifts.length === 0 ? (
        <Box textAlign="center" py={10} px={6}>
          <Box mb={3} color="text.muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36" style={{ margin: '0 auto' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="12" y1="15" x2="12" y2="19" />
              <line x1="10" y1="17" x2="14" y2="17" />
            </svg>
          </Box>
          <Text fontWeight="medium" color="text.secondary" mb={1}>
            Aucune intervention aujourd'hui
          </Text>
          <Text fontSize="sm" color="text.muted" mb={4}>
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
              <Table.Row bg="bg.page">
                <Table.ColumnHeader
                  pl={4} fontSize="12px" fontWeight="700"
                  textTransform="uppercase" letterSpacing="0.06em"
                  color="text.muted" py="11px" width="40%"
                >
                  Employé
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="12px" fontWeight="700"
                  textTransform="uppercase" letterSpacing="0.06em"
                  color="text.muted" py="11px" width="25%"
                >
                  Horaires
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="12px" fontWeight="700"
                  textTransform="uppercase" letterSpacing="0.06em"
                  color="text.muted" py="11px"
                >
                  Type
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  pr={4} fontSize="12px" fontWeight="700"
                  textTransform="uppercase" letterSpacing="0.06em"
                  color="text.muted" py="11px"
                >
                  Statut
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {shifts.map((shift) => {
                const tag = TAG_STYLES[shift.shiftType]
                const pill = STATUS_STYLES[shift.status]
                return (
                  <Table.Row
                    key={shift.id}
                    cursor="pointer"
                    _hover={{ bg: 'bg.page' }}
                    transition="background 0.15s"
                    asChild
                  >
                    <RouterLink to={`/planning?shift=${shift.id}`} style={{ display: 'table-row' }}>
                      <Table.Cell pl={4} py="12px" borderBottomWidth="1px" borderColor="border.default" verticalAlign="middle">
                        <Flex align="center" gap={2}>
                          {shift.employeeAvatarUrl ? (
                            <Box
                              as="img"
                              src={shift.employeeAvatarUrl}
                              alt=""
                              w="28px"
                              h="28px"
                              borderRadius="full"
                              objectFit="cover"
                              flexShrink={0}
                            />
                          ) : (
                            <Flex
                              align="center"
                              justify="center"
                              w="28px"
                              h="28px"
                              borderRadius="full"
                              bg="brand.500"
                              color="white"
                              fontSize="11px"
                              fontWeight="700"
                              flexShrink={0}
                            >
                              {getInitials(shift.employeeFirstName, shift.employeeLastName)}
                            </Flex>
                          )}
                          <Text fontWeight="700" fontSize="14px" color="text.default">
                            {shift.employeeFirstName} {shift.employeeLastName}
                          </Text>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell py="12px" borderBottomWidth="1px" borderColor="border.default" verticalAlign="middle">
                        <Text fontSize="14px" whiteSpace="nowrap" color="text.default">
                          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell py="12px" borderBottomWidth="1px" borderColor="border.default" verticalAlign="middle">
                        <Flex
                          as="span"
                          display="inline-flex"
                          alignItems="center"
                          px={3}
                          py="4px"
                          borderRadius="10px"
                          fontSize="12px"
                          fontWeight="600"
                          bg={tag.bg}
                          color={tag.color}
                        >
                          {SHIFT_TYPE_LABELS[shift.shiftType]}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell pr={4} py="12px" borderBottomWidth="1px" borderColor="border.default" verticalAlign="middle">
                        <Flex
                          as="span"
                          display="inline-flex"
                          alignItems="center"
                          gap="5px"
                          px={3}
                          py="4px"
                          borderRadius="full"
                          fontSize="12px"
                          fontWeight="700"
                          bg={pill.bg}
                          color={pill.color}
                        >
                          <Box
                            as="span"
                            w="6px"
                            h="6px"
                            borderRadius="full"
                            bg={pill.dot}
                          />
                          {SHIFT_STATUS_LABELS[shift.status]}
                        </Flex>
                      </Table.Cell>
                    </RouterLink>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Box>
  )
}

export default TodayPlanningWidget
