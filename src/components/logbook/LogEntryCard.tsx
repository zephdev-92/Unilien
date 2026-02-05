import { useState } from 'react'
import { Box, Flex, Text, Badge, Stack } from '@chakra-ui/react'
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

const typeIcons: Record<string, string> = {
  info: 'ℹ️',
  alert: '⚠️',
  incident: '🚨',
  instruction: '📋',
}

const typeLabels: Record<string, string> = {
  info: 'Information',
  alert: 'Alerte',
  incident: 'Incident',
  instruction: 'Instruction',
}

const importanceColors: Record<string, string> = {
  normal: 'gray',
  urgent: 'red',
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
    return "À l'instant"
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
    <Box
      p={4}
      bg={entry.importance === 'urgent' ? 'red.50' : isUnread ? 'blue.50' : 'gray.50'}
      borderRadius="md"
      borderLeftWidth="4px"
      borderLeftColor={
        entry.importance === 'urgent'
          ? 'red.500'
          : isUnread
          ? 'blue.500'
          : 'gray.300'
      }
      onClick={handleClick}
      cursor={isUnread ? 'pointer' : 'default'}
      transition="all 0.2s"
      _hover={{
        boxShadow: 'sm',
      }}
    >
      {/* Header: Type, Badge, Time */}
      <Flex justify="space-between" align="start" mb={2}>
        <Flex align="center" gap={2}>
          <Text fontSize="lg" aria-hidden="true">
            {typeIcons[entry.type]}
          </Text>
          <Badge colorPalette={importanceColors[entry.importance]} size="sm">
            {typeLabels[entry.type]}
          </Badge>
          {isUnread && (
            <Badge colorPalette="blue" size="sm">
              Non lu
            </Badge>
          )}
        </Flex>
        <Text fontSize="xs" color="gray.500">
          {formatTimeAgo(entry.createdAt)}
        </Text>
      </Flex>

      {/* Content */}
      <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
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

      {/* Footer: Author + Actions */}
      <Flex justify="space-between" align="center" mt={3}>
        <Text fontSize="xs" color="gray.500">
          Par {authorName} ({authorRoleLabels[entry.authorRole]})
        </Text>

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
                accessibleLabel="Modifier cette entrée"
              >
                Modifier
              </AccessibleButton>
            )}
            {onDelete && (
              <AccessibleButton
                variant="ghost"
                size="xs"
                colorPalette="red"
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
                    onDelete(entry.id)
                  }
                }}
                accessibleLabel="Supprimer cette entrée"
              >
                Supprimer
              </AccessibleButton>
            )}
          </Stack>
        )}
      </Flex>
    </Box>
  )
}

export default LogEntryCard
