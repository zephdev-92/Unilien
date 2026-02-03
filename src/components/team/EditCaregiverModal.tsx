import { useState, useEffect } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Input,
  Checkbox,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { updateCaregiver, type CaregiverWithProfile } from '@/services/caregiverService'
import type { CaregiverPermissions } from '@/types'

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
  const [relationship, setRelationship] = useState('')
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

  useEffect(() => {
    if (caregiver) {
      setRelationship(caregiver.relationship || '')
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
        relationship: relationship || undefined,
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

                {/* Relation */}
                <Box>
                  <Text fontWeight="medium" mb={2}>
                    Lien de parenté
                  </Text>
                  <Input
                    placeholder="Ex: Fils, Fille, Conjoint, Ami..."
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  />
                </Box>

                {/* Permissions */}
                <Box>
                  <Text fontWeight="medium" mb={3}>
                    Permissions
                  </Text>
                  <Stack gap={3}>
                    <Checkbox.Root
                      checked={permissions.canViewPlanning}
                      onCheckedChange={() => togglePermission('canViewPlanning')}
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
                      checked={permissions.canExportData}
                      onCheckedChange={() => togglePermission('canExportData')}
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
