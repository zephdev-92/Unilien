import { useState } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Steps,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addMonths } from 'date-fns'
import { AccessibleInput, AccessibleSelect, AccessibleButton } from '@/components/ui'
import { createContract, searchAuxiliaryByEmail } from '@/services/auxiliaryService'

const searchSchema = z.object({
  email: z.string().email('Adresse email invalide'),
})

const contractSchema = z.object({
  contractType: z.enum(['CDI', 'CDD']),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().optional(),
  weeklyHours: z.coerce
    .number()
    .min(1, 'Minimum 1 heure')
    .max(48, 'Maximum 48 heures par semaine'),
  hourlyRate: z.coerce
    .number()
    .min(11.65, 'Le taux horaire minimum est de 11,65€ (SMIC)')
    .max(100, 'Taux horaire maximum dépassé'),
}).refine(
  (data) => {
    if (data.contractType === 'CDD' && !data.endDate) {
      return false
    }
    return true
  },
  {
    message: 'La date de fin est requise pour un CDD',
    path: ['endDate'],
  }
).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true
    return new Date(data.endDate) >= new Date(data.startDate)
  },
  {
    message: 'La date de début ne peut pas être postérieure à la date de fin',
    path: ['startDate'],
  }
).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true
    return new Date(data.endDate) >= new Date(data.startDate)
  },
  {
    message: 'La date de fin ne peut pas être antérieure à la date de début',
    path: ['endDate'],
  }
)

type SearchFormData = z.infer<typeof searchSchema>
type ContractFormData = z.infer<typeof contractSchema>

interface NewContractModalProps {
  isOpen: boolean
  onClose: () => void
  employerId: string
  onSuccess: () => void
}

