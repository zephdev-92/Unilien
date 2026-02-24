import { useReducer, useEffect, useMemo } from 'react'
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
import { sanitizeText } from '@/lib/sanitize'
import { logger } from '@/lib/logger'
import type { Shift, ShiftType, UserRole, Contract } from '@/types'
import type { ShiftForValidation } from '@/lib/compliance'
import { useShiftNightHours } from '@/hooks/useShiftNightHours'
import { useShiftRequalification } from '@/hooks/useShiftRequalification'
import { useShiftEffectiveHours } from '@/hooks/useShiftEffectiveHours'
import { PresenceResponsibleDaySection } from './PresenceResponsibleDaySection'
import { PresenceResponsibleNightSection } from './PresenceResponsibleNightSection'
import { NightActionToggle } from './NightActionToggle'

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

// ============================================================
// State machine pour ShiftDetailModal
// ============================================================

type ModalState = {
  isEditing: boolean
  showDeleteConfirm: boolean
  acknowledgeWarnings: boolean
  isLoadingContract: boolean
  isSubmitting: boolean
  isDeleting: boolean
  isValidating: boolean
  submitError: string | null
  contract: Contract | null
  existingShifts: ShiftForValidation[]
  hasNightAction: boolean
  shiftType: ShiftType
  nightInterventionsCount: number
}

type ModalAction =
  | { type: 'MODAL_OPEN'; shift: Shift }
  | { type: 'CONTRACT_LOADED'; contract: Contract | null }
  | { type: 'SHIFTS_LOADED'; shifts: ShiftForValidation[] }
  | { type: 'START_EDITING' }
  | { type: 'CANCEL_EDITING'; shift: Shift }
  | { type: 'SET_SHIFT_TYPE'; shiftType: ShiftType }
  | { type: 'SET_HAS_NIGHT_ACTION'; value: boolean }
  | { type: 'SET_NIGHT_INTERVENTIONS'; count: number }
  | { type: 'SHOW_DELETE_CONFIRM' }
  | { type: 'HIDE_DELETE_CONFIRM' }
  | { type: 'ACKNOWLEDGE_WARNINGS' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'DELETE_START' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR'; error: string }
  | { type: 'VALIDATE_START' }
  | { type: 'VALIDATE_SUCCESS' }
  | { type: 'VALIDATE_ERROR'; error: string }

const initialState: ModalState = {
  isEditing: false,
  showDeleteConfirm: false,
  acknowledgeWarnings: false,
  isLoadingContract: true,
  isSubmitting: false,
  isDeleting: false,
  isValidating: false,
  submitError: null,
  contract: null,
  existingShifts: [],
  hasNightAction: false,
  shiftType: 'effective',
  nightInterventionsCount: 0,
}

function reducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'MODAL_OPEN':
      return {
        ...initialState,
        hasNightAction: action.shift.hasNightAction ?? false,
        shiftType: action.shift.shiftType || 'effective',
        nightInterventionsCount: action.shift.nightInterventionsCount ?? 0,
      }
    case 'CONTRACT_LOADED':
      return { ...state, contract: action.contract, isLoadingContract: false }
    case 'SHIFTS_LOADED':
      return { ...state, existingShifts: action.shifts }
    case 'START_EDITING':
      return { ...state, isEditing: true }
    case 'CANCEL_EDITING':
      return {
        ...state,
        isEditing: false,
        submitError: null,
        acknowledgeWarnings: false,
        hasNightAction: action.shift.hasNightAction ?? false,
        shiftType: action.shift.shiftType || 'effective',
        nightInterventionsCount: action.shift.nightInterventionsCount ?? 0,
      }
    case 'SET_SHIFT_TYPE':
      return {
        ...state,
        shiftType: action.shiftType,
        nightInterventionsCount: action.shiftType !== 'presence_night' ? 0 : state.nightInterventionsCount,
        hasNightAction: action.shiftType !== 'effective' ? false : state.hasNightAction,
      }
    case 'SET_HAS_NIGHT_ACTION':
      return { ...state, hasNightAction: action.value }
    case 'SET_NIGHT_INTERVENTIONS':
      return { ...state, nightInterventionsCount: action.count }
    case 'SHOW_DELETE_CONFIRM':
      return { ...state, showDeleteConfirm: true }
    case 'HIDE_DELETE_CONFIRM':
      return { ...state, showDeleteConfirm: false }
    case 'ACKNOWLEDGE_WARNINGS':
      return { ...state, acknowledgeWarnings: true }
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, submitError: null }
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, isEditing: false }
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, submitError: action.error }
    case 'DELETE_START':
      return { ...state, isDeleting: true, submitError: null }
    case 'DELETE_SUCCESS':
      return { ...state, isDeleting: false, showDeleteConfirm: false }
    case 'DELETE_ERROR':
      return { ...state, isDeleting: false, showDeleteConfirm: false, submitError: action.error }
    case 'VALIDATE_START':
      return { ...state, isValidating: true, submitError: null }
    case 'VALIDATE_SUCCESS':
      return { ...state, isValidating: false }
    case 'VALIDATE_ERROR':
      return { ...state, isValidating: false, submitError: action.error }
  }
}

