import { Box, Grid, GridItem, Text, Stack } from '@chakra-ui/react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameDay,
  isToday,
  isSameMonth,
  isWithinInterval,
} from 'date-fns'
import type { Shift, UserRole, Absence } from '@/types'

interface MonthViewProps {
  currentDate: Date
  shifts: Shift[]
  absences?: Absence[]
  userRole: UserRole
  onShiftClick?: (shift: Shift) => void
  onAbsenceClick?: (absence: Absence) => void
}

const statusColors: Record<Shift['status'], string> = {
  planned: 'blue',
  completed: 'green',
  cancelled: 'gray',
  absent: 'red',
}

const absenceStatusColors: Record<Absence['status'], string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'gray',
}

const absenceTypeLabels: Record<Absence['absenceType'], string> = {
  sick: 'Maladie',
  vacation: 'Congé',
  training: 'Formation',
  unavailable: 'Indispo.',
  emergency: 'Urgence',
}

export function MonthView({
  currentDate,
  shifts,
  absences = [],
  onShiftClick,
  onAbsenceClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  // Générer tous les jours du calendrier (6 semaines max)
  const days: Date[] = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  // Détecte si une intervention déborde sur le jour suivant (passage minuit ou 24h)
  const shiftSpansNextDay = (shift: Shift): boolean => {
    const [startH, startM] = shift.startTime.split(':').map(Number)
    const [endH, endM] = shift.endTime.split(':').map(Number)
    return endH * 60 + endM <= startH * 60 + startM
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

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      overflow="hidden"
    >
      {/* En-têtes des jours de la semaine */}
      <Grid templateColumns="repeat(7, 1fr)" borderBottomWidth="1px" borderColor="gray.200">
        {weekDays.map((dayName) => (
          <GridItem
            key={dayName}
            p={3}
            textAlign="center"
            bg="gray.50"
            borderRightWidth="1px"
            borderColor="gray.200"
            _last={{ borderRightWidth: 0 }}
          >
            <Text
              fontSize="xs"
              fontWeight="medium"
              color="gray.500"
              textTransform="uppercase"
            >
              {dayName}
            </Text>
          </GridItem>
        ))}
      </Grid>

      {/* Grille du calendrier */}
      <Grid templateColumns="repeat(7, 1fr)">
        {days.map((dayDate) => {
          const dayShifts = getShiftsForDay(dayDate)
          const dayAbsences = getAbsencesForDay(dayDate)
          const isCurrentDay = isToday(dayDate)
          const isCurrentMonth = isSameMonth(dayDate, currentDate)
          const hasContent = dayShifts.length > 0 || dayAbsences.length > 0

          return (
            <GridItem
              key={dayDate.toISOString()}
              p={2}
              borderRightWidth="1px"
              borderBottomWidth="1px"
              borderColor="gray.200"
              bg={isCurrentDay ? 'brand.50' : isCurrentMonth ? 'white' : 'gray.50'}
              minH="100px"
              _last={{ borderRightWidth: 0 }}
              opacity={isCurrentMonth ? 1 : 0.5}
            >
              {/* Numéro du jour */}
              <Text
                fontSize="sm"
                fontWeight={isCurrentDay ? 'bold' : 'medium'}
                color={isCurrentDay ? 'brand.600' : isCurrentMonth ? 'gray.800' : 'gray.400'}
                mb={1}
              >
                {format(dayDate, 'd')}
              </Text>

              <Stack gap={1}>
                {/* Absences (max 2 affichées) */}
                {dayAbsences.slice(0, 2).map((absence) => (
                  <MonthAbsenceCard
                    key={absence.id}
                    absence={absence}
                    onClick={() => onAbsenceClick?.(absence)}
                  />
                ))}

                {/* Shifts (max 2 affichés) */}
                {dayShifts.slice(0, 2).map(({ shift, isContinuation }) => (
                  <MonthShiftCard
                    key={`${shift.id}${isContinuation ? '-cont' : ''}`}
                    shift={shift}
                    isContinuation={isContinuation}
                    onClick={() => onShiftClick?.(shift)}
                  />
                ))}

                {/* Indicateur de plus d'éléments */}
                {(dayShifts.length + dayAbsences.length) > 2 && (
                  <Text fontSize="2xs" color="gray.500" textAlign="center">
                    +{dayShifts.length + dayAbsences.length - 2} autres
                  </Text>
                )}

                {!hasContent && isCurrentMonth && (
                  <Text fontSize="2xs" color="gray.300" textAlign="center">
                    -
                  </Text>
                )}
              </Stack>
            </GridItem>
          )
        })}
      </Grid>
    </Box>
  )
}

interface MonthShiftCardProps {
  shift: Shift
  isContinuation?: boolean
  onClick?: () => void
}

function MonthShiftCard({ shift, isContinuation, onClick }: MonthShiftCardProps) {
  return (
    <Box
      px={1}
      py={0.5}
      bg={`${statusColors[shift.status]}.100`}
      borderRadius="sm"
      borderLeftWidth="2px"
      borderLeftColor={`${statusColors[shift.status]}.500`}
      borderLeftStyle={isContinuation ? 'dashed' : 'solid'}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{ bg: `${statusColors[shift.status]}.200` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <Text fontSize="2xs" fontWeight="medium" color={`${statusColors[shift.status]}.700`} lineClamp={1}>
        {isContinuation ? `...${shift.endTime}` : `${shift.startTime}-${shift.endTime}`}
      </Text>
    </Box>
  )
}

interface MonthAbsenceCardProps {
  absence: Absence
  onClick?: () => void
}

function MonthAbsenceCard({ absence, onClick }: MonthAbsenceCardProps) {
  return (
    <Box
      px={1}
      py={0.5}
      bg={`${absenceStatusColors[absence.status]}.100`}
      borderRadius="sm"
      borderLeftWidth="2px"
      borderLeftColor={`${absenceStatusColors[absence.status]}.500`}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{ bg: `${absenceStatusColors[absence.status]}.200` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <Text fontSize="2xs" fontWeight="medium" color={`${absenceStatusColors[absence.status]}.700`} lineClamp={1}>
        {absenceTypeLabels[absence.absenceType]}
      </Text>
    </Box>
  )
}

export default MonthView
