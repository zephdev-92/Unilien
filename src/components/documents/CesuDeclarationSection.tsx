/**
 * Section "Declarations CESU" dans la page Documents.
 * Pattern : toolbar (periode) + tableau recapitulatif + dialog generation.
 * Les declarations sont persistees en base (table cesu_declarations).
 */

import { useState, useCallback, useEffect } from 'react'
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
  Spinner,
} from '@chakra-ui/react'
import {
  getMonthlyDeclarationData,
  generateCesuCsv,
  generateCesuSummary,
  generateCesuPdf,
  downloadExport,
  MONTHS_FR,
  type ExportFormat,
} from '@/lib/export'
import {
  saveCesuDeclaration,
  getCesuDeclarations,
  deleteCesuDeclaration,
  uploadCesuPdf,
  getCesuPdfSignedUrl,
} from '@/services/cesuDeclarationService'
import type { CesuDeclarationRecord } from '@/types'
import { toaster } from '@/lib/toaster'
import { logger } from '@/lib/logger'

interface Props {
  employerId: string
}

export function CesuDeclarationSection({ employerId }: Props) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const years = [currentYear, currentYear - 1, currentYear - 2]

  // Le dernier mois clôturé (mois précédent)
  const defaultMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const defaultYear = currentMonth === 1 ? currentYear - 1 : currentYear

  // Un mois est clôturé si on est au moins le 1er du mois suivant
  const isMonthClosed = useCallback((year: number, month: number) => {
    const firstOfNext = new Date(year, month, 1) // month est 1-based → sert de mois suivant (0-based)
    return new Date() >= firstOfNext
  }, [])

  // ── Generation
  const [selectedYear, setSelectedYear] = useState(defaultYear)
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [isGenerating, setIsGenerating] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  // ── Historique des declarations (persistees en base)
  const [declarations, setDeclarations] = useState<CesuDeclarationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ── Chargement initial depuis la base
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const records = await getCesuDeclarations(employerId)
      setDeclarations(records)
      setIsLoading(false)
    }
    load()
  }, [employerId])

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setDialogError(null)

    if (!isMonthClosed(selectedYear, selectedMonth)) {
      setDialogError('Ce mois n\'est pas encore termine. La declaration CESU sera disponible a partir du 1er du mois suivant.')
      setIsGenerating(false)
      return
    }

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

      // Générer et uploader le PDF
      let storagePath: string | null = null
      const pdfResult = await generateCesuPdf(data)
      if (pdfResult.success && pdfResult.content) {
        storagePath = await uploadCesuPdf(employerId, data.year, data.month, pdfResult.content)
      }

      // Persister en base (upsert) avec le chemin du PDF
      const saved = await saveCesuDeclaration(employerId, data, storagePath)
      if (!saved) {
        setDialogError('Erreur lors de la sauvegarde de la declaration')
        return
      }

      // Mettre à jour le state local
      setDeclarations((prev) => {
        const exists = prev.some(
          (r) => r.year === saved.year && r.month === saved.month
        )
        return exists
          ? prev.map((r) => r.year === saved.year && r.month === saved.month ? saved : r)
          : [saved, ...prev]
      })

      setShowDialog(false)
      toaster.create({
        title: 'Declaration CESU',
        description: `${saved.periodLabel} — ${saved.totalEmployees} employe${saved.totalEmployees > 1 ? 's' : ''}, ${saved.totalHours.toFixed(2).replace('.', ',')}h`,
        type: 'success',
      })
    } catch (err) {
      logger.error('Erreur generation CESU:', err)
      setDialogError('Erreur lors de la generation des donnees')
    } finally {
      setIsGenerating(false)
    }
  }, [employerId, selectedYear, selectedMonth, isMonthClosed])

  const handleDownload = async (record: CesuDeclarationRecord, format: ExportFormat) => {
    const declaration = record.declarationData

    // PDF stocké en Storage → télécharger via URL signée
    if (format === 'pdf' && record.storagePath) {
      const url = await getCesuPdfSignedUrl(record.storagePath)
      if (url) {
        window.open(url, '_blank')
        toaster.create({
          title: 'Declaration CESU',
          description: `${declaration.periodLabel} telecharge en PDF`,
          type: 'success',
        })
        return
      }
      // Fallback : regénérer si l'URL signée échoue
    }

    // Génération à la volée (CSV, summary, ou fallback PDF)
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

  const handleDelete = async (record: CesuDeclarationRecord) => {
    const success = await deleteCesuDeclaration(record.id)
    if (success) {
      setDeclarations((prev) => prev.filter((r) => r.id !== record.id))
      toaster.create({
        title: 'Declaration supprimee',
        description: record.periodLabel,
        type: 'info',
      })
    } else {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible de supprimer la declaration',
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
      {isLoading ? (
        <HStack justify="center" py={8}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="text.muted">Chargement des declarations…</Text>
        </HStack>
      ) : declarations.length === 0 ? (
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
              {declarations.map((r) => (
                <Table.Row key={r.id}>
                  <Table.Cell>
                    <Text fontWeight="medium" fontSize="sm">{r.periodLabel}</Text>
                    <Text fontSize="xs" color="text.muted">
                      {new Date(r.generatedAt).toLocaleDateString('fr-FR')}
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="sm">
                      {r.totalEmployees} employe{r.totalEmployees > 1 ? 's' : ''}
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="sm">
                      {r.totalHours.toFixed(2).replace('.', ',')} h
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontWeight="bold" fontSize="sm">
                      {r.totalGrossPay.toFixed(2).replace('.', ',')} €
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <HStack gap={1} justify="center">
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="brand"
                        onClick={() => handleDownload(r, 'pdf')}
                      >
                        PDF
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="brand"
                        onClick={() => handleDownload(r, 'csv')}
                      >
                        CSV
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => handleDelete(r)}
                      >
                        ✕
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

                {!isMonthClosed(selectedYear, selectedMonth) && (
                  <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Title>
                      Ce mois n'est pas encore termine. Vous pourrez generer la declaration a partir du {new Date(selectedYear, selectedMonth, 1).toLocaleDateString('fr-FR')}.
                    </Alert.Title>
                  </Alert.Root>
                )}

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
                  disabled={!isMonthClosed(selectedYear, selectedMonth)}
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
