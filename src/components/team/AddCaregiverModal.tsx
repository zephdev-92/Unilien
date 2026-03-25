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
  inviteCaregiverByEmail,
  addCaregiverToEmployer,
} from '@/services/caregiverService'
import { logger } from '@/lib/logger'
import { toaster } from '@/lib/toaster'
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

  // Invitation flow
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')

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
    setShowInviteForm(false)
    setIsInviting(false)
    setInviteSuccess(false)
    setInviteError(null)
    setInviteFirstName('')
    setInviteLastName('')
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
    setShowInviteForm(false)
    setInviteSuccess(false)

    try {
      const result = await searchCaregiverByEmail(email.trim())

      if (!result) {
        setError('Aucun aidant trouvé avec cet email.')
        setShowInviteForm(true)
        return
      }

      setFoundCaregiver(result)
    } catch {
      setError('Erreur lors de la recherche')
    } finally {
      setIsSearching(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteFirstName.trim() || !inviteLastName.trim() || !email.trim()) {
      setInviteError('Veuillez renseigner le prénom et le nom.')
      return
    }

    setIsInviting(true)
    setInviteError(null)

    try {
      const { userId } = await inviteCaregiverByEmail(
        email.trim(),
        inviteFirstName.trim(),
        inviteLastName.trim(),
        employerId,
      )

      toaster.success({ title: 'Invitation envoyée avec succès' })
      setInviteSuccess(true)
      setFoundCaregiver({
        profileId: userId,
        firstName: inviteFirstName.trim(),
        lastName: inviteLastName.trim(),
        email: email.trim(),
      })
    } catch (err) {
      logger.error('Erreur invitation aidant:', err)
      toaster.error({ title: "Erreur lors de l'envoi de l'invitation" })
      setInviteError(err instanceof Error ? err.message : "Erreur lors de l'envoi de l'invitation")
    } finally {
      setIsInviting(false)
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

      toaster.success({ title: 'Aidant ajouté avec succès' })
      onSuccess()
      handleClose()
    } catch (err) {
      toaster.error({ title: "Erreur lors de l'ajout de l'aidant" })
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
            bg="bg.surface"
            borderRadius="12px"
            maxW="500px"
            w="90vw"
            maxH="90vh"
            overflow="auto"
          >
            <Dialog.Header p={6} borderBottomWidth="1px" borderColor="border.default">
              <Dialog.Title fontSize="lg" fontWeight={700} color="brand.500">
                Ajouter un aidant familial
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer" color="brand.500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                      aria-label="Rechercher un aidant par email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      flex={1}
                    />
                    <AccessibleButton
                      onClick={handleSearch}
                      loading={isSearching}
                      loadingText="..."
                      bg="brand.500"
                      color="white"
                      _hover={{ bg: 'brand.600' }}
                    >
                      Rechercher
                    </AccessibleButton>
                  </Flex>
                  <Text fontSize="sm" color="text.muted" mt={1}>
                    Si l'aidant n'a pas de compte, vous pourrez l'inviter par email
                  </Text>
                </Box>

                {/* Erreur (sans invite form) */}
                {error && !showInviteForm && (
                  <Box
                    bg="red.50"
                    borderWidth="1px"
                    borderColor="red.200"
                    borderRadius="10px"
                    p={3}
                  >
                    <Text color="red.700" fontSize="sm">
                      {error}
                    </Text>
                  </Box>
                )}

                {/* Invitation form — shown when no account found */}
                {showInviteForm && !inviteSuccess && (
                  <Box
                    p={5}
                    bg="brand.subtle"
                    borderRadius="12px"
                    borderWidth="1px"
                    borderColor="brand.200"
                  >
                    <Flex align="center" gap={2} mb={3}>
                      <Box color="brand.600" flexShrink={0}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </Box>
                      <Text fontWeight="semibold" color="brand.700">
                        Inviter par email
                      </Text>
                    </Flex>
                    <Text fontSize="sm" color="brand.700" mb={4}>
                      Aucun compte trouvé pour <strong>{email}</strong>.
                      Renseignez le nom de l'aidant pour lui envoyer une invitation.
                      Il recevra un email pour créer son mot de passe.
                    </Text>

                    <Stack gap={3}>
                      <Flex gap={3}>
                        <Box flex={1}>
                          <Text fontSize="sm" fontWeight="medium" mb={1}>
                            Prénom *
                          </Text>
                          <Input
                            placeholder="Prénom"
                            aria-label="Prénom de l'aidant"
                            value={inviteFirstName}
                            onChange={(e) => setInviteFirstName(e.target.value)}
                            size="sm"
                            autoComplete="given-name"
                          />
                        </Box>
                        <Box flex={1}>
                          <Text fontSize="sm" fontWeight="medium" mb={1}>
                            Nom *
                          </Text>
                          <Input
                            placeholder="Nom"
                            aria-label="Nom de famille de l'aidant"
                            value={inviteLastName}
                            onChange={(e) => setInviteLastName(e.target.value)}
                            size="sm"
                            autoComplete="family-name"
                          />
                        </Box>
                      </Flex>

                      {inviteError && (
                        <Box p={3} bg="red.50" borderRadius="10px">
                          <Text fontSize="sm" color="red.700">{inviteError}</Text>
                        </Box>
                      )}

                      <AccessibleButton
                        colorPalette="brand"
                        size="sm"
                        onClick={handleInvite}
                        loading={isInviting}
                        loadingText="Envoi..."
                        disabled={!inviteFirstName.trim() || !inviteLastName.trim()}
                      >
                        Envoyer l'invitation
                      </AccessibleButton>
                    </Stack>
                  </Box>
                )}

                {/* Invitation success */}
                {inviteSuccess && foundCaregiver && (
                  <Box
                    p={5}
                    bg="accent.subtle"
                    borderRadius="12px"
                    borderWidth="1px"
                    borderColor="green.200"
                  >
                    <Flex align="center" gap={2} mb={2}>
                      <Box color="green.600" flexShrink={0}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </Box>
                      <Text fontWeight="semibold" color="green.800">
                        Invitation envoyée
                      </Text>
                    </Flex>
                    <Text fontSize="sm" color="green.700" mb={3}>
                      Un email a été envoyé à <strong>{email}</strong>.
                      {foundCaregiver.firstName} {foundCaregiver.lastName} pourra créer son mot de passe et accéder à Unilien.
                    </Text>
                    <Text fontSize="sm" color="green.700">
                      Vous pouvez maintenant configurer les permissions et ajouter l'aidant.
                    </Text>
                  </Box>
                )}

                {/* Aidant trouvé */}
                {foundCaregiver && (
                  <>
                    <Box
                      bg="accent.subtle"
                      borderWidth="1px"
                      borderColor="green.200"
                      borderRadius="10px"
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
                          <Text fontSize="sm" color="text.muted">
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
                        borderRadius="10px"
                        borderColor="border.default"
                        bg="bg.surface"
                        aria-label="Statut juridique"
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
                      <Text fontSize="xs" color="text.muted" mt={1}>
                        Important : les tuteurs et curateurs ont automatiquement tous les droits
                      </Text>
                    </Box>

                    {/* Message si permissions verrouillées */}
                    {permissionsLocked && (
                      <Box
                        bg="brand.subtle"
                        borderWidth="1px"
                        borderColor="brand.200"
                        borderRadius="10px"
                        p={3}
                      >
                        <Text color="brand.700" fontSize="sm" fontWeight="medium">
                          En tant que {legalStatus === 'tutor' ? 'tuteur' : 'curateur'}, cet aidant aura automatiquement tous les droits.
                        </Text>
                        <Text color="brand.600" fontSize="xs" mt={1}>
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
                              <Text fontSize="xs" color="text.muted">
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
                              <Text fontSize="xs" color="text.muted">
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
                              <Text fontSize="xs" color="text.muted">
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
                              <Text fontSize="xs" color="text.muted">
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
                              <Text fontSize="xs" color="text.muted">
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
                              <Text fontSize="xs" color="text.muted">
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

            <Dialog.Footer p={6} borderTopWidth="1px" borderColor="border.default">
              <Flex gap={3} justify="flex-end">
                <AccessibleButton variant="ghost" onClick={handleClose} color="brand.500">
                  Annuler
                </AccessibleButton>
                <AccessibleButton
                  bg="brand.500"
                  color="white"
                  _hover={{ bg: 'brand.600' }}
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
