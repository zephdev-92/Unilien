import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Box,
  Stack,
  Flex,
  Text,
  SimpleGrid,
  Badge,
  Avatar,
  Center,
  Spinner,
  Tag,
  EmptyState,
} from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { AccessibleButton } from '@/components/ui'
import { NewContractModal } from './NewContractModal'
import { AuxiliaryDetailModal } from './AuxiliaryDetailModal'
import {
  getAuxiliariesForEmployer,
  type AuxiliarySummary,
} from '@/services/auxiliaryService'

export function TeamPage() {
  const { profile, userRole, isAuthenticated, isLoading, isInitialized } = useAuth()
  const [auxiliaries, setAuxiliaries] = useState<AuxiliarySummary[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isNewContractOpen, setIsNewContractOpen] = useState(false)
  const [selectedAuxiliary, setSelectedAuxiliary] = useState<AuxiliarySummary | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Charger les auxiliaires
  useEffect(() => {
    if (profile?.id && userRole === 'employer') {
      setIsLoadingData(true)
      getAuxiliariesForEmployer(profile.id)
        .then(setAuxiliaries)
        .finally(() => setIsLoadingData(false))
    }
  }, [profile?.id, userRole])

  const refreshData = () => {
    if (profile?.id) {
      getAuxiliariesForEmployer(profile.id).then(setAuxiliaries)
    }
  }

  // Loading state
  if (!isInitialized || isLoading) {
    return (
      <Center minH="100vh">
        <Box textAlign="center">
          <Spinner size="xl" color="brand.500" borderWidth="4px" mb={4} />
          <Text fontSize="lg" color="gray.600">
            Chargement...
          </Text>
        </Box>
      </Center>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Only employers can access this page
  if (userRole !== 'employer') {
    return <Navigate to="/dashboard" replace />
  }

  // Filtrer les auxiliaires
  const filteredAuxiliaries = auxiliaries.filter((aux) => {
    if (filter === 'all') return true
    if (filter === 'active') return aux.contractStatus === 'active'
    return aux.contractStatus !== 'active'
  })

  const activeCount = auxiliaries.filter((a) => a.contractStatus === 'active').length
  const inactiveCount = auxiliaries.filter((a) => a.contractStatus !== 'active').length

  return (
    <DashboardLayout title="Mon équipe">
      <Stack gap={6}>
        {/* En-tête avec actions */}
        <Flex
          direction={{ base: 'column', sm: 'row' }}
          justify="space-between"
          align={{ base: 'stretch', sm: 'center' }}
          gap={4}
        >
          <Box>
            <Text fontSize="2xl" fontWeight="bold" color="gray.900">
              Mes auxiliaires de vie
            </Text>
            <Text color="gray.600" mt={1}>
              {activeCount} auxiliaire{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
              {inactiveCount > 0 && ` • ${inactiveCount} inactif${inactiveCount > 1 ? 's' : ''}`}
            </Text>
          </Box>

          <AccessibleButton
            colorPalette="blue"
            onClick={() => setIsNewContractOpen(true)}
            leftIcon={<span aria-hidden="true">+</span>}
          >
            Ajouter un auxiliaire
          </AccessibleButton>
        </Flex>

        {/* Filtres */}
        <Flex gap={2} flexWrap="wrap">
          <FilterButton
            isActive={filter === 'all'}
            onClick={() => setFilter('all')}
            count={auxiliaries.length}
          >
            Tous
          </FilterButton>
          <FilterButton
            isActive={filter === 'active'}
            onClick={() => setFilter('active')}
            count={activeCount}
          >
            Actifs
          </FilterButton>
          <FilterButton
            isActive={filter === 'inactive'}
            onClick={() => setFilter('inactive')}
            count={inactiveCount}
          >
            Inactifs
          </FilterButton>
        </Flex>

        {/* Liste des auxiliaires */}
        {isLoadingData ? (
          <Center py={12}>
            <Spinner size="xl" color="brand.500" />
          </Center>
        ) : filteredAuxiliaries.length === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Title>
                {auxiliaries.length === 0
                  ? 'Aucun auxiliaire'
                  : 'Aucun résultat'}
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
                onClick={() => setSelectedAuxiliary(auxiliary)}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>

      {/* Modal nouveau contrat */}
      <NewContractModal
        isOpen={isNewContractOpen}
        onClose={() => setIsNewContractOpen(false)}
        employerId={profile?.id || ''}
        onSuccess={() => {
          refreshData()
          setIsNewContractOpen(false)
        }}
      />

      {/* Modal détails auxiliaire */}
      {selectedAuxiliary && (
        <AuxiliaryDetailModal
          isOpen={!!selectedAuxiliary}
          onClose={() => setSelectedAuxiliary(null)}
          contractId={selectedAuxiliary.contractId}
          onUpdate={refreshData}
        />
      )}
    </DashboardLayout>
  )
}

// Composant carte auxiliaire
interface AuxiliaryCardProps {
  auxiliary: AuxiliarySummary
  onClick: () => void
}

function AuxiliaryCard({ auxiliary, onClick }: AuxiliaryCardProps) {
  const isActive = auxiliary.contractStatus === 'active'

  return (
    <Box
      as="button"
      onClick={onClick}
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor={isActive ? 'gray.200' : 'gray.300'}
      p={5}
      boxShadow="sm"
      textAlign="left"
      transition="all 0.2s"
      opacity={isActive ? 1 : 0.7}
      _hover={{
        borderColor: 'brand.300',
        boxShadow: 'md',
        transform: 'translateY(-2px)',
      }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'brand.500',
        outlineOffset: '2px',
      }}
      css={{
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          transform: 'none !important',
        },
      }}
      w="full"
    >
      <Flex gap={4} align="flex-start">
        <Avatar.Root size="lg">
          <Avatar.Fallback name={`${auxiliary.firstName} ${auxiliary.lastName}`} />
          {auxiliary.avatarUrl && <Avatar.Image src={auxiliary.avatarUrl} />}
        </Avatar.Root>

        <Box flex={1} minW={0}>
          <Flex align="center" gap={2} mb={1}>
            <Text fontWeight="semibold" fontSize="lg" truncate>
              {auxiliary.firstName} {auxiliary.lastName}
            </Text>
            <Badge
              colorPalette={isActive ? 'green' : 'gray'}
              size="sm"
            >
              {isActive ? 'Actif' : 'Inactif'}
            </Badge>
          </Flex>

          <Flex gap={2} mb={3} flexWrap="wrap">
            <Tag.Root size="sm" colorPalette="blue" variant="subtle">
              <Tag.Label>{auxiliary.contractType}</Tag.Label>
            </Tag.Root>
            <Tag.Root size="sm" variant="subtle">
              <Tag.Label>{auxiliary.weeklyHours}h/sem</Tag.Label>
            </Tag.Root>
            <Tag.Root size="sm" variant="subtle">
              <Tag.Label>{auxiliary.hourlyRate}€/h</Tag.Label>
            </Tag.Root>
          </Flex>

          {auxiliary.qualifications.length > 0 && (
            <Flex gap={1} flexWrap="wrap">
              {auxiliary.qualifications.slice(0, 3).map((qual) => (
                <Tag.Root key={qual} size="sm" variant="outline">
                  <Tag.Label>{qual}</Tag.Label>
                </Tag.Root>
              ))}
              {auxiliary.qualifications.length > 3 && (
                <Tag.Root size="sm" variant="outline">
                  <Tag.Label>+{auxiliary.qualifications.length - 3}</Tag.Label>
                </Tag.Root>
              )}
            </Flex>
          )}

          {auxiliary.phone && (
            <Text fontSize="sm" color="gray.500" mt={2}>
              {auxiliary.phone}
            </Text>
          )}
        </Box>
      </Flex>
    </Box>
  )
}

// Bouton de filtre
interface FilterButtonProps {
  isActive: boolean
  onClick: () => void
  count: number
  children: React.ReactNode
}

function FilterButton({ isActive, onClick, count, children }: FilterButtonProps) {
  return (
    <AccessibleButton
      size="sm"
      variant={isActive ? 'solid' : 'outline'}
      colorPalette={isActive ? 'blue' : 'gray'}
      onClick={onClick}
      minH="40px"
    >
      {children} ({count})
    </AccessibleButton>
  )
}

export default TeamPage
