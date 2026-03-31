/**
 * Section de gestion des absences — format toolbar + tableau unique
 * Alignee sur le prototype : toolbar (filtre employe) + data-table
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Center,
  Alert,
  Button,
  EmptyState,
  Box,
  Table,
  NativeSelect,
} from '@chakra-ui/react'
import { format, differenceInCalendarDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  getDocumentsForEmployer,
  type DocumentWithEmployee,
} from '@/services/documentService'
import { updateAbsenceStatus, getJustificationSignedUrl } from '@/services/absenceService'
import { logger } from '@/lib/logger'
import { toaster } from '@/lib/toaster'
import {
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_COLORS,
  ABSENCE_STATUS_LABELS as STATUS_LABELS,
  ABSENCE_STATUS_COLORS as STATUS_COLORS,
} from '@/lib/constants/statusMaps'

interface DocumentManagementSectionProps {
  employerId: string
}

export function DocumentManagementSection({ employerId }: DocumentManagementSectionProps) {
  const [documents, setDocuments] = useState<DocumentWithEmployee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('')

  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const docs = await getDocumentsForEmployer(employerId)
      setDocuments(docs)
    } catch (err) {
      logger.error('Erreur chargement documents:', err)
      setError('Erreur lors du chargement des documents')
    } finally {
      setIsLoading(false)
    }
  }, [employerId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Liste unique des employes pour le filtre
  const employeeOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const doc of documents) {
      if (!seen.has(doc.employee.id)) {
        seen.set(doc.employee.id, `${doc.employee.firstName} ${doc.employee.lastName}`)
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name }))
  }, [documents])

  // Filtrage par employe
  const filteredDocuments = filterEmployeeId
    ? documents.filter((doc) => doc.employee.id === filterEmployeeId)
    : documents

  const handleStatusUpdate = async (absenceId: string, status: 'approved' | 'rejected') => {
    setProcessingId(absenceId)
    try {
      await updateAbsenceStatus(absenceId, status)
      await loadDocuments()
      toaster.create({
        title: status === 'approved' ? 'Absence approuvee' : 'Absence refusee',
        type: status === 'approved' ? 'success' : 'info',
      })
    } catch (err) {
      logger.error('Erreur mise a jour statut:', err)
      toaster.create({
        title: 'Erreur',
        description: 'Erreur lors de la mise a jour du statut',
        type: 'error',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const openJustification = async (storagePath: string) => {
    // Si c'est déjà une URL complète (anciens enregistrements), l'ouvrir directement
    if (storagePath.startsWith('http')) {
      window.open(storagePath, '_blank', 'noopener,noreferrer')
      return
    }
    // Sinon générer une URL signée depuis le storage path
    const signedUrl = await getJustificationSignedUrl(storagePath)
    if (signedUrl) {
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } else {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible de telecharger le justificatif',
        type: 'error',
      })
    }
  }

  if (isLoading) {
    return (
      <Center py={8}>
        <Spinner size="lg" color="brand.500" />
      </Center>
    )
  }

  return (
    <VStack gap={4} align="stretch">
      {/* Toolbar */}
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <HStack gap={3}>
          <NativeSelect.Root size="sm" width="auto" minW="180px">
            <NativeSelect.Field
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              aria-label="Filtrer par employe"
            >
              <option value="">Tous les employes</option>
              {employeeOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </HStack>
      </HStack>

      {/* Message d'erreur */}
      {error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      {/* Tableau */}
      {filteredDocuments.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Title>Aucune absence</EmptyState.Title>
            <EmptyState.Description>
              Les absences (conges, arrets maladie) apparaitront ici.
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Employe</Table.ColumnHeader>
                <Table.ColumnHeader>Type</Table.ColumnHeader>
                <Table.ColumnHeader>Du</Table.ColumnHeader>
                <Table.ColumnHeader>Au</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Duree</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Statut</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredDocuments.map((doc) => {
                const { absence, employee } = doc
                const isPending = absence.status === 'pending'
                const days = differenceInCalendarDays(absence.endDate, absence.startDate) + 1

                return (
                  <Table.Row key={absence.id}>
                    <Table.Cell>
                      <Text fontWeight="medium" fontSize="sm">
                        {employee.firstName} {employee.lastName}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={ABSENCE_TYPE_COLORS[absence.absenceType]} variant="subtle" size="sm">
                        {ABSENCE_TYPE_LABELS[absence.absenceType]}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">
                        {format(absence.startDate, 'd MMM yyyy', { locale: fr })}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">
                        {format(absence.endDate, 'd MMM yyyy', { locale: fr })}
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Text fontSize="sm">
                        {days} j
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Badge colorPalette={STATUS_COLORS[absence.status]} variant="subtle" size="sm">
                        {STATUS_LABELS[absence.status]}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <HStack gap={1} justify="center" flexWrap="wrap">
                        {absence.justificationUrl && (
                          <Button
                            size="xs"
                            variant="ghost"
                            colorPalette="brand"
                            onClick={() => openJustification(absence.justificationUrl!)}
                          >
                            Justificatif
                          </Button>
                        )}
                        {isPending && (
                          <>
                            <Button
                              size="xs"
                              colorPalette="green"
                              onClick={() => handleStatusUpdate(absence.id, 'approved')}
                              loading={processingId === absence.id}
                              disabled={processingId === absence.id}
                            >
                              Approuver
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette="red"
                              onClick={() => handleStatusUpdate(absence.id, 'rejected')}
                              loading={processingId === absence.id}
                              disabled={processingId === absence.id}
                            >
                              Refuser
                            </Button>
                          </>
                        )}
                        {!isPending && !absence.justificationUrl && (
                          <Text fontSize="xs" color="text.muted">—</Text>
                        )}
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </VStack>
  )
}

export default DocumentManagementSection
