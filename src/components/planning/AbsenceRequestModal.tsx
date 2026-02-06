import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Textarea,
  Checkbox,
} from '@chakra-ui/react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { AccessibleInput, AccessibleSelect, AccessibleButton } from '@/components/ui'
import { logger } from '@/lib/logger'
import { createAbsence, uploadJustification, validateJustificationFile } from '@/services/absenceService'
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
  const [justificationFile, setJustificationFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isSingleDay, setIsSingleDay] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AbsenceFormData>({
    resolver: zodResolver(absenceSchema),
    defaultValues: {
      absenceType: '' as unknown as AbsenceFormData['absenceType'],
      startDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      endDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      reason: '',
    },
  })

  const selectedAbsenceType = useWatch({ control, name: 'absenceType' })
  const isSickLeave = selectedAbsenceType === 'sick'
  const startDateValue = watch('startDate')

  // Synchroniser la date de fin avec la date de début quand "Toute la journée" est coché
  useEffect(() => {
    if (isSingleDay && startDateValue) {
      setValue('endDate', startDateValue)
    }
  }, [isSingleDay, startDateValue, setValue])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setFileError(null)

    if (file) {
      const validation = validateJustificationFile(file)
      if (!validation.valid) {
        setFileError(validation.error || 'Fichier invalide')
        setJustificationFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }
      setJustificationFile(file)
    } else {
      setJustificationFile(null)
    }
  }

  const handleRemoveFile = () => {
    setJustificationFile(null)
    setFileError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    if (isOpen) {
      const date = defaultDate || new Date()
      reset({
        absenceType: '' as unknown as AbsenceFormData['absenceType'],
        startDate: format(date, 'yyyy-MM-dd'),
        endDate: format(date, 'yyyy-MM-dd'),
        reason: '',
      })
      setSubmitError(null)
      setJustificationFile(null)
      setFileError(null)
      setIsSingleDay(true)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [isOpen, defaultDate, reset])

  const onSubmit = async (data: AbsenceFormData) => {
    // Validation: justificatif obligatoire pour les arrêts maladie
    if (data.absenceType === 'sick' && !justificationFile) {
      setFileError('L\'arrêt de travail est obligatoire pour une absence maladie')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      let justificationUrl: string | undefined

      // Upload du justificatif (obligatoire pour les arrêts maladie)
      if (justificationFile && data.absenceType === 'sick') {
        const uploadResult = await uploadJustification(employeeId, justificationFile, {
          absenceType: data.absenceType,
          startDate: new Date(data.startDate),
        })
        justificationUrl = uploadResult.url
      }

      await createAbsence(employeeId, {
        absenceType: data.absenceType,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason || undefined,
        justificationUrl,
      })

      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Erreur création absence:', error)
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

                  <Box>
                    <Flex gap={4} mb={3}>
                      <Box flex={1}>
                        <AccessibleInput
                          label={isSingleDay ? "Date" : "Date de début"}
                          type="date"
                          error={errors.startDate?.message}
                          required
                          {...register('startDate')}
                        />
                      </Box>
                      {!isSingleDay && (
                        <Box flex={1}>
                          <AccessibleInput
                            label="Date de fin"
                            type="date"
                            error={errors.endDate?.message}
                            required
                            {...register('endDate')}
                          />
                        </Box>
                      )}
                    </Flex>
                    <Checkbox.Root
                      checked={isSingleDay}
                      onCheckedChange={(e) => setIsSingleDay(!!e.checked)}
                      colorPalette="blue"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Label>
                        <Text fontSize="sm">Toute la journée (une seule date)</Text>
                      </Checkbox.Label>
                    </Checkbox.Root>
                  </Box>

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

                  {isSickLeave && (
                    <Box>
                      <Text fontWeight="medium" fontSize="md" mb={2}>
                        Arrêt de travail <Text as="span" color="red.500">*</Text>
                      </Text>
                      <Box
                        borderWidth="2px"
                        borderStyle="dashed"
                        borderColor={fileError ? 'red.500' : justificationFile ? 'green.300' : 'gray.300'}
                        borderRadius="lg"
                        p={4}
                        bg={fileError ? 'red.50' : justificationFile ? 'green.50' : 'gray.50'}
                        transition="all 0.2s"
                      >
                        {!justificationFile ? (
                          <Flex direction="column" align="center" gap={2}>
                            <Text fontSize="sm" color="gray.600" textAlign="center">
                              Joignez votre arrêt de travail (PDF, JPG, PNG - max 5 Mo)
                            </Text>
                            <AccessibleButton
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              accessibleLabel="Sélectionner un fichier"
                            >
                              Parcourir...
                            </AccessibleButton>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              onChange={handleFileChange}
                              style={{ display: 'none' }}
                              aria-label="Sélectionner un arrêt de travail"
                            />
                          </Flex>
                        ) : (
                          <Flex justify="space-between" align="center">
                            <Flex align="center" gap={2}>
                              <Box color="green.600">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                              </Box>
                              <Box>
                                <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                  {justificationFile.name}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {(justificationFile.size / 1024 / 1024).toFixed(2)} Mo
                                </Text>
                              </Box>
                            </Flex>
                            <AccessibleButton
                              variant="ghost"
                              size="sm"
                              colorPalette="red"
                              onClick={handleRemoveFile}
                              accessibleLabel="Supprimer le fichier"
                            >
                              Supprimer
                            </AccessibleButton>
                          </Flex>
                        )}
                      </Box>
                      {fileError && (
                        <Text fontSize="sm" color="red.600" mt={2}>
                          {fileError}
                        </Text>
                      )}
                      {!fileError && (
                        <Text fontSize="xs" color="gray.500" mt={2}>
                          Un justificatif (arrêt de travail) est obligatoire pour les absences maladie.
                        </Text>
                      )}
                    </Box>
                  )}

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
