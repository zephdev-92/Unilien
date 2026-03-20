import { useState } from 'react'
import { Box, Stack, Flex, Text, Input } from '@chakra-ui/react'
import { GhostButton, PrimaryButton } from '@/components/ui'
import type { Shift } from '@/types'
import { formatTime } from './clockInUtils'

interface ShiftEditModalProps {
  shift: Shift
  onSave: (shiftId: string, updates: { startTime: string; endTime: string }) => Promise<void>
  onClose: () => void
}

export function ShiftEditModal({ shift, onSave, onClose }: ShiftEditModalProps) {
  const [startTime, setStartTime] = useState(formatTime(shift.startTime))
  const [endTime, setEndTime] = useState(formatTime(shift.endTime))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = startTime && endTime && startTime < endTime && !isSubmitting

  const handleSave = async () => {
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onSave(shift.id, { startTime, endTime })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        position="absolute"
        inset={0}
        bg="blackAlpha.600"
        onClick={onClose}
        aria-hidden="true"
      />
      <Box
        bg="bg.surface"
        borderRadius="xl"
        p={6}
        maxW="400px"
        w="90%"
        position="relative"
        zIndex={201}
        boxShadow="xl"
        role="dialog"
        aria-modal="true"
        aria-label="Modifier les heures"
      >
        <Text fontSize="lg" fontWeight="semibold" color="text.default" mb={1}>
          Modifier les heures
        </Text>
        {shift.employeeName && (
          <Text fontSize="sm" color="text.muted" mb={4}>
            {shift.employeeName}
          </Text>
        )}

        <Stack gap={3}>
          <Flex gap={3}>
            <Box flex={1}>
              <Text as="label" htmlFor="edit-start" fontSize="sm" color="text.muted" mb={1}>
                Début
              </Text>
              <Input
                id="edit-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                size="sm"
              />
            </Box>
            <Box flex={1}>
              <Text as="label" htmlFor="edit-end" fontSize="sm" color="text.muted" mb={1}>
                Fin
              </Text>
              <Input
                id="edit-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                size="sm"
              />
            </Box>
          </Flex>

          {error && (
            <Text fontSize="sm" color="red.600" role="alert">{error}</Text>
          )}

          <Flex gap={3} mt={2}>
            <PrimaryButton
              flex={1}
              onClick={handleSave}
              disabled={!canSubmit}
              loading={isSubmitting}
            >
              Enregistrer
            </PrimaryButton>
            <GhostButton onClick={onClose} disabled={isSubmitting}>
              Annuler
            </GhostButton>
          </Flex>
        </Stack>
      </Box>
    </Box>
  )
}
