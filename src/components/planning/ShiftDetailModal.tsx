import { useReducer, useMemo, useCallback } from 'react'
import {
  Flex,
  Text,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { shiftDetailSchema as shiftSchema, type ShiftDetailFormData as ShiftFormData } from '@/lib/validation/shiftSchemas'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AccessibleButton, StatusPill } from '@/components/ui'
import { ComplianceBadge } from '@/components/compliance'
import { PlanningModal } from './PlanningModal'
import { updateShift, deleteShift, validateShift } from '@/services/shiftService'
import { logger } from '@/lib/logger'
import type { Shift, UserRole } from '@/types'
import { SHIFT_STATUS_VARIANTS as statusVariants, SHIFT_STATUS_LABELS as statusLabels } from '@/lib/constants/statusMaps'
import { useShiftDetailData } from '@/hooks/useShiftDetailData'
import { useShiftEditLogic } from '@/hooks/useShiftEditLogic'
import { ShiftEditForm } from './ShiftEditForm'
import { ShiftDetailView } from './ShiftDetailView'

// ============================================================
// State machine pour ShiftDetailModal (UI state uniquement)
// Les données (contract, existingShifts) sont gérées par useShiftDetailData
// ============================================================

type ModalState = {
  isEditing: boolean
  showDeleteConfirm: boolean
  acknowledgeWarnings: boolean
  isSubmitting: boolean
  isDeleting: boolean
  isValidating: boolean
  submitError: string | null
  hasNightAction: boolean
  shiftType: Shift['shiftType']
  nightInterventionsCount: number
}

type ModalAction =
  | { type: 'MODAL_OPEN'; shift: Shift }
  | { type: 'START_EDITING' }
  | { type: 'CANCEL_EDITING'; shift: Shift }
  | { type: 'SET_SHIFT_TYPE'; shiftType: Shift['shiftType'] }
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
  isSubmitting: false,
  isDeleting: false,
  isValidating: false,
  submitError: null,
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
        nightInterventionsCount:
          action.shiftType !== 'presence_night' ? 0 : state.nightInterventionsCount,
        hasNightAction:
          action.shiftType !== 'effective' ? false : state.hasNightAction,
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
  caregiverCanEdit?: boolean
  onRepeat?: (shift: Shift) => void
}

