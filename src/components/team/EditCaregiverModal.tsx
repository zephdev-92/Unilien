import { useState, useEffect } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Avatar,
  Badge,
  Tag,
  Tabs,
  Checkbox,
} from '@chakra-ui/react'
import { AccessibleButton, AccessibleInput, AccessibleSelect, GhostButton } from '@/components/ui'
import { updateCaregiver, type CaregiverWithProfile } from '@/services/caregiverService'
import { getActiveCaregiverContract, terminateContract, updateContract } from '@/services/contractService'
import { PCH_RATES } from '@/types'
import type { Contract, CaregiverPermissions, CaregiverLegalStatus, CaregiverContractStatus } from '@/types'
import { toaster } from '@/lib/toaster'

// Labels pour les statuts juridiques
const legalStatusLabels: Record<CaregiverLegalStatus, string> = {
  none: 'Aucun statut particulier',
  tutor: 'Tuteur',
  curator: 'Curateur',
  safeguard_justice: 'Sauvegarde de justice',
  family_caregiver: 'Aidant familial reconnu',
}

// Labels statut contrat aidant
const caregiverStatusLabels: Record<string, string> = {
  active: 'PCH — Maintient une activité pro',
  full_time: 'PCH — A cessé son activité pro',
  voluntary: 'Bénévole',
}

// ============================================
// PROPS
// ============================================

interface EditCaregiverModalProps {
  isOpen: boolean
  onClose: () => void
  caregiver: CaregiverWithProfile | null
  onSuccess: () => void
  onCreateContract?: (caregiverId: string) => void
}

// ============================================
// COMPONENT
// ============================================

