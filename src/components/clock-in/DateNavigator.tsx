import { useMemo } from 'react'
import { Flex, Box, Text } from '@chakra-ui/react'
import { format, subDays, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Shift } from '@/types'

interface DateNavigatorProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  shifts: Shift[]
}

const DAY_COUNT = 8 // J-7 to today

export function DateNavigator({ selectedDate, onDateChange, shifts }: DateNavigatorProps) {
  const today = useMemo(() => new Date(), [])

  const days = useMemo(() => {
    return Array.from({ length: DAY_COUNT }, (_, i) => {
      const date = subDays(today, DAY_COUNT - 1 - i)
      return {
        date,
        abbr: format(date, 'EEE', { locale: fr }).slice(0, 3),
        dayNum: format(date, 'd'),
        isToday: isSameDay(date, today),
      }
    })
  }, [today])

  // Compute which past days have unvalidated planned shifts
  const daysWithPending = useMemo(() => {
    const pending = new Set<string>()
    for (const shift of shifts) {
      if (shift.status === 'planned') {
        const dateStr = format(new Date(shift.date), 'yyyy-MM-dd')
        const shiftDate = new Date(shift.date)
        if (shiftDate < today && !isSameDay(shiftDate, today)) {
          pending.add(dateStr)
        }
      }
    }
    return pending
  }, [shifts, today])

  return (
    <Box
      bg="bg.surface"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="0 2px 8px rgba(78,100,120,.09)"
      p={3}
    >
      <Text fontSize="xs" fontWeight="600" color="text.muted" mb={2} textTransform="uppercase" letterSpacing="0.05em">
        Sélectionner un jour
      </Text>
      <Flex gap={1} justify="space-between" role="group" aria-label="Navigation par date">
        {days.map(({ date, abbr, dayNum, isToday }) => {
          const isSelected = isSameDay(date, selectedDate)
          const dateStr = format(date, 'yyyy-MM-dd')
          const hasPending = daysWithPending.has(dateStr)

          return (
            <Box
              key={dateStr}
              as="button"
              type="button"
              onClick={() => onDateChange(date)}
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap="2px"
              px={3}
              py={2}
              borderRadius="full"
              minW="44px"
              cursor="pointer"
              position="relative"
              transition="all 0.15s"
              bg={isSelected ? '#3D5166' : 'transparent'}
              color={isSelected ? 'white' : 'text.default'}
              _hover={isSelected ? {} : { bg: '#EDF1F5' }}
              aria-label={`${format(date, 'EEEE d MMMM', { locale: fr })}${isToday ? " (aujourd'hui)" : ''}${hasPending ? ' — heures à valider' : ''}`}
              aria-pressed={isSelected}
            >
              <Text fontSize="xs" fontWeight="500" opacity={isSelected ? 1 : 0.7}>
                {abbr}
              </Text>
              <Text fontSize="sm" fontWeight="700">
                {dayNum}
              </Text>
              {hasPending && !isSelected && (
                <Box
                  position="absolute"
                  bottom="4px"
                  w="5px"
                  h="5px"
                  borderRadius="full"
                  bg="#F59E0B"
                  aria-hidden="true"
                />
              )}
              {isToday && (
                <Box
                  position="absolute"
                  top="2px"
                  right="2px"
                  w="6px"
                  h="6px"
                  borderRadius="full"
                  bg={isSelected ? 'white' : '#3D5166'}
                  aria-hidden="true"
                />
              )}
            </Box>
          )
        })}
      </Flex>
    </Box>
  )
}
