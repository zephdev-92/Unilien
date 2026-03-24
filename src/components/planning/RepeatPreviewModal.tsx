import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
} from '@chakra-ui/react'
import { AccessibleButton, StatusPill, GhostButton, PrimaryButton } from '@/components/ui'
import { validateShift } from '@/lib/compliance'
import type { ShiftForValidation, AbsenceForValidation } from '@/lib/compliance'
import type { ComplianceResult } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface RepeatOccurrence {
  date: Date
  shiftData: Omit<ShiftForValidation, 'date' | 'id'>
}

interface OccurrenceResult {
  date: Date
  complianceResult: ComplianceResult
  blocked: boolean
}

function buildOccurrenceResults(
  occurrences: RepeatOccurrence[],
  existingShifts: ShiftForValidation[],
  approvedAbsences: AbsenceForValidation[]
): OccurrenceResult[] {
  // Pour détecter les conflits intra-séquence, on accumule les occurrences déjà "créées"
  const accumulated: ShiftForValidation[] = [...existingShifts]
  const results: OccurrenceResult[] = []

  for (const occ of occurrences) {
    const shiftToValidate: ShiftForValidation = {
      ...occ.shiftData,
      date: occ.date,
    }
    const result = validateShift(shiftToValidate, accumulated, approvedAbsences)
    const blocked = !result.valid

    results.push({ date: occ.date, complianceResult: result, blocked })

    // Ajouter au pool même si bloquée (pour détecter les conflits avec les suivantes)
    if (!blocked) {
      accumulated.push(shiftToValidate)
    }
  }

  return results
}

interface RepeatPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  occurrences: RepeatOccurrence[]
  existingShifts: ShiftForValidation[]
  approvedAbsences: AbsenceForValidation[]
  baseShiftSummary: string
  isSubmitting: boolean
  onConfirm: (validOccurrences: RepeatOccurrence[]) => void
}

export function RepeatPreviewModal({
  isOpen,
  onClose,
  occurrences,
  existingShifts,
  approvedAbsences,
  baseShiftSummary,
  isSubmitting,
  onConfirm,
}: RepeatPreviewModalProps) {
  const results = buildOccurrenceResults(occurrences, existingShifts, approvedAbsences)
  const validOccurrences = occurrences.filter((_, i) => !results[i].blocked)
  const blockedCount = occurrences.length - validOccurrences.length

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="bg.surface"
            borderRadius="xl"
            maxW="500px"
            w="95vw"
            maxH="80vh"
            overflow="auto"
          >
            <Dialog.Header p={6} borderBottomWidth="1px">
              <Dialog.Title fontSize="xl" fontWeight="bold">
                Récapitulatif des répétitions
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
                  <Text fontSize="sm" fontWeight="medium" color="text.secondary">
                    Intervention source
                  </Text>
                  <Text fontSize="sm" color="text.muted">{baseShiftSummary}</Text>
                </Box>

                <Text fontSize="sm" color="text.muted">
                  {validOccurrences.length} intervention{validOccurrences.length > 1 ? 's' : ''} valide{validOccurrences.length > 1 ? 's' : ''}
                  {blockedCount > 0 && (
                    <Text as="span" color="red.600">
                      {' '}· {blockedCount} bloquée{blockedCount > 1 ? 's' : ''} (conflits)
                    </Text>
                  )}
                </Text>

                <Stack gap={2} maxH="320px" overflowY="auto">
                  {results.map((r, i) => (
                    <OccurrenceRow key={i} result={r} />
                  ))}
                </Stack>
              </Stack>
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px">
              <Flex gap={3} justify="flex-end" w="full">
                <GhostButton onClick={onClose} disabled={isSubmitting}>
                  Annuler
                </GhostButton>
                <PrimaryButton
                  loading={isSubmitting}
                  disabled={validOccurrences.length === 0 || isSubmitting}
                  onClick={() => onConfirm(validOccurrences)}
                >
                  Créer {validOccurrences.length} intervention{validOccurrences.length > 1 ? 's' : ''}
                  {blockedCount > 0 && ` (${blockedCount} ignorée${blockedCount > 1 ? 's' : ''})`}
                </PrimaryButton>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

function OccurrenceRow({ result }: { result: OccurrenceResult }) {
  const { date, complianceResult, blocked } = result
  const dateLabel = format(date, 'EEE d MMM yyyy', { locale: fr })

  return (
    <Flex
      align="center"
      justify="space-between"
      p={3}
      borderRadius="10px"
      bg={blocked ? 'red.50' : complianceResult.warnings.length > 0 ? 'orange.50' : 'green.50'}
      opacity={blocked ? 0.7 : 1}
    >
      <Text fontSize="sm" fontWeight="medium" color={blocked ? 'red.700' : 'gray.700'}>
        {dateLabel}
      </Text>
      <Flex gap={2} align="center">
        {blocked ? (
          <>
            <StatusPill variant="danger" size="sm">Conflit</StatusPill>
            {complianceResult.errors[0] && (
              <Text fontSize="xs" color="danger.500" maxW="180px" truncate>
                {complianceResult.errors[0].message}
              </Text>
            )}
          </>
        ) : complianceResult.warnings.length > 0 ? (
          <StatusPill variant="pending" size="sm">Avertissement</StatusPill>
        ) : (
          <StatusPill variant="success" size="sm">OK</StatusPill>
        )}
      </Flex>
    </Flex>
  )
}
