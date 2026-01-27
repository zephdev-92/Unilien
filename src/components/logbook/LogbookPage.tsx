import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { Box, Stack, Flex, Text, Center, Spinner, Badge } from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/dashboard'
import { AccessibleButton } from '@/components/ui'
import { LogEntryCard } from './LogEntryCard'
import { LogbookFilters } from './LogbookFilters'
import { NewLogEntryModal } from './NewLogEntryModal'
import {
  getLogEntries,
  markAsRead,
  deleteLogEntry,
  getUnreadCount,
  type LogEntryFilters,
  type LogEntryWithAuthor,
} from '@/services/logbookService'
import { supabase } from '@/lib/supabase/client'
import {
  getCaregiver,
  getCaregiverEmployerId,
} from '@/services/caregiverService'
import type { CaregiverPermissions } from '@/types'

const PAGE_SIZE = 20

export function LogbookPage() {
  const { profile, isAuthenticated, isLoading, isInitialized } = useAuth()

  const [entries, setEntries] = useState<LogEntryWithAuthor[]>([])
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [filters, setFilters] = useState<LogEntryFilters>({})
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false)

  // Caregiver-specific state
  const [resolvedEmployerId, setResolvedEmployerId] = useState<string | null>(null)
  const [caregiverPermissions, setCaregiverPermissions] = useState<CaregiverPermissions | null>(null)
  const [isResolvingEmployer, setIsResolvingEmployer] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  // Resolve employerId based on role
  useEffect(() => {
    async function resolveEmployer() {
      if (!profile) {
        setResolvedEmployerId(null)
        return
      }

      // Employer: use own id
      if (profile.role === 'employer') {
        setResolvedEmployerId(profile.id)
        return
      }

      // Employee: resolve employer from active contract
      if (profile.role === 'employee') {
        setIsResolvingEmployer(true)
        try {
          const { data } = await supabase
            .from('contracts')
            .select('employer_id')
            .eq('employee_id', profile.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()

          if (data) {
            setResolvedEmployerId(data.employer_id)
          } else {
            setAccessDenied(true)
          }
        } catch {
          setAccessDenied(true)
        } finally {
          setIsResolvingEmployer(false)
        }
        return
      }

      // Caregiver: resolve employer from caregiver record
      setIsResolvingEmployer(true)
      try {
        const caregiver = await getCaregiver(profile.id)

        if (!caregiver) {
          setAccessDenied(true)
          return
        }

        setCaregiverPermissions(caregiver.permissions)

        if (!caregiver.permissions.canViewLiaison) {
          setAccessDenied(true)
          return
        }

        const empId = await getCaregiverEmployerId(profile.id)
        setResolvedEmployerId(empId)
      } catch (error) {
        console.error('Erreur résolution employeur pour aidant:', error)
        setAccessDenied(true)
      } finally {
        setIsResolvingEmployer(false)
      }
    }

    if (profile && isInitialized) {
      resolveEmployer()
    }
  }, [profile, isInitialized])

  // Determine the actual employerId to use
  const employerId = resolvedEmployerId || ''

  const loadEntries = useCallback(async (resetPage = false) => {
    if (!profile || !resolvedEmployerId) return

    const targetPage = resetPage ? 1 : page
    if (resetPage) {
      setPage(1)
    }

    setIsLoadingEntries(true)
    try {
      const result = await getLogEntries(
        resolvedEmployerId,
        profile.id,
        profile.role,
        filters,
        targetPage,
        PAGE_SIZE
      )

      if (resetPage || targetPage === 1) {
        setEntries(result.entries)
      } else {
        setEntries((prev) => [...prev, ...result.entries])
      }

      setTotalCount(result.totalCount)
      setHasMore(result.hasMore)

      // Also update unread count
      const unread = await getUnreadCount(resolvedEmployerId, profile.id)
      setUnreadCount(unread)
    } catch (error) {
      console.error('Erreur chargement cahier de liaison:', error)
    } finally {
      setIsLoadingEntries(false)
    }
  }, [profile, resolvedEmployerId, filters, page])

  // Initial load and when filters change
  useEffect(() => {
    if (profile && isInitialized && resolvedEmployerId) {
      loadEntries(true)
    }
  }, [profile, isInitialized, filters, resolvedEmployerId, loadEntries])

  // Handle page changes for "load more"
  useEffect(() => {
    if (page > 1) {
      loadEntries(false)
    }
  }, [page, loadEntries])

  const handleFiltersChange = (newFilters: LogEntryFilters) => {
    setFilters(newFilters)
  }

  const handleMarkAsRead = async (entryId: string) => {
    if (!profile) return
    await markAsRead(entryId, profile.id)
    // Update local state
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, readBy: [...entry.readBy, profile.id] }
          : entry
      )
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleDelete = async (entryId: string) => {
    try {
      await deleteLogEntry(entryId)
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId))
      setTotalCount((prev) => prev - 1)
    } catch (error) {
      console.error('Erreur suppression entrée:', error)
    }
  }

  const handleLoadMore = () => {
    setPage((prev) => prev + 1)
  }

  const handleNewEntrySuccess = () => {
    loadEntries(true)
  }

  // Loading state
  if (!isInitialized || isLoading || isResolvingEmployer) {
    return (
      <Center minH="100vh">
        <Box textAlign="center">
          <Spinner size="xl" color="brand.500" borderWidth="4px" mb={4} />
          <Text fontSize="lg" color="gray.600">
            Chargement...
          </Text>
        </Box>
      </Center>
    )
  }

  // Not authenticated
  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" replace />
  }

  // Access denied for caregivers without permission
  if (accessDenied) {
    return (
      <DashboardLayout title="Cahier de liaison">
        <Box
          bg="orange.50"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="orange.200"
          p={8}
          textAlign="center"
        >
          <Text fontSize="xl" fontWeight="semibold" color="orange.800" mb={2}>
            Accès non autorisé
          </Text>
          <Text color="orange.700">
            {profile.role === 'caregiver'
              ? "Vous n'avez pas la permission d'accéder au cahier de liaison. Contactez votre proche pour qu'il vous accorde cet accès."
              : "Vous n'avez pas accès à ce cahier de liaison."}
          </Text>
        </Box>
      </DashboardLayout>
    )
  }

  // Check write permission
  // - Employers and employees can always write
  // - Caregivers need canWriteLiaison permission
  const canWrite =
    profile.role === 'employer' ||
    profile.role === 'employee' ||
    (profile.role === 'caregiver' && caregiverPermissions?.canWriteLiaison === true)

  return (
    <DashboardLayout title="Cahier de liaison">
      <Box>
        {/* Header with title and new entry button */}
        <Flex
          justify="space-between"
          align="center"
          mb={4}
          p={4}
          bg="white"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="gray.200"
          flexWrap="wrap"
          gap={3}
        >
          <Flex align="center" gap={3}>
            <Text fontSize="xl" fontWeight="semibold" color="gray.900">
              Cahier de liaison
            </Text>
            {unreadCount > 0 && (
              <Badge colorPalette="blue" size="md">
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </Flex>

          {canWrite && (
            <AccessibleButton
              colorPalette="blue"
              onClick={() => setIsNewEntryModalOpen(true)}
            >
              + Nouvelle note
            </AccessibleButton>
          )}
        </Flex>

        {/* Filters */}
        <LogbookFilters filters={filters} onFiltersChange={handleFiltersChange} />

        {/* Entries list */}
        {isLoadingEntries && entries.length === 0 ? (
          <Center py={12}>
            <Spinner size="lg" color="brand.500" />
          </Center>
        ) : entries.length === 0 ? (
          <Box
            bg="white"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="gray.200"
            p={8}
            textAlign="center"
          >
            <Text fontSize="lg" color="gray.500" mb={4}>
              Aucune entrée dans le cahier de liaison
            </Text>
            {canWrite && (
              <AccessibleButton
                colorPalette="blue"
                variant="outline"
                onClick={() => setIsNewEntryModalOpen(true)}
              >
                Créer la première entrée
              </AccessibleButton>
            )}
          </Box>
        ) : (
          <Stack gap={3}>
            {entries.map((entry) => (
              <LogEntryCard
                key={entry.id}
                entry={entry}
                currentUserId={profile.id}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}

            {/* Load more button */}
            {hasMore && (
              <Flex justify="center" mt={4}>
                <AccessibleButton
                  variant="outline"
                  onClick={handleLoadMore}
                  loading={isLoadingEntries}
                  loadingText="Chargement..."
                >
                  Charger plus ({totalCount - entries.length} restantes)
                </AccessibleButton>
              </Flex>
            )}
          </Stack>
        )}

        {/* Results count */}
        {entries.length > 0 && (
          <Text fontSize="sm" color="gray.500" mt={4} textAlign="center">
            {entries.length} sur {totalCount} entrée{totalCount > 1 ? 's' : ''}
          </Text>
        )}
      </Box>

      {/* New entry modal */}
      {canWrite && (
        <NewLogEntryModal
          isOpen={isNewEntryModalOpen}
          onClose={() => setIsNewEntryModalOpen(false)}
          employerId={employerId}
          authorId={profile.id}
          authorRole={profile.role}
          onSuccess={handleNewEntrySuccess}
        />
      )}
    </DashboardLayout>
  )
}

export default LogbookPage
