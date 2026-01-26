import { Box, Flex, Text, Avatar } from '@chakra-ui/react'
import type { Profile, UserRole } from '@/types'

interface WelcomeCardProps {
  profile: Profile
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

export function WelcomeCard({ profile }: WelcomeCardProps) {
  const currentHour = new Date().getHours()
  let greeting = 'Bonjour'
  if (currentHour < 5) greeting = 'Bonne nuit'
  else if (currentHour < 12) greeting = 'Bonjour'
  else if (currentHour < 18) greeting = 'Bon après-midi'
  else greeting = 'Bonsoir'

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
      boxShadow="sm"
    >
      <Flex align="center" gap={4}>
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
    </Box>
  )
}

export default WelcomeCard
