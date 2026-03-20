/**
 * Widget "Planning du jour" — dashboard aidant
 * Affiche les interventions des auxiliaires chez l'employeur associé à l'aidant.
 */

import { useState, useEffect } from 'react'
import { Box, Flex, Text, Skeleton, Stack } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { AccessibleButton } from '@/components/ui'
import { getCaregiverEmployerId } from '@/services/caregiverService'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface TimelineShift {
  id: string
  startTime: string
  endTime: string
  employeeName: string
  shiftType: string
  status: string
  duration: string
}

type DotStatus = 'done' | 'active' | 'upcoming'

interface CaregiverShiftTimelineProps {
  profileId: string
  employerName?: string
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

function getDotStatus(shift: TimelineShift): DotStatus {
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

function getTimeHint(shift: TimelineShift, dot: DotStatus): string | null {
  if (dot !== 'upcoming') return null
  const now = new Date()
  const today = now.toISOString().split('T')[0]
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

const SHIFT_TYPE_MAP: Record<string, string> = {
  regular: 'Intervention',
  night: 'Nuit',
  guard_24h: 'Garde 24h',
  presence_day: 'Journée de présence',
  presence_night: 'Nuit de présence',
}

const DOT_COLORS: Record<DotStatus, { bg: string; border: string; opacity?: number }> = {
  done: { bg: 'text.muted', border: 'text.muted', opacity: 0.5 },
  active: { bg: 'warm.500', border: 'warm.500' },
  upcoming: { bg: 'white', border: 'text.muted' },
}

const STATUS_LABELS: Record<DotStatus, { text: string; bg: string; color: string; dotColor: string }> = {
  done: { text: 'Terminé', bg: '#F0F4F8', color: 'text.muted', dotColor: 'text.muted' },
  active: { text: 'En cours', bg: 'warm.50', color: 'warm.500', dotColor: 'warm.500' },
  upcoming: { text: 'À venir', bg: 'warm.50', color: 'warm.500', dotColor: 'warm.500' },
}

export function CaregiverShiftTimeline({ profileId, employerName }: CaregiverShiftTimelineProps) {
  const [shifts, setShifts] = useState<TimelineShift[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profileId) return
    let cancelled = false

    async function load() {
      try {
        const employerId = await getCaregiverEmployerId(profileId)
        if (!employerId || cancelled) return

        const today = new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
          .from('shifts')
          .select(`
            id, start_time, end_time, status, shift_type,
            contract:contracts!inner(
              employer_id,
              employee_id,
              employee:profiles!employee_id(first_name, last_name)
            )
          `)
          .eq('date', today)
          .eq('contract.employer_id', employerId)
          .order('start_time', { ascending: true })

        if (error) {
          logger.error('CaregiverShiftTimeline — erreur:', error)
          return
        }

        if (!cancelled && data) {
          const mapped: TimelineShift[] = data.map((row: Record<string, unknown>) => {
            const startTime = row.start_time as string
            const endTime = row.end_time as string
            const contract = row.contract as Record<string, unknown> | null
            const employee = contract?.employee as Record<string, unknown> | null
            const firstName = (employee?.first_name as string) ?? ''
            const lastName = (employee?.last_name as string) ?? ''
            return {
              id: row.id as string,
              startTime,
              endTime,
              employeeName: firstName ? `${firstName} ${lastName}` : 'Auxiliaire',
              shiftType: row.shift_type as string,
              status: row.status as string,
              duration: calcDuration(startTime, endTime),
            }
          })
          setShifts(mapped)
        }
      } catch (err) {
        logger.error('CaregiverShiftTimeline — erreur:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [profileId])

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const capitalizedToday = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)

  return (
    <Box bg="bg.surface" borderRadius="12px" borderWidth="1.5px" borderColor="border.default" boxShadow="sm" overflow="hidden">
      <Flex justify="space-between" align="center" px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <Box>
          <Text fontSize="15px" fontWeight="700" color="text.default">
            Planning du jour
          </Text>
          <Text fontSize="xs" color="text.muted">
            {capitalizedToday}{employerName ? ` · ${employerName}` : ''}
          </Text>
        </Box>
        <AccessibleButton
          variant="outline"
          size="sm"
          asChild
          accessibleLabel="Voir le planning complet"
          color="text.secondary"
          borderColor="border.default"
          borderRadius="6px"
          px="16px"
          py="7px"
          _hover={{ borderColor: 'warm.500', color: 'warm.500', bg: 'warm.50' }}
        >
          <RouterLink to="/planning">Voir le planning</RouterLink>
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
            Aucune intervention prévue aujourd'hui
          </Text>
        ) : (
          <Box role="list">
            {shifts.map((shift, idx) => {
              const dot = getDotStatus(shift)
              const dotColors = DOT_COLORS[dot]
              const statusLabel = STATUS_LABELS[dot]
              const isLast = idx === shifts.length - 1

              return (
                <Flex key={shift.id} role="listitem" pb={isLast ? 0 : '16px'} gap="12px">
                  {/* Track */}
                  <Flex direction="column" align="center" flexShrink={0} w="20px" pt="2px">
                    <Box
                      w="14px" h="14px" borderRadius="full"
                      bg={dotColors.bg} borderWidth="2px" borderColor={dotColors.border}
                      flexShrink={0} opacity={dotColors.opacity ?? 1}
                      {...(dot === 'active' && { boxShadow: '0 0 0 3px var(--chakra-colors-warm-50)' })}
                    />
                    {!isLast && <Box w="2px" flex={1} bg="border.default" mt="4px" />}
                  </Flex>

                  {/* Body */}
                  <Box flex={1} minW={0}>
                    <Text fontSize="sm" fontWeight="600" color="text.muted" mb="2px">
                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                    </Text>
                    <Text fontSize="15px" fontWeight="700" color="text.default" mb="2px">
                      {shift.employeeName} — {SHIFT_TYPE_MAP[shift.shiftType] ?? 'Intervention'}
                    </Text>
                    <Flex gap="8px" align="center" flexWrap="wrap">
                      <Text
                        as="span" fontSize="11px" fontWeight="600"
                        bg={dot === 'active' ? 'warm.50' : '#F0F4F8'}
                        color={dot === 'active' ? 'warm.500' : undefined}
                        px="12px" py="4px" borderRadius="6px"
                      >
                        {shift.duration}
                      </Text>
                      <Flex
                        as="span" align="center" gap="5px" fontSize="11px" fontWeight="600"
                        bg={statusLabel.bg} color={statusLabel.color}
                        px="10px" py="3px" borderRadius="full"
                      >
                        <Box w="6px" h="6px" borderRadius="full" bg={statusLabel.dotColor} />
                        {statusLabel.text}
                      </Flex>
                      {(() => {
                        const hint = getTimeHint(shift, dot)
                        return hint ? <Text as="span" fontSize="11px" color="text.muted">{hint}</Text> : null
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
