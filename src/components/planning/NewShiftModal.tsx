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
  Switch,
} from '@chakra-ui/react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { AccessibleInput, AccessibleSelect, AccessibleButton } from '@/components/ui'
import { ComplianceAlert, PaySummary, ComplianceBadge } from '@/components/compliance'
import { getContractsForEmployer, type ContractWithEmployee } from '@/services/contractService'
import { createShift, getShifts } from '@/services/shiftService'
import { getAbsencesForEmployer } from '@/services/absenceService'
import { useComplianceCheck } from '@/hooks/useComplianceCheck'
import { calculateNightHours, calculateShiftDuration } from '@/lib/compliance'
import { logger } from '@/lib/logger'
import type { ShiftForValidation, AbsenceForValidation } from '@/lib/compliance'
import type { ShiftType } from '@/types'

const shiftSchema = z.object({
  contractId: z.string().min(1, 'Veuillez sélectionner un auxiliaire'),
  date: z.string().min(1, 'La date est requise'),
  startTime: z.string().min(1, "L'heure de début est requise"),
  endTime: z.string().min(1, "L'heure de fin est requise"),
  breakDuration: z.coerce.number().min(0, 'La pause ne peut pas être négative').default(0),
  tasks: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => data.startTime !== data.endTime, {
  message: "L'heure de fin doit être différente de l'heure de début",
  path: ['endTime'],
})

type ShiftFormData = z.infer<typeof shiftSchema>

const SHIFT_TYPE_OPTIONS = [
  { value: 'effective', label: 'Travail effectif' },
  { value: 'presence_day', label: 'Présence responsable (jour)' },
  { value: 'presence_night', label: 'Présence responsable (nuit)' },
]

const REQUALIFICATION_THRESHOLD = 4

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
  const [approvedAbsences, setApprovedAbsences] = useState<AbsenceForValidation[]>([])
  const [isLoadingContracts, setIsLoadingContracts] = useState(true)
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

  // Détecter les heures de nuit (21h-6h)
  const nightHoursCount = useMemo(() => {
    if (!watchedValues.startTime || !watchedValues.endTime || !watchedValues.date) return 0
    try {
      return calculateNightHours(
        new Date(watchedValues.date),
        watchedValues.startTime,
        watchedValues.endTime
      )
    } catch {
      return 0
    }
  }, [watchedValues.startTime, watchedValues.endTime, watchedValues.date])

  const hasNightHours = nightHoursCount > 0

  // Calcul de la requalification (>= 4 interventions nuit)
  const isRequalified = shiftType === 'presence_night' && nightInterventionsCount >= REQUALIFICATION_THRESHOLD

  // Calcul des heures effectives selon le type
  const effectiveHoursComputed = useMemo(() => {
    if (!watchedValues.startTime || !watchedValues.endTime) return null

    try {
      const durationMinutes = calculateShiftDuration(
        watchedValues.startTime,
        watchedValues.endTime,
        watchedValues.breakDuration || 0
      )
      const durationHours = durationMinutes / 60

      if (shiftType === 'presence_day') {
        return Math.round(durationHours * (2 / 3) * 100) / 100
      }
      if (shiftType === 'presence_night' && isRequalified) {
        return durationHours // Requalifié = 100% travail effectif
      }
      return null // Travail effectif standard ou nuit non requalifiée
    } catch {
      return null
    }
  }, [watchedValues.startTime, watchedValues.endTime, watchedValues.breakDuration, shiftType, isRequalified])

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
      nightInterventionsCount: shiftType === 'presence_night' ? nightInterventionsCount : undefined,
    }
  }, [watchedValues, contracts, hasNightHours, hasNightAction, shiftType, nightInterventionsCount])

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
            shiftType: s.shiftType,
          }))
          setExistingShifts(shiftsForValidation)
        })
        .catch((err) => logger.error('Erreur chargement shifts pour validation:', err))

      // Charger les absences approuvées
      getAbsencesForEmployer(employerId)
        .then((absences) => {
          const approved: AbsenceForValidation[] = absences
            .filter((a) => a.status === 'approved')
            .map((a) => ({
              id: a.id,
              employeeId: a.employeeId,
              absenceType: a.absenceType,
              startDate: new Date(a.startDate),
              endDate: new Date(a.endDate),
              status: a.status,
            }))
          setApprovedAbsences(approved)
        })
        .catch((err) => logger.error('Erreur chargement absences:', err))
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
      setHasNightAction(false)
      setShiftType('effective')
      setNightInterventionsCount(0)
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
        hasNightAction: shiftType === 'effective' && hasNightHours ? hasNightAction : undefined,
        shiftType,
        nightInterventionsCount: shiftType === 'presence_night' ? nightInterventionsCount : undefined,
        isRequalified,
        effectiveHours: effectiveHoursComputed ?? undefined,
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
                  <AccessibleSelect
                    label="Type d'intervention"
                    options={SHIFT_TYPE_OPTIONS}
                    value={shiftType}
                    onChange={(e) => {
                      const newType = e.target.value as ShiftType
                      setShiftType(newType)
                      // Reset des états liés au type précédent
                      if (newType !== 'presence_night') {
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

                  {/* ── Section présence responsable JOUR ── */}
                  {shiftType === 'presence_day' && durationHours > 0 && (
                    <Box
                      p={4}
                      bg="blue.50"
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="blue.200"
                    >
                      <Text fontWeight="medium" color="blue.800" mb={2}>
                        Présence responsable de jour
                      </Text>
                      <Text fontSize="sm" color="blue.700" mb={3}>
                        L'auxiliaire reste vigilant mais peut vaquer à des occupations personnelles.
                        Les heures sont converties en travail effectif au coefficient 2/3 (Art. 137.1 IDCC 3239).
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

                  {/* ── Section présence responsable NUIT ── */}
                  {shiftType === 'presence_night' && (
                    <Box
                      p={4}
                      bg="purple.50"
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="purple.200"
                    >
                      <Text fontWeight="medium" color="purple.800" mb={2}>
                        Présence responsable de nuit
                      </Text>
                      <Text fontSize="sm" color="purple.700" mb={3}>
                        L'auxiliaire dort sur place et intervient si besoin.
                        Indemnité forfaitaire d'au moins 1/4 du salaire horaire (Art. 148 IDCC 3239).
                      </Text>

                      {/* Nombre d'interventions */}
                      <Box mb={3}>
                        <AccessibleInput
                          label="Nombre d'interventions pendant la nuit"
                          type="number"
                          helperText="Chaque intervention (change, aide, urgence...) doit être comptée"
                          value={nightInterventionsCount}
                          onChange={(e) => setNightInterventionsCount(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                      </Box>

                      {/* Alerte requalification */}
                      {isRequalified && (
                        <Box
                          p={3}
                          bg="orange.100"
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="orange.300"
                          mb={3}
                        >
                          <Text fontWeight="bold" color="orange.800" fontSize="sm">
                            Requalification en travail effectif
                          </Text>
                          <Text fontSize="xs" color="orange.700" mt={1}>
                            {nightInterventionsCount} interventions (seuil : {REQUALIFICATION_THRESHOLD}).
                            Toute la plage est requalifiée en travail effectif et rémunérée à 100%
                            au lieu du forfaitaire 1/4 (Art. 148 IDCC 3239).
                          </Text>
                        </Box>
                      )}

                      {/* Résumé indemnité */}
                      {durationHours > 0 && (
                        <Box p={3} bg="white" borderRadius="md">
                          <Flex justify="space-between" align="center">
                            <Text fontSize="sm" color="gray.600">Durée de présence</Text>
                            <Text fontSize="sm" fontWeight="medium">{durationHours.toFixed(1)}h</Text>
                          </Flex>
                          <Flex justify="space-between" align="center" mt={1}>
                            <Text fontSize="sm" color="gray.600">
                              {isRequalified ? 'Rémunération (100% — requalifié)' : 'Indemnité forfaitaire (×1/4)'}
                            </Text>
                            <Text fontSize="sm" fontWeight="bold" color={isRequalified ? 'orange.700' : 'purple.700'}>
                              {isRequalified ? `${durationHours.toFixed(1)}h effectives` : `${(durationHours * 0.25).toFixed(1)}h équiv.`}
                            </Text>
                          </Flex>
                          {nightInterventionsCount > 0 && !isRequalified && (
                            <Text fontSize="xs" color="gray.500" mt={2}>
                              {nightInterventionsCount} intervention{nightInterventionsCount > 1 ? 's' : ''} — les interventions sont rémunérées en travail effectif avec majoration nuit (+20%)
                            </Text>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Toggle action de nuit — uniquement pour travail effectif avec heures de nuit */}
                  {shiftType === 'effective' && hasNightHours && (
                    <Box
                      p={4}
                      bg="purple.50"
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="purple.200"
                    >
                      <Flex justify="space-between" align="center" mb={2}>
                        <Box flex={1}>
                          <Text fontWeight="medium" color="purple.800">
                            Heures de nuit détectées ({nightHoursCount.toFixed(1)}h)
                          </Text>
                          <Text fontSize="sm" color="purple.600" mt={1}>
                            La majoration de nuit (+20%) ne s'applique que si l'auxiliaire
                            effectue un acte (soin, aide...) pendant les heures de nuit.
                            La simple présence ne donne pas droit à la majoration.
                          </Text>
                        </Box>
                      </Flex>
                      <Flex
                        justify="space-between"
                        align="center"
                        mt={3}
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
                      {hasNightAction && (
                        <Text fontSize="xs" color="green.600" mt={2}>
                          Majoration de nuit appliquée : +20% sur {nightHoursCount.toFixed(1)}h
                        </Text>
                      )}
                      {!hasNightAction && (
                        <Text fontSize="xs" color="gray.500" mt={2}>
                          Pas de majoration — présence de nuit uniquement
                        </Text>
                      )}
                    </Box>
                  )}

                  {/* ── Récapitulatif heures (Idée C) ── */}
                  {shiftType !== 'effective' && durationHours > 0 && selectedContract && (
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
