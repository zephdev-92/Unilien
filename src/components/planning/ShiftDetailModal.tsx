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
  Badge,
  Switch,
} from '@chakra-ui/react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AccessibleInput, AccessibleSelect, AccessibleButton } from '@/components/ui'
import { ComplianceAlert, PaySummary, ComplianceBadge } from '@/components/compliance'
import { updateShift, deleteShift, validateShift, getShifts } from '@/services/shiftService'
import { getContractById } from '@/services/contractService'
import { useComplianceCheck } from '@/hooks/useComplianceCheck'
import { calculateNightHours } from '@/lib/compliance'
import { sanitizeText } from '@/lib/sanitize'
import type { Shift, UserRole, Contract } from '@/types'
import type { ShiftForValidation } from '@/lib/compliance'

const shiftSchema = z.object({
  date: z.string().min(1, 'La date est requise'),
  startTime: z.string().min(1, "L'heure de début est requise"),
  endTime: z.string().min(1, "L'heure de fin est requise"),
  breakDuration: z.coerce.number().min(0, 'La pause ne peut pas être négative').default(0),
  tasks: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['planned', 'completed', 'cancelled', 'absent']),
})

type ShiftFormData = z.infer<typeof shiftSchema>

const statusColors: Record<Shift['status'], string> = {
  planned: 'blue',
  completed: 'green',
  cancelled: 'gray',
  absent: 'red',
}

const statusLabels: Record<Shift['status'], string> = {
  planned: 'Planifié',
  completed: 'Terminé',
  cancelled: 'Annulé',
  absent: 'Absent',
}

const statusOptions = [
  { value: 'planned', label: 'Planifié' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'absent', label: 'Absent' },
]

interface ShiftDetailModalProps {
  isOpen: boolean
  onClose: () => void
  shift: Shift | null
  userRole: UserRole
  profileId: string
  onSuccess: () => void
  caregiverCanEdit?: boolean // Permission canEditPlanning pour les aidants
}

