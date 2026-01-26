import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Stack, Flex, Text, Badge, IconButton } from '@chakra-ui/react'
import { AccessibleInput, AccessibleButton } from '@/components/ui'
import type { Employee } from '@/types'

const employeeSchema = z.object({
  maxDistanceKm: z.number().min(1).max(100).optional(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      maxDistanceKm: employee?.maxDistanceKm,
    },
  })

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setIsLoading(true)
      setSuccessMessage(null)
      await onSave({
        ...data,
        qualifications,
        languages,
      })
      setSuccessMessage('Informations mises à jour avec succès')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Erreur mise à jour employé:', error)
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
