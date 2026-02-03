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
import type { CaregiverPermissions, CaregiverLegalStatus } from '@/types'

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

// Tous les droits activés pour tuteur/curateur
const ALL_PERMISSIONS: CaregiverPermissions = {
  canViewPlanning: true,
  canEditPlanning: true,
  canViewLiaison: true,
  canWriteLiaison: true,
  canManageTeam: true,
  canExportData: true,
}

// Options de statut juridique
const legalStatusOptions: { value: CaregiverLegalStatus | 'none'; label: string }[] = [
  { value: 'none', label: 'Aucun statut particulier' },
  { value: 'tutor', label: 'Tuteur' },
  { value: 'curator', label: 'Curateur' },
  { value: 'safeguard_justice', label: 'Sauvegarde de justice' },
  { value: 'family_caregiver', label: 'Aidant familial reconnu' },
]

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
  const [legalStatus, setLegalStatus] = useState<CaregiverLegalStatus | 'none'>('none')
  const [permissions, setPermissions] = useState<CaregiverPermissions>(DEFAULT_PERMISSIONS)
  const [permissionsLocked, setPermissionsLocked] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [foundCaregiver, setFoundCaregiver] = useState<{
    profileId: string
    firstName: string
    lastName: string
    email: string
  } | null>(null)

  // Quand le statut juridique change, mettre à jour les permissions
  const handleLegalStatusChange = (newStatus: CaregiverLegalStatus | 'none') => {
    setLegalStatus(newStatus)
    if (newStatus === 'tutor' || newStatus === 'curator') {
      // Tuteur ou curateur : tous les droits, verrouillés
      setPermissions(ALL_PERMISSIONS)
      setPermissionsLocked(true)
    } else {
      // Autre statut : permissions par défaut, modifiables
      setPermissions(DEFAULT_PERMISSIONS)
      setPermissionsLocked(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setLegalStatus('none')
    setPermissions(DEFAULT_PERMISSIONS)
    setPermissionsLocked(false)
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
        permissions,
        legalStatus: legalStatus !== 'none' ? legalStatus : undefined,
        permissionsLocked,
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

                    {/* Statut juridique */}
                    <Box>
                      <Text fontWeight="medium" mb={2}>
                        Statut juridique
                      </Text>
                      <Box
                        as="select"
                        w="100%"
                        p={2}
                        borderWidth="1px"
                        borderRadius="md"
                        borderColor="gray.200"
                        bg="white"
                        value={legalStatus}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleLegalStatusChange(e.target.value as CaregiverLegalStatus | 'none')
                        }
                      >
                        {legalStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Box>
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Important : les tuteurs et curateurs ont automatiquement tous les droits
                      </Text>
                    </Box>

                    {/* Message si permissions verrouillées */}
                    {permissionsLocked && (
                      <Box
                        bg="blue.50"
                        borderWidth="1px"
                        borderColor="blue.200"
                        borderRadius="md"
                        p={3}
                      >
                        <Text color="blue.700" fontSize="sm" fontWeight="medium">
                          En tant que {legalStatus === 'tutor' ? 'tuteur' : 'curateur'}, cet aidant aura automatiquement tous les droits.
                        </Text>
                        <Text color="blue.600" fontSize="xs" mt={1}>
                          Ces permissions ne pourront pas être modifiées après l'ajout.
                        </Text>
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
                          onCheckedChange={() => !permissionsLocked && togglePermission('canViewPlanning')}
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
                          onCheckedChange={() => !permissionsLocked && togglePermission('canEditPlanning')}
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
                          onCheckedChange={() => !permissionsLocked && togglePermission('canViewLiaison')}
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
                          onCheckedChange={() => !permissionsLocked && togglePermission('canWriteLiaison')}
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
                          onCheckedChange={() => !permissionsLocked && togglePermission('canManageTeam')}
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
                          onCheckedChange={() => !permissionsLocked && togglePermission('canExportData')}
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
