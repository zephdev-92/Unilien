import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Stack, Flex, Text, Switch } from '@chakra-ui/react'
import { AccessibleInput, AccessibleButton, AccessibleSelect } from '@/components/ui'
import { logger } from '@/lib/logger'
import type { Employer, EmergencyContact, PchType } from '@/types'
import { PCH_TYPE_LABELS, PCH_TARIFFS_2026, calcEnveloppePch } from '@/lib/pch/pchTariffs'

const addressSchema = z.object({
  street: z.string().min(1, 'La rue est obligatoire'),
  city: z.string().min(1, 'La ville est obligatoire'),
  postalCode: z.string().regex(/^\d{5}$/, 'Code postal invalide (5 chiffres)'),
  country: z.string(),
})

const handicapCategories = [
  { value: '', label: 'Sélectionnez un type' },
  { value: 'moteur', label: 'Handicap moteur' },
  { value: 'visuel', label: 'Handicap visuel' },
  { value: 'auditif', label: 'Handicap auditif' },
  { value: 'cognitif', label: 'Handicap cognitif' },
  { value: 'psychique', label: 'Handicap psychique' },
  { value: 'polyhandicap', label: 'Polyhandicap' },
  { value: 'maladie_invalidante', label: 'Maladie invalidante' },
  { value: 'autre', label: 'Autre' },
]

const pchTypeOptions = [
  { value: '', label: 'Sélectionnez un type' },
  ...Object.entries(PCH_TYPE_LABELS).map(([value, label]) => ({ value, label })),
]

const employerSchema = z.object({
  address: addressSchema,
  handicapType: z.string().optional(),
  handicapName: z.string().optional(),
  specificNeeds: z.string().optional(),
  cesuNumber: z.string().optional(),
  pchBeneficiary: z.boolean(),
  pchMonthlyAmount: z.number().optional(),
  pchType: z.string().optional(),
  pchMonthlyHours: z.number().min(0).max(744).optional(),
})

type EmployerFormData = z.infer<typeof employerSchema>

interface EmployerSectionProps {
  employer?: Employer
  onSave: (data: Partial<Employer>) => Promise<void>
}

// Mock data for development
const defaultEmployer: Partial<Employer> = {
  address: {
    street: '',
    city: '',
    postalCode: '',
    country: 'France',
  },
  handicapType: '',
  handicapName: '',
  specificNeeds: '',
  cesuNumber: '',
  pchBeneficiary: false,
  pchMonthlyAmount: undefined,
  pchType: undefined,
  pchMonthlyHours: undefined,
  emergencyContacts: [],
}

