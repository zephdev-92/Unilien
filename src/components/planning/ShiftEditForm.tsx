/**
 * Formulaire d'édition d'une intervention (shift).
 * Extrait de ShiftDetailModal — gère uniquement l'UI du mode édition.
 */

import type React from 'react'
import { Box, Stack, Flex, Text, Textarea, Separator } from '@chakra-ui/react'
import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import { AccessibleInput, AccessibleSelect } from '@/components/ui'
import { ComplianceAlert, PaySummary } from '@/components/compliance'
import { PresenceResponsibleDaySection } from './PresenceResponsibleDaySection'
import { PresenceResponsibleNightSection } from './PresenceResponsibleNightSection'
import { NightActionToggle } from './NightActionToggle'
import type { Shift, Contract, ComplianceResult, ComputedPay } from '@/types'
import type { ShiftDetailFormData } from '@/lib/validation/shiftSchemas'

const SHIFT_TYPE_OPTIONS = [
  { value: 'effective', label: 'Travail effectif' },
  { value: 'presence_day', label: 'Présence responsable (jour)' },
  { value: 'presence_night', label: 'Présence responsable (nuit)' },
]

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
  onShiftTypeChange,
  onNightActionChange,
  onNightInterventionsChange,
  onAcknowledgeWarnings,
}: ShiftEditFormProps) {
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
          <Text fontSize="sm" color="gray.600">
            Durée : {durationHours.toFixed(1)} heures
            {(watchedBreakDuration ?? 0) > 0 &&
              ` (pause de ${watchedBreakDuration} min déduite)`
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
          options={STATUS_OPTIONS}
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
            onShiftTypeChange(e.target.value as Shift['shiftType'])
          }}
        />

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
  )
}
