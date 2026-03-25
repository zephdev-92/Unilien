import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Box,
  Stack,
  Flex,
  Text,
  Textarea,
  SimpleGrid,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { AccessibleInput, AccessibleButton, GhostButton, PrimaryButton } from '@/components/ui'
import { PlanningModal } from './PlanningModal'
import { toaster } from '@/lib/toaster'
import { logger } from '@/lib/logger'
import { createAbsence, uploadJustification, validateJustificationFile } from '@/services/absenceService'
import { countBusinessDays, FAMILY_EVENT_LABELS, FAMILY_EVENT_DAYS } from '@/lib/absence'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import type { FamilyEventType, LeaveBalance } from '@/types'

// ── Schéma de validation ──

const absenceSchema = z.object({
  absenceType: z.enum(['sick', 'vacation', 'family_event', 'training', 'unavailable', 'emergency'], {
    required_error: 'Veuillez sélectionner un type d\'absence',
  }),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().min(1, 'La date de fin est requise'),
  reason: z.string().optional(),
  familyEventType: z.string().optional(),
}).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true
    return new Date(data.endDate) >= new Date(data.startDate)
  },
  { message: 'La date de fin ne peut pas être antérieure à la date de début', path: ['endDate'] }
).refine(
  (data) => {
    if (data.absenceType !== 'family_event') return true
    return !!data.familyEventType
  },
  { message: 'Veuillez sélectionner le type d\'événement familial', path: ['familyEventType'] }
)

type AbsenceFormData = z.infer<typeof absenceSchema>

// ── Catégories d'absence (proto: onglets) ──

type AbsenceCategory = 'conges' | 'medical' | 'familial' | 'autre'

interface AbsenceTypeOption {
  value: string
  backendType: AbsenceFormData['absenceType']
  label: string
  sub: string
  dot: string // couleur du dot
  familyEventType?: FamilyEventType
}

const CATEGORIES: { key: AbsenceCategory; label: string }[] = [
  { key: 'conges', label: 'Congés' },
  { key: 'medical', label: 'Médical' },
  { key: 'familial', label: 'Familial' },
  { key: 'autre', label: 'Autre' },
]

const ABSENCE_OPTIONS: Record<AbsenceCategory, AbsenceTypeOption[]> = {
  conges: [
    { value: 'conge_paye', backendType: 'vacation', label: 'Congé payé (CP)', sub: '{days} dispo · Rémunéré · Art. L3141-1', dot: 'brand.500' },
    { value: 'sans_solde', backendType: 'vacation', label: 'Congé sans solde', sub: 'Durée libre · Accord employeur · Non rémunéré', dot: 'brand.500' },
    { value: 'formation', backendType: 'training', label: 'Congé formation (CPF)', sub: 'Variable · Financement CPF · Art. L6323-1', dot: 'brand.500' },
  ],
  medical: [
    { value: 'maladie', backendType: 'sick', label: 'Arrêt maladie', sub: 'Justificatif CPAM sous 48h · Art. L1226-1', dot: '#EF4444' },
    { value: 'accident_travail', backendType: 'sick', label: 'Accident du travail', sub: 'Déclaration obligatoire 48h · Art. L4121-1', dot: '#EF4444' },
    { value: 'accident_trajet', backendType: 'sick', label: 'Accident de trajet', sub: 'Déclaration 48h · Art. L411-2 CSS', dot: '#EF4444' },
    { value: 'maternite', backendType: 'sick', label: 'Congé maternité', sub: '16 semaines (1er enfant) · Art. L1225-17', dot: '#EF4444' },
    { value: 'paternite', backendType: 'sick', label: 'Congé paternité / 2nd parent', sub: '25 jours · Art. L1225-35', dot: '#EF4444' },
    { value: 'enfant_malade', backendType: 'sick', label: 'Enfant malade', sub: '3 j/an · Enfant < 16 ans · IDCC 3239 Art. 42', dot: '#EF4444' },
  ],
  familial: Object.entries(FAMILY_EVENT_LABELS).map(([key, label]) => ({
    value: key,
    backendType: 'family_event' as const,
    label,
    sub: `${FAMILY_EVENT_DAYS[key as FamilyEventType]}j ouvrés · IDCC 3239 Art. 51`,
    dot: '#7C5CBF',
    familyEventType: key as FamilyEventType,
  })),
  autre: [
    { value: 'indisponibilite', backendType: 'unavailable', label: 'Indisponibilité', sub: 'Absence non programmée · Sans motif précis', dot: 'text.muted' },
    { value: 'urgence_perso', backendType: 'emergency', label: 'Urgence personnelle', sub: 'Événement imprévu · Justificatif bienvenu', dot: 'text.muted' },
  ],
}

