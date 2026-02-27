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

  return (
    <DashboardLayout title="Mon équipe">
      <Stack gap={6}>
        <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)}>
          <Tabs.List>
            {canViewAuxiliaries && (
              <Tabs.Trigger value="auxiliaries">
                Auxiliaires de vie ({auxiliaries.length})
              </Tabs.Trigger>
            )}
            <Tabs.Trigger value="caregivers">
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
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="420px">
              <Dialog.Header>
                <Dialog.Title>Retirer un aidant</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>
                  Êtes-vous sûr de vouloir retirer{' '}
                  <Text as="span" fontWeight="semibold">
                    {caregiverToRemove?.profile.firstName} {caregiverToRemove?.profile.lastName}
                  </Text>{' '}
                  de votre équipe ?
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Flex gap={3} justify="flex-end">
                  <AccessibleButton
                    variant="outline"
                    onClick={cancelRemoveCaregiver}
                    disabled={isRemoving}
                  >
                    Annuler
                  </AccessibleButton>
                  <AccessibleButton
                    colorPalette="red"
                    onClick={confirmRemoveCaregiver}
                    loading={isRemoving}
                  >
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
