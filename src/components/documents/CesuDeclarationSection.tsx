/**
 * Section "Declarations CESU" dans la page Documents.
 * Pattern : toolbar (periode) + tableau recapitulatif + dialog generation.
 */

import { useState, useCallback } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Table,
  EmptyState,
  NativeSelect,
  Dialog,
  CloseButton,
  Alert,
} from '@chakra-ui/react'
import {
  getMonthlyDeclarationData,
  generateCesuCsv,
  generateCesuSummary,
  generateCesuPdf,
  downloadExport,
  MONTHS_FR,
  type ExportFormat,
  type MonthlyDeclarationData,
} from '@/lib/export'
import { toaster } from '@/lib/toaster'
import { logger } from '@/lib/logger'

interface Props {
  employerId: string
}

export function CesuDeclarationSection({ employerId }: Props) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const years = [currentYear, currentYear - 1, currentYear - 2]

  // ── Generation
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [isGenerating, setIsGenerating] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  // ── Historique des declarations generees
  const [declarations, setDeclarations] = useState<MonthlyDeclarationData[]>([])

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setDialogError(null)

    try {
      const data = await getMonthlyDeclarationData(employerId, {
        format: 'summary',
        year: selectedYear,
        month: selectedMonth,
      })

      if (!data) {
        setDialogError('Aucune donnee disponible pour cette periode')
        return
      }

      if (data.employees.length === 0) {
        setDialogError('Aucune intervention enregistree pour cette periode')
        return
      }

      // Ajouter aux declarations (eviter les doublons)
      setDeclarations((prev) => {
        const exists = prev.some(
          (d) => d.periodLabel === data.periodLabel
        )
        return exists ? prev.map((d) => d.periodLabel === data.periodLabel ? data : d) : [data, ...prev]
      })

      setShowDialog(false)
      toaster.create({
        title: 'Declaration CESU',
        description: `${data.periodLabel} — ${data.totalEmployees} employe${data.totalEmployees > 1 ? 's' : ''}, ${data.totalHours.toFixed(2).replace('.', ',')}h`,
        type: 'success',
      })
    } catch (err) {
      logger.error('Erreur generation CESU:', err)
      setDialogError('Erreur lors de la generation des donnees')
    } finally {
      setIsGenerating(false)
    }
  }, [employerId, selectedYear, selectedMonth])

  const handleDownload = async (declaration: MonthlyDeclarationData, format: ExportFormat) => {
    let result
    switch (format) {
      case 'pdf':
        result = await generateCesuPdf(declaration)
        break
      case 'csv':
        result = generateCesuCsv(declaration)
        break
      default:
        result = generateCesuSummary(declaration)
    }

    if (result.success) {
      downloadExport(result)
      toaster.create({
        title: 'Declaration CESU',
        description: `${declaration.periodLabel} telecharge en ${format.toUpperCase()}`,
        type: 'success',
      })
    } else {
      toaster.create({
        title: 'Erreur',
        description: result.error || 'Erreur lors du telechargement',
        type: 'error',
      })
    }
  }

  return (
    <VStack gap={4} align="stretch">
      {/* ── Toolbar ── */}
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <HStack gap={3}>
          <Text fontSize="sm" color="text.muted">
            {declarations.length} declaration{declarations.length > 1 ? 's' : ''} generee{declarations.length > 1 ? 's' : ''}
          </Text>
        </HStack>

        <Button
          size="sm"
          colorPalette="brand"
          onClick={() => {
            setDialogError(null)
            setShowDialog(true)
          }}
        >
          Generer une declaration
        </Button>
      </HStack>

      {/* ── Status hint ── */}
      <Text fontSize="xs" color="text.muted">
        Generez un recapitulatif mensuel pour chaque periode, puis telechargez-le en PDF ou CSV pour votre declaration sur cesu.urssaf.fr.
      </Text>

      {/* ── Tableau ── */}
      {declarations.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>Aucune declaration</EmptyState.Title>
            <EmptyState.Description>
              Generez votre premiere declaration CESU avec le bouton ci-dessus.
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Periode</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Employes</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Heures</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Total brut</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {declarations.map((d) => (
                <Table.Row key={d.periodLabel}>
                  <Table.Cell>
                    <Text fontWeight="medium" fontSize="sm">{d.periodLabel}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="sm">
                      {d.totalEmployees} employe{d.totalEmployees > 1 ? 's' : ''}
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="sm">
                      {d.totalHours.toFixed(2).replace('.', ',')} h
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontWeight="bold" fontSize="sm">
                      {d.totalGrossPay.toFixed(2).replace('.', ',')} €
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <HStack gap={1} justify="center">
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="brand"
                        onClick={() => handleDownload(d, 'pdf')}
                      >
                        PDF
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="brand"
                        onClick={() => handleDownload(d, 'csv')}
                      >
                        CSV
                      </Button>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      {/* ── Dialog de generation ── */}
      <Dialog.Root open={showDialog} onOpenChange={(e) => setShowDialog(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="lg">
            <Dialog.Header>
              <Dialog.Title>Generer une declaration CESU</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={5} align="stretch">
                <HStack gap={4} flexWrap="wrap">
                  <Box flex={2}>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>Mois</Text>
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
                  </Box>
                  <Box flex={1}>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>Annee</Text>
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
                  </Box>
                </HStack>

                {dialogError && (
                  <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Title>{dialogError}</Alert.Title>
                  </Alert.Root>
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={3}>
                <Button variant="outline" colorPalette="gray" onClick={() => setShowDialog(false)}>
                  Annuler
                </Button>
                <Button
                  colorPalette="brand"
                  onClick={handleGenerate}
                  loading={isGenerating}
                  loadingText="Generation…"
                >
                  Generer l'apercu pour {MONTHS_FR[selectedMonth - 1]} {selectedYear}
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  )
}
