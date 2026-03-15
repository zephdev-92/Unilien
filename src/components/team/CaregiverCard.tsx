import {
  Box,
  Flex,
  Text,
  Avatar,
  Tag,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import type { CaregiverWithProfile } from '@/services/caregiverService'

interface CaregiverCardProps {
  caregiver: CaregiverWithProfile
  onEdit: () => void
  onRemove: () => void
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <Flex align="center" gap="8px" fontSize="xs" color="text.muted">
      <Flex align="center" gap="5px" color="text.muted" fontWeight={600} minW="60px" flexShrink={0}>
        {icon}
        <Text>{label}</Text>
      </Flex>
      <Text truncate color="text.secondary">{children}</Text>
    </Flex>
  )
}

export function CaregiverCard({ caregiver, onEdit, onRemove }: CaregiverCardProps) {
  const { profile, permissions, relationship } = caregiver

  const permissionCount = [
    permissions.canViewPlanning,
    permissions.canEditPlanning,
    permissions.canViewLiaison,
    permissions.canWriteLiaison,
    permissions.canManageTeam,
    permissions.canExportData,
  ].filter(Boolean).length

  return (
    <Box
      as="article"
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="sm"
      overflow="hidden"
      transition="box-shadow 0.2s, transform 0.2s"
      _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
      css={{
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          transform: 'none !important',
        },
      }}
    >
      {/* Card top */}
      <Flex px={4} pt={4} pb={3} bg="bg.page" justify="space-between" align="flex-start">
        <Avatar.Root size="lg">
          <Avatar.Fallback
            name={`${profile.firstName} ${profile.lastName}`}
            bg="brand.500"
            color="white"
          />
          {profile.avatarUrl && <Avatar.Image src={profile.avatarUrl} />}
        </Avatar.Root>
        {relationship ? (
          <Tag.Root size="sm" colorPalette="purple" variant="subtle">
            <Tag.Label>{relationship}</Tag.Label>
          </Tag.Root>
        ) : (
          <Box fontSize="xs" fontWeight={600} px="10px" py="3px" borderRadius="full" bg="brand.50" color="brand.500">
            Aidant
          </Box>
        )}
      </Flex>

      {/* Card body */}
      <Box px={4} pb={3}>
        <Text fontWeight={800} fontSize="md" mt={3} mb="2px" lineHeight="short">
          {profile.firstName} {profile.lastName}
        </Text>
        <Text fontSize="xs" color="text.muted" fontWeight={500} mb={3}>
          Aidant familial
        </Text>

        <Flex direction="column" gap={2}>
          <MetaRow
            label="Email"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            }
          >
            {profile.email}
          </MetaRow>
          {profile.phone && (
            <MetaRow
              label="Tél."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              }
            >
              {profile.phone}
            </MetaRow>
          )}
          <MetaRow
            label="Droits"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          >
            {permissionCount} permission{permissionCount > 1 ? 's' : ''}
          </MetaRow>
        </Flex>
      </Box>

      {/* Card footer */}
      <Flex gap={2} px={4} py={2} borderTopWidth="1px" borderColor="border.default" bg="bg.page">
        <AccessibleButton
          variant="outline"
          size="sm"
          onClick={onEdit}
          flex={1}
          borderWidth="1.5px"
          borderColor="border.default"
          color="text.secondary"
          bg="transparent"
          fontSize="xs"
          borderRadius="6px"
          py="7px"
          minH="auto"
          minW="auto"
          _hover={{ borderColor: 'brand.500', color: 'brand.500', bg: 'brand.50' }}
        >
          Permissions
        </AccessibleButton>
        <AccessibleButton
          variant="outline"
          size="sm"
          onClick={onRemove}
          flex={1}
          borderWidth="1.5px"
          borderColor="border.default"
          color="danger.500"
          bg="transparent"
          fontSize="xs"
          borderRadius="6px"
          py="7px"
          minH="auto"
          minW="auto"
          _hover={{ borderColor: 'danger.500', color: 'danger.500', bg: 'danger.50' }}
        >
          Retirer
        </AccessibleButton>
      </Flex>
    </Box>
  )
}

export default CaregiverCard
