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
import { createShift } from '@/services/shiftService'
import { useComplianceCheck } from '@/hooks/useComplianceCheck'
import { logger } from '@/lib/logger'
import type { ShiftType } from '@/types'
import { useShiftNightHours } from '@/hooks/useShiftNightHours'
import { useShiftRequalification, REQUALIFICATION_THRESHOLD } from '@/hooks/useShiftRequalification'
import { useShiftEffectiveHours } from '@/hooks/useShiftEffectiveHours'
import { useGuardSegments } from '@/hooks/useGuardSegments'
import { useShiftValidationData } from '@/hooks/useShiftValidationData'
import { PresenceResponsibleDaySection } from './PresenceResponsibleDaySection'
import { PresenceResponsibleNightSection } from './PresenceResponsibleNightSection'
import { NightActionToggle } from './NightActionToggle'

const SHIFT_TYPE_VALUES = ['effective', 'presence_day', 'presence_night', 'guard_24h'] as const

const shiftSchema = z.object({
  contractId: z.string().min(1, 'Veuillez sélectionner un auxiliaire'),
  shiftType: z.enum(SHIFT_TYPE_VALUES).default('effective'),
  date: z.string().min(1, 'La date est requise'),
  startTime: z.string().min(1, "L'heure de début est requise"),
  endTime: z.string().min(1, "L'heure de fin est requise"),
  breakDuration: z.coerce.number().min(0, 'La pause ne peut pas être négative').default(0),
  tasks: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  // Pour guard_24h : endTime = startTime = 24h, c'est intentionnel
  if (data.shiftType === 'guard_24h') return true
  return data.startTime !== data.endTime
}, {
  message: "L'heure de fin doit être différente de l'heure de début",
  path: ['endTime'],
})

type ShiftFormData = z.infer<typeof shiftSchema>

