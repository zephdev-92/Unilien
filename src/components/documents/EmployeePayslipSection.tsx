/**
 * Vue employé des bulletins de paie (lecture seule).
 * L'employé voit ses propres bulletins uploadés par son employeur
 * via CESU déclaratif. Accès protégé par RLS (`payslips_employee_select`).
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Alert,
  Spinner,
  Center,
  Table,
  IconButton,
  NativeSelect,
  EmptyState,
} from '@chakra-ui/react'
import { toaster } from '@/lib/toaster'
import { getPayslipsForEmployee, getPayslipSignedUrl } from '@/services/payslipStorageService'
import { MONTHS_FR } from '@/lib/export/types'
import type { Payslip } from '@/types'

interface Props {
  employeeId: string
}

function formatUploadDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function periodLabelFor(year: number, month: number): string {
  return `${MONTHS_FR[month - 1]} ${year}`
}

export function EmployeePayslipSection({ employeeId }: Props) {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterYear, setFilterYear] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    getPayslipsForEmployee(employeeId)
      .then((list) => {
        if (!cancelled) setPayslips(list)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [employeeId])

  const yearOptions = useMemo(() => {
    const years = new Set<number>()
    for (const p of payslips) years.add(p.year)
    return Array.from(years).sort((a, b) => b - a)
  }, [payslips])

  const filteredPayslips = useMemo(() => {
    if (!filterYear) return payslips
    const y = Number(filterYear)
    return payslips.filter((p) => p.year === y)
  }, [payslips, filterYear])

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

  if (isLoading) {
    return (
      <Center py={8}>
        <Spinner size="lg" color="brand.500" />
      </Center>
    )
  }

  if (payslips.length === 0) {
    return (
      <Alert.Root status="info">
        <Alert.Indicator />
        <Alert.Title>
          Aucun bulletin disponible pour l'instant. Votre employeur vous les transmet depuis le
          portail CESU.
        </Alert.Title>
      </Alert.Root>
    )
  }

  return (
    <VStack gap={4} align="stretch">
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Text fontSize="sm" color="text.muted">
          {payslips.length} bulletin{payslips.length > 1 ? 's' : ''} archivé
          {payslips.length > 1 ? 's' : ''}
        </Text>

        {yearOptions.length > 1 && (
          <NativeSelect.Root size="sm" width="auto" minW="140px">
            <NativeSelect.Field
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              aria-label="Filtrer par année"
            >
              <option value="">Toutes les années</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        )}
      </HStack>

      {filteredPayslips.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>Aucun bulletin pour cette année</EmptyState.Title>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Période</Table.ColumnHeader>
                <Table.ColumnHeader>Reçu le</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Télécharger</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredPayslips.map((p) => (
                <Table.Row key={p.id}>
                  <Table.Cell>
                    <Text fontSize="sm" fontWeight="medium">
                      {periodLabelFor(p.year, p.month)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="text.muted">
                      {formatUploadDate(p.generatedAt)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    {p.storagePath ? (
                      <IconButton
                        aria-label="Télécharger le bulletin"
                        size="xs"
                        variant="ghost"
                        colorPalette="brand"
                        title="Télécharger le PDF"
                        onClick={() => handleDownload(p)}
                      >
                        ↓
                      </IconButton>
                    ) : (
                      <Text fontSize="xs" color="text.muted">
                        —
                      </Text>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </VStack>
  )
}
