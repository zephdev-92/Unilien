import { useState } from 'react'
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
import { AccessibleSelect, AccessibleButton } from '@/components/ui'
import { createLogEntry } from '@/services/logbookService'
import { logger } from '@/lib/logger'
import type { UserRole } from '@/types'

const logEntrySchema = z.object({
  type: z.enum(['info', 'alert', 'incident', 'instruction'], {
    message: 'Veuillez sélectionner un type',
  }),
  importance: z.enum(['normal', 'urgent']),
  content: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(5000, 'Le contenu ne peut pas dépasser 5000 caractères'),
})

type LogEntryFormData = z.infer<typeof logEntrySchema>

interface NewLogEntryModalProps {
  isOpen: boolean
  onClose: () => void
  employerId: string
  authorId: string
  authorRole: UserRole
  onSuccess: () => void
}

const typeOptions = [
  { value: 'info', label: 'Information - Note générale' },
  { value: 'alert', label: 'Alerte - À surveiller' },
  { value: 'incident', label: 'Incident - Événement important' },
  { value: 'instruction', label: 'Instruction - Consigne à suivre' },
]

const importanceOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
]

export function NewLogEntryModal({
  isOpen,
  onClose,
  employerId,
  authorId,
  authorRole,
  onSuccess,
}: NewLogEntryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LogEntryFormData>({
    resolver: zodResolver(logEntrySchema),
    defaultValues: {
      type: 'info',
      importance: 'normal',
      content: '',
    },
  })

  const contentLength = watch('content')?.length || 0

  const handleClose = () => {
    reset()
    setSubmitError(null)
    onClose()
  }

  const onSubmit = async (data: LogEntryFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await createLogEntry(employerId, authorId, authorRole, {
        type: data.type,
        importance: data.importance,
        content: data.content,
      })

      reset()
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Erreur création entrée cahier:', error)
      setSubmitError(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius="xl"
            maxW="500px"
            w="90vw"
            maxH="90vh"
            overflow="auto"
          >
            <Dialog.Header p={6} borderBottomWidth="1px">
              <Dialog.Title fontSize="xl" fontWeight="bold">
                Nouvelle entrée
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
              <form id="new-log-entry-form" onSubmit={handleSubmit(onSubmit)}>
                <Stack gap={4}>
                  {/* Type selector */}
                  <AccessibleSelect
                    label="Type d'entrée"
                    options={typeOptions}
                    error={errors.type?.message}
                    required
                    {...register('type')}
                  />

                  {/* Importance selector */}
                  <AccessibleSelect
                    label="Importance"
                    options={importanceOptions}
                    error={errors.importance?.message}
                    {...register('importance')}
                  />

                  {/* Content textarea */}
                  <Box>
                    <Text fontWeight="medium" fontSize="md" mb={2}>
                      Contenu <Text as="span" color="red.500">*</Text>
                    </Text>
                    <Textarea
                      placeholder="Écrivez votre message ici...&#10;&#10;Exemple: Mme Dupont a bien mangé ce midi. Elle était de bonne humeur et a demandé des nouvelles de sa fille."
                      rows={6}
                      size="lg"
                      borderWidth="2px"
                      {...register('content')}
                      css={{
                        '&:focus': {
                          borderColor: 'var(--chakra-colors-blue-500)',
                          boxShadow: '0 0 0 3px rgba(0, 86, 224, 0.3)',
                        },
                      }}
                    />
                    <Flex justify="space-between" mt={1}>
                      {errors.content ? (
                        <Text fontSize="sm" color="red.500">
                          {errors.content.message}
                        </Text>
                      ) : (
                        <Text fontSize="sm" color="gray.600">
                          Décrivez l'information à partager
                        </Text>
                      )}
                      <Text
                        fontSize="sm"
                        color={contentLength > 4500 ? 'orange.500' : 'gray.500'}
                      >
                        {contentLength}/5000
                      </Text>
                    </Flex>
                  </Box>

                  {/* Error message */}
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
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Annuler
                </AccessibleButton>
                <AccessibleButton
                  type="submit"
                  form="new-log-entry-form"
                  colorPalette="blue"
                  loading={isSubmitting}
                  loadingText="Enregistrement..."
                >
                  Enregistrer
                </AccessibleButton>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default NewLogEntryModal
