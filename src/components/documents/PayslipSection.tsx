/**
 * Section "Bulletins de paie" de la page Documents (vue employeur).
 *
 * Workflow :
 *  1. L'URSSAF (CESU déclaratif) envoie le bulletin officiel à l'employeur.
 *  2. L'employeur upload le PDF reçu, rattaché à un couple employé × mois.
 *  3. L'app archive le fichier (bucket "payslips") et affiche l'historique.
 *
 * La génération PDF côté app a été abandonnée : voir historique git.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Box,
  VStack,
  HStack,
  Flex,
  Text,
  Button,
  Alert,
  Spinner,
  Center,
  Table,
  IconButton,
  NativeSelect,
  Field,
  EmptyState,
  Dialog,
  CloseButton,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { toaster } from '@/lib/toaster'
import { getContractsForEmployer, type ContractWithEmployee } from '@/services/contractService'
import {
  uploadExternalPayslip,
  validatePayslipFile,
  getPayslipSignedUrl,
  getPayslipsHistory,
  deletePayslipRecord,
} from '@/services/payslipStorageService'
import { MONTHS_FR } from '@/lib/export/types'
import { logger } from '@/lib/logger'
import type { Payslip } from '@/types'

interface Props {
  employerId: string
}

function formatUploadDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function periodLabelFor(year: number, month: number): string {
  return `${MONTHS_FR[month - 1]} ${year}`
}

export function PayslipSection({ employerId }: Props) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Par défaut : mois précédent (bulletin du mois écoulé)
  const defaultMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const defaultYear = currentMonth === 1 ? currentYear - 1 : currentYear

  // ── Contrats actifs (employés employer)
  const [contracts, setContracts] = useState<ContractWithEmployee[]>([])
  const [selectedContractId, setSelectedContractId] = useState<string>('')

  // ── Formulaire d'upload
  const [selectedYear, setSelectedYear] = useState(defaultYear)
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // ── États UI
  const [isUploading, setIsUploading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  // ── Historique
  const [allPayslips, setAllPayslips] = useState<Payslip[]>([])
  const [isLoadingAll, setIsLoadingAll] = useState(false)

  // ── Filtres toolbar
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('')
  const [filterPeriod, setFilterPeriod] = useState<string>('')

  const years = [currentYear, currentYear - 1, currentYear - 2]

  useEffect(() => {
    getContractsForEmployer(employerId).then((list) => {
      const employmentContracts = list.filter((c) => c.contractCategory === 'employment')
      setContracts(employmentContracts)
      if (employmentContracts.length > 0) {
        setSelectedContractId(employmentContracts[0].id)
      }
    })
  }, [employerId])

  const loadAllPayslips = useCallback(async () => {
    setIsLoadingAll(true)
    const list = await getPayslipsHistory(employerId)
    setAllPayslips(list)
    setIsLoadingAll(false)
  }, [employerId])

  useEffect(() => {
    loadAllPayslips()
  }, [loadAllPayslips])

  const getEmployeeName = (employeeId: string): string => {
    const contract = contracts.find((c) => c.employeeId === employeeId)
    if (contract?.employee) {
      return `${contract.employee.firstName} ${contract.employee.lastName}`
    }
    return 'Employé inconnu'
  }

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

  const periodFilterOptions = useMemo(() => {
    const periods = new Set<string>()
    for (const p of allPayslips) {
      periods.add(periodLabelFor(p.year, p.month))
    }
    return Array.from(periods)
  }, [allPayslips])

  const filteredPayslips = useMemo(() => {
    let result = allPayslips
    if (filterEmployeeId) {
      result = result.filter((p) => p.employeeId === filterEmployeeId)
    }
    if (filterPeriod) {
      result = result.filter((p) => periodLabelFor(p.year, p.month) === filterPeriod)
    }
    return result
  }, [allPayslips, filterEmployeeId, filterPeriod])

  const selectedContract = contracts.find((c) => c.id === selectedContractId)

  const resetDialog = () => {
    setSelectedFile(null)
    setFileError(null)
    setDialogError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setFileError(null)
    if (!file) {
      setSelectedFile(null)
      return
    }
    const validation = validatePayslipFile(file)
    if (!validation.valid) {
      setFileError(validation.error ?? 'Fichier invalide.')
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setSelectedFile(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!selectedContract || !selectedFile) return

    setIsUploading(true)
    setDialogError(null)

    try {
      const result = await uploadExternalPayslip({
        employerId,
        employeeId: selectedContract.employeeId,
        contractId: selectedContract.id,
        year: selectedYear,
        month: selectedMonth,
        file: selectedFile,
      })

      if (!result.success) {
        setDialogError(result.error ?? 'Échec de l\'upload.')
        return
      }

      await loadAllPayslips()

      const employeeName = selectedContract.employee
        ? `${selectedContract.employee.firstName} ${selectedContract.employee.lastName}`
        : 'Employé'
      toaster.create({
        title: 'Bulletin uploadé',
        description: `${employeeName} — ${periodLabelFor(selectedYear, selectedMonth)}`,
        type: 'success',
      })

      setShowUploadDialog(false)
      resetDialog()
    } catch (err) {
      logger.error('Erreur upload bulletin:', err)
      setDialogError('Une erreur est survenue lors de l\'upload.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (payslip: Payslip) => {
    if (!payslip.storagePath) return
    const url = await getPayslipSignedUrl(payslip.storagePath)
    if (!url) {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible de générer le lien de téléchargement.',
        type: 'error',
      })
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = `bulletin_${payslip.year}-${String(payslip.month).padStart(2, '0')}.pdf`
    a.click()
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
        <Alert.Title>Aucun contrat d'emploi actif : rien à uploader pour l'instant.</Alert.Title>
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
              aria-label="Filtrer par employé"
            >
              <option value="">Tous les employés</option>
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
              aria-label="Filtrer par période"
            >
              <option value="">Toutes les périodes</option>
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
            resetDialog()
            setShowUploadDialog(true)
          }}
        >
          Uploader un bulletin
        </Button>
      </HStack>

      <Text fontSize="xs" color="text.muted">
        Uploadez le bulletin officiel reçu de l'URSSAF (CESU déclaratif). PDF uniquement, 5 Mo max.
      </Text>

      {/* ── Historique ── */}
      {isLoadingAll ? (
        <Center py={6}>
          <Spinner />
        </Center>
      ) : filteredPayslips.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>Aucun bulletin archivé</EmptyState.Title>
            <EmptyState.Description>
              Les bulletins uploadés apparaîtront ici.
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Employé</Table.ColumnHeader>
                <Table.ColumnHeader>Période</Table.ColumnHeader>
                <Table.ColumnHeader>Uploadé le</Table.ColumnHeader>
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
                    <Text fontSize="sm">{periodLabelFor(p.year, p.month)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="text.muted">
                      {formatUploadDate(p.generatedAt)}
                    </Text>
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
                          onClick={() => handleDownload(p)}
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

      {/* ── Dialog d'upload ── */}
      <Dialog.Root
        open={showUploadDialog}
        onOpenChange={(e) => {
          setShowUploadDialog(e.open)
          if (!e.open) resetDialog()
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="lg">
            <Dialog.Header>
              <Dialog.Title>Uploader un bulletin de paie</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={5} align="stretch">
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
                            : `Contrat ${c.contractType}`}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>

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

                <Box>
                  <Text fontWeight="medium" fontSize="md" mb={2}>
                    Fichier PDF <Text as="span" color="red.500">*</Text>
                  </Text>
                  <Box
                    borderWidth="2px"
                    borderStyle="dashed"
                    borderColor={fileError ? 'red.500' : selectedFile ? 'green.300' : 'border.default'}
                    borderRadius="12px"
                    p={4}
                    bg={fileError ? 'red.50' : selectedFile ? 'accent.subtle' : 'bg.page'}
                    transition="all 0.2s"
                  >
                    {!selectedFile ? (
                      <Flex direction="column" align="center" gap={2}>
                        <Text fontSize="sm" color="text.muted" textAlign="center">
                          Joignez le bulletin officiel URSSAF (PDF, max 5 Mo)
                        </Text>
                        <AccessibleButton
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          accessibleLabel="Sélectionner un bulletin"
                        >
                          Parcourir...
                        </AccessibleButton>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                          aria-label="Sélectionner un bulletin de paie"
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
                            <Text fontSize="sm" fontWeight="medium" color="text.default">{selectedFile.name}</Text>
                            <Text fontSize="xs" color="text.muted">{(selectedFile.size / 1024 / 1024).toFixed(2)} Mo</Text>
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
                  {fileError && <Text fontSize="sm" color="red.600" mt={2}>{fileError}</Text>}
                </Box>

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
                  onClick={() => {
                    setShowUploadDialog(false)
                    resetDialog()
                  }}
                >
                  Annuler
                </Button>
                <Button
                  colorPalette="brand"
                  flex={1}
                  onClick={handleUpload}
                  loading={isUploading}
                  loadingText="Upload…"
                  disabled={!selectedFile || !selectedContract || isUploading}
                >
                  Uploader
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  )
}
