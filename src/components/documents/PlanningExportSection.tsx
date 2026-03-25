/**
 * Section "Export du planning" dans la page Documents.
 * Alignee sur le prototype : card max-width 560px, radio-card format grid.
 */

import { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Alert,
  Spinner,
  Center,
  NativeSelect,
  Field,
  Icon,
  Separator,
} from '@chakra-ui/react'
import { MONTHS_FR } from '@/lib/export/types'
import {
  getPlanningExportData,
  getPlanningExportDataForEmployee,
  generatePlanningPdf,
  generatePlanningExcel,
  generatePlanningIcal,
  downloadExport,
} from '@/lib/export'
import { getContractsForEmployer } from '@/services/contractService'
import { logger } from '@/lib/logger'
import { toaster } from '@/lib/toaster'
import type { PlanningExportFormat } from '@/lib/export'

interface Props {
  employerId: string
  profileRole: 'employer' | 'employee' | 'caregiver'
  profileId: string
}

interface EmployeeOption {
  value: string
  label: string
}

const FORMAT_OPTIONS: { value: PlanningExportFormat; label: string; icon: React.ReactNode }[] = [
  {
    value: 'pdf',
    label: 'PDF',
    icon: (
      <Icon asChild boxSize="24px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </Icon>
    ),
  },
  {
    value: 'excel',
    label: 'Excel',
    icon: (
      <Icon asChild boxSize="24px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18" />
        </svg>
      </Icon>
    ),
  },
  {
    value: 'ical',
    label: 'iCal',
    icon: (
      <Icon asChild boxSize="24px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </Icon>
    ),
  },
]

export function PlanningExportSection({ employerId, profileRole, profileId }: Props) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedFormat, setSelectedFormat] = useState<PlanningExportFormat>('pdf')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')

  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const years = [currentYear, currentYear - 1, currentYear - 2]

  const canSelectEmployee = profileRole === 'employer' || profileRole === 'caregiver'

  useEffect(() => {
    if (!canSelectEmployee) return

    setIsLoadingEmployees(true)
    getContractsForEmployer(employerId)
      .then((contracts) => {
        const opts: EmployeeOption[] = contracts.map((c) => ({
          value: c.employeeId,
          label: c.employee
            ? `${c.employee.firstName} ${c.employee.lastName}`
            : `Employe (${c.contractType})`,
        }))
        setEmployees(opts)
      })
      .catch((err) => {
        logger.error('Erreur chargement employes:', err)
      })
      .finally(() => setIsLoadingEmployees(false))
  }, [employerId, canSelectEmployee])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const options = { year: selectedYear, month: selectedMonth }

      let planningData
      if (profileRole === 'employee') {
        planningData = await getPlanningExportDataForEmployee(profileId, options)
      } else {
        const employeeId = selectedEmployeeId !== 'all' ? selectedEmployeeId : undefined
        planningData = await getPlanningExportData(employerId, { ...options, employeeId })
      }

      if (!planningData) {
        setError('Aucune donnee disponible pour cette periode')
        return
      }

      if (planningData.employees.length === 0) {
        setError('Aucune intervention ni absence pour cette periode')
        return
      }

      let result
      switch (selectedFormat) {
        case 'pdf':
          result = generatePlanningPdf(planningData)
          break
        case 'excel':
          result = generatePlanningExcel(planningData)
          break
        case 'ical':
          result = generatePlanningIcal(planningData)
          break
      }

      if (!result.success) {
        setError(result.error ?? 'Erreur lors de la generation')
        return
      }

      downloadExport(result)

      const formatLabels = { pdf: 'PDF', excel: 'Excel', ical: 'iCal' }
      toaster.create({
        title: 'Export planning telecharge',
        description: `Fichier ${formatLabels[selectedFormat]} pret`,
        type: 'success',
      })
    } catch (err) {
      logger.error('Erreur export planning:', err)
      setError('Une erreur est survenue lors de la generation')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoadingEmployees) {
    return (
      <Center py={8}>
        <Spinner size="lg" color="brand.500" />
      </Center>
    )
  }

  return (
    <Box maxW="560px">
      <Card.Root>
        <Card.Header>
          <Card.Title>Export du planning</Card.Title>
          <Card.Description>
            Telechargez le planning dans le format de votre choix.
          </Card.Description>
        </Card.Header>

        <Card.Body>
          <VStack gap={5} align="stretch">
            {/* Employe (employeur/aidant uniquement) */}
            {canSelectEmployee && employees.length > 0 && (
              <Field.Root>
                <Field.Label>Employe</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  >
                    <option value="all">Tous les employes</option>
                    {employees.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )}

            {/* Periode */}
            <HStack gap={4} flexWrap="wrap">
              <Field.Root flex={2}>
                <Field.Label>Mois</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {MONTHS_FR.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              <Field.Root flex={1}>
                <Field.Label>Annee</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            </HStack>

            {/* Format d'export — radio card grid */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={3}>Format d'export</Text>
              <HStack gap={3}>
                {FORMAT_OPTIONS.map((fmt) => (
                  <Box
                    key={fmt.value}
                    as="button"
                    type="button"
                    flex={1}
                    p={4}
                    borderWidth="2px"
                    borderColor={selectedFormat === fmt.value ? 'brand.500' : 'border.default'}
                    borderRadius="12px"
                    bg={selectedFormat === fmt.value ? 'brand.subtle' : 'transparent'}
                    cursor="pointer"
                    textAlign="center"
                    transition="all 0.15s"
                    _hover={{ borderColor: 'brand.300', bg: 'bg.page' }}
                    onClick={() => setSelectedFormat(fmt.value)}
                    aria-pressed={selectedFormat === fmt.value}
                  >
                    <VStack gap={2}>
                      <Box color={selectedFormat === fmt.value ? 'brand.600' : 'text.muted'}>
                        {fmt.icon}
                      </Box>
                      <Text
                        fontSize="sm"
                        fontWeight={selectedFormat === fmt.value ? 'semibold' : 'medium'}
                        color={selectedFormat === fmt.value ? 'brand.700' : 'text.default'}
                      >
                        {fmt.label}
                      </Text>
                    </VStack>
                  </Box>
                ))}
              </HStack>
            </Box>

            {/* Erreur */}
            {error && (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Title>{error}</Alert.Title>
              </Alert.Root>
            )}

            <Separator />

            {/* Bouton principal */}
            <Button
              colorPalette="brand"
              size="lg"
              onClick={handleGenerate}
              loading={isGenerating}
              loadingText="Generation en cours…"
            >
              Exporter
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
