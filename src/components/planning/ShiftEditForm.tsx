/**
 * Formulaire d'édition d'une intervention (shift).
 * Extrait de ShiftDetailModal — gère uniquement l'UI du mode édition.
 */

import type React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { Box, Stack, Flex, Text, Textarea, Separator } from '@chakra-ui/react'
import type { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { AccessibleInput, AccessibleSelect } from '@/components/ui'
import { ComplianceAlert, PaySummary } from '@/components/compliance'
import { PresenceResponsibleDaySection } from './PresenceResponsibleDaySection'
import { PresenceResponsibleNightSection } from './PresenceResponsibleNightSection'
import { NightActionToggle } from './NightActionToggle'
import { TaskSelector } from './TaskSelector'
import type { Shift, Contract, ComplianceResult, ComputedPay } from '@/types'
import type { ShiftDetailFormData } from '@/lib/validation/shiftSchemas'
import { formatHoursCompact } from '@/lib/formatHours'
import { detectPresenceType, getPresenceMix } from '@/lib/presence/detectPresenceType'
import { PresenceMixedWarning } from './PresenceMixedWarning'
import {
  MANDATORY_BREAK_MINIMUM_MINUTES,
  MANDATORY_BREAK_THRESHOLD_MINUTES,
} from '@/lib/validation/shiftSchemas'

const SHIFT_TYPE_OPTIONS = [
  { value: 'effective', label: 'Travail effectif' },
  { value: 'presence', label: 'Présence responsable' },
]

const isPresenceType = (t: Shift['shiftType']): t is 'presence_day' | 'presence_night' =>
  t === 'presence_day' || t === 'presence_night'

const toSelectValue = (t: Shift['shiftType']): string => (isPresenceType(t) ? 'presence' : t)

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planifié' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'absent', label: 'Absent' },
]

interface ShiftEditFormProps {
  // Form API
  register: UseFormRegister<ShiftDetailFormData>
  errors: FieldErrors<ShiftDetailFormData>
  watchedBreakDuration: number | undefined
  watchedStartTime: string | undefined
  watchedEndTime: string | undefined
  onSubmit: React.FormEventHandler<HTMLFormElement>
  // Reducer state (champs métier hors form)
  shiftType: Shift['shiftType']
  hasNightAction: boolean
  nightInterventionsCount: number
  acknowledgeWarnings: boolean
  // Calculs
  durationHours: number
  nightHoursCount: number
  hasNightHours: boolean
  isRequalified: boolean
  effectiveHoursComputed: number | undefined
  // Compliance
  complianceResult: ComplianceResult | null
  computedPay: ComputedPay | null
  hasErrors: boolean
  hasWarnings: boolean
  contract: Contract | null
  // Erreur submit
  submitError: string | null
  // Tasks
  initialTasks: string[]
  setValue: UseFormSetValue<ShiftDetailFormData>
  // Dispatchers
  onShiftTypeChange: (type: Shift['shiftType']) => void
  onNightActionChange: (value: boolean) => void
  onNightInterventionsChange: (count: number) => void
  onAcknowledgeWarnings: () => void
}

export function ShiftEditForm({
  register,
  errors,
  watchedBreakDuration,
  watchedStartTime,
  watchedEndTime,
  onSubmit,
  shiftType,
  hasNightAction,
  nightInterventionsCount,
  acknowledgeWarnings,
  durationHours,
  nightHoursCount,
  hasNightHours,
  isRequalified,
  effectiveHoursComputed,
  complianceResult,
  computedPay,
  hasErrors,
  hasWarnings,
  contract,
  submitError,
  initialTasks,
  setValue,
  onShiftTypeChange,
  onNightActionChange,
  onNightInterventionsChange,
  onAcknowledgeWarnings,
}: ShiftEditFormProps) {
  const [tasksArray, setTasksArray] = useState<string[]>(initialTasks)

  const handleTasksChange = useCallback((tasks: string[]) => {
    setTasksArray(tasks)
    setValue('tasks', tasks.join('\n'))
  }, [setValue])

  // Re-détecter presence_day / presence_night quand les horaires changent
  useEffect(() => {
    if (!isPresenceType(shiftType)) return
    if (!watchedStartTime || !watchedEndTime) return
    const detected = detectPresenceType(watchedStartTime, watchedEndTime)
    if (detected !== shiftType) {
      onShiftTypeChange(detected)
    }
  }, [watchedStartTime, watchedEndTime, shiftType, onShiftTypeChange])

  return (
    <form id="edit-shift-form" onSubmit={onSubmit}>
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
          <Text fontSize="sm" color="text.muted">
            Durée : {formatHoursCompact(durationHours)}
            {(watchedBreakDuration ?? 0) > 0 &&
              ` (pause de ${watchedBreakDuration} min déduite)`
            }
          </Text>
        )}

        {/* Pause */}
        {(() => {
          const breakRequired = durationHours * 60 > MANDATORY_BREAK_THRESHOLD_MINUTES
          return (
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
          )
        })()}

        {/* Statut */}
        <AccessibleSelect
          label="Statut"
          options={STATUS_OPTIONS}
          error={errors.status?.message}
          required
          {...register('status')}
        />

        {/* Type d'intervention */}
        <AccessibleSelect
          label="Type d'intervention"
          options={SHIFT_TYPE_OPTIONS}
          value={toSelectValue(shiftType)}
          onChange={(e) => {
            const selected = e.target.value
            // "presence" = choix unifié → auto-détection jour/nuit selon horaires
            const newType =
              selected === 'presence'
                ? detectPresenceType(watchedStartTime ?? '09:00', watchedEndTime ?? '12:00')
                : (selected as Shift['shiftType'])
            onShiftTypeChange(newType)
          }}
        />

        {/* Avertissement présence à cheval jour/nuit */}
        {isPresenceType(shiftType) && watchedStartTime && watchedEndTime && (() => {
          const mix = getPresenceMix(watchedStartTime, watchedEndTime)
          return mix.isMixed ? (
            <PresenceMixedWarning dayHours={mix.dayHours} nightHours={mix.nightHours} />
          ) : null
        })()}

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
            onInterventionCountChange={onNightInterventionsChange}
          />
        )}

        {/* Toggle action de nuit — uniquement pour travail effectif */}
        {shiftType === 'effective' && hasNightHours && (
          <NightActionToggle
            mode="edit"
            nightHoursCount={nightHoursCount}
            hasNightAction={hasNightAction}
            onToggle={onNightActionChange}
          />
        )}

        <Separator />

        {/* Alertes de conformité */}
        {complianceResult && (hasErrors || hasWarnings) && (
          <ComplianceAlert
            result={complianceResult}
            onDismiss={
              hasWarnings && !hasErrors && !acknowledgeWarnings
                ? onAcknowledgeWarnings
                : undefined
            }
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
        <TaskSelector
          value={tasksArray}
          onChange={handleTasksChange}
        />
        <input type="hidden" {...register('tasks')} />

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
          <Box p={4} bg="red.50" borderRadius="10px">
            <Text color="red.700">{submitError}</Text>
          </Box>
        )}
      </Stack>
    </form>
  )
}
