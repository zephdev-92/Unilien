import { useMemo, useRef, useState, useEffect } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { addDays, format, isSameDay, isToday, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Shift, UserRole, Absence } from '@/types'
import {
  ABSENCE_TYPE_LABELS as absenceTypeLabels,
} from '@/lib/constants/statusMaps'

// ── Config ──

const DEFAULT_START_HOUR = 7
const DEFAULT_END_HOUR = 20

// ── Types ──

interface WeekViewProps {
  weekStart: Date
  shifts: Shift[]
  absences?: Absence[]
  userRole: UserRole
  onShiftClick?: (shift: Shift) => void
  onAbsenceClick?: (absence: Absence) => void
}

// ── Helpers ──

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatTimeShort(time: string): string {
  const [h, m] = time.split(':')
  return `${parseInt(h)}h${m !== '00' ? m : '00'}`
}

/** Proto shift type → background & border colors */
const SHIFT_BG: Record<string, { bg: string; border: string }> = {
  effective: { bg: 'brand.50', border: 'brand.500' },
  presence_day: { bg: 'accent.50', border: 'accent.500' },
  presence_night: { bg: 'accent.50', border: 'accent.500' },
  guard_24h: { bg: 'warm.50', border: 'warm.500' },
}

const ABSENCE_BG = { bg: 'danger.50', border: 'danger.500' }

const SHIFT_TYPE_SHORT: Record<string, string> = {
  effective: 'Travail effectif',
  presence_day: 'Prés. jour',
  presence_night: 'Prés. nuit',
  guard_24h: 'Garde 24h',
}

// ── Composant principal ──

