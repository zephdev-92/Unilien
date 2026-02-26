import { useState } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Badge,
  Separator,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AccessibleButton } from '@/components/ui'
import { updateAbsenceStatus, cancelAbsence } from '@/services/absenceService'
import type { Absence, UserRole } from '@/types'
import {
  ABSENCE_TYPE_LABELS as absenceTypeLabels,
  ABSENCE_STATUS_COLORS as statusColors,
  ABSENCE_STATUS_LABELS as statusLabels,
} from '@/lib/constants/statusMaps'

interface AbsenceDetailModalProps {
  isOpen: boolean
  onClose: () => void
  absence: Absence | null
  userRole: UserRole
  userId: string
  onSuccess: () => void
}

export function AbsenceDetailModal({
  isOpen,
  onClose,
  absence,
  userRole,
  userId,
  onSuccess,
}: AbsenceDetailModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (!absence) return null

  const startDateFormatted = format(new Date(absence.startDate), 'EEEE d MMMM yyyy', { locale: fr })
  const endDateFormatted = format(new Date(absence.endDate), 'EEEE d MMMM yyyy', { locale: fr })
  const isSameDay = format(absence.startDate, 'yyyy-MM-dd') === format(absence.endDate, 'yyyy-MM-dd')

  const handleApprove = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await updateAbsenceStatus(absence.id, 'approved')
      onSuccess()
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erreur lors de l\'approbation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await updateAbsenceStatus(absence.id, 'rejected')
      onSuccess()
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erreur lors du refus')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await cancelAbsence(absence.id, userId)
      onSuccess()
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erreur lors de l\'annulation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canEmployerAct = userRole === 'employer' && absence.status === 'pending'
  const canEmployeeCancel = userRole === 'employee' && absence.status === 'pending'

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius="xl"
            maxW="500px"
            w="95vw"
            maxH="90vh"
            overflow="auto"
          >
            <Dialog.Header p={6} borderBottomWidth="1px">
              <Flex justify="space-between" align="center" pr={8}>
                <Dialog.Title fontSize="xl" fontWeight="bold">
                  Demande d'absence
                </Dialog.Title>
                <Badge colorPalette={statusColors[absence.status]} size="lg">
                  {statusLabels[absence.status]}
                </Badge>
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
              <Stack gap={4}>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>
                    Type d'absence
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold">
                    {absenceTypeLabels[absence.absenceType]}
                  </Text>
                </Box>

                <Separator />

                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>
                    {isSameDay ? 'Date' : 'Période'}
                  </Text>
                  <Text fontSize="md">
                    {isSameDay ? (
                      startDateFormatted
                    ) : (
                      <>Du {startDateFormatted}<br />au {endDateFormatted}</>
                    )}
                  </Text>
                </Box>

                {absence.reason && (
                  <>
                    <Separator />
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Motif
                      </Text>
                      <Text fontSize="md" whiteSpace="pre-wrap">
                        {absence.reason}
                      </Text>
                    </Box>
                  </>
                )}

                {absence.absenceType === 'sick' && (
                  <>
                    <Separator />
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Arrêt de travail
                      </Text>
                      {absence.justificationUrl ? (
                        <Flex
                          align="center"
                          gap={3}
                          p={3}
                          bg="green.50"
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="green.200"
                        >
                          <Box color="green.600">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <polyline points="9 15 12 18 15 15" />
                              <line x1="12" y1="12" x2="12" y2="18" />
                            </svg>
                          </Box>
                          <Box flex={1}>
                            <Text fontSize="sm" fontWeight="medium" color="green.800">
                              Justificatif fourni
                            </Text>
                          </Box>
                          <AccessibleButton
                            as="a"
                            href={absence.justificationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            colorPalette="green"
                            variant="outline"
                          >
                            Voir
                          </AccessibleButton>
                        </Flex>
                      ) : (
                        <Flex
                          align="center"
                          gap={3}
                          p={3}
                          bg="orange.50"
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="orange.200"
                        >
                          <Box color="orange.500">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          </Box>
                          <Text fontSize="sm" color="orange.700">
                            Aucun justificatif fourni
                          </Text>
                        </Flex>
                      )}
                    </Box>
                  </>
                )}

                <Separator />

                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>
                    Demande créée le
                  </Text>
                  <Text fontSize="md">
                    {format(new Date(absence.createdAt), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                  </Text>
                </Box>

                {submitError && (
                  <Box p={4} bg="red.50" borderRadius="md">
                    <Text color="red.700">{submitError}</Text>
                  </Box>
                )}
              </Stack>
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px">
              <Flex gap={3} justify="flex-end" w="full">
                {canEmployerAct && (
                  <>
                    <AccessibleButton
                      variant="outline"
                      colorPalette="red"
                      onClick={handleReject}
                      disabled={isSubmitting}
                    >
                      Refuser
                    </AccessibleButton>
                    <AccessibleButton
                      colorPalette="green"
                      onClick={handleApprove}
                      loading={isSubmitting}
                    >
                      Approuver
                    </AccessibleButton>
                  </>
                )}

                {canEmployeeCancel && (
                  <AccessibleButton
                    variant="outline"
                    colorPalette="red"
                    onClick={handleCancel}
                    loading={isSubmitting}
                  >
                    Annuler ma demande
                  </AccessibleButton>
                )}

                {!canEmployerAct && !canEmployeeCancel && (
                  <AccessibleButton
                    variant="outline"
                    onClick={onClose}
                  >
                    Fermer
                  </AccessibleButton>
                )}
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default AbsenceDetailModal
