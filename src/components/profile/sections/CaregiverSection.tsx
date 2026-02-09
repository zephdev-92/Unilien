import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Stack,
  Flex,
  Text,
  Badge,
  Center,
  Spinner,
  Checkbox,
} from '@chakra-ui/react'
import { AccessibleInput, AccessibleButton, AccessibleSelect } from '@/components/ui'
import { logger } from '@/lib/logger'
import type { Caregiver, CaregiverRelationship, CaregiverLegalStatus, Address } from '@/types'
import { getCaregiver, updateCaregiverProfile } from '@/services/caregiverService'

const caregiverSchema = z.object({
  relationship: z.string().optional(),
  relationshipDetails: z.string().optional(),
  legalStatus: z.string().optional(),
  emergencyPhone: z.string().optional(),
  availabilityHours: z.string().optional(),
  canReplaceEmployer: z.boolean().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
})

type CaregiverFormData = z.infer<typeof caregiverSchema>

interface CaregiverSectionProps {
  profileId: string
}

const relationshipOptions: { value: CaregiverRelationship; label: string }[] = [
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Enfant' },
  { value: 'spouse', label: 'Conjoint(e)' },
  { value: 'sibling', label: 'Frère/Soeur' },
  { value: 'grandparent', label: 'Grand-parent' },
  { value: 'grandchild', label: 'Petit-enfant' },
  { value: 'friend', label: 'Ami(e)' },
  { value: 'neighbor', label: 'Voisin(e)' },
  { value: 'legal_guardian', label: 'Tuteur légal' },
  { value: 'curator', label: 'Curateur' },
  { value: 'other', label: 'Autre' },
]

const legalStatusOptions: { value: CaregiverLegalStatus; label: string }[] = [
  { value: 'none', label: 'Aucun statut particulier' },
  { value: 'tutor', label: 'Tuteur' },
  { value: 'curator', label: 'Curateur' },
  { value: 'safeguard_justice', label: 'Sauvegarde de justice' },
  { value: 'family_caregiver', label: 'Aidant familial reconnu' },
]

