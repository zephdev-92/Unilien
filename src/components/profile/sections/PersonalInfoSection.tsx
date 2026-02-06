import { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Stack, Flex, Text, Avatar, Input } from '@chakra-ui/react'
import { AccessibleInput, AccessibleButton } from '@/components/ui'
import { uploadAvatar, deleteAvatar, validateAvatarFile } from '@/services/profileService'
import { logger } from '@/lib/logger'
import type { Profile } from '@/types'

const personalInfoSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Le prénom est obligatoire')
    .min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z
    .string()
    .min(1, 'Le nom est obligatoire')
    .min(2, 'Le nom doit contenir au moins 2 caractères'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+33|0)[1-9](\d{2}){4}$/.test(val.replace(/\s/g, '')),
      'Numéro de téléphone invalide'
    ),
})

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>

interface PersonalInfoSectionProps {
  profile: Profile
  onSave: (data: Partial<Profile>) => Promise<void>
  onAvatarChange?: (avatarUrl: string | undefined) => void
}

export function PersonalInfoSection({ profile, onSave, onAvatarChange }: PersonalInfoSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone || '',
    },
  })

  const onSubmit = async (data: PersonalInfoFormData) => {
    try {
      setIsLoading(true)
      setSuccessMessage(null)
      await onSave({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
      })
      setSuccessMessage('Profil mis à jour avec succès')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      logger.error('Erreur mise à jour profil:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Gestion de la sélection de fichier
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Réinitialiser l'input pour permettre de sélectionner le même fichier
      event.target.value = ''

      // Valider le fichier
      const validation = validateAvatarFile(file)
      if (!validation.valid) {
        setAvatarError(validation.error || 'Fichier invalide')
        return
      }

      // Afficher la prévisualisation
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
      setAvatarError(null)

      try {
        setAvatarLoading(true)
        const result = await uploadAvatar(profile.id, file)

        // Notifier le parent du changement
        onAvatarChange?.(result.url)

        setSuccessMessage('Photo de profil mise à jour')
        setTimeout(() => setSuccessMessage(null), 3000)
      } catch (error) {
        logger.error('Erreur upload avatar:', error)
        setAvatarError(
          error instanceof Error ? error.message : 'Erreur lors de l\'upload'
        )
        // Réinitialiser la prévisualisation en cas d'erreur
        setPreviewUrl(null)
      } finally {
        setAvatarLoading(false)
        // Libérer l'URL de prévisualisation
        URL.revokeObjectURL(objectUrl)
        setPreviewUrl(null)
      }
    },
    [profile.id, onAvatarChange]
  )

  // Ouvrir le sélecteur de fichier
  const handleClickUpload = () => {
    fileInputRef.current?.click()
  }

  // Supprimer l'avatar
  const handleDeleteAvatar = useCallback(async () => {
    if (!profile.avatarUrl) return

    try {
      setAvatarLoading(true)
      setAvatarError(null)
      await deleteAvatar(profile.id)
      onAvatarChange?.(undefined)
      setSuccessMessage('Photo de profil supprimée')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      logger.error('Erreur suppression avatar:', error)
      setAvatarError(
        error instanceof Error ? error.message : 'Erreur lors de la suppression'
      )
    } finally {
      setAvatarLoading(false)
    }
  }, [profile.id, profile.avatarUrl, onAvatarChange])

  // URL de l'avatar à afficher (prévisualisation ou actuel)
  const displayAvatarUrl = previewUrl || profile.avatarUrl

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
    >
      <Text fontSize="xl" fontWeight="semibold" mb={6}>
        Informations personnelles
      </Text>

      <Stack gap={6}>
        {/* Avatar */}
        <Flex align="center" gap={4}>
          <Box position="relative">
            <Avatar.Root size="xl">
              <Avatar.Fallback name={`${profile.firstName} ${profile.lastName}`} />
              {displayAvatarUrl && <Avatar.Image src={displayAvatarUrl} />}
            </Avatar.Root>
            {avatarLoading && (
              <Box
                position="absolute"
                inset={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="blackAlpha.500"
                borderRadius="full"
              >
                <Box
                  as="span"
                  w="24px"
                  h="24px"
                  borderWidth="3px"
                  borderColor="white"
                  borderTopColor="transparent"
                  borderRadius="full"
                  animation="spin 1s linear infinite"
                  css={{
                    '@keyframes spin': {
                      to: { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </Box>
            )}
          </Box>
          <Box>
            <Text fontWeight="medium" mb={1}>
              Photo de profil
            </Text>
            <Text fontSize="sm" color="gray.500" mb={2}>
              JPG, PNG, GIF ou WebP. Max 2 Mo.
            </Text>

            {/* Input fichier caché */}
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              display="none"
              aria-label="Sélectionner une photo de profil"
            />

            <Flex gap={2} flexWrap="wrap">
              <AccessibleButton
                size="sm"
                variant="outline"
                onClick={handleClickUpload}
                loading={avatarLoading}
                loadingText="Upload..."
                accessibleLabel="Modifier la photo de profil"
              >
                {profile.avatarUrl ? 'Modifier' : 'Ajouter'}
              </AccessibleButton>

              {profile.avatarUrl && (
                <AccessibleButton
                  size="sm"
                  variant="ghost"
                  colorPalette="red"
                  onClick={handleDeleteAvatar}
                  disabled={avatarLoading}
                  accessibleLabel="Supprimer la photo de profil"
                >
                  Supprimer
                </AccessibleButton>
              )}
            </Flex>

            {avatarError && (
              <Text color="red.500" fontSize="sm" mt={2} role="alert">
                {avatarError}
              </Text>
            )}
          </Box>
        </Flex>

        {/* Formulaire */}
        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={5}>
            <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
              <Box flex={1}>
                <AccessibleInput
                  label="Prénom"
                  type="text"
                  autoComplete="given-name"
                  error={errors.firstName?.message}
                  required
                  {...register('firstName')}
                />
              </Box>
              <Box flex={1}>
                <AccessibleInput
                  label="Nom"
                  type="text"
                  autoComplete="family-name"
                  error={errors.lastName?.message}
                  required
                  {...register('lastName')}
                />
              </Box>
            </Flex>

            <AccessibleInput
              label="Adresse email"
              type="email"
              value={profile.email}
              readOnly
              disabled
              helperText="L'email ne peut pas être modifié"
            />

            <AccessibleInput
              label="Téléphone"
              type="tel"
              autoComplete="tel"
              placeholder="06 12 34 56 78"
              error={errors.phone?.message}
              helperText="Pour recevoir des notifications SMS"
              {...register('phone')}
            />

            {successMessage && (
              <Text color="green.600" fontSize="sm" role="status" aria-live="polite">
                {successMessage}
              </Text>
            )}

            <Flex justify="flex-end">
              <AccessibleButton
                type="submit"
                colorPalette="blue"
                loading={isLoading}
                loadingText="Enregistrement..."
                disabled={!isDirty}
              >
                Enregistrer
              </AccessibleButton>
            </Flex>
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}

export default PersonalInfoSection
