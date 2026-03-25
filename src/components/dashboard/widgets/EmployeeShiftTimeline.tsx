import { useState, useEffect } from 'react'
import { Box, Flex, Text, Skeleton, Stack } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { AccessibleButton } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { SHIFT_TYPE_LABELS } from '@/lib/constants/statusMaps'
import type { Shift } from '@/types'

interface TimelineShift {
  id: string
  startTime: string
  endTime: string
  shiftType: Shift['shiftType']
  status: Shift['status']
  employerName: string
  duration: string
}

type DotStatus = 'done' | 'active' | 'upcoming'

interface EmployeeShiftTimelineProps {
  employeeId: string
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}

function getShiftDotStatus(shift: TimelineShift): DotStatus {
  if (shift.status === 'completed') return 'done'

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const [sh, sm] = shift.startTime.split(':').map(Number)
  const [eh, em] = shift.endTime.split(':').map(Number)
  const startDate = new Date(`${today}T${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}:00`)
  const endDate = new Date(`${today}T${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}:00`)

  if (now >= startDate && now <= endDate) return 'active'
  if (now < startDate) return 'upcoming'
  return 'done'
}

const DOT_COLORS: Record<DotStatus, { bg: string; border: string; opacity?: number }> = {
  done: { bg: 'text.muted', border: 'text.muted', opacity: 0.5 },
  active: { bg: 'accent.700', border: 'accent.700' },
  upcoming: { bg: 'white', border: 'text.muted' },
}

const STATUS_LABELS: Record<DotStatus, { text: string; bg: string; color: string; dotColor: string }> = {
  done: { text: 'Terminé', bg: 'bg.muted', color: 'text.muted', dotColor: 'text.muted' },
  active: { text: 'En cours', bg: 'accent.subtle', color: 'accent.700', dotColor: 'accent.500' },
  upcoming: { text: 'À venir', bg: 'warm.subtle', color: 'warm.500', dotColor: 'warm.500' },
}

function getTimeHint(shift: TimelineShift, dotStatus: DotStatus): string | null {
  if (dotStatus === 'done') return null

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  if (dotStatus === 'upcoming') {
    const [sh, sm] = shift.startTime.split(':').map(Number)
    const startDate = new Date(`${today}T${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}:00`)
    const diffMs = startDate.getTime() - now.getTime()
    if (diffMs <= 0) return null
    const diffMins = Math.round(diffMs / 60000)
    if (diffMins < 60) return `dans ${diffMins} min`
    const h = Math.floor(diffMins / 60)
    const m = diffMins % 60
    return m > 0 ? `dans ${h}h ${m.toString().padStart(2, '0')}` : `dans ${h}h`
  }

  return null
}

