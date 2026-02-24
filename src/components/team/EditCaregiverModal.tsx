import { useState, useEffect } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Checkbox,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { updateCaregiver, type CaregiverWithProfile } from '@/services/caregiverService'
import type { CaregiverPermissions, CaregiverLegalStatus } from '@/types'

// Labels pour les statuts juridiques
const legalStatusLabels: Record<CaregiverLegalStatus, string> = {
  none: 'Aucun statut particulier',
  tutor: 'Tuteur',
  curator: 'Curateur',
  safeguard_justice: 'Sauvegarde de justice',
  family_caregiver: 'Aidant familial reconnu',
}

// ============================================
// PROPS
// ============================================

interface EditCaregiverModalProps {
  isOpen: boolean
  onClose: () => void
  caregiver: CaregiverWithProfile | null
  onSuccess: () => void
}

// ============================================
// COMPONENT
// ============================================

export function EditCaregiverModal({
  isOpen,
  onClose,
  caregiver,
  onSuccess,
}: EditCaregiverModalProps) {
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

  // Vérifier si les permissions sont verrouillées (tuteur/curateur)
  // On vérifie à la fois le flag permissionsLocked ET le legalStatus pour être sûr
  const legalStatus = caregiver?.legalStatus
  const isLegalGuardian = legalStatus === 'tutor' || legalStatus === 'curator'
  const permissionsLocked = caregiver?.permissionsLocked || isLegalGuardian

  useEffect(() => {
    if (caregiver) {
      setPermissions(caregiver.permissions)
    }
  }, [caregiver])

  const handleClose = () => {
    setError(null)
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

      onSuccess()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePermission = (key: keyof CaregiverPermissions) => {
    // Ne pas permettre la modification si les permissions sont verrouillées
    if (permissionsLocked) return
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  if (!caregiver) return null

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius="xl"
            maxW="500px"
            w="90vw"
            maxH="90vh"
            overflow="auto"
          >
            <Dialog.Header p={6} borderBottomWidth="1px">
              <Dialog.Title fontSize="xl" fontWeight="bold">
                Modifier {caregiver.profile.firstName} {caregiver.profile.lastName}
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer">
                  ✕
                </AccessibleButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body p={6}>
              <Stack gap={5}>
                {/* Erreur */}
                {error && (
                  <Box
                    bg="red.50"
                    borderWidth="1px"
                    borderColor="red.200"
                    borderRadius="md"
                    p={3}
                  >
                    <Text color="red.700" fontSize="sm">
                      {error}
                    </Text>
                  </Box>
                )}

                {/* Statut juridique (affiché depuis la BDD) */}
                {legalStatus && (
                  <Box
                    bg={permissionsLocked ? 'blue.50' : 'gray.50'}
                    borderWidth="1px"
                    borderColor={permissionsLocked ? 'blue.200' : 'gray.200'}
                    borderRadius="md"
                    p={4}
                  >
                    <Text color={permissionsLocked ? 'blue.700' : 'gray.700'} fontSize="sm" fontWeight="medium">
                      Statut juridique : {legalStatusLabels[legalStatus]}
                    </Text>
                    {permissionsLocked && (
                      <Text color="blue.600" fontSize="xs" mt={1}>
                        Les permissions de cet aidant sont verrouillées en raison de son statut juridique (tuteur/curateur).
                        Elles ne peuvent pas être modifiées.
                      </Text>
                    )}
                  </Box>
                )}

                {/* Permissions */}
                <Box>
                  <Text fontWeight="medium" mb={3}>
                    Permissions {permissionsLocked && '(verrouillées)'}
                  </Text>
                  <Stack gap={3} opacity={permissionsLocked ? 0.7 : 1}>
                    <Checkbox.Root
                      checked={permissions.canViewPlanning}
                      onCheckedChange={() => togglePermission('canViewPlanning')}
                      disabled={permissionsLocked}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>
                        <Box>
                          <Text>Voir le planning</Text>
                          <Text fontSize="xs" color="gray.500">
                            Consulter les interventions prévues
                          </Text>
                        </Box>
                      </Checkbox.Label>
                    </Checkbox.Root>

                    <Checkbox.Root
                      checked={permissions.canEditPlanning}
                      onCheckedChange={() => togglePermission('canEditPlanning')}
                      disabled={permissionsLocked}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>
                        <Box>
                          <Text>Modifier le planning</Text>
                          <Text fontSize="xs" color="gray.500">
                            Ajouter ou modifier des interventions
                          </Text>
                        </Box>
                      </Checkbox.Label>
                    </Checkbox.Root>

                    <Checkbox.Root
                      checked={permissions.canViewLiaison}
                      onCheckedChange={() => togglePermission('canViewLiaison')}
                      disabled={permissionsLocked}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>
                        <Box>
                          <Text>Voir le cahier de liaison</Text>
                          <Text fontSize="xs" color="gray.500">
                            Lire les messages et notes
                          </Text>
                        </Box>
                      </Checkbox.Label>
                    </Checkbox.Root>

                    <Checkbox.Root
                      checked={permissions.canWriteLiaison}
                      onCheckedChange={() => togglePermission('canWriteLiaison')}
                      disabled={permissionsLocked}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>
                        <Box>
                          <Text>Écrire dans le cahier de liaison</Text>
                          <Text fontSize="xs" color="gray.500">
                            Ajouter des messages et notes
                          </Text>
                        </Box>
                      </Checkbox.Label>
                    </Checkbox.Root>

                    <Checkbox.Root
                      checked={permissions.canManageTeam}
                      onCheckedChange={() => togglePermission('canManageTeam')}
                      disabled={permissionsLocked}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>
                        <Box>
                          <Text>Gérer l'équipe</Text>
                          <Text fontSize="xs" color="gray.500">
                            Ajouter ou retirer des membres de l'équipe
                          </Text>
                        </Box>
                      </Checkbox.Label>
                    </Checkbox.Root>

                    <Checkbox.Root
                      checked={permissions.canExportData}
                      onCheckedChange={() => togglePermission('canExportData')}
                      disabled={permissionsLocked}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>
                        <Box>
                          <Text>Exporter les données</Text>
                          <Text fontSize="xs" color="gray.500">
                            Télécharger les rapports et documents
                          </Text>
                        </Box>
                      </Checkbox.Label>
                    </Checkbox.Root>
                  </Stack>
                </Box>
              </Stack>
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px">
              <Flex gap={3} justify="flex-end">
                <AccessibleButton variant="ghost" onClick={handleClose}>
                  Annuler
                </AccessibleButton>
                <AccessibleButton
                  colorPalette="blue"
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

export default EditCaregiverModal
