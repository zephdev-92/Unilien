import { Box, Flex, Text, Avatar } from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import type { Profile } from '@/types'

interface ProfileHeroProps {
  profile: Profile
  isEditing: boolean
  onToggleEdit: () => void
  onAvatarClick?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  employer: 'Particulier employeur · Convention IDCC 3239',
  employee: 'Auxiliaire de vie · Convention IDCC 3239',
  caregiver: 'Aidant familial',
}

function formatMemberSince(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}

export function ProfileHero({ profile, isEditing, onToggleEdit, onAvatarClick }: ProfileHeroProps) {
  const roleLabel = ROLE_LABELS[profile.role] || profile.role

  return (
    <Box
      position="relative"
      borderRadius="12px"
      overflow="hidden"
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="sm"
    >
      {/* Background band — proto: solid brand.500 at 8% opacity */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="80px"
        bg="brand.500"
        opacity={0.08}
        aria-hidden="true"
      />

      {/* Content */}
      <Flex
        position="relative"
        direction={{ base: 'column', sm: 'row' }}
        align={{ base: 'center', sm: 'flex-end' }}
        gap={5}
        pt={8}
        px={5}
        pb={4}
        flexWrap="wrap"
      >
        {/* Avatar */}
        <Box
          position="relative"
          flexShrink={0}
          cursor={onAvatarClick ? 'pointer' : undefined}
          onClick={onAvatarClick}
        >
          <Avatar.Root size="2xl">
            <Avatar.Fallback
              name={`${profile.firstName} ${profile.lastName}`}
              bg="brand.500"
              color="white"
              fontWeight={800}
              fontSize="1.8rem"
            />
            {profile.avatarUrl && <Avatar.Image src={profile.avatarUrl} />}
          </Avatar.Root>
          {onAvatarClick && (
            <Box
              position="absolute"
              bottom={0}
              right={0}
              w="26px"
              h="26px"
              bg="bg.surface"
              borderRadius="full"
              borderWidth="1.5px"
              borderColor="border.default"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="text.muted"
              cursor="pointer"
              transition="background 0.15s, color 0.15s"
              _hover={{ bg: 'brand.subtle', color: 'brand.500' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </Box>
          )}
        </Box>

        {/* Info */}
        <Box flex={1} minW="180px" textAlign={{ base: 'center', sm: 'left' }}>
          <Text fontSize="2xl" fontWeight={800} lineHeight={1.2} mb="4px">
            {profile.firstName} {profile.lastName}
          </Text>
          <Text fontSize="sm" color="text.muted" mb={3}>
            {roleLabel}
          </Text>

          {/* Tags */}
          <Flex
            gap={2}
            flexWrap="wrap"
            justify={{ base: 'center', sm: 'flex-start' }}
          >
            {profile.email && (
              <Box fontSize="xs" fontWeight={600} px="10px" py="3px" borderRadius="full" bg="success.subtle" color="success.700">
                Compte vérifié
              </Box>
            )}
            <Box fontSize="xs" fontWeight={600} px="10px" py="3px" borderRadius="full" bg="bg.page" color="text.muted">
              Membre depuis {formatMemberSince(profile.createdAt)}
            </Box>
          </Flex>
        </Box>

        {/* Edit button — proto: btn-ghost btn-sm */}
        <Box flexShrink={0}>
          <AccessibleButton
            size="sm"
            variant="outline"
            onClick={onToggleEdit}
            borderWidth="1.5px"
            borderColor="border.default"
            color={isEditing ? 'success.700' : 'text.secondary'}
            bg="transparent"
            fontSize="xs"
            borderRadius="6px"
            py="7px"
            minH="auto"
            minW="auto"
            _hover={{ borderColor: 'brand.500', color: 'brand.500', bg: 'brand.subtle' }}
          >
            {isEditing ? 'Mode lecture' : 'Modifier le profil'}
          </AccessibleButton>
        </Box>
      </Flex>
    </Box>
  )
}
