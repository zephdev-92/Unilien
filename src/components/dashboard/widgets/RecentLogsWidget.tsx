import { useState, useEffect, useCallback } from 'react'
import { Box, Stack, Flex, Text, Badge, Spinner } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { AccessibleButton } from '@/components/ui'
import { sanitizeText } from '@/lib/sanitize'
import { logger } from '@/lib/logger'
import { getRecentLogEntries, type LogEntryWithAuthor } from '@/services/logbookService'
import type { LogEntry } from '@/types'

interface RecentLogsWidgetProps {
  employerId: string
}

const typeIcons: Record<LogEntry['type'], string> = {
  info: 'ℹ️',
  alert: '⚠️',
  incident: '🚨',
  instruction: '📋',
}

const typeLabels: Record<LogEntry['type'], string> = {
  info: 'Information',
  alert: 'Alerte',
  incident: 'Incident',
  instruction: 'Instruction',
}

const importanceColors: Record<LogEntry['importance'], string> = {
  normal: 'gray',
  urgent: 'red',
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

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

const authorRoleLabels: Record<string, string> = {
  employer: 'Employeur',
  employee: 'Auxiliaire',
  caregiver: 'Aidant',
}

export function RecentLogsWidget({ employerId }: RecentLogsWidgetProps) {
  const [logs, setLogs] = useState<LogEntryWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = useCallback(async () => {
    if (!employerId) return

    setLoading(true)
    try {
      const entries = await getRecentLogEntries(employerId, 3)
      setLogs(entries)
    } catch (error) {
      logger.error('Erreur chargement entrées récentes:', error)
    } finally {
      setLoading(false)
    }
  }, [employerId])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  if (loading) {
    return (
      <Box
        bg="bg.surface"
        borderRadius="12px"
        borderWidth="1.5px"
        borderColor="border.default"
        p={6}
        boxShadow="sm"
      >
        <Flex justify="center" py={4}>
          <Spinner size="md" color="brand.500" />
        </Flex>
      </Box>
    )
  }

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1.5px"
      borderColor="border.default"
      p={6}
      boxShadow="sm"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="semibold" color="text.default">
          Cahier de liaison
        </Text>
        <AccessibleButton
          variant="ghost"
          size="sm"
          asChild
          accessibleLabel="Voir tout le cahier de liaison"
        >
          <RouterLink to="/cahier-de-liaison">Voir tout</RouterLink>
        </AccessibleButton>
      </Flex>

      {logs.length === 0 ? (
        <Text color="text.muted" py={4} textAlign="center">
          Aucune entrée récente
        </Text>
      ) : (
        <Stack gap={3} aria-live="polite">
          {logs.map((log) => (
            <Box
              key={log.id}
              p={4}
              bg={log.importance === 'urgent' ? 'danger.subtle' : 'bg.page'}
              borderRadius="10px"
              borderLeftWidth="4px"
              borderLeftColor={log.importance === 'urgent' ? 'danger.500' : 'border.default'}
            >
              <Flex justify="space-between" align="start" mb={2}>
                <Flex align="center" gap={2}>
                  <Text fontSize="lg" aria-hidden="true">
                    {typeIcons[log.type]}
                  </Text>
                  <Badge colorPalette={importanceColors[log.importance]} size="sm">
                    {typeLabels[log.type]}
                  </Badge>
                </Flex>
                <Text fontSize="xs" color="text.muted">
                  {formatTimeAgo(log.createdAt)}
                </Text>
              </Flex>
              <Text fontSize="sm" color="text.secondary" lineClamp={2}>
                {sanitizeText(log.content)}
              </Text>
              <Text fontSize="xs" color="text.muted" mt={2}>
                Par {log.author ? `${log.author.firstName} ${log.author.lastName}` : authorRoleLabels[log.authorRole]}
              </Text>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}

export default RecentLogsWidget
