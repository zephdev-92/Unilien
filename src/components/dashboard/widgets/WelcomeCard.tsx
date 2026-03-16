import { Box, Flex, Text, Skeleton } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import type { Profile, Shift } from '@/types'

interface WelcomeCardProps {
  profile: Profile
  nextShift?: Shift | null
  complianceAlertCount?: number
  todayEmployeeCount?: number
  todayShiftCount?: number
  /** Number of care sessions today (caregiver) */
  todayCareCount?: number
  loading?: boolean
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
    return `Prochaine intervention à ${shift.startTime.slice(0, 5)}`
  }

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (shiftDate.toDateString() === tomorrow.toDateString()) {
    return `Demain à ${shift.startTime.slice(0, 5)}`
  }

  const dayName = shiftDate.toLocaleDateString('fr-FR', { weekday: 'long' })
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} à ${shift.startTime.slice(0, 5)}`
}

/** Proto chip on gradient hero */
function GlassChip({ children, highlighted }: { children: React.ReactNode; highlighted?: boolean }) {
  return (
    <Flex
      as="span"
      display="inline-flex"
      alignItems="center"
      gap="5px"
      bg={highlighted ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.18)'}
      borderWidth="1px"
      borderColor={highlighted ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.3)'}
      borderRadius="20px"
      px={3}
      py="4px"
      fontSize="14px"
      fontWeight="600"
      color="white"
      css={{ backdropFilter: 'blur(4px)' }}
    >
      {children}
    </Flex>
  )
}

export function WelcomeCard({
  profile,
  nextShift,
  complianceAlertCount,
  todayEmployeeCount,
  todayShiftCount,
  todayCareCount,
  loading = false,
}: WelcomeCardProps) {
  const currentHour = new Date().getHours()
  let greeting = 'Bonjour'
  if (currentHour < 5) greeting = 'Bonne nuit'
  else if (currentHour < 12) greeting = 'Bonjour'
  else if (currentHour < 18) greeting = 'Bon après-midi'
  else greeting = 'Bonsoir'

  const isCaregiver = profile.role === 'caregiver'
  const gradient = isCaregiver
    ? 'linear-gradient(135deg, #5E5038, #8A7A60)'
    : 'linear-gradient(135deg, #3D5166, #5A6190)'

  if (loading) {
    return (
      <Box
        borderRadius="16px"
        p={{ base: 5, md: 6 }}
        bg={gradient}
      >
        <Skeleton height="14px" width="180px" mb={2} />
        <Skeleton height="28px" width="260px" mb={3} />
        <Flex gap={2}>
          <Skeleton height="28px" width="200px" borderRadius="full" />
          <Skeleton height="28px" width="140px" borderRadius="full" />
        </Flex>
      </Box>
    )
  }

  // Build chips
  const chips: React.ReactNode[] = []

  if (profile.role === 'employer' && todayEmployeeCount !== undefined && todayEmployeeCount > 0) {
    chips.push(
      <GlassChip key="employees" highlighted>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
        {todayEmployeeCount} employé{todayEmployeeCount > 1 ? 's' : ''} en intervention aujourd&apos;hui
      </GlassChip>
    )
  }

  if (profile.role !== 'caregiver' && nextShift && !(profile.role === 'employer' && todayEmployeeCount)) {
    chips.push(
      <GlassChip key="shift" highlighted>
        {formatNextShiftChip(nextShift)}
      </GlassChip>
    )
  }

  if (profile.role === 'employee' && todayShiftCount !== undefined && todayShiftCount > 0) {
    chips.push(
      <GlassChip key="today-shifts">
        {todayShiftCount} intervention{todayShiftCount > 1 ? 's' : ''} aujourd&apos;hui
      </GlassChip>
    )
  }

  if (profile.role === 'caregiver' && todayCareCount !== undefined && todayCareCount > 0) {
    chips.push(
      <GlassChip key="care-count">
        {todayCareCount} intervention{todayCareCount > 1 ? 's' : ''} prévue{todayCareCount > 1 ? 's' : ''} aujourd&apos;hui
      </GlassChip>
    )
  }

  if (complianceAlertCount !== undefined && complianceAlertCount > 0) {
    chips.push(
      <GlassChip key="compliance">
        {complianceAlertCount} anomalie{complianceAlertCount > 1 ? 's' : ''} détectée{complianceAlertCount > 1 ? 's' : ''}
      </GlassChip>
    )
  }

  return (
    <Flex
      align="center"
      justify="space-between"
      gap={4}
      bg={gradient}
      borderRadius="16px"
      px={{ base: 5, md: 6 }}
      py={5}
      color="white"
      flexWrap={{ base: 'wrap', md: 'nowrap' }}
    >
      {/* Left */}
      <Box flex="1" minW={0}>
        <Text fontSize="14px" opacity={0.8} mb={1}>
          {formatDateEyebrow()}
        </Text>
        <Text fontSize="22px" fontWeight="800" lineHeight="1.2" mb={chips.length > 0 ? 3 : 0}>
          {greeting}, {profile.firstName} 👋
        </Text>
        {chips.length > 0 && (
          <Flex gap={2} flexWrap="wrap" alignItems="center">
            {chips}
          </Flex>
        )}
      </Box>

      {/* Right — CTA button */}
      <Box flexShrink={0}>
        <Box
          as={RouterLink}
          to={profile.role === 'employee' ? '/suivi-des-heures' : isCaregiver ? '/planning' : '/planning'}
          display="inline-flex"
          alignItems="center"
          px={4}
          py={2}
          borderRadius="10px"
          fontSize="14px"
          fontWeight="700"
          color="white"
          bg="rgba(255,255,255,.25)"
          borderWidth="1px"
          borderColor="rgba(255,255,255,.4)"
          textDecoration="none"
          transition="background 0.15s"
          _hover={{ bg: 'rgba(255,255,255,.35)' }}
          _focusVisible={{
            outline: '2px solid white',
            outlineOffset: '2px',
          }}
        >
          {profile.role === 'employee' ? 'Enregistrer mes heures →' : isCaregiver ? 'Mon planning →' : 'Voir le planning du jour →'}
        </Box>
      </Box>
    </Flex>
  )
}

export default WelcomeCard