export function ShiftDetailModal({
  isOpen,
  onClose,
  shift,
  userRole,
  profileId,
  onSuccess,
  caregiverCanEdit = false,
  onRepeat,
}: ShiftDetailModalProps) {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const {
    isEditing,
    showDeleteConfirm,
    acknowledgeWarnings,
    isSubmitting,
    isDeleting,
    isValidating,
    submitError,
    hasNightAction,
    shiftType,
    nightInterventionsCount,
  } = state

  // Permissions RBAC
  const canEdit = userRole === 'employer' || (userRole === 'caregiver' && caregiverCanEdit)
  const canDelete =
    (userRole === 'employer' || (userRole === 'caregiver' && caregiverCanEdit)) &&
    shift?.status === 'planned'
  const canValidate =
    (userRole === 'employer' || userRole === 'employee') && shift?.status === 'completed'
  const hasValidated = shift
    ? (userRole === 'employer' && shift.validatedByEmployer) ||
      (userRole === 'employee' && shift.validatedByEmployee)
    : false

  // Formulaire (react-hook-form)
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

  const watchedValues = useWatch({ control })

  // Callback stable pour le reset du formulaire (passé à useShiftDetailData)
  const handleResetForm = useCallback(
    (values: ShiftFormData) => {
      dispatch({ type: 'MODAL_OPEN', shift: shift! })
      reset(values)
    },
    [shift, reset]
  )

  // Chargement données (contrat + shifts contexte)
  const { contract, existingShifts, isLoadingContract } = useShiftDetailData({
    isOpen,
    shift,
    profileId,
    userRole,
    onResetForm: handleResetForm,
  })

  // Calculs métier (nuit, requalification, compliance)
  const {
    nightHoursCount,
    hasNightHours,
    isRequalified,
    effectiveHoursComputed,
    complianceResult,
    computedPay,
    durationHours,
    isCheckingCompliance,
    hasErrors,
    hasWarnings,
  } = useShiftEditLogic({
    isEditing,
    watchedValues,
    shiftType,
    hasNightAction,
    nightInterventionsCount,
    contract,
    existingShifts,
    shift,
  })

  // Durée brute en mode lecture (sans compliance check)
  const displayDuration = useMemo(() => {
    if (!shift) return 0
    const start = shift.startTime.split(':').map(Number)
    const end = shift.endTime.split(':').map(Number)
    let hours = end[0] - start[0] + (end[1] - start[1]) / 60
    if (hours < 0) hours += 24
    return Math.max(0, hours - shift.breakDuration / 60)
  }, [shift])

  // Soumission des modifications
  const onSubmit = async (data: ShiftFormData) => {
    if (!shift) return

    if (hasErrors) {
      dispatch({
        type: 'SUBMIT_ERROR',
        error: 'Veuillez corriger les erreurs de conformité avant de continuer.',
      })
      return
    }

    if (hasWarnings && !acknowledgeWarnings) {
      dispatch({
        type: 'SUBMIT_ERROR',
        error: 'Veuillez prendre connaissance des avertissements ou cliquez sur "Continuer quand même".',
      })
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
        nightInterventionsCount:
          shiftType === 'presence_night' ? nightInterventionsCount : undefined,
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

  // Suppression
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

  // Annulation édition
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

  const modalTitleRight = isEditing
    ? (complianceResult && !isCheckingCompliance ? <ComplianceBadge result={complianceResult} size="sm" /> : undefined)
    : (
      <StatusPill variant={statusVariants[shift.status]}>
        {statusLabels[shift.status]}
      </StatusPill>
    )

  const footerContent = isEditing ? (
    <Flex gap={3} justify="space-between" w="full" align="center">
      {isCheckingCompliance && (
        <Text fontSize="sm" color="text.muted">Validation en cours...</Text>
      )}
      <Flex gap={3} ml="auto">
        <AccessibleButton
          variant="outline"
          onClick={handleCancelEdit}
          disabled={isSubmitting}
          bg="transparent"
          color="#3D5166"
          borderWidth="1.5px"
          borderColor="border.default"
          _hover={{ borderColor: '#3D5166', bg: '#EDF1F5' }}
        >
          Annuler
        </AccessibleButton>
        <AccessibleButton
          type="submit"
          form="edit-shift-form"
          bg={hasErrors ? 'gray.400' : '#3D5166'}
          color="white"
          _hover={{ bg: hasErrors ? 'gray.400' : '#2E3F50', transform: 'translateY(-1px)', boxShadow: 'md' }}
          _active={{ transform: 'translateY(0)' }}
          loading={isSubmitting}
          disabled={!isDirty || hasErrors || isCheckingCompliance || (hasWarnings && !acknowledgeWarnings)}
        >
          {hasErrors ? 'Non conforme' : hasWarnings && !acknowledgeWarnings ? 'Vérifiez les avertissements' : 'Enregistrer'}
        </AccessibleButton>
      </Flex>
    </Flex>
  ) : (
    <Flex gap={3} justify="space-between" w="full" flexWrap="wrap">
      <Flex gap={2}>
        {canDelete && !showDeleteConfirm && (
          <AccessibleButton variant="outline" colorPalette="red" size="sm" onClick={() => dispatch({ type: 'SHOW_DELETE_CONFIRM' })}>
            Supprimer
          </AccessibleButton>
        )}
      </Flex>
      <Flex gap={3}>
        {canValidate && !hasValidated && (
          <AccessibleButton bg="#16a34a" color="white" _hover={{ bg: '#15803d', transform: 'translateY(-1px)', boxShadow: 'md' }} _active={{ transform: 'translateY(0)' }} onClick={handleValidate} loading={isValidating}>
            {"Valider l'intervention"}
          </AccessibleButton>
        )}
        {canValidate && hasValidated && (
          <Text fontSize="sm" color="green.600" alignSelf="center">Vous avez validé cette intervention</Text>
        )}
        {userRole === 'employee' && shift && shift.status === 'planned' && (
          <AccessibleButton bg="#3D5166" color="white" _hover={{ bg: '#2E3F50', transform: 'translateY(-1px)', boxShadow: 'md' }} _active={{ transform: 'translateY(0)' }} onClick={() => navigate('/suivi-des-heures')} accessibleLabel="Aller au pointage pour cette intervention">
            Pointer
          </AccessibleButton>
        )}
        {canEdit && onRepeat && shift && shift.status === 'planned' && (
          <AccessibleButton variant="outline" bg="transparent" color="#3D5166" borderWidth="1.5px" borderColor="border.default" _hover={{ borderColor: '#3D5166', bg: '#EDF1F5' }} onClick={() => onRepeat(shift)}>
            Répéter
          </AccessibleButton>
        )}
        {canEdit && (
          <AccessibleButton bg="#3D5166" color="white" _hover={{ bg: '#2E3F50', transform: 'translateY(-1px)', boxShadow: 'md' }} _active={{ transform: 'translateY(0)' }} onClick={() => dispatch({ type: 'START_EDITING' })}>
            Modifier
          </AccessibleButton>
        )}
        <AccessibleButton variant="outline" bg="transparent" color="#3D5166" borderWidth="1.5px" borderColor="border.default" _hover={{ borderColor: '#3D5166', bg: '#EDF1F5' }} onClick={onClose}>
          Fermer
        </AccessibleButton>
      </Flex>
    </Flex>
  )

  return (
    <PlanningModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Modifier l'intervention" : "Détail de l'intervention"}
      subtitle={
        <Text fontSize="sm" color="text.muted" mt={1} textTransform="capitalize">
          {formattedDate}
        </Text>
      }
      titleRight={modalTitleRight}
      footer={footerContent}
    >
      {isEditing ? (
        <ShiftEditForm
          register={register}
          errors={errors}
          watchedBreakDuration={watchedValues.breakDuration}
          onSubmit={handleSubmit(onSubmit)}
          shiftType={shiftType}
          hasNightAction={hasNightAction}
          nightInterventionsCount={nightInterventionsCount}
          acknowledgeWarnings={acknowledgeWarnings}
          durationHours={durationHours}
          nightHoursCount={nightHoursCount}
          hasNightHours={hasNightHours}
          isRequalified={isRequalified}
          effectiveHoursComputed={effectiveHoursComputed}
          complianceResult={complianceResult}
          computedPay={computedPay}
          hasErrors={hasErrors}
          hasWarnings={hasWarnings}
          isCheckingCompliance={isCheckingCompliance}
          contract={contract}
          submitError={submitError}
          onShiftTypeChange={(t) => dispatch({ type: 'SET_SHIFT_TYPE', shiftType: t })}
          onNightActionChange={(v) => dispatch({ type: 'SET_HAS_NIGHT_ACTION', value: v })}
          onNightInterventionsChange={(n) => dispatch({ type: 'SET_NIGHT_INTERVENTIONS', count: n })}
          onAcknowledgeWarnings={() => dispatch({ type: 'ACKNOWLEDGE_WARNINGS' })}
        />
      ) : (
        <ShiftDetailView
          shift={shift}
          contract={contract}
          isLoadingContract={isLoadingContract}
          displayDuration={displayDuration}
          nightHoursCount={nightHoursCount}
          hasNightHours={hasNightHours}
          showDeleteConfirm={showDeleteConfirm}
          isDeleting={isDeleting}
          submitError={submitError}
          onHideDeleteConfirm={() => dispatch({ type: 'HIDE_DELETE_CONFIRM' })}
          onDelete={handleDelete}
        />
      )}
    </PlanningModal>
  )
}

export default ShiftDetailModal
