import { useState } from 'react'
import {
  Box,
  Stack,
  Flex,
  Text,
  Separator,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AccessibleButton, StatusPill, GhostButton } from '@/components/ui'
import { PlanningModal } from './PlanningModal'
import { updateAbsenceStatus, cancelAbsence } from '@/services/absenceService'
import { toaster } from '@/lib/toaster'
import type { Absence, UserRole } from '@/types'
import {
  ABSENCE_TYPE_LABELS as absenceTypeLabels,
  ABSENCE_STATUS_VARIANTS as statusVariants,
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
      toaster.success({ title: 'Absence approuvée' })
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
      toaster.success({ title: 'Absence refusée' })
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
      toaster.success({ title: 'Absence annulée' })
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

  const footerContent = (
    <Flex gap={3} justify="flex-end" w="full">
      {canEmployerAct && (
        <>
          <AccessibleButton variant="outline" bg="transparent" color="danger.500" borderWidth="1.5px" borderColor="danger.100" _hover={{ borderColor: 'danger.500', bg: 'danger.subtle' }} onClick={handleReject} disabled={isSubmitting}>
            Refuser
          </AccessibleButton>
          <AccessibleButton bg="#16a34a" color="white" _hover={{ bg: '#15803d', transform: 'translateY(-1px)', boxShadow: 'md' }} _active={{ transform: 'translateY(0)' }} onClick={handleApprove} loading={isSubmitting}>
            Approuver
          </AccessibleButton>
        </>
      )}
      {canEmployeeCancel && (
        <AccessibleButton variant="outline" bg="transparent" color="danger.500" borderWidth="1.5px" borderColor="danger.100" _hover={{ borderColor: 'danger.500', bg: 'danger.subtle' }} onClick={handleCancel} loading={isSubmitting}>
          Annuler ma demande
        </AccessibleButton>
      )}
      {!canEmployerAct && !canEmployeeCancel && (
        <GhostButton onClick={onClose}>
          Fermer
        </GhostButton>
      )}
    </Flex>
  )

  return (
    <PlanningModal
      isOpen={isOpen}
      onClose={onClose}
      title="Demande d'absence"
      titleRight={
        <StatusPill variant={statusVariants[absence.status]}>
          {statusLabels[absence.status]}
        </StatusPill>
      }
      footer={footerContent}
    >
              <Stack gap={4}>
                <Box>
                  <Text fontSize="sm" color="text.muted" mb={1}>
                    Type d'absence
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold">
                    {absenceTypeLabels[absence.absenceType]}
                  </Text>
                </Box>

                <Separator />

                <Box>
                  <Text fontSize="sm" color="text.muted" mb={1}>
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
                      <Text fontSize="sm" color="text.muted" mb={1}>
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
                      <Text fontSize="sm" color="text.muted" mb={1}>
                        Arrêt de travail
                      </Text>
                      {absence.justificationUrl ? (
                        <Flex
                          align="center"
                          gap={3}
                          p={3}
                          bg="accent.subtle"
                          borderRadius="10px"
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
                          borderRadius="10px"
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
                  <Text fontSize="sm" color="text.muted" mb={1}>
                    Demande créée le
                  </Text>
                  <Text fontSize="md">
                    {format(new Date(absence.createdAt), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                  </Text>
                </Box>

                {submitError && (
                  <Box p={4} bg="red.50" borderRadius="10px">
                    <Text color="red.700">{submitError}</Text>
                  </Box>
                )}
              </Stack>
    </PlanningModal>
  )
}

export default AbsenceDetailModal
