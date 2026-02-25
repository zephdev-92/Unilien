import { Box, Stack, Flex, Text, Badge, Spinner, Center } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { AccessibleButton } from '@/components/ui'
import type { Shift } from '@/types'
import { SHIFT_STATUS_COLORS as statusColors, SHIFT_STATUS_LABELS as statusLabels } from '@/lib/constants/statusMaps'

interface UpcomingShiftsWidgetProps {
  shifts: Shift[]
  loading?: boolean
  userRole: 'employer' | 'employee' | 'caregiver'
}

function formatDate(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui"
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Demain'
  }
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function UpcomingShiftsWidget({
  shifts,
  loading = false,
  userRole,
}: UpcomingShiftsWidgetProps) {
  const title = userRole === 'employer' ? 'Prochaines interventions' : 'Mon planning'

  if (loading) {
    return (
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
        boxShadow="sm"
      >
        <Center py={4}>
          <Spinner size="md" color="brand.500" mr={3} />
          <Text color="gray.500">Chargement du planning...</Text>
        </Center>
      </Box>
    )
  }

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
      boxShadow="sm"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="semibold" color="gray.900">
          {title}
        </Text>
        <AccessibleButton
          variant="ghost"
          size="sm"
          asChild
          accessibleLabel="Voir tout le planning"
        >
          <RouterLink to="/planning">Voir tout</RouterLink>
        </AccessibleButton>
      </Flex>

      {shifts.length === 0 ? (
        <Text color="gray.500" py={4} textAlign="center">
          Aucune intervention prévue
        </Text>
      ) : (
        <Stack gap={3} aria-live="polite">
          {shifts.slice(0, 3).map((shift) => (
            <Box
              key={shift.id}
              p={4}
              bg="gray.50"
              borderRadius="md"
              borderLeftWidth="4px"
              borderLeftColor="brand.500"
            >
              <Flex justify="space-between" align="start" mb={2}>
                <Box>
                  <Text fontWeight="medium" color="gray.900">
                    {formatDate(shift.date)}
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold" color="brand.600">
                    {shift.startTime} - {shift.endTime}
                  </Text>
                </Box>
                <Badge colorPalette={statusColors[shift.status]}>
                  {statusLabels[shift.status]}
                </Badge>
              </Flex>
              <Text fontSize="sm" color="gray.600">
                {shift.tasks.slice(0, 2).join(', ')}
                {shift.tasks.length > 2 && ` +${shift.tasks.length - 2}`}
              </Text>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}

export default UpcomingShiftsWidget