export function EmployerSection({ employer = defaultEmployer as Employer, onSave }: EmployerSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(
    employer.emergencyContacts || []
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmployerFormData>({
    resolver: zodResolver(employerSchema),
    defaultValues: {
      address: employer.address || defaultEmployer.address,
      handicapType: employer.handicapType || '',
      handicapName: employer.handicapName || '',
      specificNeeds: employer.specificNeeds || '',
      cesuNumber: employer.cesuNumber || '',
      pchBeneficiary: employer.pchBeneficiary || false,
      pchMonthlyAmount: employer.pchMonthlyAmount,
      pchType: employer.pchType || '',
      pchMonthlyHours: employer.pchMonthlyHours,
    },
  })

  const pchBeneficiary = watch('pchBeneficiary')
  const pchType = watch('pchType') as PchType | ''
  const pchMonthlyHours = watch('pchMonthlyHours')

  const pchRate = pchType && pchType in PCH_TARIFFS_2026 ? PCH_TARIFFS_2026[pchType as PchType] : null
  const pchEnveloppe =
    pchRate && pchMonthlyHours
      ? calcEnveloppePch(pchMonthlyHours, pchType as PchType)
      : null

  const onSubmit = async (data: EmployerFormData) => {
    try {
      setIsLoading(true)
      setSuccessMessage(null)
      await onSave({
        ...data,
        pchType: (data.pchType as PchType) || undefined,
        emergencyContacts,
      })
      setSuccessMessage('Informations mises à jour avec succès')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      logger.error('Erreur mise à jour employeur:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addEmergencyContact = () => {
    setEmergencyContacts([
      ...emergencyContacts,
      { name: '', phone: '', relationship: '' },
    ])
  }

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index))
  }

  const updateEmergencyContact = (
    index: number,
    field: keyof EmergencyContact,
    value: string
  ) => {
    const updated = [...emergencyContacts]
    updated[index] = { ...updated[index], [field]: value }
    setEmergencyContacts(updated)
  }

  return (
    <Stack gap={6}>
      {/* Adresse */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Text fontSize="xl" fontWeight="semibold" mb={6}>
          Adresse
        </Text>

        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={5}>
            <AccessibleInput
              label="Rue"
              type="text"
              autoComplete="street-address"
              error={errors.address?.street?.message}
              required
              {...register('address.street')}
            />

            <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
              <Box flex={2}>
                <AccessibleInput
                  label="Ville"
                  type="text"
                  autoComplete="address-level2"
                  error={errors.address?.city?.message}
                  required
                  {...register('address.city')}
                />
              </Box>
              <Box flex={1}>
                <AccessibleInput
                  label="Code postal"
                  type="text"
                  autoComplete="postal-code"
                  error={errors.address?.postalCode?.message}
                  required
                  {...register('address.postalCode')}
                />
              </Box>
            </Flex>
          </Stack>
        </Box>
      </Box>

      {/* Informations médicales */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Text fontSize="xl" fontWeight="semibold" mb={6}>
          Informations complémentaires
        </Text>

        <Stack gap={5}>
          <AccessibleSelect
            label="Type de handicap"
            options={handicapCategories}
            helperText="Optionnel - aide les auxiliaires à mieux vous accompagner"
            {...register('handicapType')}
          />

          <AccessibleInput
            label="Nom ou précision du handicap"
            type="text"
            placeholder="Ex: Paraplégie, DMLA, Autisme..."
            helperText="Précisez votre situation si vous le souhaitez"
            {...register('handicapName')}
          />

          <AccessibleInput
            label="Besoins spécifiques"
            type="text"
            placeholder="Précisions sur vos besoins..."
            helperText="Optionnel"
            {...register('specificNeeds')}
          />

          <AccessibleInput
            label="Numéro CESU"
            type="text"
            placeholder="Votre numéro CESU"
            helperText="Chèque Emploi Service Universel"
            {...register('cesuNumber')}
          />

          <Flex
            justify="space-between"
            align="center"
            p={4}
            bg="gray.50"
            borderRadius="md"
          >
            <Box>
              <Text fontWeight="medium">Bénéficiaire PCH</Text>
              <Text fontSize="sm" color="gray.600">
                Prestation de Compensation du Handicap
              </Text>
            </Box>
            <Switch.Root
              checked={pchBeneficiary}
              onCheckedChange={(details) => setValue('pchBeneficiary', details.checked)}
            >
              <Switch.HiddenInput aria-label="Bénéficiaire PCH" />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </Flex>

          {pchBeneficiary && (
            <>
              <AccessibleInput
                label="Montant PCH mensuel (€)"
                type="number"
                placeholder="Ex: 1200"
                helperText="Montant total alloué par le Conseil Départemental"
                {...register('pchMonthlyAmount', { valueAsNumber: true })}
              />

              <AccessibleSelect
                label="Type de dispositif PCH"
                options={pchTypeOptions}
                helperText="Détermine le tarif horaire de référence"
                {...register('pchType')}
              />

              <AccessibleInput
                label="Heures allouées par mois"
                type="number"
                placeholder="Ex: 60"
                helperText="Nombre d'heures accordées par votre plan de compensation"
                {...register('pchMonthlyHours', { valueAsNumber: true })}
              />

              {pchRate !== null && (
                <Box
                  p={3}
                  bg="blue.50"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="blue.200"
                >
                  <Text fontSize="sm" color="blue.800">
                    <Text as="span" fontWeight="medium">Tarif appliqué :</Text>{' '}
                    {pchRate.toFixed(2).replace('.', ',')} €/h
                    {pchEnveloppe !== null && (
                      <>
                        {' — '}
                        <Text as="span" fontWeight="medium">Enveloppe estimée :</Text>{' '}
                        {Math.round(pchEnveloppe).toLocaleString('fr-FR')} €/mois
                      </>
                    )}
                  </Text>
                </Box>
              )}
            </>
          )}
        </Stack>
      </Box>

      {/* Contacts d'urgence */}
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
      >
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Text fontSize="xl" fontWeight="semibold">
              Contacts d'urgence
            </Text>
            <Text fontSize="sm" color="gray.600">
              Personnes à contacter en cas d'urgence
            </Text>
          </Box>
          <AccessibleButton
            size="sm"
            variant="outline"
            onClick={addEmergencyContact}
          >
            + Ajouter
          </AccessibleButton>
        </Flex>

        {emergencyContacts.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={4}>
            Aucun contact d'urgence enregistré
          </Text>
        ) : (
          <Stack gap={4}>
            {emergencyContacts.map((contact, index) => (
              <Box
                key={index}
                p={4}
                bg="gray.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
              >
                <Flex justify="space-between" align="start" mb={4}>
                  <Text fontWeight="medium">Contact {index + 1}</Text>
                  <AccessibleButton
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => removeEmergencyContact(index)}
                    accessibleLabel={`Supprimer le contact ${index + 1}`}
                  >
                    Supprimer
                  </AccessibleButton>
                </Flex>
                <Stack gap={3}>
                  <AccessibleInput
                    label="Nom"
                    type="text"
                    value={contact.name}
                    onChange={(e) =>
                      updateEmergencyContact(index, 'name', e.target.value)
                    }
                  />
                  <AccessibleInput
                    label="Téléphone"
                    type="tel"
                    value={contact.phone}
                    onChange={(e) =>
                      updateEmergencyContact(index, 'phone', e.target.value)
                    }
                  />
                  <AccessibleInput
                    label="Relation"
                    type="text"
                    placeholder="Ex: Fils, voisin..."
                    value={contact.relationship}
                    onChange={(e) =>
                      updateEmergencyContact(index, 'relationship', e.target.value)
                    }
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
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

export default EmployerSection
