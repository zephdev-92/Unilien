/**
 * Affichage en lecture seule d'une intervention (shift).
 * Extrait de ShiftDetailModal — gère uniquement l'UI du mode visualisation.
 * CSS aligné sur le proto : pattern profile-view-list (lignes label|valeur).
 */

import { Box, Stack, Flex, Text } from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { PaySummary } from '@/components/compliance'
import { PresenceResponsibleDaySection } from './PresenceResponsibleDaySection'
import { PresenceResponsibleNightSection } from './PresenceResponsibleNightSection'
import { NightActionToggle } from './NightActionToggle'
import { sanitizeText } from '@/lib/sanitize'
import { COURSES_PREFIX, parseShoppingItemString } from '@/lib/constants/taskDefaults'
import { SHIFT_TYPE_LABELS } from '@/lib/constants/statusMaps'
import type { Shift, Contract } from '@/types'

interface ShiftDetailViewProps {
  shift: Shift
  contract: Contract | null
  isLoadingContract: boolean
  displayDuration: number
  nightHoursCount: number
  hasNightHours: boolean
  showDeleteConfirm: boolean
  isDeleting: boolean
  submitError: string | null
  onHideDeleteConfirm: () => void
  onDelete: () => Promise<void>
}

// ── Row component (proto: profile-view-row) ──

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Flex
      align="baseline"
      gap={4}
      py={3}
      borderBottomWidth="1px"
      borderColor="border.default"
      _last={{ borderBottomWidth: 0, pb: 0 }}
      _first={{ pt: 0 }}
    >
      <Text
        fontSize="12px"
        color="text.muted"
        fontWeight="500"
        minW="120px"
        flexShrink={0}
      >
        {label}
      </Text>
      <Box fontSize="14px" color="text.default" fontWeight="500" flex={1}>
        {children}
      </Box>
    </Flex>
  )
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
    <Stack gap={0}>
      {/* Horaires */}
      <DetailRow label="Horaires">
        <Text fontWeight="600" fontSize="15px">
          {shift.startTime} - {shift.endTime}
        </Text>
        <Text fontSize="12px" color="text.muted" mt="2px">
          {displayDuration.toFixed(1)}h
          {shift.breakDuration > 0 && ` (pause ${shift.breakDuration} min)`}
        </Text>
      </DetailRow>

      {/* Type d'intervention */}
      <DetailRow label="Type">
        <Flex align="center" gap={2}>
          <Text>{SHIFT_TYPE_LABELS[shift.shiftType]}</Text>
          {shift.shiftType !== 'effective' && (
            <Text
              as="span"
              display="inline-flex"
              alignItems="center"
              px="12px"
              py="4px"
              borderRadius="8px"
              fontSize="xs"
              fontWeight="700"
              bg={shift.shiftType === 'presence_day' ? '#EDF1F5' : shift.shiftType === 'guard_24h' ? '#F2EDE5' : '#EDF1F5'}
              color={shift.shiftType === 'presence_day' ? '#3D5166' : shift.shiftType === 'guard_24h' ? '#4A3D2B' : '#3D5166'}
            >
              {shift.shiftType === 'presence_day' ? 'Jour' : shift.shiftType === 'guard_24h' ? '24h' : 'Nuit'}
            </Text>
          )}
        </Flex>
      </DetailRow>

      {/* Détail présence responsable JOUR */}
      {shift.shiftType === 'presence_day' && (
        <Box py={3} borderBottomWidth="1px" borderColor="border.default">
          <PresenceResponsibleDaySection
            mode="view"
            durationHours={displayDuration}
            effectiveHoursComputed={shift.effectiveHours ?? (displayDuration * (2 / 3))}
          />
        </Box>
      )}

      {/* Détail présence responsable NUIT */}
      {shift.shiftType === 'presence_night' && (
        <Box py={3} borderBottomWidth="1px" borderColor="border.default">
          <PresenceResponsibleNightSection
            mode="view"
            displayDuration={displayDuration}
            nightInterventionsCount={shift.nightInterventionsCount ?? null}
            isRequalified={shift.isRequalified ?? null}
          />
        </Box>
      )}

      {/* Indicateur heures de nuit (travail effectif uniquement) */}
      {shift.shiftType !== 'presence_night' && hasNightHours && (
        <Box py={3} borderBottomWidth="1px" borderColor="border.default">
          <NightActionToggle
            mode="view"
            nightHoursCount={nightHoursCount}
            hasNightAction={shift.hasNightAction ?? false}
          />
        </Box>
      )}

      {/* Auxiliaire */}
      {!isLoadingContract && contract && (
        <DetailRow label="Auxiliaire">
          <Text>Contrat #{contract.id.slice(0, 8)}</Text>
          <Text fontSize="12px" color="text.muted" mt="2px">
            {contract.contractType} · {contract.hourlyRate.toFixed(2)} €/h
          </Text>
        </DetailRow>
      )}

      {/* Tâches */}
      {shift.tasks.length > 0 && (
        <DetailRow label="Tâches">
          <Stack gap={1}>
            {shift.tasks.filter(t => !t.startsWith(COURSES_PREFIX)).map((task, index) => (
              <Box key={index}>
                <Flex align="center" gap={2}>
                  <Box w="5px" h="5px" borderRadius="full" bg="brand.500" flexShrink={0} />
                  <Text fontSize="14px">{sanitizeText(task)}</Text>
                </Flex>
                {task === 'Courses' && (
                  <Stack gap={0} ml={5} mt={1} pl={3} borderLeftWidth="2px" borderColor="brand.200">
                    {shift.tasks
                      .filter(t => t.startsWith(COURSES_PREFIX))
                      .map((item, i) => {
                        const parsed = parseShoppingItemString(item.slice(COURSES_PREFIX.length))
                        return (
                          <Flex key={i} align="center" gap={2} py="2px">
                            <Box w="4px" h="4px" borderRadius="full" bg="brand.300" flexShrink={0} />
                            <Text fontSize="13px" color="text.muted">
                              {sanitizeText(parsed.name)}
                              {parsed.brand && (
                                <Text as="span" fontSize="xs" fontStyle="italic" ml={1}>
                                  {sanitizeText(parsed.brand)}
                                </Text>
                              )}
                              {parsed.quantity > 1 && (
                                <Text as="span" fontSize="xs" fontWeight="600" ml={1}>
                                  x{parsed.quantity}
                                </Text>
                              )}
                              {parsed.note && (
                                <Text as="span" fontSize="xs" color="text.muted" fontStyle="italic" ml={1}>
                                  — {sanitizeText(parsed.note)}
                                </Text>
                              )}
                            </Text>
                          </Flex>
                        )
                      })}
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        </DetailRow>
      )}

      {/* Notes */}
      {shift.notes && (
        <DetailRow label="Notes">
          <Text whiteSpace="pre-wrap">{sanitizeText(shift.notes)}</Text>
        </DetailRow>
      )}

      {/* Paie calculée */}
      {shift.computedPay && shift.computedPay.totalPay > 0 && (
        <DetailRow label="Paie estimée">
          <PaySummary
            pay={shift.computedPay}
            hourlyRate={contract?.hourlyRate || 0}
            durationHours={displayDuration}
            showDetails={false}
            shiftType={shift.shiftType}
          />
        </DetailRow>
      )}

      {/* Validation */}
      <DetailRow label="Validation">
        <Flex gap={4}>
          <Flex align="center" gap={2}>
            <Box
              w="10px"
              h="10px"
              borderRadius="full"
              bg={shift.validatedByEmployer ? 'green.500' : 'gray.300'}
            />
            <Text fontSize="13px">
              Employeur {shift.validatedByEmployer ? '(validé)' : '(en attente)'}
            </Text>
          </Flex>
          <Flex align="center" gap={2}>
            <Box
              w="10px"
              h="10px"
              borderRadius="full"
              bg={shift.validatedByEmployee ? 'green.500' : 'gray.300'}
            />
            <Text fontSize="13px">
              Auxiliaire {shift.validatedByEmployee ? '(validé)' : '(en attente)'}
            </Text>
          </Flex>
        </Flex>
      </DetailRow>

      {/* Erreur */}
      {submitError && (
        <Box p={4} bg="red.50" borderRadius="10px" mt={3}>
          <Text color="red.700">{submitError}</Text>
        </Box>
      )}

      {/* Confirmation de suppression */}
      {showDeleteConfirm && (
        <Box p={4} bg="red.50" borderRadius="10px" borderWidth="1px" borderColor="red.200" mt={3}>
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
