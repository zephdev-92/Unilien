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
import { AuxiliaryCard } from './AuxiliaryCard'
import type { AuxiliarySummary } from '@/services/auxiliaryService'

interface AuxiliaryTabProps {
  auxiliaries: AuxiliarySummary[]
  filteredAuxiliaries: AuxiliarySummary[]
  isLoading: boolean
  error: string | null
  activeAuxCount: number
  inactiveAuxCount: number
  filter: 'all' | 'active' | 'inactive'
  onFilterChange: (f: 'all' | 'active' | 'inactive') => void
  onAdd: () => void
  onSelect: (a: AuxiliarySummary) => void
}

export function AuxiliaryTab({
  auxiliaries,
  filteredAuxiliaries,
  isLoading,
  error,
  activeAuxCount,
  inactiveAuxCount,
  filter,
  onFilterChange,
  onAdd,
  onSelect,
}: AuxiliaryTabProps) {
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
            Mes auxiliaires de vie
          </Text>
          <Text color="gray.600" mt={1}>
            {activeAuxCount} actif{activeAuxCount > 1 ? 's' : ''}
            {inactiveAuxCount > 0 && ` • ${inactiveAuxCount} inactif${inactiveAuxCount > 1 ? 's' : ''}`}
          </Text>
        </Box>
        <AccessibleButton
          colorPalette="blue"
          onClick={onAdd}
          leftIcon={<span aria-hidden="true">+</span>}
        >
          Ajouter un auxiliaire
        </AccessibleButton>
      </Flex>

      {/* Filtres */}
      <Flex gap={2} flexWrap="wrap">
        {(
          [
            { value: 'all', label: 'Tous', count: auxiliaries.length },
            { value: 'active', label: 'Actifs', count: activeAuxCount },
            { value: 'inactive', label: 'Inactifs', count: inactiveAuxCount },
          ] as const
        ).map(({ value, label, count }) => (
          <AccessibleButton
            key={value}
            size="sm"
            variant={filter === value ? 'solid' : 'outline'}
            colorPalette={filter === value ? 'blue' : 'gray'}
            onClick={() => onFilterChange(value)}
            minH="40px"
          >
            {label} ({count})
          </AccessibleButton>
        ))}
      </Flex>

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
      ) : filteredAuxiliaries.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>
              {auxiliaries.length === 0 ? 'Aucun auxiliaire' : 'Aucun résultat'}
            </EmptyState.Title>
            <EmptyState.Description>
              {auxiliaries.length === 0
                ? 'Ajoutez votre premier auxiliaire pour commencer à planifier les interventions.'
                : 'Aucun auxiliaire ne correspond aux filtres sélectionnés.'}
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          {filteredAuxiliaries.map((auxiliary) => (
            <AuxiliaryCard
              key={auxiliary.contractId}
              auxiliary={auxiliary}
              onClick={() => onSelect(auxiliary)}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