export function ShiftDetailModal({
  isOpen,
  onClose,
  shift,
  userRole,
  profileId,
  onSuccess,
  caregiverCanEdit = false,
}: ShiftDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [contract, setContract] = useState<Contract | null>(null)
  const [existingShifts, setExistingShifts] = useState<ShiftForValidation[]>([])
  const [isLoadingContract, setIsLoadingContract] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false)
  const [hasNightAction, setHasNightAction] = useState(false)

  const canEdit = userRole === 'employer' || (userRole === 'caregiver' && caregiverCanEdit)
  const canDelete = (userRole === 'employer' || (userRole === 'caregiver' && caregiverCanEdit)) && shift?.status === 'planned'
  const canValidate = (userRole === 'employer' || userRole === 'employee') && shift?.status === 'completed'
  const hasValidated = shift
    ? (userRole === 'employer' && shift.validatedByEmployer) ||
      (userRole === 'employee' && shift.validatedByEmployee)
    : false

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      date: '',
      startTime: '',
      endTime: '',
      breakDuration: 0,
      tasks: '',
      notes: '',
      status: 'planned',
    },
  })

  // Observer les valeurs du formulaire
  const watchedValues = useWatch({ control })

  // Détecter les heures de nuit
  const nightHoursCount = useMemo(() => {
    const st = isEditing ? watchedValues.startTime : shift?.startTime
    const et = isEditing ? watchedValues.endTime : shift?.endTime
    const d = isEditing ? watchedValues.date : (shift ? format(new Date(shift.date), 'yyyy-MM-dd') : null)
    if (!st || !et || !d) return 0
    try {
      return calculateNightHours(new Date(d), st, et)
    } catch {
      return 0
    }
  }, [isEditing, watchedValues.startTime, watchedValues.endTime, watchedValues.date, shift])

  const hasNightHours = nightHoursCount > 0

  // Construire l'objet shift pour validation compliance
  const shiftForCompliance = useMemo(() => {
    if (!isEditing || !watchedValues.date || !watchedValues.startTime || !watchedValues.endTime || !contract) {
      return null
    }

    return {
      contractId: shift?.contractId || '',
      employeeId: contract.employeeId,
      date: new Date(watchedValues.date),
      startTime: watchedValues.startTime,
      endTime: watchedValues.endTime,
      breakDuration: watchedValues.breakDuration || 0,
      hasNightAction: hasNightHours ? hasNightAction : undefined,
    }
  }, [watchedValues, contract, shift, isEditing, hasNightHours, hasNightAction])

  // Hook de validation de conformité (seulement en mode édition)
  const {
    complianceResult,
    computedPay,
    durationHours,
    isValidating: isCheckingCompliance,
    hasErrors,
    hasWarnings,
  } = useComplianceCheck({
    shift: shiftForCompliance,
    contract: contract
      ? { weeklyHours: contract.weeklyHours, hourlyRate: contract.hourlyRate }
      : null,
    existingShifts: existingShifts.filter((s) => s.id !== shift?.id), // Exclure le shift actuel
  })

  // Charger le contrat et les shifts existants
  useEffect(() => {
    if (isOpen && shift) {
      setIsLoadingContract(true)
      setIsEditing(false)
      setShowDeleteConfirm(false)
      setSubmitError(null)
      setAcknowledgeWarnings(false)

      // Charger le contrat
      getContractById(shift.contractId)
        .then(setContract)
        .finally(() => setIsLoadingContract(false))

      // Charger les interventions existantes pour la validation
      const startDate = new Date(shift.date)
      startDate.setMonth(startDate.getMonth() - 1)
      const endDate = new Date(shift.date)
      endDate.setMonth(endDate.getMonth() + 2)

      getShifts(profileId, userRole, startDate, endDate)
        .then((shifts) => {
          const shiftsForValidation: ShiftForValidation[] = shifts.map((s) => ({
            id: s.id,
            contractId: s.contractId,
            employeeId: '',
            date: new Date(s.date),
            startTime: s.startTime,
            endTime: s.endTime,
            breakDuration: s.breakDuration,
          }))
          setExistingShifts(shiftsForValidation)
        })
        .catch(console.error)

      // Reset du formulaire avec les valeurs du shift
      reset({
        date: format(new Date(shift.date), 'yyyy-MM-dd'),
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakDuration: shift.breakDuration,
        tasks: shift.tasks.join('\n'),
        notes: shift.notes || '',
        status: shift.status,
      })
      setHasNightAction(shift.hasNightAction ?? false)
    }
  }, [isOpen, shift, profileId, userRole, reset])

  // Calcul de la durée affichée
  const displayDuration = useMemo(() => {
    if (!shift) return 0
    const start = shift.startTime.split(':').map(Number)
    const end = shift.endTime.split(':').map(Number)
    let hours = end[0] - start[0] + (end[1] - start[1]) / 60
    if (hours < 0) hours += 24 // Intervention de nuit
    return Math.max(0, hours - shift.breakDuration / 60)
  }, [shift])

  // Soumission des modifications
  const onSubmit = async (data: ShiftFormData) => {
    if (!shift) return

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
      await updateShift(shift.id, {
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        breakDuration: data.breakDuration,
        tasks: data.tasks ? data.tasks.split('\n').filter(Boolean) : [],
        notes: data.notes || undefined,
        hasNightAction: hasNightHours ? hasNightAction : undefined,
        status: data.status,
      })

      onSuccess()
      setIsEditing(false)
    } catch (error) {
      console.error('Erreur mise à jour intervention:', error)
      setSubmitError(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Suppression du shift
  const handleDelete = async () => {
    if (!shift) return

    setIsDeleting(true)
    setSubmitError(null)

    try {
      await deleteShift(shift.id)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erreur suppression intervention:', error)
      setSubmitError(
        error instanceof Error ? error.message : 'Erreur lors de la suppression'
      )
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Validation du shift
  const handleValidate = async () => {
    if (!shift || userRole === 'caregiver') return

    setIsValidating(true)
    setSubmitError(null)

    try {
      await validateShift(shift.id, userRole)
      onSuccess()
    } catch (error) {
      console.error('Erreur validation intervention:', error)
      setSubmitError(
        error instanceof Error ? error.message : 'Erreur lors de la validation'
      )
    } finally {
      setIsValidating(false)
    }
  }

  // Annuler l'édition
  const handleCancelEdit = () => {
    if (shift) {
      reset({
        date: format(new Date(shift.date), 'yyyy-MM-dd'),
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakDuration: shift.breakDuration,
        tasks: shift.tasks.join('\n'),
        notes: shift.notes || '',
        status: shift.status,
      })
    }
    setIsEditing(false)
    setSubmitError(null)
    setAcknowledgeWarnings(false)
  }

  if (!shift) return null

  const formattedDate = format(new Date(shift.date), 'EEEE d MMMM yyyy', { locale: fr })

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
                <Box>
                  <Dialog.Title fontSize="xl" fontWeight="bold">
                    {isEditing ? 'Modifier l\'intervention' : 'Détail de l\'intervention'}
                  </Dialog.Title>
                  <Text fontSize="sm" color="gray.600" mt={1} textTransform="capitalize">
                    {formattedDate}
                  </Text>
                </Box>
                {!isEditing && (
                  <Badge colorPalette={statusColors[shift.status]} size="lg">
                    {statusLabels[shift.status]}
                  </Badge>
                )}
                {isEditing && complianceResult && !isCheckingCompliance && (
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
              {isEditing ? (
                // Mode édition
                <form id="edit-shift-form" onSubmit={handleSubmit(onSubmit)}>
                  <Stack gap={4}>
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
                        {(watchedValues.breakDuration ?? 0) > 0 &&
                          ` (pause de ${watchedValues.breakDuration} min déduite)`
                        }
                      </Text>
                    )}

                    {/* Pause */}
                    <AccessibleInput
                      label="Pause (minutes)"
                      type="number"
                      helperText="Durée de la pause en minutes"
                      error={errors.breakDuration?.message}
                      {...register('breakDuration')}
                    />

                    {/* Statut */}
                    <AccessibleSelect
                      label="Statut"
                      options={statusOptions}
                      error={errors.status?.message}
                      required
                      {...register('status')}
                    />

                    {/* Toggle action de nuit */}
                    {hasNightHours && (
                      <Box
                        p={4}
                        bg="purple.50"
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor="purple.200"
                      >
                        <Text fontWeight="medium" color="purple.800" mb={1}>
                          🌙 Heures de nuit : {nightHoursCount.toFixed(1)}h
                        </Text>
                        <Text fontSize="sm" color="purple.600" mb={3}>
                          La majoration +20% ne s'applique que si un acte est effectué.
                        </Text>
                        <Flex
                          justify="space-between"
                          align="center"
                          p={3}
                          bg="white"
                          borderRadius="md"
                        >
                          <Text fontSize="sm" fontWeight="medium" color="gray.700">
                            Acte effectué pendant la nuit
                          </Text>
                          <Switch.Root
                            checked={hasNightAction}
                            onCheckedChange={(e) => setHasNightAction(e.checked)}
                          >
                            <Switch.HiddenInput aria-label="Acte effectué pendant les heures de nuit" />
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Root>
                        </Flex>
                      </Box>
                    )}

                    <Separator />

                    {/* Alertes de conformité */}
                    {complianceResult && (hasErrors || hasWarnings) && (
                      <ComplianceAlert
                        result={complianceResult}
                        onDismiss={hasWarnings && !hasErrors ? () => setAcknowledgeWarnings(true) : undefined}
                      />
                    )}

                    {/* Estimation de la paie */}
                    {computedPay && contract && durationHours > 0 && (
                      <PaySummary
                        pay={computedPay}
                        hourlyRate={contract.hourlyRate}
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
                        placeholder="Une tâche par ligne"
                        rows={4}
                        size="lg"
                        borderWidth="2px"
                        {...register('tasks')}
                      />
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
              ) : (
                // Mode visualisation
                <Stack gap={5}>
                  {/* Horaires */}
                  <Box>
                    <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={1}>
                      Horaires
                    </Text>
                    <Text fontSize="xl" fontWeight="semibold">
                      {shift.startTime} - {shift.endTime}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Durée : {displayDuration.toFixed(1)} heures
                      {shift.breakDuration > 0 && ` (pause de ${shift.breakDuration} min incluse)`}
                    </Text>
                  </Box>

                  {/* Indicateur heures de nuit */}
                  {hasNightHours && (
                    <Box p={3} bg="purple.50" borderRadius="md">
                      <Flex align="center" gap={2}>
                        <Text>🌙</Text>
                        <Box>
                          <Text fontSize="sm" fontWeight="medium" color="purple.800">
                            {nightHoursCount.toFixed(1)}h de nuit
                            {shift.hasNightAction
                              ? ' — Acte effectué (majoration +20%)'
                              : ' — Présence seule (pas de majoration)'
                            }
                          </Text>
                        </Box>
                      </Flex>
                    </Box>
                  )}

                  {/* Auxiliaire */}
                  {!isLoadingContract && contract && (
                    <Box>
                      <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={1}>
                        Auxiliaire
                      </Text>
                      <Text fontSize="md">
                        Contrat #{contract.id.slice(0, 8)} - {contract.contractType}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {contract.hourlyRate.toFixed(2)} €/h
                      </Text>
                    </Box>
                  )}

                  {/* Tâches */}
                  {shift.tasks.length > 0 && (
                    <Box>
                      <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={2}>
                        Tâches prévues
                      </Text>
                      <Stack gap={1}>
                        {shift.tasks.map((task, index) => (
                          <Flex key={index} align="center" gap={2}>
                            <Box w="6px" h="6px" borderRadius="full" bg="brand.500" />
                            <Text fontSize="md">{sanitizeText(task)}</Text>
                          </Flex>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Notes */}
                  {shift.notes && (
                    <Box>
                      <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={1}>
                        Notes
                      </Text>
                      <Text fontSize="md" whiteSpace="pre-wrap">
                        {sanitizeText(shift.notes)}
                      </Text>
                    </Box>
                  )}

                  <Separator />

                  {/* Paie calculée */}
                  {shift.computedPay && shift.computedPay.totalPay > 0 && (
                    <Box>
                      <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={2}>
                        Estimation de la paie
                      </Text>
                      <PaySummary
                        pay={shift.computedPay}
                        hourlyRate={contract?.hourlyRate || 0}
                        durationHours={displayDuration}
                        showDetails={false}
                      />
                    </Box>
                  )}

                  {/* Validation */}
                  <Box>
                    <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={2}>
                      Validation
                    </Text>
                    <Flex gap={4}>
                      <Flex align="center" gap={2}>
                        <Box
                          w="12px"
                          h="12px"
                          borderRadius="full"
                          bg={shift.validatedByEmployer ? 'green.500' : 'gray.300'}
                        />
                        <Text fontSize="sm">
                          Employeur {shift.validatedByEmployer ? '(validé)' : '(en attente)'}
                        </Text>
                      </Flex>
                      <Flex align="center" gap={2}>
                        <Box
                          w="12px"
                          h="12px"
                          borderRadius="full"
                          bg={shift.validatedByEmployee ? 'green.500' : 'gray.300'}
                        />
                        <Text fontSize="sm">
                          Auxiliaire {shift.validatedByEmployee ? '(validé)' : '(en attente)'}
                        </Text>
                      </Flex>
                    </Flex>
                  </Box>

                  {/* Erreur */}
                  {submitError && (
                    <Box p={4} bg="red.50" borderRadius="md">
                      <Text color="red.700">{submitError}</Text>
                    </Box>
                  )}

                  {/* Confirmation de suppression */}
                  {showDeleteConfirm && (
                    <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
                      <Text fontWeight="medium" color="red.800" mb={3}>
                        Êtes-vous sûr de vouloir supprimer cette intervention ?
                      </Text>
                      <Flex gap={2}>
                        <AccessibleButton
                          size="sm"
                          colorPalette="red"
                          onClick={handleDelete}
                          loading={isDeleting}
                        >
                          Confirmer la suppression
                        </AccessibleButton>
                        <AccessibleButton
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeleting}
                        >
                          Annuler
                        </AccessibleButton>
                      </Flex>
                    </Box>
                  )}
                </Stack>
              )}
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px">
              {isEditing ? (
                // Boutons mode édition
                <Flex gap={3} justify="space-between" w="full" align="center">
                  {isCheckingCompliance && (
                    <Text fontSize="sm" color="gray.500">
                      Validation en cours...
                    </Text>
                  )}
                  <Flex gap={3} ml="auto">
                    <AccessibleButton
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                    >
                      Annuler
                    </AccessibleButton>
                    <AccessibleButton
                      type="submit"
                      form="edit-shift-form"
                      colorPalette={hasErrors ? 'gray' : 'blue'}
                      loading={isSubmitting}
                      disabled={!isDirty || hasErrors || isCheckingCompliance || (hasWarnings && !acknowledgeWarnings)}
                    >
                      {hasErrors
                        ? 'Non conforme'
                        : hasWarnings && !acknowledgeWarnings
                          ? 'Vérifiez les avertissements'
                          : 'Enregistrer'
                      }
                    </AccessibleButton>
                  </Flex>
                </Flex>
              ) : (
                // Boutons mode visualisation
                <Flex gap={3} justify="space-between" w="full" flexWrap="wrap">
                  <Flex gap={2}>
                    {canDelete && !showDeleteConfirm && (
                      <AccessibleButton
                        variant="outline"
                        colorPalette="red"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Supprimer
                      </AccessibleButton>
                    )}
                  </Flex>
                  <Flex gap={3}>
                    {canValidate && !hasValidated && (
                      <AccessibleButton
                        colorPalette="green"
                        onClick={handleValidate}
                        loading={isValidating}
                      >
                        Valider l'intervention
                      </AccessibleButton>
                    )}
                    {canValidate && hasValidated && (
                      <Text fontSize="sm" color="green.600" alignSelf="center">
                        Vous avez validé cette intervention
                      </Text>
                    )}
                    {canEdit && (
                      <AccessibleButton
                        colorPalette="blue"
                        onClick={() => setIsEditing(true)}
                      >
                        Modifier
                      </AccessibleButton>
                    )}
                    <AccessibleButton variant="outline" onClick={onClose}>
                      Fermer
                    </AccessibleButton>
                  </Flex>
                </Flex>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default ShiftDetailModal