export function EmployeeShiftTimeline({ employeeId }: EmployeeShiftTimelineProps) {
  const [shifts, setShifts] = useState<TimelineShift[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false

    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
          .from('shifts')
          .select(`
            id, start_time, end_time, shift_type, status,
            contract:contracts!inner(
              employee_id,
              employer:employers!employer_id(
                profile:profiles!profile_id(first_name, last_name)
              )
            )
          `)
          .eq('date', today)
          .eq('contract.employee_id', employeeId)
          .order('start_time', { ascending: true })

        if (error) {
          logger.error('Erreur chargement timeline:', error)
          return
        }

        if (!cancelled && data) {
          const mapped: TimelineShift[] = data.map((row: Record<string, unknown>) => {
            const contract = row.contract as Record<string, unknown> | null
            const employer = contract?.employer as Record<string, unknown> | null
            const profile = employer?.profile as Record<string, unknown> | null
            const firstName = (profile?.first_name as string) ?? ''
            const lastName = (profile?.last_name as string) ?? ''
            const startTime = row.start_time as string
            const endTime = row.end_time as string

            return {
              id: row.id as string,
              startTime,
              endTime,
              shiftType: row.shift_type as Shift['shiftType'],
              status: row.status as Shift['status'],
              employerName: firstName ? `Domicile ${lastName}` : 'Intervention',
              duration: calcDuration(startTime, endTime),
            }
          })
          setShifts(mapped)
        }
      } catch (err) {
        logger.error('Erreur timeline shifts:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [employeeId])

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
      borderWidth="1.5px"
      borderColor="border.default"
      boxShadow="sm"
      overflow="hidden"
    >
      <Flex justify="space-between" align="center" px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <Box>
          <Text fontSize="15px" fontWeight="700" color="text.default">
            Mes interventions du jour
          </Text>
          <Text fontSize="xs" color="text.muted">
            {capitalizedToday}
          </Text>
        </Box>
        <AccessibleButton
          variant="outline"
          size="sm"
          asChild
          accessibleLabel="Voir le planning"
          color="text.secondary"
          borderColor="border.default"
          borderRadius="6px"
          px="16px"
          py="7px"
          _hover={{ borderColor: 'brand.500', color: 'brand.500', bg: 'brand.subtle' }}
        >
          <RouterLink to="/planning">Mon planning</RouterLink>
        </AccessibleButton>
      </Flex>

      <Box p={4}>
        {isLoading ? (
          <Stack gap={4}>
            {[1, 2].map((i) => (
              <Flex key={i} gap={3} align="flex-start">
                <Skeleton borderRadius="full" w="12px" h="12px" mt="4px" />
                <Box flex={1}>
                  <Skeleton height="14px" width="120px" mb={2} />
                  <Skeleton height="12px" width="200px" mb={1} />
                  <Skeleton height="12px" width="100px" />
                </Box>
              </Flex>
            ))}
          </Stack>
        ) : shifts.length === 0 ? (
          <Text color="text.muted" textAlign="center" py={4}>
            Aucune intervention aujourd'hui
          </Text>
        ) : (
          <Box role="list">
            {shifts.map((shift, idx) => {
              const dotStatus = getShiftDotStatus(shift)
              const dotColors = DOT_COLORS[dotStatus]
              const statusLabel = STATUS_LABELS[dotStatus]
              const isLast = idx === shifts.length - 1

              return (
                <Flex key={shift.id} role="listitem" pb={isLast ? 0 : '16px'} gap="12px">
                  {/* Track */}
                  <Flex direction="column" align="center" flexShrink={0} w="20px" pt="2px">
                    <Box
                      w="14px"
                      h="14px"
                      borderRadius="full"
                      bg={dotColors.bg}
                      borderWidth="2px"
                      borderColor={dotColors.border}
                      flexShrink={0}
                      opacity={dotColors.opacity ?? 1}
                      {...(dotStatus === 'active' && {
                        boxShadow: '0 0 0 3px var(--chakra-colors-accent-50)',
                      })}
                    />
                    {!isLast && (
                      <Box w="2px" flex={1} bg="border.default" mt="4px" />
                    )}
                  </Flex>

                  {/* Body */}
                  <Box flex={1} minW={0}>
                    <Text fontSize="sm" fontWeight="600" color="text.muted" mb="2px">
                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                    </Text>
                    <Text fontSize="15px" fontWeight="700" color="text.default" mb="2px">
                      {shift.employerName} — {SHIFT_TYPE_LABELS[shift.shiftType]}
                    </Text>
                    <Flex gap="8px" align="center" flexWrap="wrap">
                      <Text
                        as="span"
                        fontSize="11px"
                        fontWeight="600"
                        bg={dotStatus === 'active' ? 'brand.subtle' : 'bg.muted'}
                        color={dotStatus === 'active' ? 'brand.500' : undefined}
                        px="12px"
                        py="4px"
                        borderRadius="6px"
                      >
                        {shift.duration}
                      </Text>
                      <Flex
                        as="span"
                        align="center"
                        gap="5px"
                        fontSize="11px"
                        fontWeight="600"
                        bg={statusLabel.bg}
                        color={statusLabel.color}
                        px="10px"
                        py="3px"
                        borderRadius="full"
                      >
                        <Box w="6px" h="6px" borderRadius="full" bg={statusLabel.dotColor} />
                        {statusLabel.text}
                      </Flex>
                      {(() => {
                        const hint = getTimeHint(shift, dotStatus)
                        return hint ? (
                          <Text as="span" fontSize="11px" color="text.muted">
                            {hint}
                          </Text>
                        ) : null
                      })()}
                    </Flex>
                  </Box>
                </Flex>
              )
            })}
          </Box>
        )}
      </Box>
    </Box>
  )
}
