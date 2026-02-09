import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Stack, Flex, Text, Badge, IconButton, Switch } from '@chakra-ui/react'
import { AccessibleInput, AccessibleButton, AccessibleSelect } from '@/components/ui'
import { logger } from '@/lib/logger'
import type { Employee, DriversLicense } from '@/types'

const employeeSchema = z.object({
  maxDistanceKm: z.number().min(1).max(100).optional(),
  // Adresse
  street: z.string().optional(),
  postalCode: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{5}$/.test(val), 'Code postal invalide (5 chiffres)'),
  city: z.string().optional(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

const licenseTypeOptions = [
  { value: 'B', label: 'Permis B (voiture)' },
  { value: 'A', label: 'Permis A (moto)' },
  { value: 'C', label: 'Permis C (poids lourd)' },
  { value: 'D', label: 'Permis D (transport en commun)' },
  { value: 'BE', label: 'Permis BE (remorque)' },
  { value: 'other', label: 'Autre' },
]

interface EmployeeSectionProps {
  employee?: Partial<Employee>
  onSave: (data: Partial<Employee>) => Promise<void>
}

const availableQualifications = [
  'Aide à la toilette',
  'Aide au repas',
  'Aide au lever/coucher',
  'Accompagnement sorties',
  'Entretien du logement',
  'Courses',
  'Garde de nuit',
  'Soins infirmiers',
  'Kinésithérapie',
  'Ergothérapie',
]

const availableLanguages = [
  'Français',
  'Anglais',
  'Espagnol',
  'Portugais',
  'Arabe',
  'Chinois',
  'Allemand',
  'Italien',
  'Langue des signes (LSF)',
]

export function EmployeeSection({ employee, onSave }: EmployeeSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [qualifications, setQualifications] = useState<string[]>(
    employee?.qualifications || []
  )
  const [languages, setLanguages] = useState<string[]>(
    employee?.languages || ['Français']
  )
  const [newQualification, setNewQualification] = useState('')

  // État pour le permis de conduire
  const [driversLicense, setDriversLicense] = useState<DriversLicense>({
    hasLicense: employee?.driversLicense?.hasLicense || false,
    licenseType: employee?.driversLicense?.licenseType,
    hasVehicle: employee?.driversLicense?.hasVehicle || false,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      maxDistanceKm: employee?.maxDistanceKm,
      street: employee?.address?.street || '',
      postalCode: employee?.address?.postalCode || '',
      city: employee?.address?.city || '',
    },
  })

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setIsLoading(true)
      setSuccessMessage(null)

      // Construire l'objet address
      const address =
        data.street || data.postalCode || data.city
          ? {
              street: data.street || '',
              postalCode: data.postalCode || '',
              city: data.city || '',
              country: 'France',
            }
          : undefined

      await onSave({
        maxDistanceKm: data.maxDistanceKm,
        qualifications,
        languages,
        driversLicense: driversLicense.hasLicense ? driversLicense : undefined,
        address,
      })
      setSuccessMessage('Informations mises à jour avec succès')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      logger.error('Erreur mise à jour employé:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addQualification = (qual: string) => {
    if (qual && !qualifications.includes(qual)) {
      setQualifications([...qualifications, qual])
    }
    setNewQualification('')
  }

  const removeQualification = (qual: string) => {
    setQualifications(qualifications.filter((q) => q !== qual))
  }

  const addLanguage = (lang: string) => {
    if (lang && !languages.includes(lang)) {
      setLanguages([...languages, lang])
    }
  }

  const removeLanguage = (lang: string) => {
    setLanguages(languages.filter((l) => l !== lang))
  }

  return (
    <Stack gap={6}>
      {/* Qualifications */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Text fontSize="xl" fontWeight="semibold" mb={2}>
          Qualifications
        </Text>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Vos compétences et services proposés
        </Text>

        {/* Tags sélectionnés */}
        <Flex wrap="wrap" gap={2} mb={4}>
          {qualifications.map((qual) => (
            <Badge
              key={qual}
              colorPalette="blue"
              px={3}
              py={1}
              borderRadius="full"
              display="flex"
              alignItems="center"
              gap={1}
            >
              {qual}
              <IconButton
                aria-label={`Retirer ${qual}`}
                size="xs"
                variant="ghost"
                minW="auto"
                h="auto"
                p={0}
                ml={1}
                onClick={() => removeQualification(qual)}
              >
                ✕
              </IconButton>
            </Badge>
          ))}
          {qualifications.length === 0 && (
            <Text color="gray.500" fontSize="sm">
              Aucune qualification sélectionnée
            </Text>
          )}
        </Flex>

        {/* Suggestions */}
        <Text fontSize="sm" fontWeight="medium" mb={2}>
          Suggestions :
        </Text>
        <Flex wrap="wrap" gap={2} mb={4}>
          {availableQualifications
            .filter((q) => !qualifications.includes(q))
            .map((qual) => (
              <Badge
                key={qual}
                variant="outline"
                colorPalette="gray"
                px={3}
                py={1}
                borderRadius="full"
                cursor="pointer"
                _hover={{ bg: 'gray.100' }}
                onClick={() => addQualification(qual)}
              >
                + {qual}
              </Badge>
            ))}
        </Flex>

        {/* Ajout personnalisé */}
        <Flex gap={2}>
          <Box flex={1}>
            <AccessibleInput
              label="Ajouter une qualification"
              hideLabel
              placeholder="Autre qualification..."
              value={newQualification}
              onChange={(e) => setNewQualification(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addQualification(newQualification)
                }
              }}
            />
          </Box>
          <AccessibleButton
            variant="outline"
            onClick={() => addQualification(newQualification)}
            disabled={!newQualification}
          >
            Ajouter
          </AccessibleButton>
        </Flex>
      </Box>

      {/* Langues */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Text fontSize="xl" fontWeight="semibold" mb={2}>
          Langues parlées
        </Text>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Langues dans lesquelles vous pouvez communiquer
        </Text>

        {/* Tags sélectionnés */}
        <Flex wrap="wrap" gap={2} mb={4}>
          {languages.map((lang) => (
            <Badge
              key={lang}
              colorPalette="green"
              px={3}
              py={1}
              borderRadius="full"
              display="flex"
              alignItems="center"
              gap={1}
            >
              {lang}
              <IconButton
                aria-label={`Retirer ${lang}`}
                size="xs"
                variant="ghost"
                minW="auto"
                h="auto"
                p={0}
                ml={1}
                onClick={() => removeLanguage(lang)}
              >
                ✕
              </IconButton>
            </Badge>
          ))}
        </Flex>

        {/* Suggestions */}
        <Text fontSize="sm" fontWeight="medium" mb={2}>
          Ajouter une langue :
        </Text>
        <Flex wrap="wrap" gap={2}>
          {availableLanguages
            .filter((l) => !languages.includes(l))
            .map((lang) => (
              <Badge
                key={lang}
                variant="outline"
                colorPalette="gray"
                px={3}
                py={1}
                borderRadius="full"
                cursor="pointer"
                _hover={{ bg: 'gray.100' }}
                onClick={() => addLanguage(lang)}
              >
                + {lang}
              </Badge>
            ))}
        </Flex>
      </Box>

      {/* Permis de conduire */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Text fontSize="xl" fontWeight="semibold" mb={2}>
          Permis de conduire
        </Text>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Indiquez si vous possédez le permis et un véhicule
        </Text>

        <Stack gap={4}>
          <Flex
            justify="space-between"
            align="center"
            p={4}
            bg="gray.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="gray.200"
          >
            <Box>
              <Text fontWeight="medium">Je possède le permis de conduire</Text>
            </Box>
            <Switch.Root
              checked={driversLicense.hasLicense}
              onCheckedChange={(details) =>
                setDriversLicense({
                  ...driversLicense,
                  hasLicense: details.checked,
                  // Réinitialiser les autres champs si pas de permis
                  licenseType: details.checked ? driversLicense.licenseType : undefined,
                  hasVehicle: details.checked ? driversLicense.hasVehicle : false,
                })
              }
            >
              <Switch.HiddenInput aria-label="J'ai le permis de conduire" />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </Flex>

          {driversLicense.hasLicense && (
            <>
              <AccessibleSelect
                label="Type de permis"
                options={licenseTypeOptions}
                placeholder="Sélectionnez le type de permis"
                value={driversLicense.licenseType || ''}
                onChange={(e) =>
                  setDriversLicense({
                    ...driversLicense,
                    licenseType: e.target.value as DriversLicense['licenseType'],
                  })
                }
              />

              <Flex
                justify="space-between"
                align="center"
                p={4}
                bg="gray.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
              >
                <Box>
                  <Text fontWeight="medium">Je dispose d'un véhicule personnel</Text>
                  <Text fontSize="sm" color="gray.600">
                    Vous pouvez vous déplacer de manière autonome
                  </Text>
                </Box>
                <Switch.Root
                  checked={driversLicense.hasVehicle}
                  onCheckedChange={(details) =>
                    setDriversLicense({
                      ...driversLicense,
                      hasVehicle: details.checked,
                    })
                  }
                >
                  <Switch.HiddenInput aria-label="J'ai un véhicule personnel" />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </Flex>
            </>
          )}
        </Stack>
      </Box>

      {/* Adresse */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Text fontSize="xl" fontWeight="semibold" mb={2}>
          Adresse
        </Text>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Votre adresse de domicile (utilisée pour calculer les distances)
        </Text>

        <Stack gap={4}>
          <AccessibleInput
            label="Rue"
            placeholder="123 rue de la Paix"
            error={errors.street?.message}
            {...register('street')}
          />

          <Flex gap={4}>
            <Box flex={1}>
              <AccessibleInput
                label="Code postal"
                placeholder="75001"
                maxLength={5}
                error={errors.postalCode?.message}
                {...register('postalCode')}
              />
            </Box>
            <Box flex={2}>
              <AccessibleInput
                label="Ville"
                placeholder="Paris"
                error={errors.city?.message}
                {...register('city')}
              />
            </Box>
          </Flex>
        </Stack>
      </Box>

      {/* Distance max */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Text fontSize="xl" fontWeight="semibold" mb={6}>
          Zone de déplacement
        </Text>

        <AccessibleInput
          label="Distance maximale de déplacement"
          type="number"
          placeholder="Ex: 20"
          helperText="En kilomètres depuis votre domicile"
          error={errors.maxDistanceKm?.message}
          {...register('maxDistanceKm', { valueAsNumber: true })}
        />
      </Box>

      {/* Bouton sauvegarder */}
      <Flex justify="flex-end">
        {successMessage && (
          <Text color="green.600" fontSize="sm" mr={4} alignSelf="center" role="status">
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

export default EmployeeSection
