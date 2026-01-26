import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Textarea,
  Separator,
} from '@chakra-ui/react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { AccessibleInput, AccessibleSelect, AccessibleButton } from '@/components/ui'
import { ComplianceAlert, PaySummary, ComplianceBadge } from '@/components/compliance'
import { getContractsForEmployer, type ContractWithEmployee } from '@/services/contractService'
import { createShift, getShifts } from '@/services/shiftService'
import { useComplianceCheck } from '@/hooks/useComplianceCheck'
import type { ShiftForValidation } from '@/lib/compliance'

const shiftSchema = z.object({
  contractId: z.string().min(1, 'Veuillez sélectionner un auxiliaire'),
  date: z.string().min(1, 'La date est requise'),
  startTime: z.string().min(1, "L'heure de début est requise"),
  endTime: z.string().min(1, "L'heure de fin est requise"),
  breakDuration: z.coerce.number().min(0, 'La pause ne peut pas être négative').default(0),
  tasks: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // Permettre les interventions qui passent minuit
    if (!data.startTime || !data.endTime) return true
    // Si l'heure de fin est avant l'heure de début, c'est une intervention de nuit
    return true
  },
  {
    message: "Vérifiez les horaires",
    path: ['endTime'],
  }
)

type ShiftFormData = z.infer<typeof shiftSchema>

interface NewShiftModalProps {
  isOpen: boolean
  onClose: () => void
  employerId: string
  defaultDate?: Date
  onSuccess: () => void
}