export function WeekView({ weekStart, shifts, absences = [], userRole, onShiftClick, onAbsenceClick }: WeekViewProps) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  // Détecte si une intervention déborde sur le jour suivant (passage minuit)
  const shiftSpansNextDay = (shift: Shift): boolean => {
    return timeToMinutes(shift.endTime) <= timeToMinutes(shift.startTime)
  }

  const getShiftsForDay = (date: Date): Array<{ shift: Shift; isContinuation: boolean }> => {
    const entries: Array<{ shift: Shift; isContinuation: boolean }> = []
    for (const shift of shifts) {
      const shiftDate = new Date(shift.date)
      if (isSameDay(shiftDate, date)) {
        entries.push({ shift, isContinuation: false })
      } else if (isSameDay(shiftDate, addDays(date, -1)) && shiftSpansNextDay(shift)) {
        entries.push({ shift, isContinuation: true })
      }
    }
    return entries
  }

  const getAbsencesForDay = (date: Date) => {
    return absences.filter((absence) => {
      const start = new Date(absence.startDate)
      const end = new Date(absence.endDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      const checkDate = new Date(date)
      checkDate.setHours(12, 0, 0, 0)
      return isWithinInterval(checkDate, { start, end })
    })
  }

  // Calcule la plage horaire visible selon les shifts de la semaine
  const { startHour, endHour } = useMemo(() => {
    let minH = DEFAULT_START_HOUR
    let maxH = DEFAULT_END_HOUR

    for (const shift of shifts) {
      const sH = Math.floor(timeToMinutes(shift.startTime) / 60)
      const eH = Math.ceil(timeToMinutes(shift.endTime) / 60)
      const spans = shiftSpansNextDay(shift)

      if (!spans) {
        if (sH < minH) minH = sH
        if (eH > maxH) maxH = eH
      } else {
        // Shift de nuit : la continuation J+1 va de 0h à endTime
        minH = 0
        maxH = 24
      }
    }

    return { startHour: minH, endHour: Math.min(maxH, 24) }
  }, [shifts])

  const totalHours = endHour - startHour

  // Mesure la hauteur du body pour calculer pxPerHour
  const bodyRef = useRef<HTMLDivElement>(null)
  const [bodyH, setBodyH] = useState(0)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const update = () => setBodyH(el.clientHeight)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pxPerHour = bodyH > 0 ? bodyH / totalHours : 30

  const getBlockStyle = (startTime: string, endTime: string, isContinuation: boolean) => {
    const startMin = timeToMinutes(startTime)
    const endMin = timeToMinutes(endTime)
    const spans = endMin <= startMin

    let topMin: number
    let durationMin: number

    if (isContinuation) {
      topMin = 0
      durationMin = endMin
    } else if (spans) {
      topMin = startMin
      durationMin = 24 * 60 - startMin
    } else {
      topMin = startMin
      durationMin = endMin - startMin
    }

    const top = ((topMin / 60) - startHour) * pxPerHour + 2
    const height = (durationMin / 60) * pxPerHour - 4

    return { top: Math.max(top, 0), height: Math.max(height, 24) }
  }

  // Lignes horaires de fond
  const hourLines = Array.from({ length: totalHours }, (_, i) => i)

  const isEmployer = userRole === 'employer' || userRole === 'caregiver'

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      overflow="hidden"
      boxShadow="sm"
      h="100%"
      display="flex"
      flexDirection="column"
    >
      {/* ── En-têtes des jours ── */}
      <Flex
        borderBottomWidth="2px"
        borderColor="border.default"
        bg="bg.surface"
        zIndex={10}
        flexShrink={0}
      >
        {days.map((day) => {
          const isCurrentDay = isToday(day)
          return (
            <Flex
              key={day.toISOString()}
              flex={1}
              direction="column"
              align="center"
              py={3}
              px={2}
              borderRightWidth="1px"
              borderColor="border.default"
              minW="80px"
              _last={{ borderRightWidth: 0 }}
            >
              <Text
                fontSize="12px"
                fontWeight="700"
                color="text.muted"
                textTransform="uppercase"
                letterSpacing="0.06em"
              >
                {format(day, 'EEE', { locale: fr })}
              </Text>
              <Flex
                align="center"
                justify="center"
                w="36px"
                h="36px"
                borderRadius="full"
                mt="2px"
                fontFamily="heading"
                fontSize="18px"
                fontWeight="800"
                bg={isCurrentDay ? 'brand.500' : 'transparent'}
                color={isCurrentDay ? 'white' : 'text.default'}
              >
                {format(day, 'd')}
              </Flex>
            </Flex>
          )
        })}
      </Flex>

      {/* ── Corps : colonnes de jours avec grille temporelle ── */}
      <Flex ref={bodyRef} position="relative" flex={1} minH={0}>
        {days.map((day) => {
          const dayShifts = getShiftsForDay(day)
          const dayAbsences = getAbsencesForDay(day)
          const isCurrentDay = isToday(day)

          return (
            <Box
              key={day.toISOString()}
              flex={1}
              position="relative"
              borderRightWidth="1px"
              borderColor="border.default"
              minW="80px"
              h="100%"
              bg={isCurrentDay ? 'rgba(78,100,120,0.02)' : 'transparent'}
              _last={{ borderRightWidth: 0 }}
            >
              {/* Lignes horaires de fond */}
              {hourLines.map((i) => (
                <Box
                  key={i}
                  position="absolute"
                  top={`${i * pxPerHour}px`}
                  left={0}
                  right={0}
                  h={`${pxPerHour}px`}
                  borderBottomWidth="1px"
                  borderColor="border.default"
                  opacity={0.5}
                />
              ))}

              {/* Absences (pleine journée → bandeau en haut) */}
              {dayAbsences.map((absence, idx) => (
                <Box
                  key={absence.id}
                  position="absolute"
                  left="4px"
                  right="4px"
                  top={`${idx * 44}px`}
                  bg={ABSENCE_BG.bg}
                  borderRadius="6px"
                  borderLeftWidth="3px"
                  borderLeftColor={ABSENCE_BG.border}
                  px={2}
                  py="2px"
                  cursor="pointer"
                  overflow="hidden"
                  transition="opacity 0.15s, box-shadow 0.15s"
                  _hover={{ opacity: 0.85, boxShadow: 'sm' }}
                  minH="28px"
                  zIndex={2}
                  onClick={() => onAbsenceClick?.(absence)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbsenceClick?.(absence) }
                  }}
                >
                  <Text fontSize="11px" fontWeight="700" color="text.default" lineClamp={1}>
                    {absence.employeeName ?? absenceTypeLabels[absence.absenceType]} — Congé
                  </Text>
                  {absence.reason && (
                    <Text fontSize="11px" color="text.muted" lineClamp={1}>
                      {absence.reason}
                    </Text>
                  )}
                </Box>
              ))}

              {/* Shift blocks positionnés en absolu */}
              {dayShifts.map(({ shift, isContinuation }) => {
                const style = getBlockStyle(shift.startTime, shift.endTime, isContinuation)
                const colors = SHIFT_BG[shift.shiftType] ?? SHIFT_BG.effective

                return (
                  <Box
                    key={`${shift.id}${isContinuation ? '-cont' : ''}`}
                    position="absolute"
                    left="4px"
                    right="4px"
                    top={`${style.top}px`}
                    h={`${style.height}px`}
                    bg={colors.bg}
                    borderRadius="6px"
                    borderLeftWidth="3px"
                    borderLeftColor={colors.border}
                    borderLeftStyle={isContinuation ? 'dashed' : 'solid'}
                    px={2}
                    py="2px"
                    cursor="pointer"
                    overflow="hidden"
                    transition="opacity 0.15s, box-shadow 0.15s"
                    _hover={{ opacity: 0.85, boxShadow: 'sm' }}
                    minH="28px"
                    zIndex={2}
                    onClick={() => onShiftClick?.(shift)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onShiftClick?.(shift) }
                    }}
                  >
                    {isEmployer && shift.employeeName && !isContinuation && (
                      <Text fontSize="11px" fontWeight="700" color="text.default" lineClamp={1}>
                        {shift.employeeName}
                      </Text>
                    )}
                    {!isContinuation && (
                      <Text fontSize="10px" fontWeight="600" color="text.muted" lineClamp={1}>
                        {SHIFT_TYPE_SHORT[shift.shiftType] ?? shift.shiftType}
                      </Text>
                    )}
                    <Text fontSize="11px" opacity={0.75} lineClamp={1}>
                      {isContinuation
                        ? `...${formatTimeShort(shift.endTime)}`
                        : `${formatTimeShort(shift.startTime)} – ${formatTimeShort(shift.endTime)}`}
                    </Text>
                  </Box>
                )
              })}

              {/* Empty state discret */}
              {dayShifts.length === 0 && dayAbsences.length === 0 && (
                <Flex
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  zIndex={1}
                >
                  <Text fontSize="xs" color="text.muted" opacity={0.5}>
                    Aucune intervention
                  </Text>
                </Flex>
              )}
            </Box>
          )
        })}
      </Flex>
    </Box>
  )
}

export default WeekView