const SHIFT_TYPE_OPTIONS = [
  { value: 'effective', label: 'Travail effectif' },
  { value: 'presence_day', label: 'Présence responsable (jour)' },
  { value: 'presence_night', label: 'Présence responsable (nuit)' },
  { value: 'guard_24h', label: 'Garde 24h' },
]


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
  const { contracts, existingShifts, approvedAbsences, isLoadingContracts } = useShiftValidationData({
    isOpen,
    employerId,
    defaultDate,
  })
  const {
    guardSegments,
    setGuardSegments,
    resetToDefaults: resetGuardSegments,
    addGuardSegment,
    removeGuardSegment,
    updateGuardSegmentEnd,
    updateGuardSegmentType,
    updateGuardSegmentBreak,
  } = useGuardSegments()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false)
  const [hasNightAction, setHasNightAction] = useState(false)
  const [shiftType, setShiftType] = useState<ShiftType>('effective')
  const [nightInterventionsCount, setNightInterventionsCount] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      shiftType: 'effective',
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

  // Pour guard_24h : endTime = startTime (même heure = 24h via calculateShiftDuration)
  // + synchroniser le premier segment avec l'heure de début
  useEffect(() => {
    if (shiftType === 'guard_24h' && watchedValues.startTime) {
      setValue('endTime', watchedValues.startTime)
      setGuardSegments(prev => {
        if (prev[0]?.startTime === watchedValues.startTime) return prev
        return [{ ...prev[0], startTime: watchedValues.startTime }, ...prev.slice(1)]
      })
    }
  }, [shiftType, watchedValues.startTime, setValue, setGuardSegments])

  // Pour guard_24h : synchroniser breakDuration avec la somme des pausees des segments effectifs
  useEffect(() => {
    if (shiftType === 'guard_24h') {
      const totalBreak = guardSegments.reduce((sum, seg) =>
        seg.type === 'effective' ? sum + (seg.breakMinutes ?? 0) : sum, 0)
      setValue('breakDuration', totalBreak)
    }
  }, [shiftType, guardSegments, setValue])

  // Heures de nuit (21h–6h)
  const { nightHoursCount, hasNightHours } = useShiftNightHours({
    startTime: watchedValues.startTime,
    endTime: watchedValues.endTime,
    date: watchedValues.date,
  })

  // Requalification présence de nuit (>= 4 interventions)
  const { isRequalified } = useShiftRequalification({ shiftType, nightInterventionsCount })

  // Heures effectives pondérées selon le type
  const { effectiveHoursComputed } = useShiftEffectiveHours({
    startTime: watchedValues.startTime,
    endTime: watchedValues.endTime,
    breakDuration: watchedValues.breakDuration || 0,
    shiftType,
    isRequalified,
    guardSegments,
  })

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
      hasNightAction: shiftType === 'effective' && hasNightHours ? hasNightAction : undefined,
      shiftType,
      nightInterventionsCount: (shiftType === 'presence_night' || shiftType === 'guard_24h') ? nightInterventionsCount : undefined,
      guardSegments: shiftType === 'guard_24h' ? guardSegments : undefined,
    }
  }, [watchedValues, contracts, hasNightHours, hasNightAction, shiftType, nightInterventionsCount, guardSegments])

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
    approvedAbsences,
  })

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
      setHasNightAction(false)
      setShiftType('effective')
      setNightInterventionsCount(0)
      resetGuardSegments()
    }
  }, [isOpen, defaultDate, reset, resetGuardSegments])

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
        hasNightAction: shiftType === 'effective' && hasNightHours ? hasNightAction : undefined,
        shiftType,
        nightInterventionsCount: (shiftType === 'presence_night' || shiftType === 'guard_24h') ? nightInterventionsCount : undefined,
        isRequalified,
        effectiveHours: effectiveHoursComputed ?? undefined,
        guardSegments: shiftType === 'guard_24h' ? guardSegments : undefined,
      })

      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Erreur création intervention:', error)
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

                  {/* Type d'intervention */}
                  <input type="hidden" {...register('shiftType')} />
                  <AccessibleSelect
                    label="Type d'intervention"
                    options={SHIFT_TYPE_OPTIONS}
                    value={shiftType}
                    onChange={(e) => {
                      const newType = e.target.value as ShiftType
                      setShiftType(newType)
                      setValue('shiftType', newType)
                      // Reset des états liés au type précédent
                      if (newType !== 'presence_night' && newType !== 'guard_24h') {
                        setNightInterventionsCount(0)
                      }
                      if (newType !== 'effective') {
                        setHasNightAction(false)
                      }
                    }}
                  />

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
                    {shiftType === 'guard_24h' ? (
                      <Box flex={1}>
                        <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                          Heure de fin
                        </Text>
                        <Box
                          p={2}
                          borderWidth="2px"
                          borderColor="gray.200"
                          borderRadius="md"
                          bg="gray.50"
                        >
                          <Text fontSize="sm" color="gray.500">
                            {watchedValues.startTime || '—'} <Text as="span" fontWeight="bold" color="gray.700">+24h</Text> (auto)
                          </Text>
                        </Box>
                        <input type="hidden" {...register('endTime')} />
                      </Box>
                    ) : (
                      <Box flex={1}>
                        <AccessibleInput
                          label="Heure de fin"
                          type="time"
                          error={errors.endTime?.message}
                          required
                          {...register('endTime')}
                        />
                      </Box>
                    )}
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

                  {/* Pause globale — masquée pour guard_24h (calculée automatiquement depuis les segments) */}
                  {shiftType !== 'guard_24h' && (
                    <AccessibleInput
                      label="Pause (minutes)"
                      type="number"
                      helperText="Durée de la pause en minutes (20 min obligatoire si > 6h)"
                      error={errors.breakDuration?.message}
                      {...register('breakDuration')}
                    />
                  )}

                  {/* ── Section présence responsable JOUR ── */}
                  {shiftType === 'presence_day' && (
                    <PresenceResponsibleDaySection
                      durationHours={durationHours}
                      effectiveHoursComputed={effectiveHoursComputed}
                    />
                  )}

                  {/* ── Section présence responsable NUIT ── */}
                  {shiftType === 'presence_night' && (
                    <PresenceResponsibleNightSection
                      mode="edit"
                      durationHours={durationHours}
                      nightInterventionsCount={nightInterventionsCount}
                      isRequalified={isRequalified}
                      onInterventionCountChange={setNightInterventionsCount}
                    />
                  )}

                  {/* ── Section Garde 24h ── */}
                  {shiftType === 'guard_24h' && (
                    <Box
                      p={4}
                      bg="teal.50"
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="teal.200"
                    >
                      <Text fontWeight="medium" color="teal.800" mb={4}>
                        Garde 24h — N segments libres
                      </Text>

                      {/* Barre visuelle colorée (lecture seule) */}
                      <Flex gap={1} mb={4} borderRadius="md" overflow="hidden" h="32px">
                        {guardSegments.map((seg, i) => {
                          const segEnd = guardSegments[i + 1]?.startTime ?? guardSegments[0].startTime
                          const durMins = calculateShiftDuration(seg.startTime, segEnd, 0)
                          const bg = seg.type === 'effective'
                            ? 'blue.200'
                            : seg.type === 'presence_day'
                              ? 'cyan.200'
                              : 'purple.200'
                          const color = seg.type === 'effective'
                            ? 'blue.800'
                            : seg.type === 'presence_day'
                              ? 'cyan.800'
                              : 'purple.800'
                          return (
                            <Flex
                              key={i}
                              flex={Math.max(durMins, 30)}
                              bg={bg}
                              minW="32px"
                              align="center"
                              justify="center"
                            >
                              <Text fontSize="xs" color={color} fontWeight="medium">
                                {(durMins / 60).toFixed(1)}h
                              </Text>
                            </Flex>
                          )
                        })}
                      </Flex>

                      {/* Liste de segments */}
                      <Stack gap={3} mb={4}>
                        {guardSegments.map((seg, i) => {
                          const isLast = i === guardSegments.length - 1
                          const canDelete = guardSegments.length > 2
                          const minBreakRequired = getMinBreakForSegment(i, guardSegments)
                          return (
                            <Box
                              key={i}
                              p={3}
                              bg="white"
                              borderRadius="md"
                              borderWidth="1px"
                              borderColor="gray.200"
                            >
                              {/* En-tête : plage horaire + boutons actions */}
                              <Flex align="center" gap={2} mb={2}>
                                <Text fontSize="sm" fontWeight="medium" color="gray.700" minW="45px">
                                  {seg.startTime}
                                </Text>
                                <Text fontSize="xs" color="gray.400">→</Text>
                                {isLast ? (
                                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                                    {guardSegments[0].startTime} +1j
                                  </Text>
                                ) : (
                                  <input
                                    type="time"
                                    value={guardSegments[i + 1].startTime}
                                    onChange={(e) => updateGuardSegmentEnd(i, e.target.value)}
                                    style={{
                                      fontSize: '0.875rem',
                                      border: '1px solid #CBD5E0',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                    }}
                                  />
                                )}
                                <Box flex={1} />
                                <AccessibleButton
                                  size="sm"
                                  variant="ghost"
                                  accessibleLabel={`Diviser le segment ${i + 1}`}
                                  title="Diviser ce segment en deux"
                                  onClick={() => addGuardSegment(i)}
                                >
                                  ÷
                                </AccessibleButton>
                                <AccessibleButton
                                  size="sm"
                                  variant="ghost"
                                  accessibleLabel={`Supprimer le segment ${i + 1}`}
                                  title="Supprimer ce segment"
                                  disabled={!canDelete}
                                  onClick={() => { if (canDelete) removeGuardSegment(i) }}
                                >
                                  ×
                                </AccessibleButton>
                              </Flex>

                              {/* Type de segment */}
                              <Box mb={seg.type === 'effective' ? 2 : 0}>
                                <AccessibleSelect
                                  label="Type de segment"
                                  options={[
                                    { value: 'effective', label: 'Travail effectif' },
                                    { value: 'presence_day', label: 'Présence responsable (jour)' },
                                    { value: 'presence_night', label: 'Présence de nuit' },
                                  ]}
                                  value={seg.type}
                                  onChange={(e) => updateGuardSegmentType(i, e.target.value as GuardSegment['type'])}
                                />
                              </Box>

                              {/* Pause — uniquement pour les segments travail effectif */}
                              {seg.type === 'effective' && (
                                <AccessibleInput
                                  label="Pause (minutes)"
                                  type="number"
                                  helperText={minBreakRequired > 0
                                    ? '20 min minimum légal (segment effectif > 6h — Art. L3121-16)'
                                    : undefined}
                                  value={seg.breakMinutes ?? 0}
                                  onChange={(e) => updateGuardSegmentBreak(i, Math.max(0, parseInt(e.target.value) || 0))}
                                />
                              )}
                            </Box>
                          )
                        })}
                      </Stack>

                      {/* Bouton ajouter un segment */}
                      <Box mb={4}>
                        <AccessibleButton
                          size="sm"
                          variant="outline"
                          accessibleLabel="Ajouter un segment"
                          onClick={() => addGuardSegment(guardSegments.length - 1)}
                        >
                          + Ajouter un segment
                        </AccessibleButton>
                      </Box>

                      {/* Compteur total travail effectif */}
                      <Box p={3} bg="white" borderRadius="md" mb={4}>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" color="gray.600">Total travail effectif</Text>
                          <Text
                            fontSize="sm"
                            fontWeight="bold"
                            color={(effectiveHoursComputed ?? 0) > 12 ? 'red.600' : 'green.700'}
                          >
                            {(effectiveHoursComputed ?? 0).toFixed(1)}h / 12h max
                          </Text>
                        </Flex>
                      </Box>

                      {/* Nombre d'interventions nocturnes */}
                      <Box mb={nightInterventionsCount >= REQUALIFICATION_THRESHOLD ? 3 : 0}>
                        <AccessibleInput
                          label="Interventions pendant la présence de nuit"
                          type="number"
                          helperText={`Chaque intervention (change, aide, urgence…) doit être comptée. Si ≥ ${REQUALIFICATION_THRESHOLD} : requalification en travail effectif (Art. 148 IDCC 3239)`}
                          value={nightInterventionsCount}
                          onChange={(e) => setNightInterventionsCount(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                      </Box>

                      {/* Alerte requalification */}
                      {nightInterventionsCount >= REQUALIFICATION_THRESHOLD && (
                        <Box
                          p={3}
                          bg="orange.100"
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="orange.300"
                        >
                          <Text fontWeight="bold" color="orange.800" fontSize="sm">
                            Requalification de la présence de nuit
                          </Text>
                          <Text fontSize="xs" color="orange.700" mt={1}>
                            {nightInterventionsCount} interventions (seuil : {REQUALIFICATION_THRESHOLD}).
                            Les segments présence de nuit sont requalifiés en travail effectif rémunéré à 100%
                            (Art. 148 IDCC 3239).
                          </Text>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Toggle action de nuit — uniquement pour travail effectif avec heures de nuit */}
                  {shiftType === 'effective' && hasNightHours && (
                    <NightActionToggle
                      mode="edit"
                      nightHoursCount={nightHoursCount}
                      hasNightAction={hasNightAction}
                      onToggle={setHasNightAction}
                    />
                  )}

                  {/* ── Récapitulatif heures (Idée C) ── */}
                  {shiftType !== 'effective' && shiftType !== 'guard_24h' && durationHours > 0 && selectedContract && (
                    <Box
                      p={4}
                      bg="gray.50"
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="gray.200"
                    >
                      <Text fontWeight="medium" color="gray.700" mb={2} fontSize="sm">
                        Récapitulatif heures
                      </Text>
                      <Stack gap={1}>
                        {shiftType === 'presence_day' && (
                          <>
                            <Flex justify="space-between">
                              <Text fontSize="sm" color="gray.600">Présence responsable</Text>
                              <Text fontSize="sm">{durationHours.toFixed(1)}h</Text>
                            </Flex>
                            <Flex justify="space-between">
                              <Text fontSize="sm" color="gray.600">Équivalent travail (×2/3)</Text>
                              <Text fontSize="sm" fontWeight="medium">{effectiveHoursComputed?.toFixed(1) ?? '—'}h</Text>
                            </Flex>
                          </>
                        )}
                        {shiftType === 'presence_night' && (
                          <>
                            <Flex justify="space-between">
                              <Text fontSize="sm" color="gray.600">Présence de nuit</Text>
                              <Text fontSize="sm">{durationHours.toFixed(1)}h</Text>
                            </Flex>
                            {isRequalified && (
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="orange.700" fontWeight="medium">Requalifié travail effectif</Text>
                                <Text fontSize="sm" fontWeight="bold" color="orange.700">{durationHours.toFixed(1)}h</Text>
                              </Flex>
                            )}
                            {nightInterventionsCount > 0 && hasNightHours && (
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">Majoration nuit (+20%)</Text>
                                <Text fontSize="sm">{nightHoursCount.toFixed(1)}h</Text>
                              </Flex>
                            )}
                          </>
                        )}
                        <Separator my={1} />
                        <Flex justify="space-between">
                          <Text fontSize="sm" fontWeight="bold" color="gray.800">Total travail effectif</Text>
                          <Text fontSize="sm" fontWeight="bold" color="gray.800">
                            {shiftType === 'presence_day'
                              ? `${effectiveHoursComputed?.toFixed(1) ?? '—'}h`
                              : isRequalified
                                ? `${durationHours.toFixed(1)}h`
                                : '—'
                            }
                          </Text>
                        </Flex>
                      </Stack>
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
                  {computedPay && selectedContract && durationHours > 0 && (
                    <PaySummary
                      pay={computedPay}
                      hourlyRate={selectedContract.hourlyRate}
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
