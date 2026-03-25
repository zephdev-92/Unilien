import { useState, useRef, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Stack,
  Center,
  Spinner,
  Tabs,
  Dialog,
  Portal,
  Flex,
  Box,
  Text,
} from '@chakra-ui/react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { AccessibleButton } from '@/components/ui'
import { NewContractModal } from './NewContractModal'
import { NewCaregiverContractModal } from './NewCaregiverContractModal'
import { AuxiliaryDetailModal } from './AuxiliaryDetailModal'
import { AddCaregiverModal } from './AddCaregiverModal'
import { EditCaregiverModal } from './EditCaregiverModal'
import { AuxiliaryTab } from './AuxiliaryTab'
import { CaregiversTab } from './CaregiversTab'
import { useTeamPage } from '@/hooks/useTeamPage'

export function TeamPage() {
  const {
    profile,
    userRole,
    isEmployer,
    effectiveEmployerId,
    currentCaregiver,
    isLoadingCurrentCaregiver,
    auxiliaries,
    isLoadingAuxiliaries,
    auxiliariesError,
    auxiliaryFilter,
    setAuxiliaryFilter,
    filteredAuxiliaries,
    activeAuxCount,
    inactiveAuxCount,
    onLeaveAuxCount,
    isNewContractOpen,
    setIsNewContractOpen,
    selectedAuxiliary,
    setSelectedAuxiliary,
    refreshAuxiliaries,
    caregivers,
    isLoadingCaregivers,
    caregiversError,
    isAddCaregiverOpen,
    setIsAddCaregiverOpen,
    isNewCaregiverContractOpen,
    setIsNewCaregiverContractOpen,
    selectedCaregiver,
    setSelectedCaregiver,
    caregiverToRemove,
    isRemoving,
    removeError,
    handleRemoveCaregiver,
    confirmRemoveCaregiver,
    cancelRemoveCaregiver,
    refreshCaregivers,
    caregiverContractMap,
    activeTab,
    setActiveTab,
  } = useTeamPage()

  // Pré-sélection aidant pour contrat
  const [preselectedCaregiverId, setPreselectedCaregiverId] = useState<string | undefined>()

  // Dropdown "Ajouter" — choix auxiliaire ou aidant
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAddMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isAddMenuOpen])

  if (isLoadingCurrentCaregiver || !profile) {
    return (
      <DashboardLayout title="Équipe">
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      </DashboardLayout>
    )
  }

  if (userRole === 'caregiver' && !currentCaregiver?.permissions?.canManageTeam) {
    return <Navigate to="/tableau-de-bord" replace />
  }

  const canViewAuxiliaries = isEmployer || !!currentCaregiver?.permissions?.canManageTeam

  const topbarAddButton = isEmployer ? (
    <Box position="relative" ref={addMenuRef}>
      <AccessibleButton
        bg="brand.500"
        color="white"
        fontWeight={600}
        borderRadius="6px"
        _hover={{ bg: 'brand.600' }}
        onClick={() => setIsAddMenuOpen((v) => !v)}
        aria-label="Ajouter un membre"
        aria-expanded={isAddMenuOpen}
        display="inline-flex"
        alignItems="center"
        gap={2}
        px={3}
        py={2}
        size="sm"
        minH="auto"
        minW="auto"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={16} height={16} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <Text as="span" display={{ base: 'none', sm: 'inline' }}>Ajouter</Text>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={12} height={12} aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </AccessibleButton>

      {isAddMenuOpen && (
        <Box
          position="absolute"
          right={0}
          top="100%"
          mt={1}
          bg="bg.surface"
          borderRadius="10px"
          borderWidth="1px"
          borderColor="border.default"
          boxShadow="lg"
          minW="220px"
          zIndex={10}
          py={1}
        >
          <Box
            as="button"
            w="full"
            px={4}
            py={3}
            textAlign="left"
            _hover={{ bg: 'brand.subtle' }}
            onClick={() => { setIsAddMenuOpen(false); setIsNewContractOpen(true) }}
            display="flex"
            alignItems="center"
            gap={3}
            cursor="pointer"
            bg="transparent"
            border="none"
          >
            <Box color="brand.500" flexShrink={0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight={600} color="text.primary">Auxiliaire de vie</Text>
              <Text fontSize="xs" color="text.muted">Contrat de travail (IDCC 3239)</Text>
            </Box>
          </Box>

          <Box h="1px" bg="border.default" mx={3} />

          <Box
            as="button"
            w="full"
            px={4}
            py={3}
            textAlign="left"
            _hover={{ bg: 'brand.subtle' }}
            onClick={() => { setIsAddMenuOpen(false); setIsAddCaregiverOpen(true) }}
            display="flex"
            alignItems="center"
            gap={3}
            cursor="pointer"
            bg="transparent"
            border="none"
          >
            <Box color="brand.500" flexShrink={0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight={600} color="text.primary">Aidant familial</Text>
              <Text fontSize="xs" color="text.muted">Avec ou sans dédommagement PCH</Text>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  ) : undefined

  return (
    <DashboardLayout title="Équipe" topbarRight={topbarAddButton}>
      <Stack gap={6}>
        <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)}>
          <Tabs.List borderBottomWidth="1px" borderColor="border.default">
            {canViewAuxiliaries && (
              <Tabs.Trigger
                value="auxiliaries"
                fontWeight={600}
                fontSize="sm"
                _selected={{ color: 'brand.500', borderBottomColor: 'brand.500' }}
                py={3}
              >
                Auxiliaires de vie ({auxiliaries.length})
              </Tabs.Trigger>
            )}
            <Tabs.Trigger
              value="caregivers"
              fontWeight={600}
              fontSize="sm"
              _selected={{ color: 'brand.500', borderBottomColor: 'brand.500' }}
              py={3}
            >
              Aidants familiaux ({caregivers.length})
            </Tabs.Trigger>
          </Tabs.List>

          {canViewAuxiliaries && (
            <Tabs.Content value="auxiliaries">
              <AuxiliaryTab
                auxiliaries={auxiliaries}
                filteredAuxiliaries={filteredAuxiliaries}
                isLoading={isLoadingAuxiliaries}
                error={auxiliariesError}
                activeAuxCount={activeAuxCount}
                inactiveAuxCount={inactiveAuxCount}
                onLeaveAuxCount={onLeaveAuxCount}
                filter={auxiliaryFilter}
                onFilterChange={setAuxiliaryFilter}
                onAdd={() => setIsNewContractOpen(true)}
                onSelect={setSelectedAuxiliary}
              />
            </Tabs.Content>
          )}

          <Tabs.Content value="caregivers">
            <CaregiversTab
              caregivers={caregivers}
              isLoading={isLoadingCaregivers}
              error={caregiversError}
              removeError={removeError}
              caregiverContractMap={caregiverContractMap}
              onAdd={() => setIsAddCaregiverOpen(true)}
              onEdit={setSelectedCaregiver}
              onRemove={handleRemoveCaregiver}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Stack>

      {/* Modals */}
      {isEmployer && (
        <NewContractModal
          isOpen={isNewContractOpen}
          onClose={() => setIsNewContractOpen(false)}
          employerId={profile?.id || ''}
          onSuccess={() => { refreshAuxiliaries(); setIsNewContractOpen(false) }}
        />
      )}

      {canViewAuxiliaries && selectedAuxiliary && (
        <AuxiliaryDetailModal
          isOpen={!!selectedAuxiliary}
          onClose={() => setSelectedAuxiliary(null)}
          contractId={selectedAuxiliary.contractId}
          onUpdate={refreshAuxiliaries}
        />
      )}

      {isEmployer && (
        <NewCaregiverContractModal
          isOpen={isNewCaregiverContractOpen}
          onClose={() => { setIsNewCaregiverContractOpen(false); setPreselectedCaregiverId(undefined) }}
          employerId={profile?.id || ''}
          caregivers={caregivers}
          defaultCaregiverId={preselectedCaregiverId}
          onSuccess={() => { setIsNewCaregiverContractOpen(false); setPreselectedCaregiverId(undefined) }}
        />
      )}

      <AddCaregiverModal
        isOpen={isAddCaregiverOpen}
        onClose={() => setIsAddCaregiverOpen(false)}
        employerId={effectiveEmployerId || ''}
        onSuccess={refreshCaregivers}
      />

      <EditCaregiverModal
        isOpen={!!selectedCaregiver}
        onClose={() => setSelectedCaregiver(null)}
        caregiver={selectedCaregiver}
        onSuccess={refreshCaregivers}
        onCreateContract={isEmployer ? (caregiverId: string) => {
          setSelectedCaregiver(null)
          setPreselectedCaregiverId(caregiverId)
          setIsNewCaregiverContractOpen(true)
        } : undefined}
      />

      {/* Dialog confirmation suppression aidant */}
      <Dialog.Root
        open={!!caregiverToRemove}
        onOpenChange={(e) => { if (!e.open) cancelRemoveCaregiver() }}
      >
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.600" />
          <Dialog.Positioner>
            <Dialog.Content maxW="420px" borderRadius="12px" bg="bg.surface">
              <Dialog.Header p={6} borderBottomWidth="1px" borderColor="border.default">
                <Dialog.Title fontSize="lg" fontWeight={700} color="brand.500">Retirer un aidant</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body p={6}>
                <Text>
                  Êtes-vous sûr de vouloir retirer{' '}
                  <Text as="span" fontWeight="semibold">
                    {caregiverToRemove?.profile.firstName} {caregiverToRemove?.profile.lastName}
                  </Text>{' '}
                  de votre équipe ?
                </Text>
              </Dialog.Body>
              <Dialog.Footer p={6} borderTopWidth="1px" borderColor="border.default">
                <Flex gap={3} justify="flex-end">
                  <AccessibleButton variant="ghost" onClick={cancelRemoveCaregiver} disabled={isRemoving} color="brand.500">
                    Annuler
                  </AccessibleButton>
                  <AccessibleButton bg="danger.500" color="white" _hover={{ bg: 'danger.600' }} onClick={confirmRemoveCaregiver} loading={isRemoving}>
                    Retirer
                  </AccessibleButton>
                </Flex>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </DashboardLayout>
  )
}

export default TeamPage
