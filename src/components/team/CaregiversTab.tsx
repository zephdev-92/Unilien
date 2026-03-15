import { useState } from 'react'
import {
  Stack,
  Flex,
  Box,
  Text,
  Center,
  Spinner,
  Alert,
  EmptyState,
  Input,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { CaregiverCard } from './CaregiverCard'
import type { CaregiverWithProfile } from '@/services/caregiverService'

interface CaregiversTabProps {
  caregivers: CaregiverWithProfile[]
  isLoading: boolean
  error: string | null
  removeError: string | null
  onAdd: () => void
  onEdit: (c: CaregiverWithProfile) => void
  onRemove: (c: CaregiverWithProfile) => void
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <Box
      as="button"
      onClick={onClick}
      borderRadius="12px"
      border="2px dashed"
      borderColor="border.default"
      bg="transparent"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minH={{ base: '120px', sm: '280px' }}
      cursor="pointer"
      transition="border-color 0.2s, background 0.2s"
      _hover={{ borderColor: 'brand.400', bg: 'brand.50' }}
      w="full"
    >
      <Box
        w="48px"
        h="48px"
        borderRadius="full"
        bg="border.default"
        display="flex"
        alignItems="center"
        justifyContent="center"
        mb={3}
        transition="background 0.2s"
        css={{ 'button:hover &': { background: 'var(--chakra-colors-brand-50)' } }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22" color="var(--chakra-colors-brand-500)">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Box>
      <Text color="text.muted" fontSize="sm" fontWeight={500}>
        Ajouter un aidant
      </Text>
    </Box>
  )
}

export function CaregiversTab({
  caregivers,
  isLoading,
  error,
  removeError,
  onAdd,
  onEdit,
  onRemove,
}: CaregiversTabProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const displayedCaregivers = searchQuery
    ? caregivers.filter((c) => {
        const q = searchQuery.toLowerCase()
        const name = `${c.profile.firstName} ${c.profile.lastName}`.toLowerCase()
        const email = (c.profile.email || '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
    : caregivers

  return (
    <Stack gap={5} pt={4}>
      {/* Toolbar */}
      <Flex
        gap={3}
        direction={{ base: 'column', sm: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', sm: 'center' }}
      >
        <Flex gap={3} flex={1} align="center">
          <Box position="relative" flex={1} minW="200px" maxW="320px">
            <Box
              position="absolute"
              left={3}
              top="50%"
              transform="translateY(-50%)"
              color="text.muted"
              pointerEvents="none"
              zIndex={1}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </Box>
            <Input
              placeholder="Rechercher un aidant…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              pl={9}
              py="8px"
              size="sm"
              borderRadius="full"
              borderWidth="1.5px"
              borderColor="border.default"
              bg="bg.surface"
              fontSize="sm"
              _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 3px rgba(78,100,120,.1)' }}
              aria-label="Rechercher un aidant"
            />
          </Box>
        </Flex>
      </Flex>

      {removeError && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{removeError}</Alert.Title>
        </Alert.Root>
      )}

      {/* Contenu */}
      {isLoading ? (
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      ) : error ? (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      ) : displayedCaregivers.length === 0 && caregivers.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>Aucun aidant familial</EmptyState.Title>
            <EmptyState.Description>
              Ajoutez des membres de votre famille ou proches pour leur donner accès
              au planning et au cahier de liaison.
            </EmptyState.Description>
            <AccessibleButton bg="brand.500" color="white" _hover={{ bg: 'brand.600' }} size="sm" onClick={onAdd} mt={3}>
              Ajouter un aidant
            </AccessibleButton>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : displayedCaregivers.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>Aucun résultat</EmptyState.Title>
            <EmptyState.Description>
              Aucun aidant ne correspond à &quot;{searchQuery}&quot;.
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <Box
          display="grid"
          gridTemplateColumns="repeat(auto-fill, minmax(260px, 1fr))"
          gap={5}
          role="list"
        >
          {displayedCaregivers.map((caregiver) => (
            <Box key={caregiver.profileId} role="listitem">
              <CaregiverCard
                caregiver={caregiver}
                onEdit={() => onEdit(caregiver)}
                onRemove={() => onRemove(caregiver)}
              />
            </Box>
          ))}
          <Box role="listitem">
            <AddCard onClick={onAdd} />
          </Box>
        </Box>
      )}
    </Stack>
  )
}
