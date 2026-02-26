/**
 * Section "Bulletins de paie" dans la page Documents.
 *
 * Fonctionnalités :
 *  - Sélection employé + période (mois/année)
 *  - Taux PAS pré-rempli depuis le contrat, modifiable
 *  - Génération + téléchargement local
 *  - Génération + sauvegarde dans Supabase Storage + historique DB
 *  - Tableau de l'historique avec re-téléchargement et suppression
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Badge,
  Alert,
  Spinner,
  Center,
  Table,
  IconButton,
  NativeSelect,
  Input,
  Field,
  Separator,
} from '@chakra-ui/react'
import { getContractsForEmployer, type ContractWithEmployee } from '@/services/contractService'
import {
  getPayslipData,
} from '@/lib/export/payslipService'
import {
  generatePayslipPdf,
  downloadExport,
} from '@/lib/export'
import {
  uploadPayslipPdf,
  getPayslipSignedUrl,
  savePayslipRecord,
  getPayslipsHistory,
  deletePayslipRecord,
} from '@/services/payslipStorageService'
import { MONTHS_FR } from '@/lib/export/types'
import { logger } from '@/lib/logger'
import type { Payslip } from '@/types'

interface Props {
  employerId: string
}

export function PayslipSection({ employerId }: Props) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // ── Contrats actifs ───────────────────────────────────────────────────────
  const [contracts, setContracts] = useState<ContractWithEmployee[]>([])
  const [selectedContractId, setSelectedContractId] = useState<string>('')

  // ── Période ───────────────────────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  // ── Taux PAS ─────────────────────────────────────────────────────────────
  const [pasRateInput, setPasRateInput] = useState('0')

  // ── Exemption patronale ──────────────────────────────────────────────────
  const [isExemptPatronal, setIsExemptPatronal] = useState(false)

  // ── États UI ─────────────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── Historique ────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<Payslip[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const years = [currentYear, currentYear - 1, currentYear - 2]

  // Charger les contrats au montage
  useEffect(() => {
    getContractsForEmployer(employerId).then((list) => {
      setContracts(list)
      if (list.length > 0) {
        setSelectedContractId(list[0].id)
        // Pré-remplir le taux PAS depuis le premier contrat
        const rate = list[0].pasRate ?? 0
        setPasRateInput((rate * 100).toFixed(2))
      }
    })
  }, [employerId])

  // Mettre à jour le taux PAS quand le contrat change
  useEffect(() => {
    const contract = contracts.find((c) => c.id === selectedContractId)
    if (contract) {
      const rate = contract.pasRate ?? 0
      setPasRateInput((rate * 100).toFixed(2))
    }
  }, [selectedContractId, contracts])

  // Charger l'historique
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    const contract = contracts.find((c) => c.id === selectedContractId)
    const employeeId = contract?.employeeId
    const list = await getPayslipsHistory(employerId, employeeId)
    setHistory(list)
    setIsLoadingHistory(false)
  }, [employerId, selectedContractId, contracts])

  useEffect(() => {
    if (selectedContractId) {
      loadHistory()
    }
  }, [selectedContractId, loadHistory])

  // ── Génération ────────────────────────────────────────────────────────────

  const selectedContract = contracts.find((c) => c.id === selectedContractId)
  const pasRateDecimal = Math.min(1, Math.max(0, parseFloat(pasRateInput || '0') / 100))

  const handleGenerate = async (saveToStorage: boolean) => {
    if (!selectedContract) return

    setIsGenerating(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const payslipData = await getPayslipData(
        employerId,
        selectedContract.employeeId,
        selectedYear,
        selectedMonth,
        pasRateDecimal,
        isExemptPatronal
      )

      if (!payslipData) {
        setError('Aucune donnée trouvée pour cette période')
        return
      }

      const result = generatePayslipPdf(payslipData)

      if (!result.success) {
        setError(result.error ?? 'Erreur lors de la génération du PDF')
        return
      }

      // Téléchargement local
      downloadExport(result)

      if (saveToStorage) {
        // Upload + sauvegarde DB
        const storagePath = await uploadPayslipPdf(
          employerId,
          selectedContract.employeeId,
          selectedYear,
          selectedMonth,
          result.filename,
          result.content
        )

        const storageUrl = storagePath
          ? await getPayslipSignedUrl(storagePath)
          : null

        await savePayslipRecord({
          data: payslipData,
          contractId: selectedContractId,
          storagePath,
          storageUrl,
        })

        setSuccessMsg('Bulletin généré, téléchargé et sauvegardé dans l\'historique.')
        await loadHistory()
      } else {
        setSuccessMsg('Bulletin généré et téléchargé.')
      }
    } catch (err) {
      logger.error('Erreur génération bulletin:', err)
      setError('Une erreur est survenue lors de la génération.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReDownload = async (payslip: Payslip) => {
    if (!payslip.storagePath) return
    const url = await getPayslipSignedUrl(payslip.storagePath)
    if (!url) {
      setError('Impossible de générer le lien de téléchargement.')
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = `bulletin_${payslip.periodLabel.toLowerCase().replace(/\s+/g, '_')}.pdf`
    a.click()
  }

  const handleDelete = async (payslipId: string) => {
    await deletePayslipRecord(payslipId)
    await loadHistory()
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (contracts.length === 0) {
    return (
      <Alert.Root status="info">
        <Alert.Indicator />
        <Alert.Title>Aucun contrat actif trouvé pour générer un bulletin.</Alert.Title>
      </Alert.Root>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      {/* ── Formulaire de génération ── */}
      <Card.Root>
        <Card.Body>
          <VStack gap={5} align="stretch">
            <Text fontWeight="semibold" fontSize="md">Générer un bulletin de paie</Text>

            {/* Employé */}
            <Field.Root>
              <Field.Label>Employé</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                >
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.employee
                        ? `${c.employee.firstName} ${c.employee.lastName}`
                        : `Contrat ${c.contractType}`}{' '}
                      — {c.contractType}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

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

            {/* Taux PAS */}
            <HStack gap={4} align="flex-end">
              <Field.Root flex={1}>
                <Field.Label>Taux PAS (%)</Field.Label>
                <Field.HelperText>Prélèvement à la Source — pré-rempli depuis le contrat</Field.HelperText>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={pasRateInput}
                  onChange={(e) => setPasRateInput(e.target.value)}
                />
              </Field.Root>
              <Field.Root flex={1}>
                <Field.Label>Exonération patronale SS</Field.Label>
                <Field.HelperText>Art. L241-10 CSS — Éligible AGED/AGED+</Field.HelperText>
                <Button
                  size="sm"
                  variant={isExemptPatronal ? 'solid' : 'outline'}
                  colorPalette={isExemptPatronal ? 'green' : 'gray'}
                  onClick={() => setIsExemptPatronal((v) => !v)}
                  alignSelf="flex-start"
                  mt={1}
                >
                  {isExemptPatronal ? 'Activée' : 'Désactivée'}
                </Button>
              </Field.Root>
            </HStack>

            <Separator />

            {/* Messages */}
            {error && (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Title>{error}</Alert.Title>
              </Alert.Root>
            )}
            {successMsg && (
              <Alert.Root status="success">
                <Alert.Indicator />
                <Alert.Title>{successMsg}</Alert.Title>
              </Alert.Root>
            )}

            {/* Boutons */}
            <HStack gap={3} flexWrap="wrap">
              <Button
                colorPalette="brand"
                size="lg"
                flex={1}
                onClick={() => handleGenerate(true)}
                loading={isGenerating}
                loadingText="Génération…"
              >
                Générer et sauvegarder
              </Button>
              <Button
                variant="outline"
                colorPalette="brand"
                size="lg"
                flex={1}
                onClick={() => handleGenerate(false)}
                loading={isGenerating}
                disabled={isGenerating}
              >
                Générer (sans sauvegarder)
              </Button>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* ── Historique ── */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Historique des bulletins</Card.Title>
          <Card.Description>
            Bulletins sauvegardés pour {selectedContract?.employee
              ? `${selectedContract.employee.firstName} ${selectedContract.employee.lastName}`
              : 'cet employé'}
          </Card.Description>
        </Card.Header>
        <Card.Body>
          {isLoadingHistory ? (
            <Center py={6}>
              <Spinner />
            </Center>
          ) : history.length === 0 ? (
            <Text color="gray.500" textAlign="center" py={4}>
              Aucun bulletin sauvegardé pour le moment
            </Text>
          ) : (
            <Box overflowX="auto">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Période</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Brut</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Net à payer</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Heures</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">PAS</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">Généré le</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">Actions</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {history.map((p) => (
                    <Table.Row key={p.id}>
                      <Table.Cell>
                        <Badge colorPalette="blue" variant="subtle">{p.periodLabel}</Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="right" fontWeight="medium">
                        {p.grossPay.toFixed(2).replace('.', ',')} €
                      </Table.Cell>
                      <Table.Cell textAlign="right" color="green.600" fontWeight="bold">
                        {p.netPay.toFixed(2).replace('.', ',')} €
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        {p.totalHours.toFixed(2).replace('.', ',')} h
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        {(p.pasRate * 100).toFixed(2)} %
                      </Table.Cell>
                      <Table.Cell textAlign="center" fontSize="xs" color="gray.600">
                        {p.generatedAt.toLocaleDateString('fr-FR')}
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <HStack gap={1} justify="center">
                          {p.storagePath && (
                            <IconButton
                              aria-label="Télécharger"
                              size="xs"
                              variant="ghost"
                              colorPalette="brand"
                              title="Télécharger le PDF"
                              onClick={() => handleReDownload(p)}
                            >
                              ↓
                            </IconButton>
                          )}
                          <IconButton
                            aria-label="Supprimer"
                            size="xs"
                            variant="ghost"
                            colorPalette="red"
                            title="Supprimer ce bulletin"
                            onClick={() => handleDelete(p.id)}
                          >
                            ✕
                          </IconButton>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