export function NewContractModal({
  isOpen,
  onClose,
  employerId,
  onSuccess,
}: NewContractModalProps) {
  const [step, setStep] = useState(0)
  const [foundEmployee, setFoundEmployee] = useState<{
    id: string
    firstName: string
    lastName: string
  } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const searchForm = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
  })

  const contractForm = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractType: 'CDI',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      weeklyHours: 20,
      hourlyRate: 13,
    },
  })

  const watchContractType = contractForm.watch('contractType')

  // Réinitialiser à la fermeture
  const handleClose = () => {
    setStep(0)
    setFoundEmployee(null)
    setSearchError(null)
    setSubmitError(null)
    searchForm.reset()
    contractForm.reset()
    onClose()
  }

  // Rechercher l'auxiliaire par email
  const onSearch = async (data: SearchFormData) => {
    setIsSearching(true)
    setSearchError(null)

    try {
      const employee = await searchAuxiliaryByEmail(data.email)

      if (!employee) {
        setSearchError(
          'Aucun auxiliaire trouvé avec cette adresse email. ' +
            'L\'auxiliaire doit d\'abord créer un compte sur Unilien.'
        )
        return
      }

      setFoundEmployee(employee)
      setStep(1)
    } catch (error) {
      console.error('Erreur recherche:', error)
      setSearchError('Une erreur est survenue lors de la recherche')
    } finally {
      setIsSearching(false)
    }
  }

  // Créer le contrat
  const onSubmitContract = async (data: ContractFormData) => {
    if (!foundEmployee) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await createContract(employerId, foundEmployee.id, {
        contractType: data.contractType,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        weeklyHours: data.weeklyHours,
        hourlyRate: data.hourlyRate,
      })

      onSuccess()
    } catch (error) {
      console.error('Erreur création contrat:', error)
      setSubmitError(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      )
    } finally {
      setIsSubmitting(false)
    }
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
                Ajouter un auxiliaire
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer">
                  X
                </AccessibleButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body p={6}>
              {/* Indicateur d'étapes */}
              <Steps.Root step={step} count={2} mb={6}>
                <Steps.List>
                  <Steps.Item index={0}>
                    <Steps.Trigger>
                      <Steps.Indicator />
                      <Steps.Title>Rechercher</Steps.Title>
                    </Steps.Trigger>
                    <Steps.Separator />
                  </Steps.Item>
                  <Steps.Item index={1}>
                    <Steps.Trigger>
                      <Steps.Indicator />
                      <Steps.Title>Contrat</Steps.Title>
                    </Steps.Trigger>
                  </Steps.Item>
                </Steps.List>
              </Steps.Root>

              {/* Étape 1: Recherche */}
              {step === 0 && (
                <form onSubmit={searchForm.handleSubmit(onSearch)}>
                  <Stack gap={4}>
                    <Text color="gray.600">
                      Recherchez l'auxiliaire par son adresse email. Il doit avoir
                      un compte Unilien avec le rôle "Auxiliaire de vie".
                    </Text>

                    <AccessibleInput
                      label="Email de l'auxiliaire"
                      type="email"
                      placeholder="auxiliaire@email.com"
                      error={searchForm.formState.errors.email?.message}
                      required
                      {...searchForm.register('email')}
                    />

                    {searchError && (
                      <Box p={4} bg="orange.50" borderRadius="md">
                        <Text color="orange.700">{searchError}</Text>
                      </Box>
                    )}

                    <AccessibleButton
                      type="submit"
                      colorPalette="blue"
                      loading={isSearching}
                      loadingText="Recherche..."
                    >
                      Rechercher
                    </AccessibleButton>
                  </Stack>
                </form>
              )}

              {/* Étape 2: Détails du contrat */}
              {step === 1 && foundEmployee && (
                <form
                  id="contract-form"
                  onSubmit={contractForm.handleSubmit(onSubmitContract)}
                >
                  <Stack gap={4}>
                    {/* Auxiliaire trouvé */}
                    <Box p={4} bg="green.50" borderRadius="md">
                      <Flex justify="space-between" align="center">
                        <Box>
                          <Text fontWeight="semibold" color="green.700">
                            Auxiliaire trouvé
                          </Text>
                          <Text fontSize="lg" color="green.800">
                            {foundEmployee.firstName} {foundEmployee.lastName}
                          </Text>
                        </Box>
                        <AccessibleButton
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setStep(0)
                            setFoundEmployee(null)
                          }}
                        >
                          Modifier
                        </AccessibleButton>
                      </Flex>
                    </Box>

                    <AccessibleSelect
                      label="Type de contrat"
                      options={[
                        { value: 'CDI', label: 'CDI - Contrat à durée indéterminée' },
                        { value: 'CDD', label: 'CDD - Contrat à durée déterminée' },
                      ]}
                      error={contractForm.formState.errors.contractType?.message}
                      required
                      {...contractForm.register('contractType')}
                    />

                    <AccessibleInput
                      label="Date de début"
                      type="date"
                      error={contractForm.formState.errors.startDate?.message}
                      required
                      {...contractForm.register('startDate')}
                    />

                    {watchContractType === 'CDD' && (
                      <AccessibleInput
                        label="Date de fin"
                        type="date"
                        helperText="Obligatoire pour un CDD"
                        error={contractForm.formState.errors.endDate?.message}
                        required
                        defaultValue={format(addMonths(new Date(), 6), 'yyyy-MM-dd')}
                        {...contractForm.register('endDate')}
                      />
                    )}

                    <Flex gap={4}>
                      <Box flex={1}>
                        <AccessibleInput
                          label="Heures/semaine"
                          type="number"
                          helperText="Heures contractuelles"
                          error={contractForm.formState.errors.weeklyHours?.message}
                          required
                          {...contractForm.register('weeklyHours')}
                        />
                      </Box>
                      <Box flex={1}>
                        <AccessibleInput
                          label="Taux horaire (€)"
                          type="number"
                          step="0.01"
                          helperText="Minimum SMIC: 11,65€"
                          error={contractForm.formState.errors.hourlyRate?.message}
                          required
                          {...contractForm.register('hourlyRate')}
                        />
                      </Box>
                    </Flex>

                    {/* Récapitulatif */}
                    <Box p={4} bg="gray.50" borderRadius="md">
                      <Text fontWeight="medium" mb={2}>
                        Estimation mensuelle
                      </Text>
                      <Text color="gray.700">
                        {contractForm.watch('weeklyHours') || 0}h × 4,33 semaines ×{' '}
                        {contractForm.watch('hourlyRate') || 0}€ ={' '}
                        <Text as="span" fontWeight="bold">
                          {(
                            (contractForm.watch('weeklyHours') || 0) *
                            4.33 *
                            (contractForm.watch('hourlyRate') || 0)
                          ).toFixed(2)}
                          € brut/mois
                        </Text>
                      </Text>
                    </Box>

                    {submitError && (
                      <Box p={4} bg="red.50" borderRadius="md">
                        <Text color="red.700">{submitError}</Text>
                      </Box>
                    )}
                  </Stack>
                </form>
              )}
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px">
              <Flex gap={3} justify="flex-end">
                <AccessibleButton
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSearching || isSubmitting}
                >
                  Annuler
                </AccessibleButton>

                {step === 1 && (
                  <AccessibleButton
                    type="submit"
                    form="contract-form"
                    colorPalette="blue"
                    loading={isSubmitting}
                    loadingText="Création..."
                  >
                    Créer le contrat
                  </AccessibleButton>
                )}
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default NewContractModal
