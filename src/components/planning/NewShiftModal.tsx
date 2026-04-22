import { useState, useCallback, useEffect } from 'react'
import {
  Box,
  Stack,
  Flex,
  Text,
  Textarea,
  Separator,
} from '@chakra-ui/react'
import { AccessibleInput, AccessibleSelect, AccessibleButton, GhostButton, PrimaryButton } from '@/components/ui'
import { ComplianceAlert, PaySummary, ComplianceBadge } from '@/components/compliance'
import { PlanningModal } from './PlanningModal'
import type { ShiftType } from '@/types'
import { PresenceResponsibleDaySection } from './PresenceResponsibleDaySection'
import { PresenceResponsibleNightSection } from './PresenceResponsibleNightSection'
import { NightActionToggle } from './NightActionToggle'
import { Guard24hSection } from './Guard24hSection'
import { ShiftHoursSummary } from './ShiftHoursSummary'
import { RepeatConfigSection } from './RepeatConfigSection'
import { RepeatPreviewModal, type RepeatOccurrence } from './RepeatPreviewModal'
import { useNewShiftForm } from '@/hooks/useNewShiftForm'
import { useRepeatConfig } from '@/hooks/useRepeatConfig'
import { createShifts } from '@/services/shiftService'
import { SHIFT_TYPE_LABELS } from './shiftTypeLabels'
import { TaskSelector } from './TaskSelector'
import { logger } from '@/lib/logger'
import { toaster } from '@/lib/toaster'
import { formatHoursCompact } from '@/lib/formatHours'
import { detectPresenceType } from '@/lib/presence/detectPresenceType'

const SHIFT_TYPE_OPTIONS = [
  { value: 'effective', label: 'Travail effectif' },
  { value: 'presence', label: 'Présence responsable' },
  { value: 'guard_24h', label: 'Garde 24h' },
]

const isPresenceType = (t: ShiftType): t is 'presence_day' | 'presence_night' =>
  t === 'presence_day' || t === 'presence_night'