// ── Info contextuelle par type sélectionné ──

function getInfoText(
  selected: AbsenceTypeOption | null,
  leaveBalance: LeaveBalance | null,
) {
  if (!selected) return null
  if (selected.value === 'conge_paye') {
    if (!leaveBalance) return 'Congé payé · Rémunéré · Chargement du solde…'
    const days = leaveBalance.remainingDays
    if (days <= 0) return 'Congé payé · Rémunéré · Aucun jour de CP disponible. Votre solde sera recalculé selon votre ancienneté.'
    return `Congé payé · Rémunéré · Il vous reste ${days.toFixed(0)} jour${days >= 2 ? 's' : ''} de CP disponibles.`
  }
  if (selected.value === 'sans_solde') return 'Congé sans solde · Non rémunéré · Nécessite l\'accord de votre employeur.'
  if (selected.value === 'formation') return 'Congé formation · CPF · Financé via votre Compte Personnel de Formation.'
  if (selected.backendType === 'sick') return `${selected.label} · Justificatif requis sous 48h.`
  if (selected.backendType === 'family_event' && selected.familyEventType) {
    const days = FAMILY_EVENT_DAYS[selected.familyEventType]
    return `${selected.label} · ${days} jour(s) ouvré(s) · Convention IDCC 3239 Art. 51.`
  }
  return `${selected.label} · Votre demande sera transmise pour validation.`
}

// ── Composant ──

interface AbsenceRequestModalProps {
  isOpen: boolean
  onClose: () => void
  employeeId: string
  contractId?: string
  defaultDate?: Date
  onSuccess: () => void
}

