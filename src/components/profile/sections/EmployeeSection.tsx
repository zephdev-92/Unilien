import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Stack, Flex, Text } from '@chakra-ui/react'
import { AccessibleInput, AccessibleButton } from '@/components/ui'
import { logger } from '@/lib/logger'
import type { Employee, DriversLicense } from '@/types'
import { QualificationsSubSection } from './QualificationsSubSection'
import { LanguagesSubSection } from './LanguagesSubSection'
import { DriversLicenseSubSection } from './DriversLicenseSubSection'

const employeeSchema = z.object({
  maxDistanceKm: z.number().min(1).max(100).optional(),
  street: z.string().optional(),
  postalCode: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{5}$/.test(val), 'Code postal invalide (5 chiffres)'),
  city: z.string().optional(),
  dateOfBirth: z.string().optional(),
  socialSecurityNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{13,15}$/.test(val.replace(/\s/g, '')),
      'N° de sécurité sociale invalide (13 à 15 chiffres)'
    ),
  iban: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[A-Z]{2}\d{2}[\s\dA-Z]{10,30}$/.test(val.replace(/\s/g, '')),
      'IBAN invalide'
    ),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

interface EmployeeSectionProps {
  employee?: Partial<Employee>
  onSave: (data: Partial<Employee>) => Promise<void>
}

export function EmployeeSection({ employee, onSave }: EmployeeSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [qualifications, setQualifications] = useState<string[]>(employee?.qualifications || [])
  const [languages, setLanguages] = useState<string[]>(employee?.languages || ['Français'])
  const [newQualification, setNewQualification] = useState('')
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
      dateOfBirth: employee?.dateOfBirth || '',
      socialSecurityNumber: employee?.socialSecurityNumber || '',
      iban: employee?.iban || '',
    },
  })

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setIsLoading(true)
      setSuccessMessage(null)
      const address =
        data.street || data.postalCode || data.city
          ? { street: data.street || '', postalCode: data.postalCode || '', city: data.city || '', country: 'France' }
          : undefined
      await onSave({
        maxDistanceKm: data.maxDistanceKm,
        qualifications,
        languages,
        driversLicense: driversLicense.hasLicense ? driversLicense : undefined,
        address,
        dateOfBirth: data.dateOfBirth || undefined,
        socialSecurityNumber: data.socialSecurityNumber || undefined,
        iban: data.iban || undefined,
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
    if (qual && !qualifications.includes(qual)) setQualifications([...qualifications, qual])
    setNewQualification('')
  }

  const addLanguage = (lang: string) => {
    if (lang && !languages.includes(lang)) setLanguages([...languages, lang])
  }

  return (
    <Stack gap={6}>
      {/* Informations personnelles */}
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" p={6}>
        <Text fontSize="xl" fontWeight="semibold" mb={2}>Informations administratives</Text>
        <Text fontSize="sm" color="text.muted" mb={4}>
          Données utilisées pour les déclarations URSSAF et bulletins de paie
        </Text>
        <Stack gap={4}>
          <AccessibleInput
            label="Date de naissance"
            type="date"
            error={errors.dateOfBirth?.message}
            {...register('dateOfBirth')}
          />

          <AccessibleInput
            label="N° de sécurité sociale"
            placeholder="2 89 03 14 075 089"
            helperText="Utilisé pour les déclarations URSSAF et les bulletins de paie"
            error={errors.socialSecurityNumber?.message}
            {...register('socialSecurityNumber')}
          />

          <AccessibleInput
            label="IBAN"
            placeholder="FR76 1234 5678 9012 3456 7890 143"
            helperText="Utilisé uniquement pour le virement de votre salaire"
            error={errors.iban?.message}
            {...register('iban')}
          />
        </Stack>
      </Box>

      <QualificationsSubSection
        qualifications={qualifications}
        newQualification={newQualification}
        onNewQualificationChange={setNewQualification}
        onAdd={addQualification}
        onRemove={(q) => setQualifications(qualifications.filter((x) => x !== q))}
      />

      <LanguagesSubSection
        languages={languages}
        onAdd={addLanguage}
        onRemove={(l) => setLanguages(languages.filter((x) => x !== l))}
      />

      <DriversLicenseSubSection
        driversLicense={driversLicense}
        onChange={setDriversLicense}
      />

      {/* Adresse */}
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" p={6}>
        <Text fontSize="xl" fontWeight="semibold" mb={2}>Adresse</Text>
        <Text fontSize="sm" color="text.muted" mb={4}>
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
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" p={6}>
        <Text fontSize="xl" fontWeight="semibold" mb={6}>Zone de déplacement</Text>
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
          colorPalette="brand"
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
