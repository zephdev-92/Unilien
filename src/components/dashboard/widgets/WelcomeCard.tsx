import { Box, Flex, Text, Avatar, Badge, Skeleton } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { AccessibleButton } from '@/components/ui'
import type { Profile, Shift, UserRole } from '@/types'

interface WelcomeCardProps {
  profile: Profile
  nextShift?: Shift | null
  complianceAlertCount?: number
  loading?: boolean
}

const roleLabels: Record<UserRole, string> = {
  employer: 'Employeur',
  employee: 'Auxiliaire de vie',
  caregiver: 'Aidant familial',
}

const roleDescriptions: Record<UserRole, string> = {
  employer: 'Gérez vos auxiliaires et suivez les interventions',
  employee: 'Consultez votre planning et le cahier de liaison',
  caregiver: 'Suivez les soins de votre proche',
}

function formatDateEyebrow(): string {
  const now = new Date()
  const day = now.toLocaleDateString('fr-FR', { weekday: 'long' })
  const date = now.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `${day.charAt(0).toUpperCase() + day.slice(1)} ${date}`
}

function formatNextShiftChip(shift: Shift): string {
  const now = new Date()
  const shiftDate = new Date(shift.date)
  const isToday = shiftDate.toDateString() === now.toDateString()

  if (isToday) {
    return `Prochaine intervention à ${shift.startTime}`
  }

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (shiftDate.toDateString() === tomorrow.toDateString()) {
    return `Demain à ${shift.startTime}`
  }

  const dayName = shiftDate.toLocaleDateString('fr-FR', { weekday: 'long' })
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} à ${shift.startTime}`
}

export function WelcomeCard({
  profile,
  nextShift,
  complianceAlertCount,
  loading = false,
}: WelcomeCardProps) {
  const currentHour = new Date().getHours()
  let greeting = 'Bonjour'
  if (currentHour < 5) greeting = 'Bonne nuit'
  else if (currentHour < 12) greeting = 'Bonjour'
  else if (currentHour < 18) greeting = 'Bon après-midi'
  else greeting = 'Bonsoir'

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
        <Skeleton height="14px" width="180px" mb={3} />
        <Flex align="center" gap={4}>
          <Skeleton borderRadius="full" height="48px" width="48px" />
          <Box flex="1">
            <Skeleton height="28px" width="250px" mb={2} />
            <Skeleton height="16px" width="300px" mb={3} />
            <Flex gap={2}>
              <Skeleton height="24px" width="180px" borderRadius="full" />
              <Skeleton height="24px" width="100px" borderRadius="full" />
            </Flex>
          </Box>
        </Flex>
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
      <Text fontSize="sm" color="gray.500" mb={3}>
        {formatDateEyebrow()}
      </Text>

      <Flex align="center" gap={4} mb={nextShift || complianceAlertCount ? 4 : 0}>
        <Avatar.Root size="lg">
          <Avatar.Fallback name={`${profile.firstName} ${profile.lastName}`} />
          {profile.avatarUrl && <Avatar.Image src={profile.avatarUrl} />}
        </Avatar.Root>
        <Box>
          <Text fontSize="2xl" fontWeight="bold" color="gray.900">
            {greeting}, {profile.firstName} !
          </Text>
          <Text fontSize="md" color="gray.600">
            {roleLabels[profile.role]} - {roleDescriptions[profile.role]}
          </Text>
        </Box>
      </Flex>

      {(nextShift || (complianceAlertCount !== undefined && complianceAlertCount > 0)) && (
        <Flex gap={2} flexWrap="wrap" align="center" mt={1}>
          {nextShift && (
            <Badge
              colorPalette="blue"
              variant="subtle"
              px={3}
              py={1}
              borderRadius="full"
              fontSize="xs"
            >
              {formatNextShiftChip(nextShift)}
            </Badge>
          )}
          {complianceAlertCount !== undefined && complianceAlertCount > 0 && (
            <Badge
              colorPalette="orange"
              variant="subtle"
              px={3}
              py={1}
              borderRadius="full"
              fontSize="xs"
            >
              {complianceAlertCount} alerte{complianceAlertCount > 1 ? 's' : ''} conformité
            </Badge>
          )}
          <Box flex="1" />
          <AccessibleButton
            variant="ghost"
            size="sm"
            colorPalette="brand"
            asChild
            accessibleLabel="Voir le planning du jour"
          >
            <RouterLink to="/planning">Voir le planning</RouterLink>
          </AccessibleButton>
        </Flex>
      )}
    </Box>
  )
}

export default WelcomeCard
