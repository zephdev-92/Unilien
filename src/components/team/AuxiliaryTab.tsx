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
import { AuxiliaryCard } from './AuxiliaryCard'
import type { AuxiliarySummary } from '@/services/auxiliaryService'

interface AuxiliaryTabProps {
  auxiliaries: AuxiliarySummary[]
  filteredAuxiliaries: AuxiliarySummary[]
  isLoading: boolean
  error: string | null
  activeAuxCount: number
  inactiveAuxCount: number
  onLeaveAuxCount: number
  filter: 'all' | 'active' | 'inactive' | 'on_leave'
  onFilterChange: (f: 'all' | 'active' | 'inactive' | 'on_leave') => void
  onAdd: () => void
  onSelect: (a: AuxiliarySummary) => void
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="sm"
      p={4}
      textAlign="center"
    >
      <Text fontSize="2xl" fontWeight="bold" color="brand.500" lineHeight={1}>
        {value}
      </Text>
      <Text fontSize="sm" color="text.muted" mt={1}>
        {label}
      </Text>
    </Box>
  )
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
      _hover={{ borderColor: 'brand.400', bg: 'brand.subtle' }}
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
        Ajouter un employé
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
  onLeaveAuxCount,
  filter,
  onFilterChange,
  onAdd,
  onSelect,
}: AuxiliaryTabProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const totalWeeklyHours = auxiliaries
    .filter((a) => a.contractStatus === 'active')
    .reduce((sum, a) => sum + a.weeklyHours, 0)
  const activeContracts = auxiliaries.filter((a) => a.contractStatus === 'active').length

  const displayedAuxiliaries = searchQuery
    ? filteredAuxiliaries.filter((a) => {
        const q = searchQuery.toLowerCase()
        const name = `${a.firstName} ${a.lastName}`.toLowerCase()
        const email = (a.email || '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
    : filteredAuxiliaries

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
              placeholder="Rechercher un employé…"
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
              aria-label="Rechercher un employé"
            />
          </Box>
        </Flex>

        <Box
          as="select"
          value={filter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            onFilterChange(e.target.value as 'all' | 'active' | 'inactive' | 'on_leave')
          }
          borderRadius="10px"
          borderWidth="1.5px"
          borderColor="border.default"
          bg="bg.surface"
          px={3}
          py="7px"
          fontSize="sm"
          color="text.default"
          cursor="pointer"
          minW="160px"
          outline="none"
          transition="border-color 0.15s"
          _focus={{ borderColor: 'brand.500' }}
          aria-label="Filtrer par statut"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif ({activeAuxCount})</option>
          <option value="on_leave">En congé ({onLeaveAuxCount})</option>
          <option value="inactive">Inactif ({inactiveAuxCount})</option>
        </Box>
      </Flex>

      {/* Stats */}
      {!isLoading && auxiliaries.length > 0 && (
        <Box
          display="grid"
          gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
          gap={4}
        >
          <StatCard value={String(activeAuxCount)} label={`Employé${activeAuxCount > 1 ? 's' : ''} actif${activeAuxCount > 1 ? 's' : ''}`} />
          <StatCard value={String(onLeaveAuxCount)} label="En congé" />
          <StatCard value={`${totalWeeklyHours}h`} label="Heures ce mois" />
          <StatCard value={String(activeContracts)} label={`Contrat${activeContracts > 1 ? 's' : ''} actif${activeContracts > 1 ? 's' : ''}`} />
        </Box>
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
      ) : displayedAuxiliaries.length === 0 && auxiliaries.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>Aucun employé dans votre équipe</EmptyState.Title>
            <EmptyState.Description>
              Commencez par ajouter votre premier auxiliaire de vie pour gérer son planning et ses documents.
            </EmptyState.Description>
            <AccessibleButton bg="brand.500" color="white" _hover={{ bg: 'brand.600' }} size="sm" onClick={onAdd} mt={3}>
              Ajouter un employé
            </AccessibleButton>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : displayedAuxiliaries.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>
              {searchQuery ? 'Aucun résultat' : 'Aucun employé avec ce filtre'}
            </EmptyState.Title>
            <EmptyState.Description>
              {searchQuery
                ? `Aucun employé ne correspond à "${searchQuery}".`
                : 'Aucun auxiliaire ne correspond aux filtres sélectionnés.'}
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
          {displayedAuxiliaries.map((auxiliary) => (
            <Box key={auxiliary.contractId} role="listitem">
              <AuxiliaryCard
                auxiliary={auxiliary}
                onClick={() => onSelect(auxiliary)}
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
