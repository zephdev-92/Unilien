import { Box, Grid, GridItem, Text, Stack, Badge, Flex } from '@chakra-ui/react'
import { addDays, format, isSameDay, isToday, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Shift, UserRole, Absence } from '@/types'

interface WeekViewProps {
  weekStart: Date
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

const statusLabels: Record<Shift['status'], string> = {
  planned: 'Planifié',
  completed: 'Terminé',
  cancelled: 'Annulé',
  absent: 'Absent',
}

const absenceStatusColors: Record<Absence['status'], string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'gray',
}

const absenceStatusLabels: Record<Absence['status'], string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
}

const absenceTypeLabels: Record<Absence['absenceType'], string> = {
  sick: 'Maladie',
  vacation: 'Congé',
  training: 'Formation',
  unavailable: 'Indispo.',
  emergency: 'Urgence',
}

export function WeekView({ weekStart, shifts, absences = [], userRole, onShiftClick, onAbsenceClick }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

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
      // Normaliser les dates pour comparer uniquement les jours
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      const checkDate = new Date(date)
      checkDate.setHours(12, 0, 0, 0)
      return isWithinInterval(checkDate, { start, end })
    })
  }

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      overflow="hidden"
    >
      {/* En-têtes des jours */}
      <Grid templateColumns="repeat(7, 1fr)" borderBottomWidth="1px" borderColor="gray.200">
        {days.map((day) => {
          const isCurrentDay = isToday(day)
          return (
            <GridItem
              key={day.toISOString()}
              p={3}
              textAlign="center"
              bg={isCurrentDay ? 'brand.50' : 'gray.50'}
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
                {format(day, 'EEE', { locale: fr })}
              </Text>
              <Text
                fontSize="xl"
                fontWeight={isCurrentDay ? 'bold' : 'semibold'}
                color={isCurrentDay ? 'brand.600' : 'gray.800'}
              >
                {format(day, 'd')}
              </Text>
            </GridItem>
          )
        })}
      </Grid>

      {/* Contenu des jours */}
      <Grid templateColumns="repeat(7, 1fr)" minH="400px">
        {days.map((day) => {
          const dayShifts = getShiftsForDay(day)
          const dayAbsences = getAbsencesForDay(day)
          const isCurrentDay = isToday(day)
          const hasContent = dayShifts.length > 0 || dayAbsences.length > 0

          return (
            <GridItem
              key={day.toISOString()}
              p={2}
              borderRightWidth="1px"
              borderColor="gray.200"
              bg={isCurrentDay ? 'brand.50' : 'white'}
              _last={{ borderRightWidth: 0 }}
            >
              <Stack gap={2}>
                {/* Absences en premier */}
                {dayAbsences.map((absence) => (
                  <AbsenceCard
                    key={absence.id}
                    absence={absence}
                    onClick={() => onAbsenceClick?.(absence)}
                  />
                ))}

                {/* Shifts */}
                {dayShifts.map(({ shift, isContinuation }) => (
                  <ShiftCard
                    key={`${shift.id}${isContinuation ? '-cont' : ''}`}
                    shift={shift}
                    isContinuation={isContinuation}
                    userRole={userRole}
                    onClick={() => onShiftClick?.(shift)}
                  />
                ))}

                {!hasContent && (
                  <Text
                    fontSize="xs"
                    color="gray.400"
                    textAlign="center"
                    py={4}
                  >
                    Aucune intervention
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

interface ShiftCardProps {
  shift: Shift
  isContinuation?: boolean
  userRole: UserRole
  onClick?: () => void
}

function ShiftCard({ shift, isContinuation, onClick }: ShiftCardProps) {
  return (
    <Box
      p={2}
      bg="white"
      borderRadius="md"
      borderLeftWidth="3px"
      borderLeftColor={`${statusColors[shift.status]}.500`}
      borderLeftStyle={isContinuation ? 'dashed' : 'solid'}
      boxShadow="sm"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        boxShadow: 'md',
        transform: 'translateY(-1px)',
      }}
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
      <Flex justify="space-between" align="start" mb={1}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.800">
          {isContinuation ? `...${shift.endTime}` : `${shift.startTime} - ${shift.endTime}`}
        </Text>
        <Badge
          size="sm"
          colorPalette={isContinuation ? 'purple' : statusColors[shift.status]}
          fontSize="2xs"
        >
          {isContinuation ? 'Suite' : statusLabels[shift.status]}
        </Badge>
      </Flex>

      {!isContinuation && shift.tasks.length > 0 && (
        <Text fontSize="xs" color="gray.600" lineClamp={2}>
          {shift.tasks.slice(0, 2).join(', ')}
          {shift.tasks.length > 2 && ` +${shift.tasks.length - 2}`}
        </Text>
      )}
    </Box>
  )
}

interface AbsenceCardProps {
  absence: Absence
  onClick?: () => void
}

function AbsenceCard({ absence, onClick }: AbsenceCardProps) {
  return (
    <Box
      p={2}
      bg={`${absenceStatusColors[absence.status]}.50`}
      borderRadius="md"
      borderLeftWidth="3px"
      borderLeftColor={`${absenceStatusColors[absence.status]}.500`}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        bg: `${absenceStatusColors[absence.status]}.100`,
        transform: 'translateY(-1px)',
      }}
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
      <Flex justify="space-between" align="start" mb={1}>
        <Text fontSize="sm" fontWeight="semibold" color={`${absenceStatusColors[absence.status]}.700`}>
          {absenceTypeLabels[absence.absenceType]}
        </Text>
        <Badge
          size="sm"
          colorPalette={absenceStatusColors[absence.status]}
          fontSize="2xs"
        >
          {absenceStatusLabels[absence.status]}
        </Badge>
      </Flex>

      {absence.reason && (
        <Text fontSize="xs" color="gray.600" lineClamp={1}>
          {absence.reason}
        </Text>
      )}
    </Box>
  )
}

export default WeekView
