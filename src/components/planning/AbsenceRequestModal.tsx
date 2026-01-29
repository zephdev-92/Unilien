import { useState, useEffect } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { AccessibleInput, AccessibleSelect, AccessibleButton } from '@/components/ui'
import { createAbsence } from '@/services/absenceService'
import type { Absence } from '@/types'

const absenceSchema = z.object({
  absenceType: z.enum(['sick', 'vacation', 'training', 'unavailable', 'emergency'], {
    required_error: 'Veuillez sélectionner un type d\'absence',
  }),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().min(1, 'La date de fin est requise'),
  reason: z.string().optional(),
}).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true
    return new Date(data.endDate) >= new Date(data.startDate)
  },
  {
    message: 'La date de début ne peut pas être postérieure à la date de fin',
    path: ['startDate'],
  }
).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true
    return new Date(data.endDate) >= new Date(data.startDate)
  },
  {
    message: 'La date de fin ne peut pas être antérieure à la date de début',
    path: ['endDate'],
  }
)

type AbsenceFormData = z.infer<typeof absenceSchema>

const absenceTypeOptions: { value: Absence['absenceType']; label: string }[] = [
  { value: 'sick', label: 'Maladie' },
  { value: 'vacation', label: 'Congé' },
  { value: 'training', label: 'Formation' },
  { value: 'unavailable', label: 'Indisponibilité' },
  { value: 'emergency', label: 'Urgence personnelle' },
]

interface AbsenceRequestModalProps {
  isOpen: boolean
  onClose: () => void
  employeeId: string
  defaultDate?: Date
  onSuccess: () => void
}

export function AbsenceRequestModal({
  isOpen,
  onClose,
  employeeId,
  defaultDate,
  onSuccess,
}: AbsenceRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AbsenceFormData>({
    resolver: zodResolver(absenceSchema),
    defaultValues: {
      absenceType: undefined,
      startDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      endDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      reason: '',
    },
  })

  useEffect(() => {
    if (isOpen) {
      const date = defaultDate || new Date()
      reset({
        absenceType: undefined,
        startDate: format(date, 'yyyy-MM-dd'),
        endDate: format(date, 'yyyy-MM-dd'),
        reason: '',
      })
      setSubmitError(null)
    }
  }, [isOpen, defaultDate, reset])

  const onSubmit = async (data: AbsenceFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await createAbsence(employeeId, {
        absenceType: data.absenceType,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason || undefined,
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erreur création absence:', error)
      setSubmitError(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

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
              <Dialog.Title fontSize="xl" fontWeight="bold">
                Déclarer une absence
              </Dialog.Title>
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
              <form id="absence-request-form" onSubmit={handleSubmit(onSubmit)}>
                <Stack gap={4}>
                  <AccessibleSelect
                    label="Type d'absence"
                    options={absenceTypeOptions}
                    placeholder="Sélectionnez le type"
                    error={errors.absenceType?.message}
                    required
                    {...register('absenceType')}
                  />

                  <Flex gap={4}>
                    <Box flex={1}>
                      <AccessibleInput
                        label="Date de début"
                        type="date"
                        error={errors.startDate?.message}
                        required
                        {...register('startDate')}
                      />
                    </Box>
                    <Box flex={1}>
                      <AccessibleInput
                        label="Date de fin"
                        type="date"
                        error={errors.endDate?.message}
                        required
                        {...register('endDate')}
                      />
                    </Box>
                  </Flex>

                  <Box>
                    <Text fontWeight="medium" fontSize="md" mb={2}>
                      Motif (optionnel)
                    </Text>
                    <Textarea
                      placeholder="Précisez le motif de votre absence..."
                      rows={3}
                      size="lg"
                      borderWidth="2px"
                      {...register('reason')}
                    />
                  </Box>

                  <Box p={4} bg="blue.50" borderRadius="md">
                    <Text fontSize="sm" color="blue.700">
                      Votre demande sera envoyée à votre employeur pour validation.
                      Vous serez notifié de sa décision.
                    </Text>
                  </Box>

                  {submitError && (
                    <Box p={4} bg="red.50" borderRadius="md">
                      <Text color="red.700">{submitError}</Text>
                    </Box>
                  )}
                </Stack>
              </form>
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px">
              <Flex gap={3} justify="flex-end">
                <AccessibleButton
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Annuler
                </AccessibleButton>
                <AccessibleButton
                  type="submit"
                  form="absence-request-form"
                  colorPalette="blue"
                  loading={isSubmitting}
                >
                  Envoyer la demande
                </AccessibleButton>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default AbsenceRequestModal
