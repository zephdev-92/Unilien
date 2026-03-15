import { Navigate } from 'react-router-dom'
import {
  Stack,
  Center,
  Spinner,
  Tabs,
  Dialog,
  Portal,
  Flex,
  Text,
} from '@chakra-ui/react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { AccessibleButton } from '@/components/ui'
import { NewContractModal } from './NewContractModal'
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
    selectedCaregiver,
    setSelectedCaregiver,
    caregiverToRemove,
    isRemoving,
    removeError,
    handleRemoveCaregiver,
    confirmRemoveCaregiver,
    cancelRemoveCaregiver,
    refreshCaregivers,
    activeTab,
    setActiveTab,
  } = useTeamPage()

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

  // Bouton "+ Ajouter" dans le header (topbar-right) comme le proto
  // Bouton "+ Ajouter" topbar — même style que btn "Nouveau" messagerie
  const topbarAddButton = isEmployer ? (
    <AccessibleButton
      bg="brand.500"
      color="white"
      fontWeight={600}
      borderRadius="6px"
      _hover={{ bg: 'brand.600' }}
      onClick={() => setIsNewContractOpen(true)}
      aria-label="Ajouter un employé"
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
    </AccessibleButton>
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
