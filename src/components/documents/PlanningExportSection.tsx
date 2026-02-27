/**
 * Section "Export du planning" dans la page Documents.
 *
 * Fonctionnalités :
 *  - Sélection mois + année
 *  - [Employeur/aidant] sélection employé ou "Tous"
 *  - Choix du format : PDF | Excel | iCal
 *  - Génération + téléchargement
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
import type { PlanningExportFormat } from '@/lib/export'

interface Props {
  /** ID de l'employeur (toujours requis, même pour un employé) */
  employerId: string
  /** Rôle du profil connecté */
  profileRole: 'employer' | 'employee' | 'caregiver'
  /** ID du profil connecté (utilisé si role=employee pour filtrer) */
  profileId: string
}

interface EmployeeOption {
  value: string // employee_id
  label: string
}

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

  // Charger la liste des employés pour employeur/aidant
  useEffect(() => {
    if (!canSelectEmployee) return

    setIsLoadingEmployees(true)
    getContractsForEmployer(employerId)
      .then((contracts) => {
        const opts: EmployeeOption[] = contracts.map((c) => ({
          value: c.employeeId,
          label: c.employee
            ? `${c.employee.firstName} ${c.employee.lastName}`
            : `Employé (${c.contractType})`,
        }))
        setEmployees(opts)
      })
      .catch((err) => {
        logger.error('Erreur chargement employés:', err)
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
        setError('Aucune donnée disponible pour cette période')
        return
      }

      if (planningData.employees.length === 0) {
        setError('Aucune intervention ni absence pour cette période')
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
        setError(result.error ?? 'Erreur lors de la génération')
        return
      }

      downloadExport(result)
    } catch (err) {
      logger.error('Erreur export planning:', err)
      setError('Une erreur est survenue lors de la génération')
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
    <VStack gap={6} align="stretch">
      <Card.Root>
        <Card.Body>
          <VStack gap={5} align="stretch">
            <Text fontWeight="semibold" fontSize="md">Exporter le planning</Text>

            {/* Période */}
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
                <Field.Label>Année</Field.Label>
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

            {/* Sélection employé (employeur/aidant uniquement) */}
            {canSelectEmployee && employees.length > 0 && (
              <Field.Root>
                <Field.Label>Employé</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  >
                    <option value="all">Tous les employés</option>
                    {employees.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )}

            {/* Format */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>Format d'export</Text>
              <HStack gap={3}>
                {(['pdf', 'excel', 'ical'] as PlanningExportFormat[]).map((fmt) => (
                  <Button
                    key={fmt}
                    size="sm"
                    variant={selectedFormat === fmt ? 'solid' : 'outline'}
                    colorPalette={selectedFormat === fmt ? 'brand' : 'gray'}
                    onClick={() => setSelectedFormat(fmt)}
                    flex={1}
                  >
                    {fmt === 'pdf' && 'PDF'}
                    {fmt === 'excel' && 'Excel'}
                    {fmt === 'ical' && 'iCal'}
                  </Button>
                ))}
              </HStack>
            </Box>

            {/* Messages */}
            {error && (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Title>{error}</Alert.Title>
              </Alert.Root>
            )}

            {/* Bouton principal */}
            <Button
              colorPalette="brand"
              size="lg"
              onClick={handleGenerate}
              loading={isGenerating}
              loadingText="Génération en cours…"
            >
              Générer et télécharger
            </Button>

            {/* Aide */}
            <Alert.Root status="info">
              <Alert.Indicator />
              <Box>
                <Alert.Title>À propos des formats</Alert.Title>
                <Alert.Description>
                  Le <strong>PDF</strong> génère une grille calendrier, une page par employé.
                  L'<strong>Excel</strong> inclut un onglet résumé et un onglet détaillé par employé.
                  L'<strong>iCal</strong> (.ics) est importable dans Google Calendar, Apple Calendar ou Outlook.
                </Alert.Description>
              </Box>
            </Alert.Root>
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
