import { useState } from 'react'
import { Box, Flex, Text, Badge, Stack, Avatar } from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { sanitizeText } from '@/lib/sanitize'
import type { LogEntryWithAuthor } from '@/services/logbookService'

interface LogEntryCardProps {
  entry: LogEntryWithAuthor
  currentUserId: string
  onMarkAsRead?: (entryId: string) => void
  onEdit?: (entry: LogEntryWithAuthor) => void
  onDelete?: (entryId: string) => void
}

const typeLabels: Record<string, string> = {
  info: 'Observation',
  alert: 'Alerte',
  incident: 'Incident',
  instruction: 'Instruction',
}

const typeBadgeColors: Record<string, string> = {
  info: 'blue',
  alert: 'orange',
  incident: 'red',
  instruction: 'purple',
}

const timelineDotColors: Record<string, string> = {
  info: 'blue.400',
  alert: 'orange.400',
  incident: 'red.500',
  instruction: 'purple.400',
}

const authorRoleLabels: Record<string, string> = {
  employer: 'Employeur',
  employee: 'Auxiliaire',
  caregiver: 'Aidant',
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return "A l'instant"
  }
  if (diffMins < 60) {
    return `Il y a ${diffMins} min`
  }
  if (diffHours < 24) {
    return `Il y a ${diffHours}h`
  }
  if (diffDays === 1) {
    return 'Hier'
  }
  return `Il y a ${diffDays} jours`
}

const CONTENT_TRUNCATE_LENGTH = 150

export function LogEntryCard({
  entry,
  currentUserId,
  onMarkAsRead,
  onEdit,
  onDelete,
}: LogEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const isUnread = !entry.readBy.includes(currentUserId)
  const isAuthor = entry.authorId === currentUserId
  const sanitizedContent = sanitizeText(entry.content)
  const shouldTruncate = sanitizedContent.length > CONTENT_TRUNCATE_LENGTH
  const displayContent = isExpanded || !shouldTruncate
    ? sanitizedContent
    : sanitizedContent.slice(0, CONTENT_TRUNCATE_LENGTH) + '...'

  const authorName = entry.author
    ? `${entry.author.firstName} ${entry.author.lastName}`
    : authorRoleLabels[entry.authorRole]

  const handleClick = () => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(entry.id)
    }
  }

  return (
    <Flex gap={0}>
      {/* Timeline dot */}
      <Flex direction="column" align="center" w="40px" flexShrink={0} pt={5}>
        <Box
          w="12px"
          h="12px"
          borderRadius="full"
          bg={timelineDotColors[entry.type] || 'gray.400'}
          borderWidth="2px"
          borderColor="white"
          boxShadow="sm"
          flexShrink={0}
        />
        <Box w="2px" flex={1} bg="border.default" mt={1} />
      </Flex>

      {/* Card */}
      <Box
        flex={1}
        p={4}
        mb={2}
        bg={entry.importance === 'urgent' ? 'danger.50' : isUnread ? 'brand.50' : 'bg.surface'}
        borderRadius="12px"
        borderWidth="1px"
        borderColor={entry.importance === 'urgent' ? 'danger.100' : isUnread ? 'brand.100' : 'border.default'}
        onClick={handleClick}
        cursor={isUnread ? 'pointer' : 'default'}
        transition="all 0.2s"
        _hover={{
          boxShadow: 'sm',
        }}
      >
        {/* Header: Category badge + Time */}
        <Flex justify="space-between" align="start" mb={2}>
          <Flex align="center" gap={2}>
            <Badge colorPalette={typeBadgeColors[entry.type]} size="sm">
              {typeLabels[entry.type]}
            </Badge>
            {entry.importance === 'urgent' && (
              <Badge colorPalette="red" size="sm" variant="solid">
                Urgent
              </Badge>
            )}
            {isUnread && (
              <Badge colorPalette="brand" size="sm" variant="outline">
                Non lu
              </Badge>
            )}
          </Flex>
          <Text fontSize="xs" color="text.muted" whiteSpace="nowrap" ml={2}>
            {formatTimeAgo(entry.createdAt)}
          </Text>
        </Flex>

        {/* Alert block for urgent/incident entries */}
        {(entry.importance === 'urgent' || entry.type === 'incident') && (
          <Box
            p={3}
            mb={3}
            bg={entry.type === 'incident' ? 'red.100' : 'orange.100'}
            borderRadius="10px"
            borderLeftWidth="3px"
            borderLeftColor={entry.type === 'incident' ? 'red.500' : 'orange.500'}
          >
            <Text fontSize="xs" fontWeight="semibold" color={entry.type === 'incident' ? 'red.700' : 'orange.700'}>
              {entry.type === 'incident' ? 'Incident signale — action requise' : 'Attention — message urgent'}
            </Text>
          </Box>
        )}

        {/* Content */}
        <Text fontSize="sm" color="text.secondary" whiteSpace="pre-wrap">
          {displayContent}
        </Text>

        {/* Expand/Collapse button */}
        {shouldTruncate && (
          <AccessibleButton
            variant="ghost"
            size="xs"
            mt={1}
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            accessibleLabel={isExpanded ? 'Voir moins' : 'Voir plus'}
          >
            {isExpanded ? 'Voir moins' : 'Voir plus'}
          </AccessibleButton>
        )}

        {/* Footer: Author avatar + name + Actions */}
        <Flex justify="space-between" align="center" mt={3} pt={3} borderTopWidth="1px" borderTopColor="border.default">
          <Flex align="center" gap={2}>
            <Avatar.Root size="xs">
              <Avatar.Fallback name={authorName} />
            </Avatar.Root>
            <Box>
              <Text fontSize="xs" fontWeight="medium" color="text.secondary">
                {authorName}
              </Text>
              <Text fontSize="xs" color="text.muted">
                {authorRoleLabels[entry.authorRole]}
              </Text>
            </Box>
          </Flex>

          {isAuthor && (onEdit || onDelete) && (
            <Stack direction="row" gap={1}>
              {onEdit && (
                <AccessibleButton
                  variant="ghost"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(entry)
                  }}
                  accessibleLabel="Modifier cette entree"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </AccessibleButton>
              )}
              {onDelete && (
                <AccessibleButton
                  variant="ghost"
                  size="xs"
                  colorPalette="red"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('Supprimer cette entree ?')) {
                      onDelete(entry.id)
                    }
                  }}
                  accessibleLabel="Supprimer cette entree"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </AccessibleButton>
              )}
            </Stack>
          )}
        </Flex>
      </Box>
    </Flex>
  )
}

export default LogEntryCard
