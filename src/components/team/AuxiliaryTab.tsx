import { useState } from 'react'
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
  Input,
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

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={4}
      boxShadow="sm"
      textAlign="center"
    >
      <Text fontSize="2xl" fontWeight="bold" color="brand.600" lineHeight={1}>
        {value}
      </Text>
      <Text fontSize="sm" color="gray.500" mt={1}>
        {label}
      </Text>
    </Box>
  )
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
  const [searchQuery, setSearchQuery] = useState('')

  // Calculer les stats
  const totalWeeklyHours = auxiliaries
    .filter((a) => a.contractStatus === 'active')
    .reduce((sum, a) => sum + a.weeklyHours, 0)
  const activeContracts = auxiliaries.filter((a) => a.contractStatus === 'active').length

  // Filtrer par recherche texte
  const displayedAuxiliaries = searchQuery
    ? filteredAuxiliaries.filter((a) => {
        const q = searchQuery.toLowerCase()
        const name = `${a.firstName} ${a.lastName}`.toLowerCase()
        const email = (a.email || '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
    : filteredAuxiliaries

  return (
    <Stack gap={6} pt={4}>
      {/* Stats équipe */}
      {!isLoading && auxiliaries.length > 0 && (
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
          <StatCard value={String(activeAuxCount)} label={`Employe${activeAuxCount > 1 ? 's' : ''} actif${activeAuxCount > 1 ? 's' : ''}`} />
          <StatCard value={String(inactiveAuxCount)} label="Inactif" />
          <StatCard value={`${totalWeeklyHours}h`} label="Heures / semaine" />
          <StatCard value={String(activeContracts)} label={`Contrat${activeContracts > 1 ? 's' : ''} actif${activeContracts > 1 ? 's' : ''}`} />
        </SimpleGrid>
      )}

      {/* Toolbar: recherche + filtres + bouton ajouter */}
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', sm: 'center' }}
        gap={3}
      >
        <Flex gap={3} flex={1} align="center" flexWrap="wrap">
          {/* Recherche */}
          <Box position="relative" flex={1} minW="200px" maxW="320px">
            <Box
              position="absolute"
              left={3}
              top="50%"
              transform="translateY(-50%)"
              color="gray.400"
              pointerEvents="none"
              zIndex={1}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </Box>
            <Input
              placeholder="Rechercher un employe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              pl={9}
              size="sm"
              borderRadius="md"
              aria-label="Rechercher un employe"
            />
          </Box>

          {/* Filtres statut */}
          <Flex gap={1}>
            {(
              [
                { value: 'all', label: 'Tous' },
                { value: 'active', label: 'Actifs' },
                { value: 'inactive', label: 'Inactifs' },
              ] as const
            ).map(({ value, label }) => (
              <AccessibleButton
                key={value}
                size="sm"
                variant={filter === value ? 'solid' : 'outline'}
                colorPalette={filter === value ? 'blue' : 'gray'}
                onClick={() => onFilterChange(value)}
                minH="36px"
              >
                {label}
              </AccessibleButton>
            ))}
          </Flex>
        </Flex>

        <AccessibleButton
          colorPalette="blue"
          onClick={onAdd}
          size="sm"
        >
          + Ajouter
        </AccessibleButton>
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
      ) : displayedAuxiliaries.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>
              {auxiliaries.length === 0
                ? 'Aucun auxiliaire'
                : searchQuery
                  ? 'Aucun resultat'
                  : 'Aucun auxiliaire avec ce filtre'}
            </EmptyState.Title>
            <EmptyState.Description>
              {auxiliaries.length === 0
                ? 'Ajoutez votre premier auxiliaire pour commencer a planifier les interventions.'
                : searchQuery
                  ? `Aucun employe ne correspond a "${searchQuery}".`
                  : 'Aucun auxiliaire ne correspond aux filtres selectionnes.'}
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          {displayedAuxiliaries.map((auxiliary) => (
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
