/**
 * Section de gestion des absences — format tableau
 * Colonnes : Employé, Type, Du, Au, Durée, Statut, Actions
 */

import { useState, useEffect, useCallback } from 'react'
import {
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Center,
  Alert,
  Grid,
  Card,
  Tabs,
  Button,
  EmptyState,
  Box,
  Table,
} from '@chakra-ui/react'
import { format, differenceInCalendarDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  getDocumentsForEmployer,
  getDocumentStatsForEmployer,
  type DocumentWithEmployee,
  type DocumentStats,
} from '@/services/documentService'
import { updateAbsenceStatus } from '@/services/absenceService'
import { logger } from '@/lib/logger'
import {
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_COLORS,
  ABSENCE_STATUS_LABELS as STATUS_LABELS,
  ABSENCE_STATUS_COLORS as STATUS_COLORS,
} from '@/lib/constants/statusMaps'

// ============================================
// TYPES
// ============================================

interface DocumentManagementSectionProps {
  employerId: string
}

// ============================================
// COMPONENT
// ============================================

export function DocumentManagementSection({ employerId }: DocumentManagementSectionProps) {
  const [documents, setDocuments] = useState<DocumentWithEmployee[]>([])
  const [stats, setStats] = useState<DocumentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Charger les documents
  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [docs, docStats] = await Promise.all([
        getDocumentsForEmployer(employerId),
        getDocumentStatsForEmployer(employerId),
      ])
      setDocuments(docs)
      setStats(docStats)
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

  // Filtrer les documents selon l'onglet actif
  const filteredDocuments = documents.filter((doc) => {
    switch (activeTab) {
      case 'pending':
        return doc.absence.status === 'pending'
      case 'approved':
        return doc.absence.status === 'approved'
      case 'rejected':
        return doc.absence.status === 'rejected'
      default:
        return true
    }
  })

  // Gérer l'approbation/refus d'une absence
  const handleStatusUpdate = async (absenceId: string, status: 'approved' | 'rejected') => {
    setProcessingId(absenceId)
    try {
      await updateAbsenceStatus(absenceId, status)
      await loadDocuments()
    } catch (err) {
      logger.error('Erreur mise à jour statut:', err)
      setError('Erreur lors de la mise à jour du statut')
    } finally {
      setProcessingId(null)
    }
  }

  // Ouvrir un justificatif
  const openJustification = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (isLoading) {
    return (
      <Center py={8}>
        <Spinner size="lg" color="brand.500" />
      </Center>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Statistiques */}
      {stats && (
        <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={4}>
          <StatCard
            label="Total absences"
            value={stats.totalAbsences}
            colorScheme="gray"
          />
          <StatCard
            label="En attente"
            value={stats.pendingAbsences}
            colorScheme="yellow"
          />
          <StatCard
            label="Approuvées"
            value={stats.approvedAbsences}
            colorScheme="green"
          />
          <StatCard
            label="Justificatifs"
            value={stats.withJustification}
            colorScheme="blue"
          />
        </Grid>
      )}

      {/* Message d'erreur */}
      {error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      {/* Onglets de filtrage */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(e) => setActiveTab(e.value)}
        variant="enclosed"
      >
        <Tabs.List>
          <Tabs.Trigger value="all">
            Tous ({documents.length})
          </Tabs.Trigger>
          <Tabs.Trigger value="pending">
            En attente ({stats?.pendingAbsences || 0})
          </Tabs.Trigger>
          <Tabs.Trigger value="approved">
            Approuvées ({stats?.approvedAbsences || 0})
          </Tabs.Trigger>
          <Tabs.Trigger value="rejected">
            Refusées ({stats?.rejectedAbsences || 0})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value={activeTab} pt={4}>
          {filteredDocuments.length === 0 ? (
            <EmptyState.Root>
              <EmptyState.Content>
                <EmptyState.Title>Aucune absence</EmptyState.Title>
                <EmptyState.Description>
                  {activeTab === 'pending'
                    ? 'Aucune absence en attente de validation'
                    : activeTab === 'approved'
                    ? 'Aucune absence approuvée'
                    : activeTab === 'rejected'
                    ? 'Aucune absence refusée'
                    : 'Aucune absence enregistrée pour vos employés'}
                </EmptyState.Description>
              </EmptyState.Content>
            </EmptyState.Root>
          ) : (
            <Box overflowX="auto">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Employé</Table.ColumnHeader>
                    <Table.ColumnHeader>Type</Table.ColumnHeader>
                    <Table.ColumnHeader>Du</Table.ColumnHeader>
                    <Table.ColumnHeader>Au</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">Durée</Table.ColumnHeader>
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
                                colorPalette="blue"
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
                              <Text fontSize="xs" color="gray.400">—</Text>
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
        </Tabs.Content>
      </Tabs.Root>
    </VStack>
  )
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface StatCardProps {
  label: string
  value: number
  colorScheme: string
}

function StatCard({ label, value, colorScheme }: StatCardProps) {
  return (
    <Card.Root variant="outline">
      <Card.Body p={4}>
        <VStack gap={1}>
          <Text fontSize="2xl" fontWeight="bold" color={`${colorScheme}.600`}>
            {value}
          </Text>
          <Text fontSize="sm" color="gray.600">
            {label}
          </Text>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

export default DocumentManagementSection
