/**
 * Section de gestion des absences — toolbar filtres + tableau
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
import { updateAbsenceStatus } from '@/services/absenceService'
import { getJustificationSignedUrl } from '@/services/absenceJustificationService'
import { logger } from '@/lib/logger'
import { toaster } from '@/lib/toaster'
import {
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_COLORS,
  ABSENCE_STATUS_LABELS as STATUS_LABELS,
  ABSENCE_STATUS_COLORS as STATUS_COLORS,
} from '@/lib/constants/statusMaps'
import type { AbsenceType } from '@/types'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

interface DocumentManagementSectionProps {
  employerId: string
}

export function DocumentManagementSection({ employerId }: DocumentManagementSectionProps) {
  const [documents, setDocuments] = useState<DocumentWithEmployee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Filtres
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('')
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterJustification, setFilterJustification] = useState<string>('')

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

  // Liste unique des employés pour le filtre
  const employeeOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const doc of documents) {
      if (!seen.has(doc.employee.id)) {
        seen.set(doc.employee.id, `${doc.employee.firstName} ${doc.employee.lastName}`)
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name }))
  }, [documents])

  // Options mois (basées sur les données existantes)
  const monthOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const doc of documents) {
      const d = doc.absence.startDate
      seen.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return Array.from(seen)
      .sort()
      .reverse()
      .map((key) => {
        const [year, month] = key.split('-')
        return { value: key, label: `${MONTHS_FR[parseInt(month, 10) - 1]} ${year}` }
      })
  }, [documents])

  // Filtrage combiné
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (filterEmployeeId && doc.employee.id !== filterEmployeeId) return false

      if (filterMonth) {
        const d = doc.absence.startDate
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key !== filterMonth) return false
      }

      if (filterType && doc.absence.absenceType !== filterType) return false
      if (filterStatus && doc.absence.status !== filterStatus) return false

      if (filterJustification === 'with' && !doc.absence.justificationUrl) return false
      if (filterJustification === 'without' && doc.absence.justificationUrl) return false

      return true
    })
  }, [documents, filterEmployeeId, filterMonth, filterType, filterStatus, filterJustification])

  const activeFilterCount = [filterEmployeeId, filterMonth, filterType, filterStatus, filterJustification]
    .filter(Boolean).length

  const resetFilters = () => {
    setFilterEmployeeId('')
    setFilterMonth('')
    setFilterType('')
    setFilterStatus('')
    setFilterJustification('')
  }

  const handleStatusUpdate = async (absenceId: string, status: 'approved' | 'rejected') => {
    setProcessingId(absenceId)
    try {
      await updateAbsenceStatus(absenceId, status)
      await loadDocuments()
      toaster.create({
        title: status === 'approved' ? 'Absence approuvée' : 'Absence refusée',
        type: status === 'approved' ? 'success' : 'info',
      })
    } catch (err) {
      logger.error('Erreur mise à jour statut:', err)
      toaster.create({
        title: 'Erreur',
        description: 'Erreur lors de la mise à jour du statut',
        type: 'error',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const openJustification = async (url: string) => {
    try {
      // Extraire le chemin storage depuis une ancienne URL publique ou un path direct
      let storagePath = url
      const publicMarker = '/storage/v1/object/public/justifications/'
      const idx = url.indexOf(publicMarker)
      if (idx !== -1) {
        storagePath = url.substring(idx + publicMarker.length)
      }

      const signedUrl = await getJustificationSignedUrl(storagePath)
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer')
      } else {
        toaster.create({ title: 'Impossible de télécharger le justificatif', type: 'error' })
      }
    } catch (err) {
      logger.error('Erreur ouverture justificatif:', err)
      toaster.create({ title: 'Impossible de télécharger le justificatif', type: 'error' })
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
      {/* Toolbar filtres */}
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <HStack gap={2} flexWrap="wrap">
          {/* Filtre employé */}
          <NativeSelect.Root size="sm" width="auto" minW="160px">
            <NativeSelect.Field
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              aria-label="Filtrer par employé"
            >
              <option value="">Tous les employés</option>
              {employeeOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>

          {/* Filtre mois */}
          <NativeSelect.Root size="sm" width="auto" minW="150px">
            <NativeSelect.Field
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              aria-label="Filtrer par mois"
            >
              <option value="">Tous les mois</option>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>

          {/* Filtre type */}
          <NativeSelect.Root size="sm" width="auto" minW="140px">
            <NativeSelect.Field
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Filtrer par type"
            >
              <option value="">Tous les types</option>
              {(Object.entries(ABSENCE_TYPE_LABELS) as [AbsenceType, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>

          {/* Filtre statut */}
          <NativeSelect.Root size="sm" width="auto" minW="130px">
            <NativeSelect.Field
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filtrer par statut"
            >
              <option value="">Tous les statuts</option>
              {(Object.entries(STATUS_LABELS) as [string, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>

          {/* Filtre justificatif */}
          <NativeSelect.Root size="sm" width="auto" minW="140px">
            <NativeSelect.Field
              value={filterJustification}
              onChange={(e) => setFilterJustification(e.target.value)}
              aria-label="Filtrer par justificatif"
            >
              <option value="">Justificatif</option>
              <option value="with">Avec justificatif</option>
              <option value="without">Sans justificatif</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </HStack>

        <HStack gap={2}>
          {activeFilterCount > 0 && (
            <Button size="xs" variant="ghost" onClick={resetFilters}>
              Réinitialiser ({activeFilterCount})
            </Button>
          )}
          <Text fontSize="sm" color="text.muted">
            {filteredDocuments.length} absence{filteredDocuments.length !== 1 ? 's' : ''}
            {activeFilterCount > 0 && ` sur ${documents.length}`}
          </Text>
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
              {activeFilterCount > 0
                ? 'Aucune absence ne correspond aux filtres sélectionnés.'
                : 'Les absences (congés, arrêts maladie) apparaîtront ici.'}
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
