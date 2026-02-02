import { useState } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Input,
  Checkbox,
  Avatar,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import {
  searchCaregiverByEmail,
  addCaregiverToEmployer,
} from '@/services/caregiverService'
import type { CaregiverPermissions } from '@/types'

// ============================================
// PROPS
// ============================================

interface AddCaregiverModalProps {
  isOpen: boolean
  onClose: () => void
  employerId: string
  onSuccess: () => void
}

// ============================================
// DEFAULT PERMISSIONS
// ============================================

const DEFAULT_PERMISSIONS: CaregiverPermissions = {
  canViewPlanning: true,
  canEditPlanning: false,
  canViewLiaison: true,
  canWriteLiaison: true,
  canManageTeam: false,
  canExportData: false,
}

// ============================================
// COMPONENT
// ============================================

export function AddCaregiverModal({
  isOpen,
  onClose,
  employerId,
  onSuccess,
}: AddCaregiverModalProps) {
  const [email, setEmail] = useState('')
  const [relationship, setRelationship] = useState('')
  const [permissions, setPermissions] = useState<CaregiverPermissions>(DEFAULT_PERMISSIONS)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [foundCaregiver, setFoundCaregiver] = useState<{
    profileId: string
    firstName: string
    lastName: string
    email: string
  } | null>(null)

  const resetForm = () => {
    setEmail('')
    setRelationship('')
    setPermissions(DEFAULT_PERMISSIONS)
    setFoundCaregiver(null)
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSearch = async () => {
    if (!email.trim()) {
      setError('Veuillez entrer une adresse email')
      return
    }

    setIsSearching(true)
    setError(null)
    setFoundCaregiver(null)

    try {
      const result = await searchCaregiverByEmail(email.trim())

      if (!result) {
        setError('Aucun aidant trouvé avec cet email. L\'utilisateur doit d\'abord créer un compte avec le rôle "Aidant familial".')
        return
      }

      setFoundCaregiver(result)
    } catch {
      setError('Erreur lors de la recherche')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!foundCaregiver) return

    setIsSubmitting(true)
    setError(null)

    try {
      await addCaregiverToEmployer(employerId, foundCaregiver.profileId, {
        relationship: relationship || undefined,
        permissions,
      })

      onSuccess()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout')
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
                Ajouter un aidant familial
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer">
                  ✕
                </AccessibleButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body p={6}>
              <Stack gap={5}>
                {/* Recherche par email */}
                <Box>
                  <Text fontWeight="medium" mb={2}>
                    Rechercher par email
                  </Text>
                  <Flex gap={2}>
                    <Input
                      type="email"
                      placeholder="email@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      flex={1}
                    />
                    <AccessibleButton
                      onClick={handleSearch}
                      loading={isSearching}
                      loadingText="..."
                      colorPalette="blue"
                    >
                      Rechercher
                    </AccessibleButton>
                  </Flex>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    L'aidant doit avoir un compte Unilien avec le rôle "Aidant familial"
                  </Text>
                </Box>

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

                {/* Aidant trouvé */}
                {foundCaregiver && (
                  <>
                    <Box
                      bg="green.50"
                      borderWidth="1px"
                      borderColor="green.200"
                      borderRadius="md"
                      p={4}
                    >
                      <Flex align="center" gap={3}>
                        <Avatar.Root size="md">
                          <Avatar.Fallback
                            name={`${foundCaregiver.firstName} ${foundCaregiver.lastName}`}
                          />
                        </Avatar.Root>
                        <Box>
                          <Text fontWeight="semibold">
                            {foundCaregiver.firstName} {foundCaregiver.lastName}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {foundCaregiver.email}
                          </Text>
                        </Box>
                      </Flex>
                    </Box>

                    {/* Relation */}
                    <Box>
                      <Text fontWeight="medium" mb={2}>
                        Lien de parenté (optionnel)
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
                  </>
                )}
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
                  disabled={!foundCaregiver}
                  loading={isSubmitting}
                  loadingText="Ajout..."
                >
                  Ajouter l'aidant
                </AccessibleButton>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default AddCaregiverModal
