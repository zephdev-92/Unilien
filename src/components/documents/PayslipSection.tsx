/**
 * Section "Bulletins de paie" dans la page Documents.
 *
 * Structure (alignee sur le prototype) :
 *  1. Toolbar : filtres employe/periode a gauche, bouton "Generer" a droite
 *  2. Status-hint avec legende des pills
 *  3. Tableau recapitulatif (Employe, Periode, Heures, Net, Statut, Actions)
 *  4. Formulaire de generation dans un Dialog
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Alert,
  Spinner,
  Center,
  Table,
  IconButton,
  NativeSelect,
  Input,
  Field,
  EmptyState,
  Dialog,
  CloseButton,
} from '@chakra-ui/react'
import { toaster } from '@/lib/toaster'
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

  // ── Contrats actifs
  const [contracts, setContracts] = useState<ContractWithEmployee[]>([])
  const [selectedContractId, setSelectedContractId] = useState<string>('')

  // ── Periode
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  // ── Taux PAS
  const [pasRateInput, setPasRateInput] = useState('0')

  // ── Exemption patronale
  const [isExemptPatronal, setIsExemptPatronal] = useState(false)

  // ── Etats UI
  const [isGenerating, setIsGenerating] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)

  // ── Tous les bulletins (tableau recapitulatif)
  const [allPayslips, setAllPayslips] = useState<Payslip[]>([])
  const [isLoadingAll, setIsLoadingAll] = useState(false)

  // ── Filtres toolbar
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('')
  const [filterPeriod, setFilterPeriod] = useState<string>('')

  const years = [currentYear, currentYear - 1, currentYear - 2]

  // Charger les contrats au montage
  useEffect(() => {
    getContractsForEmployer(employerId).then((list) => {
      setContracts(list)
      if (list.length > 0) {
        setSelectedContractId(list[0].id)
        const rate = list[0].pasRate ?? 0
        setPasRateInput((rate * 100).toFixed(2))
      }
    })
  }, [employerId])

  // Mettre a jour le taux PAS quand le contrat change
  useEffect(() => {
    const contract = contracts.find((c) => c.id === selectedContractId)
    if (contract) {
      const rate = contract.pasRate ?? 0
      setPasRateInput((rate * 100).toFixed(2))
    }
  }, [selectedContractId, contracts])

  // Charger tous les bulletins
  const loadAllPayslips = useCallback(async () => {
    setIsLoadingAll(true)
    const list = await getPayslipsHistory(employerId)
    setAllPayslips(list)
    setIsLoadingAll(false)
  }, [employerId])

  useEffect(() => {
    loadAllPayslips()
  }, [loadAllPayslips])

  // ── Helpers

  const getEmployeeName = (employeeId: string): string => {
    const contract = contracts.find((c) => c.employeeId === employeeId)
    if (contract?.employee) {
      return `${contract.employee.firstName} ${contract.employee.lastName}`
    }
    return 'Employe inconnu'
  }

  // Options employes uniques pour le filtre
  const employeeFilterOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of allPayslips) {
      if (!seen.has(p.employeeId)) {
        seen.set(p.employeeId, getEmployeeName(p.employeeId))
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPayslips, contracts])

  // Periodes uniques pour le filtre
  const periodFilterOptions = useMemo(() => {
    const periods = new Set<string>()
    for (const p of allPayslips) {
      periods.add(p.periodLabel)
    }
    return Array.from(periods)
  }, [allPayslips])

  // Bulletins filtres
  const filteredPayslips = useMemo(() => {
    let result = allPayslips
    if (filterEmployeeId) {
      result = result.filter((p) => p.employeeId === filterEmployeeId)
    }
    if (filterPeriod) {
      result = result.filter((p) => p.periodLabel === filterPeriod)
    }
    return result
  }, [allPayslips, filterEmployeeId, filterPeriod])

  // ── Generation

  const selectedContract = contracts.find((c) => c.id === selectedContractId)
  const pasRateDecimal = Math.min(1, Math.max(0, parseFloat(pasRateInput || '0') / 100))

  const handleGenerate = async (saveToStorage: boolean) => {
    if (!selectedContract) return

    setIsGenerating(true)
    setDialogError(null)

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
        setDialogError('Aucune donnee trouvee pour cette periode')
        return
      }

      const result = generatePayslipPdf(payslipData)

      if (!result.success) {
        setDialogError(result.error ?? 'Erreur lors de la generation du PDF')
        return
      }

      downloadExport(result)

      const employeeName = selectedContract.employee
        ? `${selectedContract.employee.firstName} ${selectedContract.employee.lastName}`
        : 'Employe'
      const periodLabel = `${MONTHS_FR[selectedMonth - 1]} ${selectedYear}`

      if (saveToStorage) {
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

        await loadAllPayslips()
        toaster.create({
          title: 'Bulletin de paie',
          description: `${employeeName} — ${periodLabel} genere et sauvegarde`,
          type: 'success',
        })
      } else {
        toaster.create({
          title: 'Bulletin de paie',
          description: `${employeeName} — ${periodLabel} telecharge`,
          type: 'success',
        })
      }

      setShowGenerateDialog(false)
    } catch (err) {
      logger.error('Erreur generation bulletin:', err)
      setDialogError('Une erreur est survenue lors de la generation.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReDownload = async (payslip: Payslip) => {
    if (!payslip.storagePath) return
    const url = await getPayslipSignedUrl(payslip.storagePath)
    if (!url) {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible de generer le lien de telechargement.',
        type: 'error',
      })
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = `bulletin_${payslip.periodLabel.toLowerCase().replace(/\s+/g, '_')}.pdf`
    a.click()
    toaster.create({
      title: 'Bulletin de paie',
      description: `${payslip.periodLabel} telecharge`,
      type: 'success',
    })
  }

  const handleDelete = async (payslipId: string) => {
    await deletePayslipRecord(payslipId)
    await loadAllPayslips()
  }

  // ── Rendu

  if (contracts.length === 0) {
    return (
      <Alert.Root status="info">
        <Alert.Indicator />
        <Alert.Title>Aucun contrat actif trouve pour generer un bulletin.</Alert.Title>
      </Alert.Root>
    )
  }

  return (
    <VStack gap={4} align="stretch">
      {/* ── Toolbar ── */}
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <HStack gap={3} flexWrap="wrap">
          <NativeSelect.Root size="sm" width="auto" minW="180px">
            <NativeSelect.Field
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              aria-label="Filtrer par employe"
            >
              <option value="">Tous les employes</option>
              {employeeFilterOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>

          <NativeSelect.Root size="sm" width="auto" minW="160px">
            <NativeSelect.Field
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              aria-label="Filtrer par periode"
            >
              <option value="">Toutes les periodes</option>
              {periodFilterOptions.map((period) => (
                <option key={period} value={period}>{period}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </HStack>

        <Button
          size="sm"
          colorPalette="brand"
          onClick={() => {
            setDialogError(null)
            setShowGenerateDialog(true)
          }}
        >
          Generer un bulletin de paie
        </Button>
      </HStack>

      {/* ── Status hint ── */}
      <Text fontSize="xs" color="text.muted">
        <Badge colorPalette="green" variant="subtle" size="sm">Envoye</Badge>
        {' = bulletin deja transmis · '}
        <Badge colorPalette="orange" variant="subtle" size="sm">A envoyer</Badge>
        {' = a verifier avant l\'envoi.'}
      </Text>

      {/* ── Tableau recapitulatif ── */}
      {isLoadingAll ? (
        <Center py={6}>
          <Spinner />
        </Center>
      ) : filteredPayslips.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>Aucun bulletin</EmptyState.Title>
            <EmptyState.Description>
              Les bulletins apparaitront ici une fois generes.
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Employe</Table.ColumnHeader>
                <Table.ColumnHeader>Periode</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Heures</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Net a payer</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Statut</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredPayslips.map((p) => (
                <Table.Row key={p.id}>
                  <Table.Cell>
                    <Text fontWeight="medium" fontSize="sm">
                      {getEmployeeName(p.employeeId)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{p.periodLabel}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="sm">
                      {p.totalHours.toFixed(2).replace('.', ',')} h
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontWeight="bold" fontSize="sm">
                      {p.netPay.toFixed(2).replace('.', ',')} €
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <Badge
                      colorPalette={p.storagePath ? 'green' : 'orange'}
                      variant="subtle"
                      size="sm"
                    >
                      {p.storagePath ? 'Envoye' : 'A envoyer'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <HStack gap={1} justify="center">
                      {p.storagePath && (
                        <IconButton
                          aria-label="Telecharger"
                          size="xs"
                          variant="ghost"
                          colorPalette="brand"
                          title="Telecharger le PDF"
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

      {/* ── Dialog de generation ── */}
      <Dialog.Root open={showGenerateDialog} onOpenChange={(e) => setShowGenerateDialog(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="lg">
            <Dialog.Header>
              <Dialog.Title>Generer un bulletin de paie</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={5} align="stretch">
                {/* Employe */}
                <Field.Root>
                  <Field.Label>Employe</Field.Label>
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

                {/* Taux PAS */}
                <HStack gap={4} align="flex-end">
                  <Field.Root flex={1}>
                    <Field.Label>Taux PAS (%)</Field.Label>
                    <Field.HelperText>Pre-rempli depuis le contrat</Field.HelperText>
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
                    <Field.Label>Exoneration patronale SS</Field.Label>
                    <Field.HelperText>Art. L241-10 CSS</Field.HelperText>
                    <Button
                      size="sm"
                      variant={isExemptPatronal ? 'solid' : 'outline'}
                      colorPalette={isExemptPatronal ? 'green' : 'gray'}
                      onClick={() => setIsExemptPatronal((v) => !v)}
                      alignSelf="flex-start"
                      mt={1}
                    >
                      {isExemptPatronal ? 'Activee' : 'Desactivee'}
                    </Button>
                  </Field.Root>
                </HStack>

                {/* Messages */}
                {dialogError && (
                  <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Title>{dialogError}</Alert.Title>
                  </Alert.Root>
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={3} flexWrap="wrap" width="100%">
                <Button
                  variant="outline"
                  colorPalette="gray"
                  onClick={() => setShowGenerateDialog(false)}
                >
                  Annuler
                </Button>
                <Button
                  variant="outline"
                  colorPalette="brand"
                  flex={1}
                  onClick={() => handleGenerate(false)}
                  loading={isGenerating}
                  disabled={isGenerating}
                >
                  Generer (sans sauvegarder)
                </Button>
                <Button
                  colorPalette="brand"
                  flex={1}
                  onClick={() => handleGenerate(true)}
                  loading={isGenerating}
                  loadingText="Generation…"
                >
                  Generer et sauvegarder
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  )
}