export function NewShiftModal({
  isOpen,
  onClose,
  employerId,
  defaultDate,
  onSuccess,
}: NewShiftModalProps) {
  const [contracts, setContracts] = useState<ContractWithEmployee[]>([])
  const [existingShifts, setExistingShifts] = useState<ShiftForValidation[]>([])
  const [isLoadingContracts, setIsLoadingContracts] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '12:00',
      breakDuration: 0,
      tasks: '',
      notes: '',
    },
  })

  // Observer les valeurs du formulaire
  const watchedValues = useWatch({ control })

  // Trouver le contrat sélectionné
  const selectedContract = useMemo(() => {
    return contracts.find((c) => c.id === watchedValues.contractId)
  }, [contracts, watchedValues.contractId])

  // Construire l'objet shift pour validation
  const shiftForCompliance = useMemo(() => {
    if (!watchedValues.contractId || !watchedValues.date || !watchedValues.startTime || !watchedValues.endTime) {
      return null
    }

    // Trouver l'employeeId à partir du contrat
    const contract = contracts.find((c) => c.id === watchedValues.contractId)
    if (!contract) return null

    return {
      contractId: watchedValues.contractId,
      employeeId: contract.employeeId,
      date: new Date(watchedValues.date),
      startTime: watchedValues.startTime,
      endTime: watchedValues.endTime,
      breakDuration: watchedValues.breakDuration || 0,
    }
  }, [watchedValues, contracts])

  // Hook de validation de conformité
  const {
    complianceResult,
    computedPay,
    durationHours,
    isValidating,
    hasErrors,
    hasWarnings,
  } = useComplianceCheck({
    shift: shiftForCompliance,
    contract: selectedContract
      ? { weeklyHours: selectedContract.weeklyHours, hourlyRate: selectedContract.hourlyRate }
      : null,
    existingShifts,
  })

  // Charger les contrats et les interventions existantes
  useEffect(() => {
    if (isOpen && employerId) {
      setIsLoadingContracts(true)
      setAcknowledgeWarnings(false)

      // Charger les contrats
      getContractsForEmployer(employerId)
        .then(setContracts)
        .finally(() => setIsLoadingContracts(false))

      // Charger les interventions existantes (3 mois autour de la date)
      const centerDate = defaultDate || new Date()
      const startDate = new Date(centerDate)
      startDate.setMonth(startDate.getMonth() - 1)
      const endDate = new Date(centerDate)
      endDate.setMonth(endDate.getMonth() + 2)

      getShifts(employerId, 'employer', startDate, endDate)
        .then((shifts) => {
          // Convertir en format pour compliance
          const shiftsForValidation: ShiftForValidation[] = shifts.map((s) => ({
            id: s.id,
            contractId: s.contractId,
            employeeId: '', // Sera rempli via le contrat si nécessaire
            date: new Date(s.date),
            startTime: s.startTime,
            endTime: s.endTime,
            breakDuration: s.breakDuration,
          }))
          setExistingShifts(shiftsForValidation)
        })
        .catch(console.error)
    }
  }, [isOpen, employerId, defaultDate])

  // Reset du formulaire à l'ouverture
  useEffect(() => {
    if (isOpen) {
      reset({
        date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '12:00',
        breakDuration: 0,
        tasks: '',
        notes: '',
      })
      setSubmitError(null)
      setAcknowledgeWarnings(false)
    }
  }, [isOpen, defaultDate, reset])

  // Soumission du formulaire
  const onSubmit = async (data: ShiftFormData) => {
    // Bloquer si erreurs de conformité
    if (hasErrors) {
      setSubmitError('Veuillez corriger les erreurs de conformité avant de continuer.')
      return
    }

    // Demander confirmation si avertissements non acquittés
    if (hasWarnings && !acknowledgeWarnings) {
      setSubmitError('Veuillez prendre connaissance des avertissements ou cliquez sur "Continuer quand même".')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await createShift(data.contractId, {
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        breakDuration: data.breakDuration,
        tasks: data.tasks ? data.tasks.split('\n').filter(Boolean) : [],
        notes: data.notes || undefined,
        // Ajouter le calcul de paie
        ...(computedPay && { computedPay }),
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erreur création intervention:', error)
      setSubmitError(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const contractOptions = contracts.map((contract) => ({
    value: contract.id,
    label: contract.employee
      ? `${contract.employee.firstName} ${contract.employee.lastName}`
      : `Contrat ${contract.id.slice(0, 8)}`,
  }))

  // Désactiver le bouton de soumission
  const isSubmitDisabled =
    isLoadingContracts ||
    contracts.length === 0 ||
    hasErrors ||
    isValidating ||
    (hasWarnings && !acknowledgeWarnings)

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius="xl"
            maxW="600px"
            w="95vw"
            maxH="90vh"
            overflow="auto"
          >
            <Dialog.Header p={6} borderBottomWidth="1px">
              <Flex justify="space-between" align="center" pr={8}>
                <Dialog.Title fontSize="xl" fontWeight="bold">
                  Nouvelle intervention
                </Dialog.Title>
                {complianceResult && !isValidating && (
                  <ComplianceBadge result={complianceResult} size="sm" />
                )}
              </Flex>
              <Dialog.CloseTrigger
                position="absolute"
                top={4}
                right={4}
                asChild
              >
                <AccessibleButton
                  variant="ghost"
                  size="sm"
                  accessibleLabel="Fermer"
                >
                  X
                </AccessibleButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body p={6}>
              <form id="new-shift-form" onSubmit={handleSubmit(onSubmit)}>
                <Stack gap={4}>
                  {/* Sélection auxiliaire */}
                  {isLoadingContracts ? (
                    <Text color="gray.500">Chargement des auxiliaires...</Text>
                  ) : contracts.length === 0 ? (
                    <Box p={4} bg="orange.50" borderRadius="md">
                      <Text color="orange.700">
                        Aucun contrat actif. Veuillez d'abord créer un contrat avec un auxiliaire.
                      </Text>
                    </Box>
                  ) : (
                    <AccessibleSelect
                      label="Auxiliaire"
                      options={contractOptions}
                      placeholder="Sélectionnez un auxiliaire"
                      error={errors.contractId?.message}
                      required
                      {...register('contractId')}
                    />
                  )}

                  {/* Date */}
                  <AccessibleInput
                    label="Date"
                    type="date"
                    error={errors.date?.message}
                    required
                    {...register('date')}
                  />

                  {/* Horaires */}
                  <Flex gap={4}>
                    <Box flex={1}>
                      <AccessibleInput
                        label="Heure de début"
                        type="time"
                        error={errors.startTime?.message}
                        required
                        {...register('startTime')}
                      />
                    </Box>
                    <Box flex={1}>
                      <AccessibleInput
                        label="Heure de fin"
                        type="time"
                        error={errors.endTime?.message}
                        required
                        {...register('endTime')}
                      />
                    </Box>
                  </Flex>

                  {/* Durée affichée */}
                  {durationHours > 0 && (
                    <Text fontSize="sm" color="gray.600">
                      Durée : {durationHours.toFixed(1)} heures
                      {watchedValues.breakDuration > 0 &&
                        ` (pause de ${watchedValues.breakDuration} min déduite)`
                      }
                    </Text>
                  )}

                  {/* Pause */}
                  <AccessibleInput
                    label="Pause (minutes)"
                    type="number"
                    helperText="Durée de la pause en minutes (20 min obligatoire si > 6h)"
                    error={errors.breakDuration?.message}
                    {...register('breakDuration')}
                  />

                  <Separator />

                  {/* Alertes de conformité */}
                  {complianceResult && (hasErrors || hasWarnings) && (
                    <ComplianceAlert
                      result={complianceResult}
                      onDismiss={hasWarnings && !hasErrors ? () => setAcknowledgeWarnings(true) : undefined}
                    />
                  )}

                  {/* Estimation de la paie */}
                  {computedPay && selectedContract && durationHours > 0 && (
                    <PaySummary
                      pay={computedPay}
                      hourlyRate={selectedContract.hourlyRate}
                      durationHours={durationHours}
                      showDetails={true}
                    />
                  )}

                  <Separator />

                  {/* Tâches */}
                  <Box>
                    <Text fontWeight="medium" fontSize="md" mb={2}>
                      Tâches prévues
                    </Text>
                    <Textarea
                      placeholder="Une tâche par ligne&#10;Ex: Aide au lever&#10;Préparation du petit-déjeuner"
                      rows={4}
                      size="lg"
                      borderWidth="2px"
                      {...register('tasks')}
                    />
                    <Text fontSize="sm" color="gray.600" mt={1}>
                      Une tâche par ligne
                    </Text>
                  </Box>

                  {/* Notes */}
                  <Box>
                    <Text fontWeight="medium" fontSize="md" mb={2}>
                      Notes
                    </Text>
                    <Textarea
                      placeholder="Notes ou instructions particulières..."
                      rows={3}
                      size="lg"
                      borderWidth="2px"
                      {...register('notes')}
                    />
                  </Box>

                  {/* Erreur de soumission */}
                  {submitError && (
                    <Box p={4} bg="red.50" borderRadius="md">
                      <Text color="red.700">{submitError}</Text>
                    </Box>
                  )}
                </Stack>
              </form>
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px">
              <Flex gap={3} justify="space-between" w="full" align="center">
                {/* Indicateur de validation en cours */}
                {isValidating && (
                  <Text fontSize="sm" color="gray.500">
                    Validation en cours...
                  </Text>
                )}

                <Flex gap={3} ml="auto">
                  <AccessibleButton
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Annuler
                  </AccessibleButton>
                  <AccessibleButton
                    type="submit"
                    form="new-shift-form"
                    colorPalette={hasErrors ? 'gray' : 'blue'}
                    loading={isSubmitting}
                    disabled={isSubmitDisabled}
                  >
                    {hasErrors
                      ? 'Intervention non conforme'
                      : hasWarnings && !acknowledgeWarnings
                        ? 'Vérifiez les avertissements'
                        : 'Créer l\'intervention'
                    }
                  </AccessibleButton>
                </Flex>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default NewShiftModal