export function CaregiverSection({ profileId }: CaregiverSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [canReplaceEmployer, setCanReplaceEmployer] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
  } = useForm<CaregiverFormData>({
    resolver: zodResolver(caregiverSchema),
  })

  const relationshipValue = watch('relationship')

  // Mise à jour automatique du statut juridique selon le type de relation
  useEffect(() => {
    if (relationshipValue === 'legal_guardian') {
      setValue('legalStatus', 'tutor')
    } else if (relationshipValue === 'curator') {
      setValue('legalStatus', 'curator')
    } else if (relationshipValue) {
      setValue('legalStatus', 'none')
    }
  }, [relationshipValue, setValue])

  // Charger les données au montage
  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true)
      try {
        const data = await getCaregiver(profileId)
        setCaregiver(data)
        if (data) {
          reset({
            relationship: data.relationship || '',
            relationshipDetails: data.relationshipDetails || '',
            legalStatus: data.legalStatus || 'none',
            emergencyPhone: data.emergencyPhone || '',
            availabilityHours: data.availabilityHours || '',
            canReplaceEmployer: data.canReplaceEmployer || false,
            street: data.address?.street || '',
            city: data.address?.city || '',
            postalCode: data.address?.postalCode || '',
          })
          setCanReplaceEmployer(data.canReplaceEmployer || false)
        }
      } catch (error) {
        logger.error('Erreur chargement profil aidant:', error)
        setErrorMessage('Erreur lors du chargement des données')
      } finally {
        setIsLoadingData(false)
      }
    }
    loadData()
  }, [profileId, reset])

  const onSubmit = async (data: CaregiverFormData) => {
    if (!caregiver) {
      setErrorMessage("Vous devez d'abord être ajouté par un employeur")
      return
    }

    try {
      setIsLoading(true)
      setSuccessMessage(null)
      setErrorMessage(null)

      const address: Address | undefined =
        data.street || data.city || data.postalCode
          ? {
              street: data.street || '',
              city: data.city || '',
              postalCode: data.postalCode || '',
              country: 'France',
            }
          : undefined

      await updateCaregiverProfile(profileId, {
        relationship: (data.relationship as CaregiverRelationship) || undefined,
        relationshipDetails: data.relationshipDetails || undefined,
        legalStatus: (data.legalStatus as CaregiverLegalStatus) || undefined,
        address,
        emergencyPhone: data.emergencyPhone || undefined,
        availabilityHours: data.availabilityHours || undefined,
        canReplaceEmployer: canReplaceEmployer,
      })

      setSuccessMessage('Profil aidant mis à jour avec succès')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      logger.error('Erreur mise à jour profil aidant:', error)
      setErrorMessage('Erreur lors de la mise à jour')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <Center py={8}>
        <Spinner size="lg" color="brand.500" />
      </Center>
    )
  }

  if (!caregiver) {
    return (
      <Box
        bg="orange.50"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="orange.200"
        p={6}
      >
        <Text fontSize="lg" fontWeight="semibold" color="orange.800" mb={2}>
          Profil aidant non configuré
        </Text>
        <Text color="orange.700">
          Vous devez être ajouté comme aidant par un employeur pour accéder à ces paramètres.
          Une fois ajouté, vous pourrez compléter votre profil aidant ici.
        </Text>
      </Box>
    )
  }

  return (
    <Stack gap={6}>
      {/* Info employeur associé */}
      <Box
        bg="blue.50"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="blue.200"
        p={4}
      >
        <Flex align="center" gap={2}>
          <Badge colorPalette="blue">Aidant actif</Badge>
          <Text fontSize="sm" color="blue.700">
            Vous êtes lié à un employeur
          </Text>
        </Flex>
      </Box>

      {/* Relation avec l'employeur */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Text fontSize="xl" fontWeight="semibold" mb={2}>
          Relation avec l'employeur
        </Text>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Décrivez votre lien avec la personne que vous aidez
        </Text>

        <Stack gap={4}>
          <AccessibleSelect
            label="Type de relation"
            placeholder="Sélectionner..."
            options={relationshipOptions}
            {...register('relationship')}
          />

          {relationshipValue === 'other' && (
            <AccessibleInput
              label="Précisez la relation"
              placeholder="Ex: Cousin, Ami de longue date..."
              {...register('relationshipDetails')}
            />
          )}
        </Stack>
      </Box>

      {/* Statut juridique */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Text fontSize="xl" fontWeight="semibold" mb={2}>
          Statut juridique
        </Text>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Indiquez si vous avez un pouvoir légal sur la personne aidée
        </Text>

        <AccessibleSelect
          label="Statut"
          helperText="Important pour déterminer vos droits et responsabilités"
          options={legalStatusOptions}
          {...register('legalStatus')}
        />
      </Box>

      {/* Coordonnées */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Text fontSize="xl" fontWeight="semibold" mb={2}>
          Coordonnées
        </Text>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Votre adresse si différente de celle de l'employeur
        </Text>

        <Stack gap={4}>
          <AccessibleInput
            label="Adresse"
            placeholder="Numéro et nom de rue"
            {...register('street')}
          />

          <Flex gap={4}>
            <Box flex={1}>
              <AccessibleInput
                label="Code postal"
                placeholder="75001"
                {...register('postalCode')}
              />
            </Box>
            <Box flex={2}>
              <AccessibleInput
                label="Ville"
                placeholder="Paris"
                {...register('city')}
              />
            </Box>
          </Flex>

          <AccessibleInput
            label="Téléphone d'urgence"
            type="tel"
            placeholder="06 12 34 56 78"
            helperText="Numéro à contacter en cas d'urgence"
            {...register('emergencyPhone')}
          />
        </Stack>
      </Box>

      {/* Disponibilités */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Text fontSize="xl" fontWeight="semibold" mb={2}>
          Disponibilités
        </Text>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Indiquez vos disponibilités générales pour aider
        </Text>

        <Stack gap={4}>
          <AccessibleInput
            label="Horaires de disponibilité"
            placeholder="Ex: Lundi-Vendredi 9h-18h, Week-end sur demande"
            helperText="Description libre de vos disponibilités"
            {...register('availabilityHours')}
          />

          <Box
            p={4}
            bg="gray.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="gray.200"
          >
            <Checkbox.Root
              checked={canReplaceEmployer}
              onCheckedChange={(e) => setCanReplaceEmployer(!!e.checked)}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Box>
                  <Text fontWeight="medium">
                    Je peux agir si l'employeur est indisponible
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    En cas d'urgence ou d'indisponibilité de l'employeur, vous pourrez
                    être contacté pour prendre des décisions
                  </Text>
                </Box>
              </Checkbox.Label>
            </Checkbox.Root>
          </Box>
        </Stack>
      </Box>

      {/* Bouton sauvegarder */}
      <Flex justify="flex-end" align="center" gap={4}>
        {errorMessage && (
          <Text color="red.600" fontSize="sm" role="alert">
            {errorMessage}
          </Text>
        )}
        {successMessage && (
          <Text color="green.600" fontSize="sm" role="status">
            {successMessage}
          </Text>
        )}
        <AccessibleButton
          colorPalette="blue"
          loading={isLoading}
          loadingText="Enregistrement..."
          onClick={handleSubmit(onSubmit)}
        >
          Enregistrer les modifications
        </AccessibleButton>
      </Flex>
    </Stack>
  )
}

export default CaregiverSection