export function EditCaregiverModal({
  isOpen,
  onClose,
  caregiver,
  onSuccess,
  onCreateContract,
}: EditCaregiverModalProps) {
  const [activeTab, setActiveTab] = useState('permissions')
  const [permissions, setPermissions] = useState<CaregiverPermissions>({
    canViewPlanning: false,
    canEditPlanning: false,
    canViewLiaison: false,
    canWriteLiaison: false,
    canManageTeam: false,
    canExportData: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Contrat aidant
  const [caregiverContract, setCaregiverContract] = useState<Contract | null>(null)
  const [isLoadingContract, setIsLoadingContract] = useState(false)
  const [isTerminating, setIsTerminating] = useState(false)
  const [confirmTerminate, setConfirmTerminate] = useState(false)
  const [isEditingContract, setIsEditingContract] = useState(false)
  const [isSavingContract, setIsSavingContract] = useState(false)
  const [editWeeklyHours, setEditWeeklyHours] = useState(0)
  const [editPchRate, setEditPchRate] = useState(0)
  const [editCaregiverStatus, setEditCaregiverStatus] = useState<CaregiverContractStatus>('active')

  // Vérifier si les permissions sont verrouillées (tuteur/curateur)
  const legalStatus = caregiver?.legalStatus
  const isLegalGuardian = legalStatus === 'tutor' || legalStatus === 'curator'
  const permissionsLocked = caregiver?.permissionsLocked || isLegalGuardian

  useEffect(() => {
    if (caregiver) {
      setPermissions(caregiver.permissions)
      setActiveTab('permissions')
      setConfirmTerminate(false)
      // Charger le contrat aidant actif
      setIsLoadingContract(true)
      getActiveCaregiverContract(caregiver.employerId, caregiver.profileId)
        .then(setCaregiverContract)
        .finally(() => setIsLoadingContract(false))
    } else {
      setCaregiverContract(null)
    }
  }, [caregiver])

  const handleClose = () => {
    setError(null)
    setCaregiverContract(null)
    setConfirmTerminate(false)
    onClose()
  }

  const handleSubmit = async () => {
    if (!caregiver) return

    setIsSubmitting(true)
    setError(null)

    try {
      await updateCaregiver(caregiver.profileId, caregiver.employerId, {
        permissions,
      })

      toaster.success({ title: 'Permissions mises à jour' })
      onSuccess()
      handleClose()
    } catch (err) {
      toaster.error({ title: 'Erreur lors de la mise à jour des permissions' })
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTerminateContract = async () => {
    if (!caregiverContract) return
    setIsTerminating(true)
    try {
      await terminateContract(caregiverContract.id)
      toaster.success({ title: 'Contrat aidant résilié' })
      setCaregiverContract(null)
      setConfirmTerminate(false)
    } catch (err) {
      toaster.error({ title: 'Erreur lors de la résiliation du contrat' })
      setError(err instanceof Error ? err.message : 'Erreur lors de la terminaison du contrat')
    } finally {
      setIsTerminating(false)
    }
  }

  const startEditingContract = () => {
    if (!caregiverContract) return
    setEditWeeklyHours(caregiverContract.weeklyHours)
    setEditPchRate(caregiverContract.pchHourlyRate || 0)
    setEditCaregiverStatus((caregiverContract.caregiverStatus as CaregiverContractStatus) || 'active')
    setIsEditingContract(true)
  }

  const cancelEditingContract = () => {
    setIsEditingContract(false)
  }

  const handleSaveContract = async () => {
    if (!caregiverContract) return
    setIsSavingContract(true)
    try {
      await updateContract(caregiverContract.id, {
        weeklyHours: editWeeklyHours,
        pchHourlyRate: editCaregiverStatus === 'voluntary' ? 0 : editPchRate,
        caregiverStatus: editCaregiverStatus,
      })
      // Recharger le contrat
      if (caregiver) {
        const updated = await getActiveCaregiverContract(caregiver.employerId, caregiver.profileId)
        setCaregiverContract(updated)
      }
      toaster.success({ title: 'Contrat aidant mis à jour' })
      setIsEditingContract(false)
    } catch (err) {
      toaster.error({ title: 'Erreur lors de la mise à jour du contrat' })
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du contrat')
    } finally {
      setIsSavingContract(false)
    }
  }

  const handleCreateContract = () => {
    if (!caregiver || !onCreateContract) return
    handleClose()
    onCreateContract(caregiver.profileId)
  }

  const togglePermission = (key: keyof CaregiverPermissions) => {
    if (permissionsLocked) return
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  if (!caregiver) return null

  const { profile, relationship } = caregiver
  const permissionCount = Object.values(permissions).filter(Boolean).length

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="bg.surface"
            borderRadius="12px"
            maxW="600px"
            w="95vw"
            maxH="90vh"
            overflow="auto"
          >
            <Dialog.Header p={6} borderBottomWidth="1px" borderColor="border.default">
              <Dialog.Title fontSize="lg" fontWeight={700} color="brand.500">
                Détails de l'aidant
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer" color="brand.500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </AccessibleButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body p={0}>
              {/* En-tête profil — comme AuxiliaryDetailModal */}
              <Box p={6} bg="bg.page">
                <Flex gap={4} align="center">
                  <Avatar.Root size="xl">
                    <Avatar.Fallback
                      name={`${profile.firstName} ${profile.lastName}`}
                      bg="brand.500"
                      color="white"
                    />
                    {profile.avatarUrl && (
                      <Avatar.Image src={profile.avatarUrl} />
                    )}
                  </Avatar.Root>

                  <Box flex={1}>
                    <Flex align="center" gap={2} mb={1}>
                      <Text fontSize="xl" fontWeight={800} color="brand.500">
                        {profile.firstName} {profile.lastName}
                      </Text>
                      <Badge colorPalette={caregiverContract ? 'green' : 'gray'}>
                        {caregiverContract ? 'Contrat actif' : 'Sans contrat'}
                      </Badge>
                    </Flex>

                    <Flex gap={4} flexWrap="wrap" color="text.muted" fontSize="sm">
                      {profile.phone && <Text>{profile.phone}</Text>}
                      {profile.email && <Text>{profile.email}</Text>}
                    </Flex>

                    <Flex gap={2} mt={2}>
                      {relationship && (
                        <Tag.Root colorPalette="purple" size="sm">
                          <Tag.Label>{relationship}</Tag.Label>
                        </Tag.Root>
                      )}
                      <Tag.Root size="sm">
                        <Tag.Label>{permissionCount} permission{permissionCount > 1 ? 's' : ''}</Tag.Label>
                      </Tag.Root>
                      {legalStatus && legalStatus !== 'none' && (
                        <Tag.Root colorPalette="blue" size="sm">
                          <Tag.Label>{legalStatusLabels[legalStatus]}</Tag.Label>
                        </Tag.Root>
                      )}
                    </Flex>
                  </Box>
                </Flex>
              </Box>

              {/* Onglets */}
              <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)}>
                <Tabs.List px={6} borderBottomWidth="1px" borderColor="border.default">
                  <Tabs.Trigger value="permissions" py={4} fontWeight={600} fontSize="sm" _selected={{ color: 'brand.500', borderBottomColor: 'brand.500' }}>
                    Permissions
                  </Tabs.Trigger>
                  <Tabs.Trigger value="contract" py={4} fontWeight={600} fontSize="sm" _selected={{ color: 'brand.500', borderBottomColor: 'brand.500' }}>
                    Contrat
                  </Tabs.Trigger>
                </Tabs.List>

                <Box p={6}>
                  {/* Erreur */}
                  {error && (
                    <Box bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="10px" p={3} mb={4}>
                      <Text color="red.700" fontSize="sm">{error}</Text>
                    </Box>
                  )}

                  {/* Onglet Permissions */}
                  <Tabs.Content value="permissions">
                    <Stack gap={4}>
                      {/* Info permissions verrouillées */}
                      {permissionsLocked && (
                        <Box bg="blue.50" borderWidth="1px" borderColor="blue.200" borderRadius="10px" p={4}>
                          <Text color="blue.700" fontSize="sm">
                            Les permissions sont verrouillées en raison du statut juridique (tuteur/curateur).
                          </Text>
                        </Box>
                      )}

                      <Stack gap={3} opacity={permissionsLocked ? 0.7 : 1}>
                        <PermissionCheckbox
                          checked={permissions.canViewPlanning}
                          onChange={() => togglePermission('canViewPlanning')}
                          disabled={permissionsLocked}
                          label="Voir le planning"
                          description="Consulter les interventions prévues"
                        />
                        <PermissionCheckbox
                          checked={permissions.canEditPlanning}
                          onChange={() => togglePermission('canEditPlanning')}
                          disabled={permissionsLocked}
                          label="Modifier le planning"
                          description="Ajouter ou modifier des interventions"
                        />
                        <PermissionCheckbox
                          checked={permissions.canViewLiaison}
                          onChange={() => togglePermission('canViewLiaison')}
                          disabled={permissionsLocked}
                          label="Voir le cahier de liaison"
                          description="Lire les messages et notes"
                        />
                        <PermissionCheckbox
                          checked={permissions.canWriteLiaison}
                          onChange={() => togglePermission('canWriteLiaison')}
                          disabled={permissionsLocked}
                          label="Écrire dans le cahier de liaison"
                          description="Ajouter des messages et notes"
                        />
                        <PermissionCheckbox
                          checked={permissions.canManageTeam}
                          onChange={() => togglePermission('canManageTeam')}
                          disabled={permissionsLocked}
                          label="Gérer l'équipe"
                          description="Ajouter ou retirer des membres de l'équipe"
                        />
                        <PermissionCheckbox
                          checked={permissions.canExportData}
                          onChange={() => togglePermission('canExportData')}
                          disabled={permissionsLocked}
                          label="Exporter les données"
                          description="Télécharger les rapports et documents"
                        />
                      </Stack>
                    </Stack>
                  </Tabs.Content>

                  {/* Onglet Contrat */}
                  <Tabs.Content value="contract">
                    <Stack gap={4}>
                      {isLoadingContract ? (
                        <Text fontSize="sm" color="text.muted">Chargement...</Text>
                      ) : caregiverContract ? (
                        <>
                          {isEditingContract ? (
                            <>
                              <AccessibleSelect
                                label="Type de dédommagement"
                                value={editCaregiverStatus}
                                options={[
                                  { value: 'active', label: `PCH — Maintient une activité pro (${PCH_RATES.active}€/h)` },
                                  { value: 'full_time', label: `PCH — A cessé son activité pro (${PCH_RATES.full_time}€/h)` },
                                  { value: 'voluntary', label: 'Bénévole — Sans dédommagement' },
                                ]}
                                onChange={(e) => {
                                  const status = e.target.value as CaregiverContractStatus
                                  setEditCaregiverStatus(status)
                                  if (status === 'voluntary') {
                                    setEditPchRate(0)
                                  } else {
                                    setEditPchRate(status === 'full_time' ? PCH_RATES.full_time : PCH_RATES.active)
                                  }
                                }}
                              />
                              <AccessibleInput
                                label="Heures/semaine"
                                type="number"
                                value={editWeeklyHours}
                                onChange={(e) => setEditWeeklyHours(Number(e.target.value))}
                              />
                              {editCaregiverStatus !== 'voluntary' && (
                                <AccessibleInput
                                  label="Taux horaire PCH (€)"
                                  type="number"
                                  step="0.01"
                                  value={editPchRate}
                                  onChange={(e) => setEditPchRate(Number(e.target.value))}
                                />
                              )}
                              <Flex gap={3}>
                                <GhostButton flex={1} onClick={cancelEditingContract} disabled={isSavingContract}>
                                  Annuler
                                </GhostButton>
                                <AccessibleButton
                                  flex={1}
                                  bg="brand.500"
                                  color="white"
                                  _hover={{ bg: 'brand.600' }}
                                  onClick={handleSaveContract}
                                  loading={isSavingContract}
                                >
                                  Enregistrer
                                </AccessibleButton>
                              </Flex>
                            </>
                          ) : (
                            <>
                              <InfoRow
                                label="Statut"
                                value={caregiverStatusLabels[caregiverContract.caregiverStatus || ''] || 'Aidant'}
                              />
                              <InfoRow
                                label="Heures hebdomadaires"
                                value={`${caregiverContract.weeklyHours}h`}
                              />
                              {caregiverContract.pchHourlyRate ? (
                                <>
                                  <InfoRow
                                    label="Taux horaire PCH"
                                    value={`${caregiverContract.pchHourlyRate}€`}
                                  />
                                  <InfoRow
                                    label="Dédommagement mensuel estimé"
                                    value={`${(caregiverContract.weeklyHours * 4.33 * caregiverContract.pchHourlyRate).toFixed(2)}€`}
                                  />
                                </>
                              ) : (
                                <InfoRow label="Dédommagement" value="Bénévole" />
                              )}
                              <InfoRow
                                label="Depuis le"
                                value={caregiverContract.startDate.toLocaleDateString('fr-FR')}
                              />

                              <GhostButton onClick={startEditingContract}>
                                Modifier le contrat
                              </GhostButton>
                            </>
                          )}

                          {/* Terminer le contrat */}
                          {!isEditingContract && (
                            confirmTerminate ? (
                              <Stack gap={3}>
                                <Box p={4} bg="danger.subtle" borderRadius="10px" borderWidth="1px" borderColor="danger.100">
                                  <Text color="danger.500" fontWeight={600} fontSize="sm">
                                    Êtes-vous sûr de vouloir mettre fin à ce contrat ?
                                  </Text>
                                  <Text color="danger.600" fontSize="xs" mt={1}>
                                    Cette action marquera le contrat comme terminé à la date d'aujourd'hui.
                                  </Text>
                                </Box>
                                <Flex gap={3}>
                                  <GhostButton
                                    flex={1}
                                    onClick={() => setConfirmTerminate(false)}
                                    disabled={isTerminating}
                                  >
                                    Annuler
                                  </GhostButton>
                                  <AccessibleButton
                                    flex={1}
                                    bg="danger.500"
                                    color="white"
                                    _hover={{ bg: 'danger.600' }}
                                    onClick={handleTerminateContract}
                                    loading={isTerminating}
                                  >
                                    Confirmer la fin du contrat
                                  </AccessibleButton>
                                </Flex>
                              </Stack>
                            ) : (
                              <AccessibleButton
                                variant="outline"
                                borderColor="danger.500"
                                color="danger.500"
                                _hover={{ bg: 'danger.subtle' }}
                                onClick={() => setConfirmTerminate(true)}
                              >
                                Mettre fin au contrat
                              </AccessibleButton>
                            )
                          )}
                        </>
                      ) : (
                        <Box p={6} textAlign="center">
                          <Text color="text.muted" mb={4}>
                            Aucun contrat actif pour cet aidant.
                          </Text>
                          {onCreateContract && (
                            <GhostButton onClick={handleCreateContract}>
                              Créer un contrat aidant
                            </GhostButton>
                          )}
                        </Box>
                      )}
                    </Stack>
                  </Tabs.Content>
                </Box>
              </Tabs.Root>
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px" borderColor="border.default">
              <Flex gap={3} justify="flex-end" w="full">
                <GhostButton onClick={handleClose}>
                  Annuler
                </GhostButton>
                <AccessibleButton
                  bg="brand.500"
                  color="white"
                  _hover={{ bg: 'brand.600' }}
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  loadingText="Enregistrement..."
                >
                  Enregistrer
                </AccessibleButton>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

// Composant permission checkbox
function PermissionCheckbox({
  checked,
  onChange,
  disabled,
  label,
  description,
}: {
  checked: boolean
  onChange: () => void
  disabled: boolean
  label: string
  description: string
}) {
  return (
    <Checkbox.Root checked={checked} onCheckedChange={onChange} disabled={disabled}>
      <Checkbox.HiddenInput />
      <Checkbox.Control />
      <Checkbox.Label>
        <Box>
          <Text>{label}</Text>
          <Text fontSize="xs" color="text.muted">{description}</Text>
        </Box>
      </Checkbox.Label>
    </Checkbox.Root>
  )
}

// Composant ligne d'info — même style que AuxiliaryDetailModal
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" align="center" py={2} borderBottomWidth="1px" borderColor="bg.page">
      <Text fontSize="sm" color="text.muted">{label}</Text>
      <Text fontSize="sm" fontWeight={600} color="brand.500">{value}</Text>
    </Flex>
  )
}

export default EditCaregiverModal
