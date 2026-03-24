import { useState, useEffect, useCallback, useMemo } from 'react'
import { Box, Stack, Flex, Text, Center, Spinner } from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/dashboard'
import { AccessibleButton } from '@/components/ui'
import { LogEntryCard } from './LogEntryCard'
import { LogbookFilters } from './LogbookFilters'
import { NewLogEntryModal } from './NewLogEntryModal'
import { EditLogEntryModal } from './EditLogEntryModal'
import {
  getLogEntries,
  markAsRead,
  deleteLogEntry,
  getUnreadCount,
  type LogEntryFilters,
  type LogEntryWithAuthor,
} from '@/services/logbookService'
import { useEmployerResolution } from '@/hooks/useEmployerResolution'
import { logger } from '@/lib/logger'

const PAGE_SIZE = 20

function formatDateSeparator(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (entryDate.getTime() === today.getTime()) {
    return "Aujourd'hui"
  }
  if (entryDate.getTime() === yesterday.getTime()) {
    return 'Hier'
  }
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function LogbookPage() {
  const { profile, isInitialized } = useAuth()

  const [entries, setEntries] = useState<LogEntryWithAuthor[]>([])
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [filters, setFilters] = useState<LogEntryFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LogEntryWithAuthor | null>(null)

  const {
    resolvedEmployerId,
    caregiverPermissions,
    isResolving: isResolvingEmployer,
    accessDenied,
  } = useEmployerResolution({ requiredCaregiverPermission: 'canViewLiaison' })

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

      const unread = await getUnreadCount(resolvedEmployerId, profile.id)
      setUnreadCount(unread)
    } catch (error) {
      logger.error('Erreur chargement cahier de liaison:', error)
    } finally {
      setIsLoadingEntries(false)
    }
  }, [profile, resolvedEmployerId, filters, page])

  useEffect(() => {
    if (profile && isInitialized && resolvedEmployerId) {
      loadEntries(true)
    }
  }, [profile, isInitialized, filters, resolvedEmployerId, loadEntries])

  useEffect(() => {
    if (page > 1) {
      loadEntries(false)
    }
  }, [page, loadEntries])

  // Filter entries by search query (client-side)
  const displayedEntries = useMemo(() => {
    if (!searchQuery) return entries
    const q = searchQuery.toLowerCase()
    return entries.filter((entry) => {
      const content = entry.content.toLowerCase()
      const authorName = entry.author
        ? `${entry.author.firstName} ${entry.author.lastName}`.toLowerCase()
        : ''
      return content.includes(q) || authorName.includes(q)
    })
  }, [entries, searchQuery])

  // Group entries by date for separators
  const entriesWithSeparators = useMemo(() => {
    const result: { type: 'separator'; label: string; key: string }[] | { type: 'entry'; entry: LogEntryWithAuthor }[] = []
    let lastDateKey = ''

    for (const entry of displayedEntries) {
      const dateKey = getDateKey(entry.createdAt)
      if (dateKey !== lastDateKey) {
        (result as { type: string; label?: string; key?: string; entry?: LogEntryWithAuthor }[]).push({
          type: 'separator',
          label: formatDateSeparator(entry.createdAt),
          key: dateKey,
        })
        lastDateKey = dateKey
      }
      (result as { type: string; entry?: LogEntryWithAuthor }[]).push({ type: 'entry', entry })
    }

    return result as ({ type: 'separator'; label: string; key: string } | { type: 'entry'; entry: LogEntryWithAuthor })[]
  }, [displayedEntries])

  const handleFiltersChange = (newFilters: LogEntryFilters) => {
    setFilters(newFilters)
  }

  const handleMarkAsRead = async (entryId: string) => {
    if (!profile) return
    await markAsRead(entryId, profile.id)
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, readBy: [...entry.readBy, profile.id] }
          : entry
      )
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleEdit = (entry: LogEntryWithAuthor) => {
    setEditingEntry(entry)
  }

  const handleEditSuccess = () => {
    setEditingEntry(null)
    loadEntries(true)
  }

  const handleDelete = async (entryId: string) => {
    try {
      await deleteLogEntry(entryId)
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId))
      setTotalCount((prev) => prev - 1)
    } catch (error) {
      logger.error('Erreur suppression entree:', error)
    }
  }

  const handleLoadMore = () => {
    setPage((prev) => prev + 1)
  }

  const handleNewEntrySuccess = () => {
    loadEntries(true)
  }

  // Loading state
  if (!profile || isResolvingEmployer) {
    return (
      <DashboardLayout title="Cahier de liaison">
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      </DashboardLayout>
    )
  }

  // Access denied
  if (accessDenied) {
    return (
      <DashboardLayout title="Cahier de liaison">
        <Box
          bg="orange.50"
          borderRadius="12px"
          borderWidth="1px"
          borderColor="orange.200"
          p={8}
          textAlign="center"
        >
          <Text fontSize="xl" fontWeight="semibold" color="orange.800" mb={2}>
            Acces non autorise
          </Text>
          <Text color="orange.700">
            {profile.role === 'caregiver'
              ? "Vous n'avez pas la permission d'acceder au cahier de liaison. Contactez votre proche pour qu'il vous accorde cet acces."
              : "Vous n'avez pas acces a ce cahier de liaison."}
          </Text>
        </Box>
      </DashboardLayout>
    )
  }

  const canWrite =
    profile.role === 'employer' ||
    profile.role === 'employee' ||
    (profile.role === 'caregiver' && caregiverPermissions?.canWriteLiaison === true)

  const topbarRight = canWrite ? (
    <Flex
      as="button"
      align="center"
      gap={1}
      px={4} py="6px"
      bg="brand.500" color="white"
      borderRadius="6px"
      fontSize="13px" fontWeight="700"
      _hover={{ bg: 'brand.600' }}
      onClick={() => setIsNewEntryModalOpen(true)}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={14} height={14} aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <Box as="span" display={{ base: 'none', sm: 'inline' }}>Nouvelle note</Box>
    </Flex>
  ) : undefined

  return (
    <DashboardLayout title="Cahier de liaison" topbarRight={topbarRight}>
      <Box>

        {/* Bandeau non lus */}
        {unreadCount > 0 && (
          <Flex
            align="center"
            gap={2}
            mb={3}
            px={3}
            py={2}
            bg="brand.50"
            borderRadius="8px"
            fontSize="13px"
            fontWeight="600"
            color="brand.500"
          >
            <Box w="6px" h="6px" borderRadius="50%" bg="brand.500" flexShrink={0} />
            {unreadCount} note{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
          </Flex>
        )}

        {/* Filters with search */}
        <LogbookFilters
          filters={filters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFiltersChange={handleFiltersChange}
        />

        {/* Entries list with date separators and timeline */}
        {isLoadingEntries && entries.length === 0 ? (
          <Center py={12}>
            <Spinner size="lg" color="brand.500" />
          </Center>
        ) : displayedEntries.length === 0 ? (
          <Box
            bg="bg.surface"
            borderRadius="12px"
            borderWidth="1px"
            borderColor="border.default"
            p={8}
            textAlign="center"
          >
            <Text fontSize="lg" color="text.muted" mb={4}>
              {searchQuery
                ? `Aucun resultat pour "${searchQuery}"`
                : 'Aucune entree dans le cahier de liaison'}
            </Text>
            {canWrite && !searchQuery && (
              <AccessibleButton
                colorPalette="brand"
                variant="outline"
                onClick={() => setIsNewEntryModalOpen(true)}
              >
                Creer la premiere entree
              </AccessibleButton>
            )}
          </Box>
        ) : (
          <Stack gap={0}>
            {entriesWithSeparators.map((item) => {
              if (item.type === 'separator') {
                return (
                  <Flex key={`sep-${item.key}`} align="center" gap={3} py={3} pl="40px">
                    <Box h="1px" flex={1} bg="border.default" />
                    <Text fontSize="xs" fontWeight="semibold" color="text.muted" textTransform="capitalize" whiteSpace="nowrap">
                      {item.label}
                    </Text>
                    <Box h="1px" flex={1} bg="border.default" />
                  </Flex>
                )
              }
              return (
                <LogEntryCard
                  key={item.entry.id}
                  entry={item.entry}
                  currentUserId={profile.id}
                  onMarkAsRead={handleMarkAsRead}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )
            })}

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
        {displayedEntries.length > 0 && (
          <Text fontSize="sm" color="text.muted" mt={4} textAlign="center">
            {displayedEntries.length} sur {totalCount} entree{totalCount > 1 ? 's' : ''}
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

      {/* Edit entry modal */}
      <EditLogEntryModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSuccess={handleEditSuccess}
      />
    </DashboardLayout>
  )
}

export default LogbookPage
