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
import { AccessibleSelect, AccessibleButton } from '@/components/ui'
import { updateLogEntry } from '@/services/logbookService'
import type { LogEntryWithAuthor } from '@/services/logbookService'
import { logger } from '@/lib/logger'

const editEntrySchema = z.object({
  type: z.enum(['info', 'alert', 'incident', 'instruction']),
  importance: z.enum(['normal', 'urgent']),
  content: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(5000, 'Le contenu ne peut pas depasser 5000 caracteres'),
})

type EditEntryFormData = z.infer<typeof editEntrySchema>

interface EditLogEntryModalProps {
  entry: LogEntryWithAuthor | null
  onClose: () => void
  onSuccess: () => void
}

const typeOptions = [
  { value: 'info', label: 'Observation - Note generale' },
  { value: 'alert', label: 'Alerte - A surveiller' },
  { value: 'incident', label: 'Incident - Evenement important' },
  { value: 'instruction', label: 'Instruction - Consigne a suivre' },
]

const importanceOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
]

export function EditLogEntryModal({ entry, onClose, onSuccess }: EditLogEntryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditEntryFormData>({
    resolver: zodResolver(editEntrySchema),
  })

  useEffect(() => {
    if (entry) {
      reset({
        type: entry.type,
        importance: entry.importance,
        content: entry.content,
      })
    }
  }, [entry, reset])

  const contentLength = watch('content')?.length || 0

  const handleClose = () => {
    reset()
    setSubmitError(null)
    onClose()
  }

  const onSubmit = async (data: EditEntryFormData) => {
    if (!entry) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await updateLogEntry(entry.id, {
        type: data.type,
        importance: data.importance,
        content: data.content,
      })
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Erreur modification entree cahier:', error)
      setSubmitError(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={!!entry} onOpenChange={(e) => !e.open && handleClose()}>
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
                Modifier l'entree
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
              <form id="edit-log-entry-form" onSubmit={handleSubmit(onSubmit)}>
                <Stack gap={4}>
                  <AccessibleSelect
                    label="Type d'entree"
                    options={typeOptions}
                    error={errors.type?.message}
                    required
                    {...register('type')}
                  />

                  <AccessibleSelect
                    label="Importance"
                    options={importanceOptions}
                    error={errors.importance?.message}
                    {...register('importance')}
                  />

                  <Box>
                    <Text fontWeight="medium" fontSize="md" mb={2}>
                      Contenu <Text as="span" color="red.500">*</Text>
                    </Text>
                    <Textarea
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
                        <Box />
                      )}
                      <Text
                        fontSize="sm"
                        color={contentLength > 4500 ? 'orange.500' : 'gray.500'}
                      >
                        {contentLength}/5000
                      </Text>
                    </Flex>
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
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Annuler
                </AccessibleButton>
                <AccessibleButton
                  type="submit"
                  form="edit-log-entry-form"
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
