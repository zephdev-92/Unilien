import { Box, Grid, GridItem, Text, Stack, Badge, Flex } from '@chakra-ui/react'
import { addDays, format, isSameDay, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Shift, UserRole } from '@/types'

interface WeekViewProps {
  weekStart: Date
  shifts: Shift[]
  userRole: UserRole
  onShiftClick?: (shift: Shift) => void
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

export function WeekView({ weekStart, shifts, userRole, onShiftClick }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getShiftsForDay = (date: Date) => {
    return shifts.filter((shift) => isSameDay(new Date(shift.date), date))
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
          const isCurrentDay = isToday(day)

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
                {dayShifts.length === 0 ? (
                  <Text
                    fontSize="xs"
                    color="gray.400"
                    textAlign="center"
                    py={4}
                  >
                    Aucune intervention
                  </Text>
                ) : (
                  dayShifts.map((shift) => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      userRole={userRole}
                      onClick={() => onShiftClick?.(shift)}
                    />
                  ))
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
  userRole: UserRole
  onClick?: () => void
}

function ShiftCard({ shift, onClick }: ShiftCardProps) {
  return (
    <Box
      p={2}
      bg="white"
      borderRadius="md"
      borderLeftWidth="3px"
      borderLeftColor={`${statusColors[shift.status]}.500`}
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
          {shift.startTime} - {shift.endTime}
        </Text>
        <Badge
          size="sm"
          colorPalette={statusColors[shift.status]}
          fontSize="2xs"
        >
          {statusLabels[shift.status]}
        </Badge>
      </Flex>

      {shift.tasks.length > 0 && (
        <Text fontSize="xs" color="gray.600" lineClamp={2}>
          {shift.tasks.slice(0, 2).join(', ')}
          {shift.tasks.length > 2 && ` +${shift.tasks.length - 2}`}
        </Text>
      )}
    </Box>
  )
}

export default WeekView
