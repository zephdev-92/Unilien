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
import { AccessibleInput, AccessibleSelect, AccessibleButton } from '@/components/ui'
import { ComplianceAlert, PaySummary, ComplianceBadge } from '@/components/compliance'
import type { ShiftType } from '@/types'
import { PresenceResponsibleDaySection } from './PresenceResponsibleDaySection'
import { PresenceResponsibleNightSection } from './PresenceResponsibleNightSection'
import { NightActionToggle } from './NightActionToggle'
import { Guard24hSection } from './Guard24hSection'
import { ShiftHoursSummary } from './ShiftHoursSummary'
import { useNewShiftForm } from '@/hooks/useNewShiftForm'

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
    onSubmit,
    isSubmitDisabled,
  } = useNewShiftForm({ isOpen, employerId, defaultDate, onSuccess, onClose })

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
              <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer">
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
                        <Box p={2} borderWidth="2px" borderColor="gray.200" borderRadius="md" bg="gray.50">
                          <Text fontSize="sm" color="gray.500">
                            {watchedValues.startTime || '—'}{' '}
                            <Text as="span" fontWeight="bold" color="gray.700">+24h</Text> (auto)
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
                {isValidating && (
                  <Text fontSize="sm" color="gray.500">
                    Validation en cours...
                  </Text>
                )}
                <Flex gap={3} ml="auto">
                  <AccessibleButton variant="outline" onClick={onClose} disabled={isSubmitting}>
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
                        : "Créer l'intervention"
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
