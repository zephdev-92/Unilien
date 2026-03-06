import { useState, useEffect } from 'react'
import {
  Box,
  Flex,
  Text,
  Avatar,
  Badge,
  Stack,
  Input,
} from '@chakra-ui/react'
import { Dialog } from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { getActiveAuxiliariesForEmployer } from '@/services/auxiliaryService'
import { getCaregiversForEmployer } from '@/services/caregiverTeamService'
import type { AuxiliarySummary } from '@/services/auxiliaryService'
import type { CaregiverWithProfile } from '@/services/caregiverTeamService'
import { LuSearch } from 'react-icons/lu'

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: 'employee' | 'caregiver'
}

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  employerId: string
  currentUserId: string
  /** IDs des membres qui ont déjà une conversation privée avec l'utilisateur courant */
  existingConversationMemberIds: string[]
  onSelect: (memberId: string) => void
}

export function NewConversationModal({
  isOpen,
  onClose,
  employerId,
  currentUserId,
  existingConversationMemberIds,
  onSelect,
}: NewConversationModalProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isOpen) return

    async function loadMembers() {
      setIsLoading(true)
      try {
        const [auxiliaries, caregivers] = await Promise.all([
          getActiveAuxiliariesForEmployer(employerId),
          getCaregiversForEmployer(employerId),
        ])

        const employees: TeamMember[] = auxiliaries
          .filter((a: AuxiliarySummary) => a.id !== currentUserId)
          .map((a: AuxiliarySummary) => ({
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            avatarUrl: a.avatarUrl,
            role: 'employee' as const,
          }))

        const cg: TeamMember[] = caregivers
          .filter((c: CaregiverWithProfile) => c.profileId !== currentUserId)
          .map((c: CaregiverWithProfile) => ({
            id: c.profileId,
            firstName: c.profile.firstName,
            lastName: c.profile.lastName,
            avatarUrl: c.profile.avatarUrl,
            role: 'caregiver' as const,
          }))

        // Dédupliquer par id
        const seen = new Set<string>()
        const all: TeamMember[] = []
        for (const m of [...employees, ...cg]) {
          if (!seen.has(m.id)) {
            seen.add(m.id)
            all.push(m)
          }
        }

        setMembers(all)
      } finally {
        setIsLoading(false)
      }
    }

    loadMembers()
  }, [isOpen, employerId, currentUserId])

  const filtered = members.filter((m) => {
    const fullName = `${m.firstName} ${m.lastName}`.toLowerCase()
    return fullName.includes(search.toLowerCase())
  })

  const handleSelect = (memberId: string) => {
    onSelect(memberId)
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => { if (!e.open) onClose() }} size="sm">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Nouvelle conversation</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <AccessibleButton
                variant="ghost"
                size="sm"
                position="absolute"
                right={3}
                top={3}
                accessibleLabel="Fermer"
              >
                ✕
              </AccessibleButton>
            </Dialog.CloseTrigger>
          </Dialog.Header>

          <Dialog.Body>
            {/* Recherche */}
            <Flex align="center" gap={2} mb={4}>
              <LuSearch size={16} color="gray" />
              <Input
                placeholder="Rechercher un membre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="sm"
                variant="flushed"
                flex={1}
              />
            </Flex>

            {/* Liste */}
            {isLoading ? (
              <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                Chargement...
              </Text>
            ) : filtered.length === 0 ? (
              <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                Aucun membre trouvé.
              </Text>
            ) : (
              <Stack gap={1}>
                {filtered.map((member) => {
                  const alreadyExists = existingConversationMemberIds.includes(member.id)
                  const fullName = `${member.firstName} ${member.lastName}`

                  return (
                    <Flex
                      key={member.id}
                      align="center"
                      gap={3}
                      px={3}
                      py={2.5}
                      borderRadius="md"
                      cursor={alreadyExists ? 'default' : 'pointer'}
                      opacity={alreadyExists ? 0.5 : 1}
                      _hover={alreadyExists ? {} : { bg: 'blue.50' }}
                      onClick={alreadyExists ? undefined : () => handleSelect(member.id)}
                    >
                      <Avatar.Root size="sm" flexShrink={0}>
                        {member.avatarUrl ? <Avatar.Image src={member.avatarUrl} /> : null}
                        <Avatar.Fallback name={fullName} />
                      </Avatar.Root>

                      <Box flex={1} minW={0}>
                        <Text fontSize="sm" fontWeight="medium" truncate>
                          {fullName}
                        </Text>
                        <Badge
                          size="sm"
                          colorPalette={member.role === 'employee' ? 'blue' : 'purple'}
                          variant="subtle"
                        >
                          {member.role === 'employee' ? 'Auxiliaire' : 'Aidant'}
                        </Badge>
                      </Box>

                      {alreadyExists && (
                        <Text fontSize="xs" color="gray.400">
                          Déjà en cours
                        </Text>
                      )}
                    </Flex>
                  )
                })}
              </Stack>
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