export function AbsenceRequestModal({
  isOpen,
  onClose,
  employeeId,
  contractId,
  defaultDate,
  onSuccess,
}: AbsenceRequestModalProps) {
  const { profile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [justificationFile, setJustificationFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [employerName, setEmployerName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Onglet + type sélectionné
  const [activeCategory, setActiveCategory] = useState<AbsenceCategory>('conges')
  const [selectedValue, setSelectedValue] = useState<string>('conge_paye')

  const selectedOption = useMemo(() => {
    for (const opts of Object.values(ABSENCE_OPTIONS)) {
      const found = opts.find((o) => o.value === selectedValue)
      if (found) return found
    }
    return null
  }, [selectedValue])

  const isSickLeave = selectedOption?.backendType === 'sick'

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AbsenceFormData>({
    resolver: zodResolver(absenceSchema),
    defaultValues: {
      absenceType: 'vacation',
      startDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      endDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      reason: '',
      familyEventType: '',
    },
  })

  const startDateValue = watch('startDate')
  const endDateValue = watch('endDate')

  const businessDays = useMemo(() => {
    if (!startDateValue || !endDateValue) return 0
    const start = new Date(startDateValue)
    const end = new Date(endDateValue)
    if (end < start) return 0
    return countBusinessDays(start, end)
  }, [startDateValue, endDateValue])

  // Sync le form caché quand on change de type
  useEffect(() => {
    if (!selectedOption) return
    setValue('absenceType', selectedOption.backendType)
    if (selectedOption.familyEventType) {
      setValue('familyEventType', selectedOption.familyEventType)
    } else {
      setValue('familyEventType', '')
    }
  }, [selectedOption, setValue])

  // Charger le solde congés (même approche que le dashboard — avec fallback ancienneté)
  useEffect(() => {
    if (!isOpen || !employeeId) {
      setLeaveBalance(null)
      return
    }
    async function loadBalance() {
      const [balancesRes, contractsRes] = await Promise.all([
        supabase
          .from('leave_balances')
          .select('acquired_days, taken_days, adjustment_days')
          .eq('employee_id', employeeId),
        supabase
          .from('contracts')
          .select('start_date')
          .eq('employee_id', employeeId)
          .eq('status', 'active'),
      ])

      const balances = balancesRes.data || []
      let remaining: number

      if (balances.length > 0) {
        remaining = balances.reduce(
          (sum, b) => sum + (b.acquired_days || 0) - (b.taken_days || 0) + (b.adjustment_days || 0),
          0,
        )
      } else {
        // Fallback : calcul depuis l'ancienneté (2.5j / mois travaillé, IDCC 3239)
        const contracts = contractsRes.data || []
        const now = new Date()
        let totalMonths = 0
        for (const c of contracts) {
          const start = new Date(c.start_date)
          const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
          totalMonths += Math.max(0, months)
        }
        remaining = Math.round(totalMonths * 2.5 * 10) / 10
      }

      setLeaveBalance({
        remainingDays: Math.round(remaining * 10) / 10,
      } as LeaveBalance)
    }
    loadBalance()
  }, [isOpen, employeeId])

  // Charger le contractId + nom de l'employeur
  useEffect(() => {
    if (!isOpen || !profile) return
    async function loadContractAndEmployer() {
      const { data } = await supabase
        .from('contracts')
        .select('employer_id')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .limit(1)
        .single()
      if (data) {
        if (data.employer_id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', data.employer_id)
            .single()
          if (prof) setEmployerName(`${prof.first_name} ${prof.last_name}`)
        }
      }
    }
    loadContractAndEmployer()
  }, [isOpen, employeeId, profile, contractId])

  // Reset à l'ouverture
  useEffect(() => {
    if (isOpen) {
      const date = defaultDate || new Date()
      reset({
        absenceType: 'vacation',
        startDate: format(date, 'yyyy-MM-dd'),
        endDate: format(date, 'yyyy-MM-dd'),
        reason: '',
        familyEventType: '',
      })
      setSubmitError(null)
      setJustificationFile(null)
      setFileError(null)
      setActiveCategory('conges')
      setSelectedValue('conge_paye')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [isOpen, defaultDate, reset])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setFileError(null)
    if (file) {
      const validation = validateJustificationFile(file)
      if (!validation.valid) {
        setFileError(validation.error || 'Fichier invalide')
        setJustificationFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onSubmit = async (data: AbsenceFormData) => {
    if (data.absenceType === 'sick' && !justificationFile) {
      setFileError('L\'arrêt de travail est obligatoire pour une absence maladie')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      let justificationUrl: string | undefined
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
        familyEventType: data.absenceType === 'family_event'
          ? (data.familyEventType as FamilyEventType)
          : undefined,
      })

      toaster.success({ title: 'Demande d\'absence envoyée' })
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Erreur création absence:', error)
      toaster.error({ title: 'Erreur lors de la demande d\'absence' })
      setSubmitError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const infoText = getInfoText(selectedOption, leaveBalance)

  return (
    <PlanningModal
      isOpen={isOpen}
      onClose={onClose}
      title="Demander une absence"
      large
      footer={
        <Flex gap={3} justify="flex-end">
          <GhostButton onClick={onClose} disabled={isSubmitting}>
            Annuler
          </GhostButton>
          <PrimaryButton type="submit" form="absence-request-form" loading={isSubmitting}>
            Envoyer la demande
          </PrimaryButton>
        </Flex>
      }
    >
      <form id="absence-request-form" onSubmit={handleSubmit(onSubmit)}>
        <Stack gap={4}>
          {/* ── Catégorie tabs (proto: abs-cat-tabs) ── */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="text.default" mb={2}>
              Type d&apos;absence <Text as="span" color="red.500">*</Text>
            </Text>
            <Flex
              gap={1}
              bg="bg.page"
              borderRadius="10px"
              p="3px"
              mb={4}
              role="tablist"
              aria-label="Catégorie d'absence"
            >
              {CATEGORIES.map((cat) => (
                <Flex
                  key={cat.key}
                  as="button"
                  type="button"
                  flex={1}
                  justify="center"
                  py={2}
                  px={2}
                  borderRadius="8px"
                  border="none"
                  fontSize="12px"
                  fontWeight="600"
                  cursor="pointer"
                  transition="all 0.15s"
                  whiteSpace="nowrap"
                  bg={activeCategory === cat.key ? 'bg.surface' : 'transparent'}
                  color={activeCategory === cat.key ? 'brand.500' : 'text.muted'}
                  boxShadow={activeCategory === cat.key ? 'sm' : 'none'}
                  _hover={{ color: activeCategory === cat.key ? 'brand.500' : 'text.default' }}
                  onClick={() => {
                    setActiveCategory(cat.key)
                    // Sélectionner le premier item de la catégorie
                    const firstOpt = ABSENCE_OPTIONS[cat.key][0]
                    if (firstOpt) setSelectedValue(firstOpt.value)
                  }}
                  role="tab"
                  aria-selected={activeCategory === cat.key}
                >
                  {cat.label}
                </Flex>
              ))}
            </Flex>

            {/* ── Radio cards (proto: abs-type-panel) ── */}
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2}>
              {ABSENCE_OPTIONS[activeCategory].map((opt) => (
                <Flex
                  key={opt.value}
                  as="label"
                  align="flex-start"
                  gap={2}
                  p={3}
                  bg={selectedValue === opt.value ? 'brand.subtle' : 'bg.page'}
                  borderWidth="2px"
                  borderColor={selectedValue === opt.value ? 'brand.500' : 'border.default'}
                  borderRadius="10px"
                  cursor="pointer"
                  transition="all 0.15s"
                  _hover={{ borderColor: 'brand.500', bg: 'brand.subtle' }}
                  onClick={() => setSelectedValue(opt.value)}
                >
                  <input
                    type="radio"
                    name="abs-type"
                    value={opt.value}
                    checked={selectedValue === opt.value}
                    onChange={() => setSelectedValue(opt.value)}
                    style={{ display: 'none' }}
                  />
                  <Box
                    w="10px"
                    h="10px"
                    borderRadius="full"
                    flexShrink={0}
                    mt="4px"
                    bg={opt.dot}
                  />
                  <Box>
                    <Text fontSize="sm" fontWeight="700" color="text.default">
                      {opt.label}
                    </Text>
                    <Text fontSize="10px" color="text.muted" mt="1px">
                      {opt.sub.replace('{days}', leaveBalance ? `${leaveBalance.remainingDays.toFixed(0)} j` : '— j')}
                    </Text>
                  </Box>
                </Flex>
              ))}
            </SimpleGrid>
          </Box>

          {/* ── Champs hidden pour react-hook-form ── */}
          <input type="hidden" {...register('absenceType')} />
          <input type="hidden" {...register('familyEventType')} />

          {/* ── Info contextuelle (proto: abs-info-box) ── */}
          {infoText && (
            <Flex
              align="center"
              gap={2}
              p={3}
              bg="#F0F5E6"
              borderWidth="1px"
              borderColor="#D4E2B6"
              borderRadius="10px"
              role="status"
            >
              <Box flexShrink={0} color="text.default">
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </Box>
              <Text fontSize="sm" color="text.default">
                {infoText}
              </Text>
            </Flex>
          )}

          {/* ── Justificatif (conditionnel: maladie) ── */}
          {isSickLeave && (
            <Box>
              <Text fontWeight="medium" fontSize="md" mb={2}>
                Justificatif <Text as="span" color="red.500">*</Text>
              </Text>
              <Box
                borderWidth="2px"
                borderStyle="dashed"
                borderColor={fileError ? 'red.500' : justificationFile ? 'green.300' : 'border.default'}
                borderRadius="12px"
                p={4}
                bg={fileError ? 'red.50' : justificationFile ? 'accent.subtle' : 'bg.page'}
                transition="all 0.2s"
              >
                {!justificationFile ? (
                  <Flex direction="column" align="center" gap={2}>
                    <Text fontSize="sm" color="text.muted" textAlign="center">
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
                        <Text fontSize="sm" fontWeight="medium" color="text.default">{justificationFile.name}</Text>
                        <Text fontSize="xs" color="text.muted">{(justificationFile.size / 1024 / 1024).toFixed(2)} Mo</Text>
                      </Box>
                    </Flex>
                    <AccessibleButton variant="ghost" size="sm" colorPalette="red" onClick={handleRemoveFile} accessibleLabel="Supprimer le fichier">
                      Supprimer
                    </AccessibleButton>
                  </Flex>
                )}
              </Box>
              {fileError && <Text fontSize="sm" color="red.600" mt={2}>{fileError}</Text>}
              {!fileError && (
                <Text fontSize="xs" color="text.muted" mt={2}>
                  Document médical requis sous 48h.
                </Text>
              )}
            </Box>
          )}

          {/* ── Dates côte à côte (proto: form-grid) ── */}
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

          {businessDays > 0 && (
            <Text fontSize="xs" color="text.muted" mt={-2}>
              {businessDays} jour(s) ouvrable(s) demandé(s)
            </Text>
          )}

          {/* ── Notes / motif ── */}
          <Box>
            <Text fontWeight="medium" fontSize="md" mb={2}>
              Notes / motif
            </Text>
            <Textarea
              placeholder="Précisez si nécessaire…"
              rows={2}
              size="lg"
              borderWidth="2px"
              {...register('reason')}
            />
          </Box>

          {/* ── Message validation (proto: form-hint centré) ── */}
          <Text fontSize="xs" color="text.muted" textAlign="center">
            Votre demande sera transmise à{' '}
            <Text as="span" fontWeight="bold">{employerName || 'votre employeur'}</Text>
            {' '}pour validation.
          </Text>

          {submitError && (
            <Box p={4} bg="red.50" borderRadius="10px">
              <Text color="red.700" whiteSpace="pre-line">{submitError}</Text>
            </Box>
          )}
        </Stack>
      </form>
    </PlanningModal>
  )
}

export default AbsenceRequestModal