const toSelectValue = (t: ShiftType): string => (isPresenceType(t) ? 'presence' : t)

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
  const {
    register,
    handleSubmit,
    errors,
    watchedValues,
    isSubmitting,
    submitError,
    acknowledgeWarnings,
    setAcknowledgeWarnings,
    hasNightAction,
    setHasNightAction,
    shiftType,
    setShiftType,
    setValue,
    nightInterventionsCount,
    setNightInterventionsCount,
    guardSegments,
    addGuardSegment,
    removeGuardSegment,
    updateGuardSegmentEnd,
    updateGuardSegmentType,
    updateGuardSegmentBreak,
    selectedContract,
    nightHoursCount,
    hasNightHours,
    isRequalified,
    effectiveHoursComputed,
    complianceResult,
    computedPay,
    durationHours,
    isValidating,
    hasErrors,
    hasWarnings,
    contracts,
    isLoadingContracts,
    contractOptions,
    existingShifts,
    approvedAbsences,
    onSubmit,
    isSubmitDisabled,
  } = useNewShiftForm({ isOpen, employerId, defaultDate, onSuccess, onClose })

  const baseDate = watchedValues.date ? new Date(watchedValues.date) : defaultDate
  const repeatConfig = useRepeatConfig(baseDate)

  // Re-détecter presence_day / presence_night quand les horaires changent
  useEffect(() => {
    if (!isPresenceType(shiftType)) return
    if (!watchedValues.startTime || !watchedValues.endTime) return
    const detected = detectPresenceType(watchedValues.startTime, watchedValues.endTime)
    if (detected !== shiftType) {
      setShiftType(detected)
      setValue('shiftType', detected)
      if (detected !== 'presence_night') setNightInterventionsCount(0)
    }
  }, [watchedValues.startTime, watchedValues.endTime, shiftType, setShiftType, setValue, setNightInterventionsCount])

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false)
  const [tasksArray, setTasksArray] = useState<string[]>([])

  const handleTasksChange = useCallback((tasks: string[]) => {
    setTasksArray(tasks)
    setValue('tasks', tasks.join('\n'))
  }, [setValue])

  const buildShiftData = () => ({
    contractId: watchedValues.contractId ?? '',
    employeeId: contracts.find((c) => c.id === watchedValues.contractId)?.employeeId ?? '',
    startTime: watchedValues.startTime ?? '09:00',
    endTime: watchedValues.endTime ?? '12:00',
    breakDuration: watchedValues.breakDuration ?? 0,
    shiftType: shiftType,
    hasNightAction: shiftType === 'effective' && hasNightHours ? hasNightAction : undefined,
    nightInterventionsCount: (shiftType === 'presence_night' || shiftType === 'guard_24h') ? nightInterventionsCount : undefined,
    guardSegments: shiftType === 'guard_24h' ? guardSegments : undefined,
  })

  // Inclure le shift original (baseDate) + toutes les répétitions
  const repeatOccurrences: RepeatOccurrence[] = [
    ...(baseDate ? [{ date: baseDate, shiftData: buildShiftData() }] : []),
    ...repeatConfig.generatedDates.map((date) => ({ date, shiftData: buildShiftData() })),
  ]

  const handleRepeatConfirm = async (validOccurrences: RepeatOccurrence[]) => {
    if (!watchedValues.contractId) return
    setIsBatchSubmitting(true)
    try {
      const { failed } = await createShifts(
        watchedValues.contractId,
        validOccurrences.map((occ) => ({
          date: occ.date,
          startTime: watchedValues.startTime ?? '09:00',
          endTime: watchedValues.endTime ?? '12:00',
          breakDuration: watchedValues.breakDuration ?? 0,
          tasks: watchedValues.tasks ? watchedValues.tasks.split('\n').filter(Boolean) : [],
          notes: watchedValues.notes || undefined,
          hasNightAction: shiftType === 'effective' && hasNightHours ? hasNightAction : undefined,
          shiftType,
          nightInterventionsCount: (shiftType === 'presence_night' || shiftType === 'guard_24h') ? nightInterventionsCount : undefined,
          isRequalified,
          effectiveHours: effectiveHoursComputed ?? undefined,
          guardSegments: shiftType === 'guard_24h' ? guardSegments : undefined,
        }))
      )
      if (failed.length > 0) {
        logger.error('Certaines occurrences ont échoué:', failed)
        toaster.success({
          title: 'Interventions créées',
          description: `${validOccurrences.length - failed.length} créées, ${failed.length} échouées`,
        })
      } else {
        toaster.success({ title: `${validOccurrences.length} interventions créées avec succès` })
      }
      setIsPreviewOpen(false)
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Erreur création répétitions:', error)
      toaster.error({ title: 'Erreur lors de la création des interventions' })
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  const baseShiftSummary = (() => {
    if (!watchedValues.date) return ''
    const typeLabel = SHIFT_TYPE_LABELS[shiftType]
    return `${watchedValues.date} · ${watchedValues.startTime ?? ''}–${watchedValues.endTime ?? ''} · ${typeLabel}`
  })()

  const footerContent = (
    <Flex gap={3} justify="space-between" w="full" align="center">
      {isValidating && (
        <Text fontSize="sm" color="text.muted">Validation en cours...</Text>
      )}
      <Flex gap={3} ml="auto">
        <GhostButton onClick={onClose} disabled={isSubmitting || isBatchSubmitting}>
          Annuler
        </GhostButton>
        {repeatConfig.isRepeatEnabled ? (
          <PrimaryButton
            disabled={isSubmitDisabled || repeatOccurrences.length === 0}
            onClick={() => setIsPreviewOpen(true)}
          >
            Vérifier ({repeatOccurrences.length} intervention{repeatOccurrences.length > 1 ? 's' : ''})
          </PrimaryButton>
        ) : (
          <AccessibleButton
            type="submit"
            form="new-shift-form"
            bg={hasErrors ? 'gray.400' : 'brand.500'} color="white" _hover={{ bg: hasErrors ? 'gray.400' : 'brand.600', transform: 'translateY(-1px)', boxShadow: 'md' }} _active={{ transform: 'translateY(0)' }}
            loading={isSubmitting}
            disabled={isSubmitDisabled}
          >
            {hasErrors ? 'Intervention non conforme' : hasWarnings && !acknowledgeWarnings ? 'Vérifiez les avertissements' : "Créer l'intervention"}
          </AccessibleButton>
        )}
      </Flex>
    </Flex>
  )

  return (
    <>
    <PlanningModal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouvelle intervention"
      titleRight={complianceResult && !isValidating ? <ComplianceBadge result={complianceResult} size="sm" /> : undefined}
      large
      footer={footerContent}
    >
              <form id="new-shift-form" onSubmit={handleSubmit(onSubmit)}>
                <Stack gap={4}>
                  {/* Sélection auxiliaire */}
                  {isLoadingContracts ? (
                    <Text color="text.muted">Chargement des auxiliaires...</Text>
                  ) : contracts.length === 0 ? (
                    <Box p={4} bg="orange.50" borderRadius="10px">
                      <Text color="orange.700">
                        Aucun contrat actif. Veuillez d'abord créer un contrat avec un auxiliaire.
                      </Text>
                    </Box>
                  ) : (
                    <AccessibleSelect
                      label="Intervenant"
                      options={contractOptions}
                      placeholder="Sélectionnez un intervenant"
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
                    value={toSelectValue(shiftType)}
                    onChange={(e) => {
                      const selected = e.target.value
                      // "presence" = choix unifié → auto-détection jour/nuit selon horaires
                      const newType: ShiftType =
                        selected === 'presence'
                          ? detectPresenceType(
                              watchedValues.startTime ?? '09:00',
                              watchedValues.endTime ?? '12:00',
                            )
                          : (selected as ShiftType)
                      setShiftType(newType)
                      setValue('shiftType', newType)
                      if (newType !== 'presence_night' && newType !== 'guard_24h') {
                        setNightInterventionsCount(0)
                      }
                      if (newType !== 'effective') {
                        setHasNightAction(false)
                      }
                      if (newType === 'guard_24h') {
                        // géré par useEffect du hook
                      } else if (selected === 'presence') {
                        // on garde les horaires courants (l'auto-détection s'en occupe)
                      } else {
                        setValue('startTime', '09:00')
                        setValue('endTime', '12:00')
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
                        <Text fontSize="sm" fontWeight="medium" color="text.secondary" mb={1}>
                          Heure de fin
                        </Text>
                        <Box p={2} borderWidth="2px" borderColor="border.default" borderRadius="10px" bg="bg.page">
                          <Text fontSize="sm" color="text.muted">
                            {watchedValues.startTime || '—'}{' '}
                            <Text as="span" fontWeight="bold" color="text.secondary">+24h</Text> (auto)
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
                    <Text fontSize="sm" color="text.muted">
                      Durée : {formatHoursCompact(durationHours)}
                      {watchedValues.breakDuration > 0 &&
                        ` (pause de ${watchedValues.breakDuration} min déduite)`
                      }
                    </Text>
                  )}

                  {/* Pause globale — masquée pour guard_24h */}
                  {shiftType !== 'guard_24h' && (
                    <AccessibleInput
                      label="Pause (minutes)"
                      type="number"
                      helperText="Durée de la pause en minutes (20 min obligatoire si > 6h)"
                      error={errors.breakDuration?.message}
                      {...register('breakDuration')}
                    />
                  )}

                  {/* Section présence responsable JOUR */}
                  {shiftType === 'presence_day' && (
                    <PresenceResponsibleDaySection
                      durationHours={durationHours}
                      effectiveHoursComputed={effectiveHoursComputed}
                    />
                  )}

                  {/* Section présence responsable NUIT */}
                  {shiftType === 'presence_night' && (
                    <PresenceResponsibleNightSection
                      mode="edit"
                      durationHours={durationHours}
                      nightInterventionsCount={nightInterventionsCount}
                      isRequalified={isRequalified}
                      onInterventionCountChange={setNightInterventionsCount}
                    />
                  )}

                  {/* Section Garde 24h */}
                  {shiftType === 'guard_24h' && (
                    <Guard24hSection
                      guardSegments={guardSegments}
                      startTime={watchedValues.startTime}
                      effectiveHoursComputed={effectiveHoursComputed}
                      nightInterventionsCount={nightInterventionsCount}
                      onAddSegment={addGuardSegment}
                      onRemoveSegment={removeGuardSegment}
                      onUpdateSegmentEnd={updateGuardSegmentEnd}
                      onUpdateSegmentType={updateGuardSegmentType}
                      onUpdateSegmentBreak={updateGuardSegmentBreak}
                      onInterventionCountChange={setNightInterventionsCount}
                    />
                  )}

                  {/* Toggle action de nuit */}
                  {shiftType === 'effective' && hasNightHours && (
                    <NightActionToggle
                      mode="edit"
                      nightHoursCount={nightHoursCount}
                      hasNightAction={hasNightAction}
                      onToggle={setHasNightAction}
                    />
                  )}

                  {/* Récapitulatif heures */}
                  {selectedContract && (
                    <ShiftHoursSummary
                      shiftType={shiftType}
                      durationHours={durationHours}
                      effectiveHoursComputed={effectiveHoursComputed}
                      nightHoursCount={nightHoursCount}
                      nightInterventionsCount={nightInterventionsCount}
                      hasNightHours={hasNightHours}
                      isRequalified={isRequalified}
                    />
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
                  <TaskSelector
                    value={tasksArray}
                    onChange={handleTasksChange}
                    prefillFromSettings
                  />
                  <input type="hidden" {...register('tasks')} />

                  {/* Notes */}
                  <Box>
                    <Text fontWeight="600" fontSize="sm" color="text.default" mb={1}>
                      Notes
                    </Text>
                    <Textarea
                      placeholder="Notes ou instructions particulières..."
                      rows={3}
                      fontSize="sm"
                      borderWidth="1.5px"
                      borderColor="border.default"
                      borderRadius="10px"
                      bg="bg.page"
                      p="10px 12px"
                      minH="80px"
                      css={{
                        '&:focus': {
                          borderColor: 'var(--chakra-colors-brand-500)',
                          boxShadow: '0 0 0 3px rgba(78,100,120,.12)',
                          background: 'var(--chakra-colors-bg-surface, #fff)',
                        },
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        resize: 'vertical',
                      }}
                      {...register('notes')}
                    />
                  </Box>

                  {/* Répétition */}
                  <RepeatConfigSection
                    {...repeatConfig}
                    baseDate={baseDate}
                  />

                  {/* Erreur de soumission */}
                  {submitError && (
                    <Box p={4} bg="red.50" borderRadius="10px">
                      <Text color="red.700">{submitError}</Text>
                    </Box>
                  )}
                </Stack>
              </form>
    </PlanningModal>

    {isPreviewOpen && (
      <RepeatPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        occurrences={repeatOccurrences}
        existingShifts={existingShifts}
        approvedAbsences={approvedAbsences}
        baseShiftSummary={baseShiftSummary}
        isSubmitting={isBatchSubmitting}
        onConfirm={handleRepeatConfirm}
      />
    )}
    </>
  )
}

export default NewShiftModal
