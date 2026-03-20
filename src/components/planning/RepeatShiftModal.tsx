import { useState } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Separator,
} from '@chakra-ui/react'
import { AccessibleButton, GhostButton, PrimaryButton } from '@/components/ui'
import { RepeatConfigSection } from './RepeatConfigSection'
import { RepeatPreviewModal, type RepeatOccurrence } from './RepeatPreviewModal'
import { useRepeatConfig } from '@/hooks/useRepeatConfig'
import { createShifts } from '@/services/shiftService'
import type { Shift } from '@/types'
import type { ShiftForValidation, AbsenceForValidation } from '@/lib/compliance'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger } from '@/lib/logger'
import { SHIFT_TYPE_LABELS } from '@/components/planning/shiftTypeLabels'

interface RepeatShiftModalProps {
  isOpen: boolean
  onClose: () => void
  shift: Shift
  employerId: string
  existingShifts: ShiftForValidation[]
  approvedAbsences: AbsenceForValidation[]
  onSuccess: () => void
}

export function RepeatShiftModal({
  isOpen,
  onClose,
  shift,
  existingShifts,
  approvedAbsences,
  onSuccess,
}: RepeatShiftModalProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const repeatConfig = useRepeatConfig(shift.date, true)

  const baseShiftSummary = buildSummary(shift)

  const occurrences: RepeatOccurrence[] = repeatConfig.generatedDates.map((date) => ({
    date,
    shiftData: {
      contractId: shift.contractId,
      employeeId: shift.employeeId ?? '',
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: shift.breakDuration,
      shiftType: shift.shiftType,
      hasNightAction: shift.hasNightAction,
      nightInterventionsCount: shift.nightInterventionsCount,
      guardSegments: shift.guardSegments,
    },
  }))

  const handleOpenPreview = () => {
    if (repeatConfig.generatedDates.length === 0) return
    setSubmitError(null)
    setIsPreviewOpen(true)
  }

  const handleConfirm = async (validOccurrences: RepeatOccurrence[]) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const { failed } = await createShifts(
        shift.contractId,
        validOccurrences.map((occ) => ({
          date: occ.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          breakDuration: shift.breakDuration,
          tasks: shift.tasks,
          notes: shift.notes,
          hasNightAction: shift.hasNightAction,
          shiftType: shift.shiftType,
          nightInterventionsCount: shift.nightInterventionsCount,
          guardSegments: shift.guardSegments,
        }))
      )
      if (failed.length > 0) {
        logger.error('Certaines occurrences ont échoué:', failed)
      }
      setIsPreviewOpen(false)
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Erreur création occurrences:', error)
      setSubmitError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.600" />
          <Dialog.Positioner>
            <Dialog.Content
              bg="bg.surface"
              borderRadius="xl"
              maxW="500px"
              w="95vw"
              maxH="90vh"
              overflow="auto"
            >
              <Dialog.Header p={6} borderBottomWidth="1px">
                <Dialog.Title fontSize="xl" fontWeight="bold">
                  Répéter l'intervention
                </Dialog.Title>
                <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                  <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer">
                    X
                  </AccessibleButton>
                </Dialog.CloseTrigger>
              </Dialog.Header>

              <Dialog.Body p={6}>
                <Stack gap={4}>
                  <Box p={3} bg="bg.page" borderRadius="10px">
                    <Text fontSize="sm" fontWeight="medium" color="text.secondary" mb={1}>
                      Intervention source
                    </Text>
                    <Text fontSize="sm" color="text.muted">{baseShiftSummary}</Text>
                  </Box>

                  <Separator />

                  {/* RepeatConfigSection avec répétition toujours activée */}
                  <RepeatConfigSection
                    {...repeatConfig}
                    isRepeatEnabled={true}
                    setIsRepeatEnabled={() => {}}
                    baseDate={shift.date}
                  />

                  {submitError && (
                    <Box p={4} bg="red.50" borderRadius="10px">
                      <Text color="red.700">{submitError}</Text>
                    </Box>
                  )}
                </Stack>
              </Dialog.Body>

              <Dialog.Footer p={6} borderTopWidth="1px">
                <Flex gap={3} justify="flex-end" w="full">
                  <GhostButton onClick={onClose}>
                    Annuler
                  </GhostButton>
                  <PrimaryButton
                    disabled={repeatConfig.generatedDates.length === 0}
                    onClick={handleOpenPreview}
                  >
                    Vérifier ({repeatConfig.generatedDates.length} date{repeatConfig.generatedDates.length > 1 ? 's' : ''})
                  </PrimaryButton>
                </Flex>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {isPreviewOpen && (
        <RepeatPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          occurrences={occurrences}
          existingShifts={existingShifts}
          approvedAbsences={approvedAbsences}
          baseShiftSummary={baseShiftSummary}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}

function buildSummary(shift: Shift): string {
  const dateStr = format(shift.date, 'EEE d MMM yyyy', { locale: fr })
  const typeLabel = SHIFT_TYPE_LABELS[shift.shiftType] ?? shift.shiftType
  return `${dateStr} · ${shift.startTime}–${shift.endTime} · ${typeLabel}`
}
