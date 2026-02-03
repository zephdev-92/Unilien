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
  Tabs,
} from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { AccessibleButton } from '@/components/ui'
import { NewContractModal } from './NewContractModal'
import { AuxiliaryDetailModal } from './AuxiliaryDetailModal'
import { AddCaregiverModal } from './AddCaregiverModal'
import { EditCaregiverModal } from './EditCaregiverModal'
import { CaregiverCard } from './CaregiverCard'
import {
  getAuxiliariesForEmployer,
  type AuxiliarySummary,
} from '@/services/auxiliaryService'
import {
  getCaregiver,
  getCaregiversForEmployer,
  removeCaregiverFromEmployer,
  type CaregiverWithProfile,
} from '@/services/caregiverService'
import type { Caregiver } from '@/types'

export function TeamPage() {
  const { profile, userRole, isAuthenticated, isLoading, isInitialized } = useAuth()

  // Auxiliaires state
  const [auxiliaries, setAuxiliaries] = useState<AuxiliarySummary[]>([])
  const [isLoadingAuxiliaries, setIsLoadingAuxiliaries] = useState(true)
  const [isNewContractOpen, setIsNewContractOpen] = useState(false)
  const [selectedAuxiliary, setSelectedAuxiliary] = useState<AuxiliarySummary | null>(null)
  const [auxiliaryFilter, setAuxiliaryFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Caregivers state
  const [caregivers, setCaregivers] = useState<CaregiverWithProfile[]>([])
  const [isLoadingCaregivers, setIsLoadingCaregivers] = useState(true)
  const [isAddCaregiverOpen, setIsAddCaregiverOpen] = useState(false)
  const [selectedCaregiver, setSelectedCaregiver] = useState<CaregiverWithProfile | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('auxiliaries')

  // Caregiver data (pour les aidants avec canManageTeam)
  const [currentCaregiver, setCurrentCaregiver] = useState<Caregiver | null>(null)
  const [isLoadingCurrentCaregiver, setIsLoadingCurrentCaregiver] = useState(userRole === 'caregiver')

  // Vérifier si l'utilisateur peut gérer l'équipe
  const isEmployer = userRole === 'employer'
  const effectiveEmployerId = isEmployer ? profile?.id : currentCaregiver?.employerId

  // Charger les données de l'aidant si c'est un caregiver
  useEffect(() => {
    if (!profile?.id || userRole !== 'caregiver') {
      setIsLoadingCurrentCaregiver(false)
      return
    }

    const loadCaregiverData = async () => {
      try {
        const caregiverData = await getCaregiver(profile.id)
        setCurrentCaregiver(caregiverData)
        // Si l'aidant peut gérer l'équipe, mettre l'onglet aidants par défaut
        if (caregiverData?.permissions?.canManageTeam) {
          setActiveTab('caregivers')
        }
      } catch (error) {
        console.error('Erreur chargement données aidant:', error)
      } finally {
        setIsLoadingCurrentCaregiver(false)
      }
    }

    loadCaregiverData()
  }, [profile?.id, userRole])

  // Charger les données de l'équipe
  useEffect(() => {
    if (!effectiveEmployerId) return

    let cancelled = false

    const loadData = async () => {
      try {
        // Les auxiliaires sont chargés pour les employeurs et les aidants avec canManageTeam
        const canViewAuxiliaries = isEmployer || currentCaregiver?.permissions?.canManageTeam
        const auxPromise = canViewAuxiliaries
          ? getAuxiliariesForEmployer(effectiveEmployerId)
          : Promise.resolve([])

        const [auxData, caregiverData] = await Promise.all([
          auxPromise,
          getCaregiversForEmployer(effectiveEmployerId),
        ])
        if (!cancelled) {
          setAuxiliaries(auxData)
          setCaregivers(caregiverData)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAuxiliaries(false)
          setIsLoadingCaregivers(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [effectiveEmployerId, isEmployer, currentCaregiver?.permissions?.canManageTeam])

  const refreshAuxiliaries = () => {
    const canViewAuxiliaries = isEmployer || currentCaregiver?.permissions?.canManageTeam
    if (effectiveEmployerId && canViewAuxiliaries) {
      getAuxiliariesForEmployer(effectiveEmployerId).then(setAuxiliaries)
    }
  }

  const refreshCaregivers = () => {
    if (effectiveEmployerId) {
      getCaregiversForEmployer(effectiveEmployerId).then(setCaregivers)
    }
  }

  const handleRemoveCaregiver = async (caregiver: CaregiverWithProfile) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer ${caregiver.profile.firstName} ${caregiver.profile.lastName} de votre équipe ?`)) {
      return
    }

    try {
      await removeCaregiverFromEmployer(caregiver.profileId, caregiver.employerId)
      refreshCaregivers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  // Loading state
  if (!isInitialized || isLoading || isLoadingCurrentCaregiver) {
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

  // Seuls les employeurs et les aidants peuvent accéder
  if (userRole !== 'employer' && userRole !== 'caregiver') {
    return <Navigate to="/dashboard" replace />
  }

  // Aidants: vérifier la permission canManageTeam
  if (userRole === 'caregiver' && !currentCaregiver?.permissions?.canManageTeam) {
    return <Navigate to="/dashboard" replace />
  }

  // Filtrer les auxiliaires
  const filteredAuxiliaries = auxiliaries.filter((aux) => {
    if (auxiliaryFilter === 'all') return true
    if (auxiliaryFilter === 'active') return aux.contractStatus === 'active'
    return aux.contractStatus !== 'active'
  })

  const activeAuxCount = auxiliaries.filter((a) => a.contractStatus === 'active').length
  const inactiveAuxCount = auxiliaries.filter((a) => a.contractStatus !== 'active').length

  return (
    <DashboardLayout title="Mon équipe">
      <Stack gap={6}>
        {/* Tabs */}
        <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)}>
          <Tabs.List>
            {(isEmployer || currentCaregiver?.permissions?.canManageTeam) && (
              <Tabs.Trigger value="auxiliaries">
                Auxiliaires de vie ({auxiliaries.length})
              </Tabs.Trigger>
            )}
            <Tabs.Trigger value="caregivers">
              Aidants familiaux ({caregivers.length})
            </Tabs.Trigger>
          </Tabs.List>

          {/* Tab: Auxiliaires - Employeurs et aidants avec canManageTeam */}
          {(isEmployer || currentCaregiver?.permissions?.canManageTeam) && (
          <Tabs.Content value="auxiliaries">
            <Stack gap={6} pt={4}>
              {/* En-tête avec actions */}
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
                  onClick={() => setIsNewContractOpen(true)}
                  leftIcon={<span aria-hidden="true">+</span>}
                >
                  Ajouter un auxiliaire
                </AccessibleButton>
              </Flex>

              {/* Filtres */}
              <Flex gap={2} flexWrap="wrap">
                <FilterButton
                  isActive={auxiliaryFilter === 'all'}
                  onClick={() => setAuxiliaryFilter('all')}
                  count={auxiliaries.length}
                >
                  Tous
                </FilterButton>
                <FilterButton
                  isActive={auxiliaryFilter === 'active'}
                  onClick={() => setAuxiliaryFilter('active')}
                  count={activeAuxCount}
                >
                  Actifs
                </FilterButton>
                <FilterButton
                  isActive={auxiliaryFilter === 'inactive'}
                  onClick={() => setAuxiliaryFilter('inactive')}
                  count={inactiveAuxCount}
                >
                  Inactifs
                </FilterButton>
              </Flex>

              {/* Liste des auxiliaires */}
              {isLoadingAuxiliaries ? (
                <Center py={12}>
                  <Spinner size="xl" color="brand.500" />
                </Center>
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
                      onClick={() => setSelectedAuxiliary(auxiliary)}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Tabs.Content>
          )}

          {/* Tab: Aidants familiaux */}
          <Tabs.Content value="caregivers">
            <Stack gap={6} pt={4}>
              {/* En-tête avec actions */}
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
                  onClick={() => setIsAddCaregiverOpen(true)}
                  leftIcon={<span aria-hidden="true">+</span>}
                >
                  Ajouter un aidant
                </AccessibleButton>
              </Flex>

              {/* Liste des aidants */}
              {isLoadingCaregivers ? (
                <Center py={12}>
                  <Spinner size="xl" color="brand.500" />
                </Center>
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
                      onEdit={() => setSelectedCaregiver(caregiver)}
                      onRemove={() => handleRemoveCaregiver(caregiver)}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Tabs.Content>
        </Tabs.Root>
      </Stack>

      {/* Modal nouveau contrat - Employeurs seulement */}
      {isEmployer && (
        <NewContractModal
          isOpen={isNewContractOpen}
          onClose={() => setIsNewContractOpen(false)}
          employerId={profile?.id || ''}
          onSuccess={() => {
            refreshAuxiliaries()
            setIsNewContractOpen(false)
          }}
        />
      )}

      {/* Modal détails auxiliaire - Employeurs et aidants avec canManageTeam */}
      {(isEmployer || currentCaregiver?.permissions?.canManageTeam) && selectedAuxiliary && (
        <AuxiliaryDetailModal
          isOpen={!!selectedAuxiliary}
          onClose={() => setSelectedAuxiliary(null)}
          contractId={selectedAuxiliary.contractId}
          onUpdate={refreshAuxiliaries}
        />
      )}

      {/* Modal ajouter aidant */}
      <AddCaregiverModal
        isOpen={isAddCaregiverOpen}
        onClose={() => setIsAddCaregiverOpen(false)}
        employerId={effectiveEmployerId || ''}
        onSuccess={refreshCaregivers}
      />

      {/* Modal modifier aidant */}
      <EditCaregiverModal
        isOpen={!!selectedCaregiver}
        onClose={() => setSelectedCaregiver(null)}
        caregiver={selectedCaregiver}
        onSuccess={refreshCaregivers}
      />
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