// ============================================================

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
  const [state, dispatch] = useReducer(reducer, initialState)
  const {
    isEditing,
    showDeleteConfirm,
    acknowledgeWarnings,
    isLoadingContract,
    isSubmitting,
    isDeleting,
    isValidating,
    submitError,
    contract,
    existingShifts,
    hasNightAction,
    shiftType,
    nightInterventionsCount,
  } = state

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

  // Sources de données selon le mode édition/lecture
  const stForHooks = isEditing ? watchedValues.startTime : shift?.startTime
  const etForHooks = isEditing ? watchedValues.endTime : shift?.endTime
  const bdForHooks = isEditing ? (watchedValues.breakDuration || 0) : (shift?.breakDuration || 0)
  const dateForHooks = isEditing
    ? watchedValues.date
    : (shift ? format(new Date(shift.date), 'yyyy-MM-dd') : undefined)

  // Heures de nuit (21h–6h)
  const { nightHoursCount, hasNightHours } = useShiftNightHours({
    startTime: stForHooks,
    endTime: etForHooks,
    date: dateForHooks,
  })

  // Requalification présence de nuit (>= 4 interventions)
  const { isRequalified } = useShiftRequalification({ shiftType, nightInterventionsCount })

  // Heures effectives pondérées selon le type (édition uniquement — vue utilise shift.effectiveHours)
  const { effectiveHoursComputed } = useShiftEffectiveHours({
    startTime: stForHooks,
    endTime: etForHooks,
    breakDuration: bdForHooks,
    shiftType,
    isRequalified,
  })

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
      dispatch({ type: 'MODAL_OPEN', shift })

      // Charger le contrat
      getContractById(shift.contractId)
        .then((c) => dispatch({ type: 'CONTRACT_LOADED', contract: c }))
        .catch(() => dispatch({ type: 'CONTRACT_LOADED', contract: null }))

      // ±4 semaines : suffisant pour toutes les règles IDCC 3239
      const startDate = new Date(shift.date)
      startDate.setDate(startDate.getDate() - 28)
      const endDate = new Date(shift.date)
      endDate.setDate(endDate.getDate() + 28)

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
          dispatch({ type: 'SHIFTS_LOADED', shifts: shiftsForValidation })
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
      dispatch({ type: 'SUBMIT_ERROR', error: 'Veuillez corriger les erreurs de conformité avant de continuer.' })
      return
    }

    // Demander confirmation si avertissements non acquittés
    if (hasWarnings && !acknowledgeWarnings) {
      dispatch({ type: 'SUBMIT_ERROR', error: 'Veuillez prendre connaissance des avertissements ou cliquez sur "Continuer quand même".' })
      return
    }

    dispatch({ type: 'SUBMIT_START' })

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
      dispatch({ type: 'SUBMIT_SUCCESS' })
    } catch (error) {
      logger.error('Erreur mise à jour intervention:', error)
      dispatch({
        type: 'SUBMIT_ERROR',
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    }
  }

  // Suppression du shift
  const handleDelete = async () => {
    if (!shift) return

    dispatch({ type: 'DELETE_START' })

    try {
      await deleteShift(shift.id)
      dispatch({ type: 'DELETE_SUCCESS' })
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Erreur suppression intervention:', error)
      dispatch({
        type: 'DELETE_ERROR',
        error: error instanceof Error ? error.message : 'Erreur lors de la suppression',
      })
    }
  }

  // Validation du shift
  const handleValidate = async () => {
    if (!shift || userRole === 'caregiver') return

    dispatch({ type: 'VALIDATE_START' })

    try {
      await validateShift(shift.id, userRole)
      dispatch({ type: 'VALIDATE_SUCCESS' })
      onSuccess()
    } catch (error) {
      logger.error('Erreur validation intervention:', error)
      dispatch({
        type: 'VALIDATE_ERROR',
        error: error instanceof Error ? error.message : 'Erreur lors de la validation',
      })
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
      dispatch({ type: 'CANCEL_EDITING', shift })
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
                        dispatch({ type: 'SET_SHIFT_TYPE', shiftType: e.target.value as ShiftType })
                      }}
                    />

                    {/* Section présence responsable JOUR (édition) */}
                    {shiftType === 'presence_day' && (
                      <PresenceResponsibleDaySection
                        durationHours={durationHours}
                        effectiveHoursComputed={effectiveHoursComputed}
                      />
                    )}

                    {/* Section présence responsable NUIT (édition) */}
                    {shiftType === 'presence_night' && (
                      <PresenceResponsibleNightSection
                        mode="edit"
                        durationHours={durationHours}
                        nightInterventionsCount={nightInterventionsCount}
                        isRequalified={isRequalified}
                        onInterventionCountChange={(count) =>
                          dispatch({ type: 'SET_NIGHT_INTERVENTIONS', count })
                        }
                      />
                    )}

                    {/* Toggle action de nuit — uniquement pour travail effectif */}
                    {shiftType === 'effective' && hasNightHours && (
                      <NightActionToggle
                        mode="edit"
                        nightHoursCount={nightHoursCount}
                        hasNightAction={hasNightAction}
                        onToggle={(value) => dispatch({ type: 'SET_HAS_NIGHT_ACTION', value })}
                      />
                    )}

                    <Separator />

                    {/* Alertes de conformité */}
                    {complianceResult && (hasErrors || hasWarnings) && (
                      <ComplianceAlert
                        result={complianceResult}
                        onDismiss={hasWarnings && !hasErrors ? () => dispatch({ type: 'ACKNOWLEDGE_WARNINGS' }) : undefined}
                      />
                    )}

                    {/* Estimation de la paie */}
                    {computedPay && contract && durationHours > 0 && (
                      <PaySummary
                        pay={computedPay}
                        hourlyRate={contract.hourlyRate}
                        durationHours={durationHours}
                        showDetails={true}
                        shiftType={shiftType}
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
                    <PresenceResponsibleDaySection
                      mode="view"
                      durationHours={displayDuration}
                      effectiveHoursComputed={shift.effectiveHours ?? (displayDuration * (2 / 3))}
                    />
                  )}

                  {/* Détail présence responsable NUIT */}
                  {shift.shiftType === 'presence_night' && (
                    <PresenceResponsibleNightSection
                      mode="view"
                      displayDuration={displayDuration}
                      nightInterventionsCount={shift.nightInterventionsCount ?? null}
                      isRequalified={shift.isRequalified ?? null}
                    />
                  )}

                  {/* Indicateur heures de nuit (travail effectif uniquement) */}
                  {shift.shiftType !== 'presence_night' && hasNightHours && (
                    <NightActionToggle
                      mode="view"
                      nightHoursCount={nightHoursCount}
                      hasNightAction={shift.hasNightAction ?? false}
                    />
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
                        shiftType={shift.shiftType}
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
                          onClick={() => dispatch({ type: 'HIDE_DELETE_CONFIRM' })}
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
                        onClick={() => dispatch({ type: 'SHOW_DELETE_CONFIRM' })}
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
                        onClick={() => dispatch({ type: 'START_EDITING' })}
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
