import {
  Box,
  Flex,
  Text,
  Avatar,
  Tag,
  IconButton,
  Stack,
} from '@chakra-ui/react'
import type { CaregiverWithProfile } from '@/services/caregiverService'

// ============================================
// ICONS
// ============================================

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3,6 5,6 21,6" />
      <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11,4H4a2,2 0 0,0-2,2v14a2,2 0 0,0,2,2h14a2,2 0 0,0,2-2v-7" />
      <path d="M18.5,2.5a2.121,2.121 0 0,1,3,3L12,15l-4,1l1-4l9.5-9.5z" />
    </svg>
  )
}

// ============================================
// PROPS
// ============================================

interface CaregiverCardProps {
  caregiver: CaregiverWithProfile
  onEdit: () => void
  onRemove: () => void
}

// ============================================
// COMPONENT
// ============================================

export function CaregiverCard({ caregiver, onEdit, onRemove }: CaregiverCardProps) {
  const { profile, permissions, relationship } = caregiver

  const permissionTags = [
    permissions.canViewPlanning && 'Planning',
    permissions.canEditPlanning && 'Édition planning',
    permissions.canViewLiaison && 'Liaison',
    permissions.canWriteLiaison && 'Écriture liaison',
    permissions.canExportData && 'Export',
  ].filter(Boolean)

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={5}
      boxShadow="sm"
      transition="all 0.2s"
      _hover={{
        borderColor: 'purple.300',
        boxShadow: 'md',
      }}
    >
      <Flex gap={4} align="flex-start">
        <Avatar.Root size="lg">
          <Avatar.Fallback name={`${profile.firstName} ${profile.lastName}`} />
          {profile.avatarUrl && <Avatar.Image src={profile.avatarUrl} />}
        </Avatar.Root>

        <Box flex={1} minW={0}>
          <Flex align="center" gap={2} mb={1}>
            <Text fontWeight="semibold" fontSize="lg" truncate>
              {profile.firstName} {profile.lastName}
            </Text>
            {relationship && (
              <Tag.Root size="sm" colorPalette="purple" variant="subtle">
                <Tag.Label>{relationship}</Tag.Label>
              </Tag.Root>
            )}
          </Flex>

          <Text fontSize="sm" color="gray.600" mb={3}>
            {profile.email}
          </Text>

          {permissionTags.length > 0 && (
            <Flex gap={1} flexWrap="wrap" mb={3}>
              {permissionTags.map((tag) => (
                <Tag.Root key={tag} size="sm" variant="outline" colorPalette="gray">
                  <Tag.Label>{tag}</Tag.Label>
                </Tag.Root>
              ))}
            </Flex>
          )}

          {profile.phone && (
            <Text fontSize="sm" color="gray.500">
              {profile.phone}
            </Text>
          )}
        </Box>

        <Stack gap={1}>
          <IconButton
            aria-label="Modifier les permissions"
            size="sm"
            variant="ghost"
            onClick={onEdit}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            aria-label="Retirer l'aidant"
            size="sm"
            variant="ghost"
            colorPalette="red"
            onClick={onRemove}
          >
            <TrashIcon />
          </IconButton>
        </Stack>
      </Flex>
    </Box>
  )
}

export default CaregiverCard
