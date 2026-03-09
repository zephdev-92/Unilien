import { Box, Flex, Text, Badge, Avatar } from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import type { Profile } from '@/types'

interface ProfileHeroProps {
  profile: Profile
  isEditing: boolean
  onToggleEdit: () => void
  onAvatarClick?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  employer: 'Particulier employeur',
  employee: 'Auxiliaire de vie',
  caregiver: 'Aidant familial',
}

const ROLE_COLORS: Record<string, string> = {
  employer: 'blue',
  employee: 'purple',
  caregiver: 'orange',
}

function formatMemberSince(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}

export function ProfileHero({ profile, isEditing, onToggleEdit, onAvatarClick }: ProfileHeroProps) {
  const roleColor = ROLE_COLORS[profile.role] || 'blue'
  const roleLabel = ROLE_LABELS[profile.role] || profile.role

  return (
    <Box
      position="relative"
      borderRadius="xl"
      overflow="hidden"
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="sm"
    >
      {/* Background gradient */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="100px"
        bgGradient={`to-r`}
        bg={`linear-gradient(135deg, ${roleColor === 'blue' ? '#3182CE' : roleColor === 'purple' ? '#805AD5' : '#DD6B20'} 0%, ${roleColor === 'blue' ? '#63B3ED' : roleColor === 'purple' ? '#B794F4' : '#F6AD55'} 100%)`}
        aria-hidden="true"
      />

      {/* Content */}
      <Flex
        position="relative"
        direction={{ base: 'column', sm: 'row' }}
        align={{ base: 'center', sm: 'flex-end' }}
        gap={4}
        pt="60px"
        px={6}
        pb={6}
      >
        {/* Avatar */}
        <Box
          position="relative"
          flexShrink={0}
          cursor={onAvatarClick ? 'pointer' : undefined}
          onClick={onAvatarClick}
        >
          <Avatar.Root
            size="2xl"
            borderWidth="4px"
            borderColor="white"
            boxShadow="md"
          >
            <Avatar.Fallback name={`${profile.firstName} ${profile.lastName}`} />
            {profile.avatarUrl && <Avatar.Image src={profile.avatarUrl} />}
          </Avatar.Root>
          {onAvatarClick && (
            <Box
              position="absolute"
              bottom={0}
              right={0}
              bg="white"
              borderRadius="full"
              p={1}
              boxShadow="sm"
              borderWidth="1px"
              borderColor="gray.200"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </Box>
          )}
        </Box>

        {/* Info */}
        <Box flex={1} textAlign={{ base: 'center', sm: 'left' }}>
          <Text fontSize="2xl" fontWeight="bold" lineHeight={1.2}>
            {profile.firstName} {profile.lastName}
          </Text>
          <Flex
            mt={1}
            gap={2}
            align="center"
            justify={{ base: 'center', sm: 'flex-start' }}
            flexWrap="wrap"
          >
            <Text fontSize="sm" color="gray.600">{roleLabel}</Text>
            <Badge colorPalette={roleColor} size="sm">
              IDCC 3239
            </Badge>
          </Flex>

          {/* Tags */}
          <Flex
            mt={3}
            gap={2}
            flexWrap="wrap"
            justify={{ base: 'center', sm: 'flex-start' }}
          >
            {profile.email && (
              <Badge variant="outline" size="sm" colorPalette="green">
                Compte verifie
              </Badge>
            )}
            <Badge variant="outline" size="sm" colorPalette="gray">
              Membre depuis {formatMemberSince(profile.createdAt)}
            </Badge>
          </Flex>
        </Box>

        {/* Edit button */}
        <Box flexShrink={0} alignSelf={{ base: 'center', sm: 'flex-start' }} mt={{ base: 0, sm: 10 }}>
          <AccessibleButton
            size="sm"
            variant={isEditing ? 'solid' : 'outline'}
            colorPalette={isEditing ? 'green' : 'gray'}
            onClick={onToggleEdit}
          >
            {isEditing ? 'Mode lecture' : 'Modifier le profil'}
          </AccessibleButton>
        </Box>
      </Flex>
    </Box>
  )
}
