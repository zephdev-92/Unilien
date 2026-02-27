/**
 * Affichage en lecture seule d'une intervention (shift).
 * Extrait de ShiftDetailModal — gère uniquement l'UI du mode visualisation.
 */

import { Box, Stack, Flex, Text, Separator, Badge } from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { PaySummary } from '@/components/compliance'
import { PresenceResponsibleDaySection } from './PresenceResponsibleDaySection'
import { PresenceResponsibleNightSection } from './PresenceResponsibleNightSection'
import { NightActionToggle } from './NightActionToggle'
import { sanitizeText } from '@/lib/sanitize'
import { SHIFT_TYPE_LABELS } from '@/lib/constants/statusMaps'
import type { Shift, Contract } from '@/types'

interface ShiftDetailViewProps {
  shift: Shift
  contract: Contract | null
  isLoadingContract: boolean
  displayDuration: number
  nightHoursCount: number
  hasNightHours: boolean
  // State
  showDeleteConfirm: boolean
  isDeleting: boolean
  submitError: string | null
  // Handlers
  onHideDeleteConfirm: () => void
  onDelete: () => Promise<void>
}

export function ShiftDetailView({
  shift,
  contract,
  isLoadingContract,
  displayDuration,
  nightHoursCount,
  hasNightHours,
  showDeleteConfirm,
  isDeleting,
  submitError,
  onHideDeleteConfirm,
  onDelete,
}: ShiftDetailViewProps) {
  return (
    <Stack gap={5}>
      {/* Horaires */}
      <Box>
        <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={1}>
          Horaires
        </Text>
        <Text fontSize="xl" fontWeight="semibold">
          {shift.startTime} - {shift.endTime}
        </Text>
        <Text fontSize="sm" color="gray.600">
          Durée : {displayDuration.toFixed(1)} heures
          {shift.breakDuration > 0 && ` (pause de ${shift.breakDuration} min incluse)`}
        </Text>
      </Box>

      {/* Type d'intervention */}
      {shift.shiftType && shift.shiftType !== 'effective' && (
        <Box>
          <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={1}>
            {"Type d'intervention"}
          </Text>
          <Badge
            colorPalette={shift.shiftType === 'presence_day' ? 'blue' : 'purple'}
            size="lg"
          >
            {SHIFT_TYPE_LABELS[shift.shiftType]}
          </Badge>
        </Box>
      )}

      {/* Détail présence responsable JOUR */}
      {shift.shiftType === 'presence_day' && (
        <PresenceResponsibleDaySection
          mode="view"
          durationHours={displayDuration}
          effectiveHoursComputed={shift.effectiveHours ?? (displayDuration * (2 / 3))}
        />
      )}

      {/* Détail présence responsable NUIT */}
      {shift.shiftType === 'presence_night' && (
        <PresenceResponsibleNightSection
          mode="view"
          displayDuration={displayDuration}
          nightInterventionsCount={shift.nightInterventionsCount ?? null}
          isRequalified={shift.isRequalified ?? null}
        />
      )}

      {/* Indicateur heures de nuit (travail effectif uniquement) */}
      {shift.shiftType !== 'presence_night' && hasNightHours && (
        <NightActionToggle
          mode="view"
          nightHoursCount={nightHoursCount}
          hasNightAction={shift.hasNightAction ?? false}
        />
      )}

      {/* Auxiliaire */}
      {!isLoadingContract && contract && (
        <Box>
          <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={1}>
            Auxiliaire
          </Text>
          <Text fontSize="md">
            Contrat #{contract.id.slice(0, 8)} - {contract.contractType}
          </Text>
          <Text fontSize="sm" color="gray.600">
            {contract.hourlyRate.toFixed(2)} €/h
          </Text>
        </Box>
      )}

      {/* Tâches */}
      {shift.tasks.length > 0 && (
        <Box>
          <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={2}>
            Tâches prévues
          </Text>
          <Stack gap={1}>
            {shift.tasks.map((task, index) => (
              <Flex key={index} align="center" gap={2}>
                <Box w="6px" h="6px" borderRadius="full" bg="brand.500" />
                <Text fontSize="md">{sanitizeText(task)}</Text>
              </Flex>
            ))}
          </Stack>
        </Box>
      )}

      {/* Notes */}
      {shift.notes && (
        <Box>
          <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={1}>
            Notes
          </Text>
          <Text fontSize="md" whiteSpace="pre-wrap">
            {sanitizeText(shift.notes)}
          </Text>
        </Box>
      )}

      <Separator />

      {/* Paie calculée */}
      {shift.computedPay && shift.computedPay.totalPay > 0 && (
        <Box>
          <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={2}>
            Estimation de la paie
          </Text>
          <PaySummary
            pay={shift.computedPay}
            hourlyRate={contract?.hourlyRate || 0}
            durationHours={displayDuration}
            showDetails={false}
            shiftType={shift.shiftType}
          />
        </Box>
      )}

      {/* Validation */}
      <Box>
        <Text fontWeight="medium" color="gray.500" fontSize="sm" mb={2}>
          Validation
        </Text>
        <Flex gap={4}>
          <Flex align="center" gap={2}>
            <Box
              w="12px"
              h="12px"
              borderRadius="full"
              bg={shift.validatedByEmployer ? 'green.500' : 'gray.300'}
            />
            <Text fontSize="sm">
              Employeur {shift.validatedByEmployer ? '(validé)' : '(en attente)'}
            </Text>
          </Flex>
          <Flex align="center" gap={2}>
            <Box
              w="12px"
              h="12px"
              borderRadius="full"
              bg={shift.validatedByEmployee ? 'green.500' : 'gray.300'}
            />
            <Text fontSize="sm">
              Auxiliaire {shift.validatedByEmployee ? '(validé)' : '(en attente)'}
            </Text>
          </Flex>
        </Flex>
      </Box>

      {/* Erreur */}
      {submitError && (
        <Box p={4} bg="red.50" borderRadius="md">
          <Text color="red.700">{submitError}</Text>
        </Box>
      )}

      {/* Confirmation de suppression */}
      {showDeleteConfirm && (
        <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
          <Text fontWeight="medium" color="red.800" mb={3}>
            Êtes-vous sûr de vouloir supprimer cette intervention ?
          </Text>
          <Flex gap={2}>
            <AccessibleButton
              size="sm"
              colorPalette="red"
              onClick={onDelete}
              loading={isDeleting}
            >
              Confirmer la suppression
            </AccessibleButton>
            <AccessibleButton
              size="sm"
              variant="outline"
              onClick={onHideDeleteConfirm}
              disabled={isDeleting}
            >
              Annuler
            </AccessibleButton>
          </Flex>
        </Box>
      )}

    </Stack>
  )
}
