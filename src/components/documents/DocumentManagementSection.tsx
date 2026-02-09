/**
 * Section de gestion des documents (absences, justificatifs)
 */

import { useState, useEffect } from 'react'
import {
  VStack,
  HStack,
  Text,
  Card,
  Badge,
  Spinner,
  Center,
  Alert,
  Grid,
  Tabs,
  Button,
  EmptyState,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  getDocumentsForEmployer,
  getDocumentStatsForEmployer,
  type DocumentWithEmployee,
  type DocumentStats,
} from '@/services/documentService'
import { updateAbsenceStatus } from '@/services/absenceService'
import { logger } from '@/lib/logger'
import type { Absence } from '@/types'

// ============================================
// TYPES
// ============================================

interface DocumentManagementSectionProps {
  employerId: string
}

// ============================================
// CONSTANTS
// ============================================

const ABSENCE_TYPE_LABELS: Record<Absence['absenceType'], string> = {
  sick: 'Maladie',
  vacation: 'Congé',
  training: 'Formation',
  unavailable: 'Indisponibilité',
  emergency: 'Urgence',
}

const ABSENCE_TYPE_COLORS: Record<Absence['absenceType'], string> = {
  sick: 'red',
  vacation: 'blue',
  training: 'purple',
  unavailable: 'gray',
  emergency: 'orange',
}

const STATUS_LABELS: Record<Absence['status'], string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
}

const STATUS_COLORS: Record<Absence['status'], string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
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
  const loadDocuments = async () => {
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
  }

  useEffect(() => {
    loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employerId])

  // Filtrer les documents selon l'onglet actif
  const filteredDocuments = documents.filter((doc) => {
    switch (activeTab) {
      case 'pending':
        return doc.absence.status === 'pending'
      case 'justifications':
        return !!doc.absence.justificationUrl
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
          <Tabs.Trigger value="justifications">
            Justificatifs ({stats?.withJustification || 0})
          </Tabs.Trigger>
          <Tabs.Trigger value="approved">
            Approuvées ({stats?.approvedAbsences || 0})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value={activeTab} pt={4}>
          {filteredDocuments.length === 0 ? (
            <EmptyState.Root>
              <EmptyState.Content>
                <EmptyState.Title>Aucun document</EmptyState.Title>
                <EmptyState.Description>
                  {activeTab === 'pending'
                    ? 'Aucune absence en attente de validation'
                    : activeTab === 'justifications'
                    ? 'Aucun justificatif disponible'
                    : 'Aucune absence enregistrée pour vos employés'}
                </EmptyState.Description>
              </EmptyState.Content>
            </EmptyState.Root>
          ) : (
            <VStack gap={3} align="stretch">
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.absence.id}
                  document={doc}
                  onApprove={() => handleStatusUpdate(doc.absence.id, 'approved')}
                  onReject={() => handleStatusUpdate(doc.absence.id, 'rejected')}
                  onViewJustification={() => doc.absence.justificationUrl && openJustification(doc.absence.justificationUrl)}
                  isProcessing={processingId === doc.absence.id}
                />
              ))}
            </VStack>
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

interface DocumentCardProps {
  document: DocumentWithEmployee
  onApprove: () => void
  onReject: () => void
  onViewJustification: () => void
  isProcessing: boolean
}

function DocumentCard({
  document,
  onApprove,
  onReject,
  onViewJustification,
  isProcessing,
}: DocumentCardProps) {
  const { absence, employee } = document
  const isPending = absence.status === 'pending'

  // Formater les dates
  const startDateStr = format(absence.startDate, 'd MMM yyyy', { locale: fr })
  const endDateStr = format(absence.endDate, 'd MMM yyyy', { locale: fr })
  const isSingleDay = startDateStr === endDateStr

  return (
    <Card.Root variant="outline">
      <Card.Body p={4}>
        <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
          {/* Informations principales */}
          <VStack align="start" gap={2} flex={1} minW="200px">
            <HStack gap={2} flexWrap="wrap">
              <Text fontWeight="semibold">
                {employee.firstName} {employee.lastName}
              </Text>
              <Badge colorPalette={ABSENCE_TYPE_COLORS[absence.absenceType]}>
                {ABSENCE_TYPE_LABELS[absence.absenceType]}
              </Badge>
              <Badge colorPalette={STATUS_COLORS[absence.status]}>
                {STATUS_LABELS[absence.status]}
              </Badge>
            </HStack>

            <Text fontSize="sm" color="gray.600">
              {isSingleDay ? startDateStr : `${startDateStr} - ${endDateStr}`}
            </Text>

            {absence.reason && (
              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                "{absence.reason}"
              </Text>
            )}

            <Text fontSize="xs" color="gray.400">
              Demandé le {format(absence.createdAt, 'd MMM yyyy à HH:mm', { locale: fr })}
            </Text>
          </VStack>

          {/* Actions */}
          <HStack gap={2} flexWrap="wrap">
            {absence.justificationUrl && (
              <Button
                size="sm"
                variant="outline"
                colorPalette="blue"
                onClick={onViewJustification}
              >
                Voir justificatif
              </Button>
            )}

            {isPending && (
              <>
                <Button
                  size="sm"
                  colorPalette="green"
                  onClick={onApprove}
                  loading={isProcessing}
                  disabled={isProcessing}
                >
                  Approuver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="red"
                  onClick={onReject}
                  loading={isProcessing}
                  disabled={isProcessing}
                >
                  Refuser
                </Button>
              </>
            )}
          </HStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

export default DocumentManagementSection
