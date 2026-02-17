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
import { calculateNightHours, calculateShiftDuration } from '@/lib/compliance'
import { sanitizeText } from '@/lib/sanitize'
import { logger } from '@/lib/logger'
import type { Shift, ShiftType, UserRole, Contract } from '@/types'
import type { ShiftForValidation } from '@/lib/compliance'

const SHIFT_TYPE_OPTIONS = [
  { value: 'effective', label: 'Travail effectif' },
  { value: 'presence_day', label: 'Présence responsable (jour)' },
  { value: 'presence_night', label: 'Présence responsable (nuit)' },
]

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  effective: 'Travail effectif',
  presence_day: 'Présence responsable (jour)',
  presence_night: 'Présence responsable (nuit)',
}

const REQUALIFICATION_THRESHOLD = 4

const shiftSchema = z.object({
  date: z.string().min(1, 'La date est requise'),
  startTime: z.string().min(1, "L'heure de début est requise"),
  endTime: z.string().min(1, "L'heure de fin est requise"),
  breakDuration: z.coerce.number().min(0, 'La pause ne peut pas être négative').default(0),
  tasks: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['planned', 'completed', 'cancelled', 'absent']),
}).refine((data) => data.startTime !== data.endTime, {
  message: "L'heure de fin doit être différente de l'heure de début",
  path: ['endTime'],
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
  const [shiftType, setShiftType] = useState<ShiftType>('effective')
  const [nightInterventionsCount, setNightInterventionsCount] = useState(0)

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

  // Calcul de la requalification (>= 4 interventions nuit)
  const isRequalified = shiftType === 'presence_night' && nightInterventionsCount >= REQUALIFICATION_THRESHOLD

  // Calcul des heures effectives selon le type (pour mode édition)
  const effectiveHoursComputed = useMemo(() => {
    const st = isEditing ? watchedValues.startTime : shift?.startTime
    const et = isEditing ? watchedValues.endTime : shift?.endTime
    const bd = isEditing ? (watchedValues.breakDuration || 0) : (shift?.breakDuration || 0)
    if (!st || !et) return null

    try {
      const durationMinutes = calculateShiftDuration(st, et, bd)
      const hours = durationMinutes / 60

      if (shiftType === 'presence_day') {
        return Math.round(hours * (2 / 3) * 100) / 100
      }
      if (shiftType === 'presence_night' && isRequalified) {
        return hours
      }
      return null
    } catch {
      return null
    }
  }, [isEditing, watchedValues.startTime, watchedValues.endTime, watchedValues.breakDuration, shift, shiftType, isRequalified])

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
      hasNightAction: shiftType === 'effective' && hasNightHours ? hasNightAction : undefined,
      shiftType,
      nightInterventionsCount: shiftType === 'presence_night' ? nightInterventionsCount : undefined,
    }
  }, [watchedValues, contract, shift, isEditing, hasNightHours, hasNightAction, shiftType, nightInterventionsCount])

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
            shiftType: s.shiftType,
          }))
          setExistingShifts(shiftsForValidation)
        })
        .catch((err) => logger.error('Erreur chargement shifts pour validation:', err))

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
      setShiftType(shift.shiftType || 'effective')
      setNightInterventionsCount(shift.nightInterventionsCount ?? 0)
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
        hasNightAction: shiftType === 'effective' && hasNightHours ? hasNightAction : undefined,
        shiftType,
        nightInterventionsCount: shiftType === 'presence_night' ? nightInterventionsCount : undefined,
        isRequalified,
        effectiveHours: effectiveHoursComputed ?? undefined,
        status: data.status,
      })

      onSuccess()
      setIsEditing(false)
    } catch (error) {
      logger.error('Erreur mise à jour intervention:', error)
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
      logger.error('Erreur suppression intervention:', error)
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
      logger.error('Erreur validation intervention:', error)
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
    if (shift) {
      setHasNightAction(shift.hasNightAction ?? false)
      setShiftType(shift.shiftType || 'effective')
      setNightInterventionsCount(shift.nightInterventionsCount ?? 0)
    }
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

                    {/* Type d'intervention */}
                    <AccessibleSelect
                      label="Type d'intervention"
                      options={SHIFT_TYPE_OPTIONS}
                      value={shiftType}
                      onChange={(e) => {
                        const newType = e.target.value as ShiftType
                        setShiftType(newType)
                        if (newType !== 'presence_night') setNightInterventionsCount(0)
                        if (newType !== 'effective') setHasNightAction(false)
                      }}
                    />

                    {/* Section présence responsable JOUR (édition) */}
                    {shiftType === 'presence_day' && durationHours > 0 && (
                      <Box p={4} bg="blue.50" borderRadius="lg" borderWidth="1px" borderColor="blue.200">
                        <Text fontWeight="medium" color="blue.800" mb={2}>
                          Présence responsable de jour
                        </Text>
                        <Text fontSize="sm" color="blue.700" mb={3}>
                          Heures converties en travail effectif au coefficient 2/3 (Art. 137.1 IDCC 3239).
                        </Text>
                        <Box p={3} bg="white" borderRadius="md">
                          <Flex justify="space-between" align="center">
                            <Text fontSize="sm" color="gray.600">Présence responsable</Text>
                            <Text fontSize="sm" fontWeight="medium">{durationHours.toFixed(1)}h</Text>
                          </Flex>
                          <Flex justify="space-between" align="center" mt={1}>
                            <Text fontSize="sm" color="gray.600">Équivalent travail effectif (×2/3)</Text>
                            <Text fontSize="sm" fontWeight="bold" color="blue.700">
                              {effectiveHoursComputed?.toFixed(1) ?? '—'}h
                            </Text>
                          </Flex>
                        </Box>
                      </Box>
                    )}

                    {/* Section présence responsable NUIT (édition) */}
                    {shiftType === 'presence_night' && (
                      <Box p={4} bg="purple.50" borderRadius="lg" borderWidth="1px" borderColor="purple.200">
                        <Text fontWeight="medium" color="purple.800" mb={2}>
                          Présence responsable de nuit
                        </Text>
                        <Text fontSize="sm" color="purple.700" mb={3}>
                          Indemnité forfaitaire d'au moins 1/4 du salaire horaire (Art. 148 IDCC 3239).
                        </Text>
                        <Box mb={3}>
                          <AccessibleInput
                            label="Nombre d'interventions pendant la nuit"
                            type="number"
                            helperText="Chaque intervention (change, aide, urgence...) doit être comptée"
                            value={nightInterventionsCount}
                            onChange={(e) => setNightInterventionsCount(Math.max(0, parseInt(e.target.value) || 0))}
                          />
                        </Box>
                        {isRequalified && (
                          <Box p={3} bg="orange.100" borderRadius="md" borderWidth="1px" borderColor="orange.300" mb={3}>
                            <Text fontWeight="bold" color="orange.800" fontSize="sm">
                              Requalification en travail effectif
                            </Text>
                            <Text fontSize="xs" color="orange.700" mt={1}>
                              {nightInterventionsCount} interventions (seuil : {REQUALIFICATION_THRESHOLD}).
                              Toute la plage est rémunérée à 100% (Art. 148 IDCC 3239).
                            </Text>
                          </Box>
                        )}
                        {durationHours > 0 && (
                          <Box p={3} bg="white" borderRadius="md">
                            <Flex justify="space-between" align="center">
                              <Text fontSize="sm" color="gray.600">Durée de présence</Text>
                              <Text fontSize="sm" fontWeight="medium">{durationHours.toFixed(1)}h</Text>
                            </Flex>
                            <Flex justify="space-between" align="center" mt={1}>
                              <Text fontSize="sm" color="gray.600">
                                {isRequalified ? 'Rémunération (100%)' : 'Indemnité forfaitaire (×1/4)'}
                              </Text>
                              <Text fontSize="sm" fontWeight="bold" color={isRequalified ? 'orange.700' : 'purple.700'}>
                                {isRequalified ? `${durationHours.toFixed(1)}h effectives` : `${(durationHours * 0.25).toFixed(1)}h équiv.`}
                              </Text>
                            </Flex>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* Toggle action de nuit — uniquement pour travail effectif */}
                    {shiftType === 'effective' && hasNightHours && (
                      <Box
                        p={4}
                        bg="purple.50"
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor="purple.200"
                      >
                        <Text fontWeight="medium" color="purple.800" mb={1}>
                          Heures de nuit : {nightHoursCount.toFixed(1)}h
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

                  {/* Type d'intervention */}
                  {shift.shiftType && shift.shiftType !== 'effective' && (
                    <Box>
                      <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={1}>
                        Type d'intervention
                      </Text>
                      <Badge
                        colorPalette={shift.shiftType === 'presence_day' ? 'blue' : 'purple'}
                        size="lg"
                      >
                        {SHIFT_TYPE_LABELS[shift.shiftType]}
                      </Badge>
                    </Box>
                  )}

                  {/* Détail présence responsable JOUR */}
                  {shift.shiftType === 'presence_day' && (
                    <Box p={3} bg="blue.50" borderRadius="md">
                      <Text fontSize="sm" fontWeight="medium" color="blue.800" mb={2}>
                        Conversion présence responsable
                      </Text>
                      <Flex justify="space-between" align="center">
                        <Text fontSize="sm" color="gray.600">Présence</Text>
                        <Text fontSize="sm">{displayDuration.toFixed(1)}h</Text>
                      </Flex>
                      <Flex justify="space-between" align="center" mt={1}>
                        <Text fontSize="sm" color="gray.600">Équivalent travail (×2/3)</Text>
                        <Text fontSize="sm" fontWeight="bold" color="blue.700">
                          {shift.effectiveHours?.toFixed(1) ?? (displayDuration * 2 / 3).toFixed(1)}h
                        </Text>
                      </Flex>
                    </Box>
                  )}

                  {/* Détail présence responsable NUIT */}
                  {shift.shiftType === 'presence_night' && (
                    <Box p={3} bg="purple.50" borderRadius="md">
                      <Text fontSize="sm" fontWeight="medium" color="purple.800" mb={2}>
                        Présence responsable de nuit
                      </Text>
                      {shift.nightInterventionsCount != null && shift.nightInterventionsCount > 0 && (
                        <Text fontSize="sm" color="gray.700" mb={1}>
                          {shift.nightInterventionsCount} intervention{shift.nightInterventionsCount > 1 ? 's' : ''} pendant la nuit
                        </Text>
                      )}
                      {shift.isRequalified && (
                        <Box p={2} bg="orange.100" borderRadius="md" mt={1} mb={2}>
                          <Text fontSize="xs" fontWeight="bold" color="orange.800">
                            Requalifié en travail effectif (Art. 148 IDCC 3239)
                          </Text>
                        </Box>
                      )}
                      <Flex justify="space-between" align="center">
                        <Text fontSize="sm" color="gray.600">
                          {shift.isRequalified ? 'Rémunération (100%)' : 'Indemnité forfaitaire (×1/4)'}
                        </Text>
                        <Text fontSize="sm" fontWeight="bold" color={shift.isRequalified ? 'orange.700' : 'purple.700'}>
                          {shift.isRequalified
                            ? `${displayDuration.toFixed(1)}h effectives`
                            : `${(displayDuration * 0.25).toFixed(1)}h équiv.`
                          }
                        </Text>
                      </Flex>
                    </Box>
                  )}

                  {/* Indicateur heures de nuit (travail effectif uniquement) */}
                  {shift.shiftType !== 'presence_night' && hasNightHours && (
                    <Box p={3} bg="purple.50" borderRadius="md">
                      <Flex align="center" gap={2}>
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
