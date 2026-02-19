/**
 * Modal de génération de bulletin de paie PDF
 * Convention Collective IDCC 3239 — barèmes 2025
 */

import { useState } from 'react'
import {
  Dialog,
  VStack,
  HStack,
  Text,
  Button,
  Field,
  NativeSelect,
  Alert,
  Checkbox,
  Box,
} from '@chakra-ui/react'
import { getPayslipData, generatePayslipPdf, downloadExport } from '@/lib/export'
import { MONTHS_FR } from '@/lib/export/types'
import { logger } from '@/lib/logger'

export interface PayslipEmployee {
  id: string
  firstName: string
  lastName: string
  pasRate?: number
}

interface PayslipGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  employerId: string
  employees: PayslipEmployee[]
}

export function PayslipGeneratorModal({
  isOpen,
  onClose,
  employerId,
  employees,
}: PayslipGeneratorModalProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    employees[0]?.id ?? ''
  )
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [isExemptPatronalSS, setIsExemptPatronalSS] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const years = [currentYear - 1, currentYear]

  const handleGenerate = async () => {
    if (!selectedEmployeeId) return
    setIsGenerating(true)
    setError(null)

    try {
      const employee = employees.find(e => e.id === selectedEmployeeId)
      const pasRate = employee?.pasRate ?? 0

      const data = await getPayslipData(
        employerId,
        selectedEmployeeId,
        selectedYear,
        selectedMonth,
        pasRate,
        isExemptPatronalSS
      )

      if (!data) {
        setError('Aucune intervention trouvée pour cette période. Vérifiez que des shifts existent pour cet employé ce mois-ci.')
        return
      }

      const result = generatePayslipPdf(data)
      if (!result.success) {
        setError(result.error ?? 'Erreur lors de la génération du PDF.')
        return
      }

      downloadExport(result)
      onClose()
    } catch (err) {
      logger.error('Erreur génération bulletin de paie:', err)
      setError('Une erreur inattendue est survenue.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => { if (!details.open) onClose() }}
      size="sm"
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Générer un bulletin de paie</Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>

          <Dialog.Body>
            <VStack gap={4} align="stretch">
              {error && (
                <Alert.Root status="error">
                  <Alert.Indicator />
                  <Alert.Title>{error}</Alert.Title>
                </Alert.Root>
              )}

              <Field.Root>
                <Field.Label>Employé</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              <HStack gap={3}>
                <Field.Root flex={1}>
                  <Field.Label>Mois</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    >
                      {MONTHS_FR.map((label, i) => (
                        <option key={i + 1} value={i + 1}>
                          {label}
                        </option>
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

              {/* Exonération cotisations patronales SS */}
              <Box
                borderWidth="1px"
                borderColor="orange.200"
                borderRadius="md"
                p={3}
                bg="orange.50"
              >
                <Checkbox.Root
                  checked={isExemptPatronalSS}
                  onCheckedChange={(details) => setIsExemptPatronalSS(!!details.checked)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    <Text fontSize="sm" fontWeight="medium">
                      Exonération cotisations patronales SS
                    </Text>
                  </Checkbox.Label>
                </Checkbox.Root>
                <Text fontSize="xs" color="orange.700" mt={1} ml={6}>
                  Employeur invalide ≥80%, ≥60 ans avec tierce personne, MTP ou PCTP —
                  Art. L241-10 CSS. Les cotisations Maladie, Vieillesse et Alloc. familiales
                  sont exonérées. Restent dues : AGIRC-ARRCO, chômage, FNAL, CSA, AT/MP.
                </Text>
              </Box>

              <Text fontSize="xs" color="gray.500" lineHeight="1.5">
                Le bulletin est généré à titre indicatif selon les taux IDCC 3239 (barèmes 2025).
                Le taux PAS est celui renseigné sur le contrat (0% par défaut).
              </Text>
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack gap={3}>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isGenerating}
              >
                Annuler
              </Button>
              <Button
                onClick={handleGenerate}
                loading={isGenerating}
                disabled={!selectedEmployeeId || employees.length === 0}
                style={{ backgroundColor: '#4E6478', color: 'white' }}
              >
                Télécharger le PDF
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
