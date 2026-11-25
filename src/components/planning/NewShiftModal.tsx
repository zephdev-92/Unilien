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
import { format, addDays } from 'date-fns'
import {
  MANDATORY_BREAK_MINIMUM_MINUTES,
  MANDATORY_BREAK_THRESHOLD_MINUTES,
} from '@/lib/validation/shiftSchemas'

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
    isSegmentedShift,
    savedSegments,
    hasNightPresence,
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

  // Découpage visible d'office s'il n'est pas trivial ; sinon sur demande
  const [showBreakdown, setShowBreakdown] = useState(false)
  useEffect(() => {
    if (isOpen) setShowBreakdown(false)
  }, [isOpen])
  const isPlainEffective = shiftType === 'effective' && !isSegmentedShift
  // Heures effectives affichées dans le découpage (présence seule → 0)
  const breakdownEffectiveHours = isPlainEffective
    ? durationHours
    : savedSegments ? effectiveHoursComputed : 0

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
    hasNightAction: isPlainEffective && hasNightHours ? hasNightAction : undefined,
    nightInterventionsCount: hasNightPresence ? nightInterventionsCount : undefined,
    guardSegments: savedSegments,
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
          hasNightAction: isPlainEffective && hasNightHours ? hasNightAction : undefined,
          shiftType,
          nightInterventionsCount: hasNightPresence ? nightInterventionsCount : undefined,
          isRequalified,
          effectiveHours: effectiveHoursComputed ?? undefined,
          guardSegments: savedSegments,
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
    return `${watchedValues.date} · ${watchedValues.startTime ?? ''}–${watchedValues.endTime ?? ''} · ${typeLabel}${isSegmentedShift ? ' (découpée)' : ''}`
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

                  <input type="hidden" {...register('shiftType')} />

                  {/* Début / fin — façon agenda */}
                  <Flex gap={4}>
                    <Box flex={1}>
                      <AccessibleInput
                        label="Début"
                        type="date"
                        error={errors.date?.message}
                        required
                        {...register('date')}
                      />
                    </Box>
                    <Box flex={1}>
                      <AccessibleInput
                        label="Heure de début"
                        type="time"
                        error={errors.startTime?.message}
                        required
                        {...register('startTime')}
                      />
                    </Box>
                  </Flex>
                  <Flex gap={4}>
                    <Box flex={1}>
                      <AccessibleInput
                        label="Fin"
                        type="date"
                        min={watchedValues.date}
                        max={watchedValues.date ? format(addDays(new Date(`${watchedValues.date}T00:00`), 1), 'yyyy-MM-dd') : undefined}
                        error={errors.endDate?.message}
                        required
                        {...register('endDate')}
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
                    <Text fontSize="sm" color="text.muted">
                      Durée : {shiftType === 'guard_24h' ? '24h (garde)' : formatHoursCompact(durationHours)}
                      {!isSegmentedShift && watchedValues.breakDuration > 0 &&
                        ` (pause de ${watchedValues.breakDuration} min déduite)`
                      }
                    </Text>
                  )}

                  {/* Pause globale — si non découpée (sinon pause par segment) */}
                  {!isSegmentedShift && (() => {
                    const breakRequired = durationHours * 60 > MANDATORY_BREAK_THRESHOLD_MINUTES
                    return (
                      <Box>
                        <AccessibleInput
                          label="Pause (minutes)"
                          type="number"
                          min={breakRequired ? MANDATORY_BREAK_MINIMUM_MINUTES : 0}
                          step={5}
                          helperText={
                            breakRequired
                              ? `Intervention > 6 h : ${MANDATORY_BREAK_MINIMUM_MINUTES} min minimum obligatoire (art. L3121-16).`
                              : 'Durée de la pause en minutes.'
                          }
                          error={errors.breakDuration?.message}
                          {...register('breakDuration')}
                        />
                      </Box>
                    )
                  })()}

                  {/* Découpage suggéré (effectif / présence / nuit) — modifiable */}
                  {guardSegments.length > 0 && (showBreakdown || !isPlainEffective) ? (
                    <Guard24hSection
                      title="Découpage suggéré"
                      guardSegments={guardSegments}
                      startTime={watchedValues.startTime}
                      endTime={watchedValues.endTime}
                      showBreaks={isSegmentedShift}
                      showNightInterventions={hasNightPresence}
                      effectiveHoursComputed={breakdownEffectiveHours}
                      nightInterventionsCount={nightInterventionsCount}
                      onAddSegment={addGuardSegment}
                      onRemoveSegment={removeGuardSegment}
                      onUpdateSegmentEnd={updateGuardSegmentEnd}
                      onUpdateSegmentType={updateGuardSegmentType}
                      onUpdateSegmentBreak={updateGuardSegmentBreak}
                      onInterventionCountChange={setNightInterventionsCount}
                    />
                  ) : guardSegments.length > 0 && (
                    <GhostButton size="sm" alignSelf="flex-start" onClick={() => setShowBreakdown(true)}>
                      Découper l'intervention (présence responsable, nuit…)
                    </GhostButton>
                  )}

                  {/* Toggle action de nuit */}
                  {isPlainEffective && hasNightHours && (
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
