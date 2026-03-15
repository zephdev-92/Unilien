import { useState } from 'react'
import { Box, Flex, Text, Input, Button, Stack } from '@chakra-ui/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Shift } from '@/types'

interface RetroactiveEntryFormProps {
  shifts: Shift[]
  selectedDate: Date
  onValidate: (shiftId: string, startTime: string, endTime: string) => Promise<void>
  isSubmitting: boolean
}

interface ShiftEntry {
  shiftId: string
  startTime: string
  endTime: string
}

export function RetroactiveEntryForm({
  shifts,
  selectedDate,
  onValidate,
  isSubmitting,
}: RetroactiveEntryFormProps) {
  const [entries, setEntries] = useState<Record<string, ShiftEntry>>(() => {
    const initial: Record<string, ShiftEntry> = {}
    for (const shift of shifts) {
      if (shift.status !== 'completed') {
        initial[shift.id] = {
          shiftId: shift.id,
          startTime: shift.startTime,
          endTime: shift.endTime,
        }
      }
    }
    return initial
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const dateLabel = format(selectedDate, "EEEE d MMMM", { locale: fr })

  const updateEntry = (shiftId: string, field: 'startTime' | 'endTime', value: string) => {
    setEntries((prev) => ({
      ...prev,
      [shiftId]: { ...prev[shiftId], [field]: value },
    }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[shiftId]
      return next
    })
  }

  const handleSubmit = async (shiftId: string) => {
    const entry = entries[shiftId]
    if (!entry) return

    if (entry.startTime >= entry.endTime) {
      setErrors((prev) => ({
        ...prev,
        [shiftId]: "L'heure de début doit être antérieure à l'heure de fin",
      }))
      return
    }

    setSubmittingId(shiftId)
    try {
      await onValidate(shiftId, entry.startTime, entry.endTime)
    } finally {
      setSubmittingId(null)
    }
  }

  const plannedShifts = shifts.filter((s) => s.status === 'planned')
  const completedShifts = shifts.filter((s) => s.status === 'completed')

  if (shifts.length === 0) {
    return (
      <Box
        bg="bg.surface"
        borderRadius="md"
        borderWidth="1px"
        borderColor="border.default"
        boxShadow="0 2px 8px rgba(78,100,120,.09)"
        p={6}
        textAlign="center"
      >
        <Text color="text.muted">
          Aucune intervention prévue le {dateLabel}
        </Text>
      </Box>
    )
  }

  return (
    <Box
      bg="bg.surface"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="0 2px 8px rgba(78,100,120,.09)"
      p={5}
    >
      <Text fontFamily="heading" fontSize="lg" fontWeight="700" mb={4}>
        Valider mes horaires du {dateLabel}
      </Text>

      <Stack gap={4}>
        {plannedShifts.map((shift) => {
          const entry = entries[shift.id]
          const error = errors[shift.id]
          const isThisSubmitting = submittingId === shift.id

          return (
            <Box
              key={shift.id}
              p={4}
              borderRadius="md"
              borderWidth="1px"
              borderColor="border.default"
              bg="#FAFBFC"
            >
              <Flex align="center" gap={3} mb={3} flexWrap="wrap">
                <Text fontSize="sm" fontWeight="600" color="text.default">
                  Intervention prévue : {shift.startTime} – {shift.endTime}
                </Text>
              </Flex>

              <Flex gap={3} align="flex-end" flexWrap="wrap">
                <Box flex={1} minW="120px">
                  <Text fontSize="xs" fontWeight="500" color="text.muted" mb={1}>
                    Début réel
                  </Text>
                  <Input
                    type="time"
                    size="sm"
                    value={entry?.startTime || shift.startTime}
                    onChange={(e) => updateEntry(shift.id, 'startTime', e.target.value)}
                    disabled={isSubmitting}
                    aria-label="Heure de début"
                  />
                </Box>
                <Box flex={1} minW="120px">
                  <Text fontSize="xs" fontWeight="500" color="text.muted" mb={1}>
                    Fin réelle
                  </Text>
                  <Input
                    type="time"
                    size="sm"
                    value={entry?.endTime || shift.endTime}
                    onChange={(e) => updateEntry(shift.id, 'endTime', e.target.value)}
                    disabled={isSubmitting}
                    aria-label="Heure de fin"
                  />
                </Box>
                <Button
                  size="sm"
                  bg="#9BB23B"
                  color="white"
                  borderRadius="md"
                  fontWeight="600"
                  _hover={{ bg: '#8A9E34' }}
                  onClick={() => handleSubmit(shift.id)}
                  disabled={isSubmitting || isThisSubmitting}
                  loading={isThisSubmitting}
                >
                  Valider mes horaires
                </Button>
              </Flex>

              {error && (
                <Text fontSize="xs" color="#991B1B" mt={2}>
                  {error}
                </Text>
              )}
            </Box>
          )
        })}

        {completedShifts.map((shift) => (
          <Box
            key={shift.id}
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="#D1E7DD"
            bg="#EFF4DC"
          >
            <Flex align="center" justify="space-between" flexWrap="wrap" gap={2}>
              <Text fontSize="sm" fontWeight="500" color="text.default">
                {shift.startTime} – {shift.endTime}
              </Text>
              <Flex gap={2} align="center">
                <Flex
                  as="span"
                  display="inline-flex"
                  px="10px"
                  py="3px"
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="700"
                  bg="#EFF4DC"
                  color="#3A5210"
                >
                  Terminé
                </Flex>
                {shift.lateEntry && (
                  <Flex
                    as="span"
                    display="inline-flex"
                    px="10px"
                    py="3px"
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="700"
                    bg="#FEF3C7"
                    color="#92400E"
                  >
                    Rétroactif
                  </Flex>
                )}
              </Flex>
            </Flex>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}
