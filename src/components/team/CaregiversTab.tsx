import {
  Stack,
  Flex,
  Box,
  Text,
  SimpleGrid,
  Center,
  Spinner,
  Alert,
  EmptyState,
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

export function CaregiversTab({
  caregivers,
  isLoading,
  error,
  removeError,
  onAdd,
  onEdit,
  onRemove,
}: CaregiversTabProps) {
  return (
    <Stack gap={6} pt={4}>
      {/* En-tête */}
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', sm: 'center' }}
        gap={4}
      >
        <Box>
          <Text fontSize="xl" fontWeight="bold" color="gray.900">
            Mes aidants familiaux
          </Text>
          <Text color="gray.600" mt={1}>
            Personnes autorisées à accéder à votre espace
          </Text>
        </Box>
        <AccessibleButton
          colorPalette="purple"
          onClick={onAdd}
          leftIcon={<span aria-hidden="true">+</span>}
        >
          Ajouter un aidant
        </AccessibleButton>
      </Flex>

      {removeError && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{removeError}</Alert.Title>
        </Alert.Root>
      )}

      {isLoading ? (
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      ) : error ? (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      ) : caregivers.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>Aucun aidant familial</EmptyState.Title>
            <EmptyState.Description>
              Ajoutez des membres de votre famille ou proches pour leur donner accès
              au planning et au cahier de liaison.
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {caregivers.map((caregiver) => (
            <CaregiverCard
              key={caregiver.profileId}
              caregiver={caregiver}
              onEdit={() => onEdit(caregiver)}
              onRemove={() => onRemove(caregiver)}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
