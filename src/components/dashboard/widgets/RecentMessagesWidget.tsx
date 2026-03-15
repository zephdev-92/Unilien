import { useState, useEffect } from 'react'
import { Box, Flex, Text, Skeleton, Stack } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface MessagePreview {
  id: string
  senderName: string
  initials: string
  text: string
  time: string
  unread: boolean
}

interface RecentMessagesWidgetProps {
  userId: string
}

function formatMsgTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) {
    return date.toLocaleDateString('fr-FR', { weekday: 'short' })
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function RecentMessagesWidget({ userId }: RecentMessagesWidgetProps) {
  const [messages, setMessages] = useState<MessagePreview[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      try {
        // Get recent messages where user is participant
        const { data, error } = await supabase
          .from('liaison_messages')
          .select(`
            id, content, created_at, sender_id, read_by,
            conversation:liaison_conversations!inner(
              id, employer_id, employee_id
            ),
            sender:profiles!sender_id(first_name, last_name)
          `)
          .or(`conversation.employer_id.eq.${userId},conversation.employee_id.eq.${userId}`)
          .neq('sender_id', userId)
          .order('created_at', { ascending: false })
          .limit(3)

        if (error) {
          logger.error('Erreur chargement messages récents:', error)
          return
        }

        if (!cancelled && data) {
          const mapped: MessagePreview[] = data.map((row: Record<string, unknown>) => {
            const sender = row.sender as Record<string, unknown> | null
            const firstName = (sender?.first_name as string) ?? ''
            const lastName = (sender?.last_name as string) ?? ''
            const readBy = (row.read_by as string[] | null) ?? []

            return {
              id: row.id as string,
              senderName: `${firstName} ${lastName}`.trim() || 'Inconnu',
              initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
              text: (row.content as string) ?? '',
              time: formatMsgTime(row.created_at as string),
              unread: !readBy.includes(userId),
            }
          })
          setMessages(mapped)
        }
      } catch (err) {
        logger.error('Erreur messages récents:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="sm"
      overflow="hidden"
    >
      <Flex justify="space-between" align="center" px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <Text fontSize="15px" fontWeight="700" color="text.default">
          Messages
        </Text>
        <Box
          as={RouterLink}
          to="/messagerie"
          fontSize="sm"
          fontWeight="600"
          color="brand.500"
          textDecoration="none"
          _hover={{ textDecoration: 'underline' }}
        >
          Voir tout
        </Box>
      </Flex>

      <Box py={1}>
        {isLoading ? (
          <Stack gap={0} px={4}>
            {[1, 2, 3].map((i) => (
              <Flex key={i} gap={3} py={3} align="center">
                <Skeleton borderRadius="full" w="32px" h="32px" flexShrink={0} />
                <Box flex={1}>
                  <Skeleton height="12px" width="100px" mb={1} />
                  <Skeleton height="12px" width="180px" />
                </Box>
              </Flex>
            ))}
          </Stack>
        ) : messages.length === 0 ? (
          <Text color="text.muted" textAlign="center" py={4} fontSize="sm">
            Aucun message récent
          </Text>
        ) : (
          messages.map((msg) => (
            <Flex
              key={msg.id}
              as={RouterLink}
              to="/messagerie"
              gap={3}
              px={4}
              py="10px"
              align="center"
              textDecoration="none"
              cursor="pointer"
              transition="background 0.15s"
              _hover={{ bg: 'bg.page' }}
              borderBottomWidth="1px"
              borderColor="border.default"
              css={{ '&:last-child': { borderBottom: 'none' } }}
            >
              {/* Unread dot */}
              {msg.unread ? (
                <Box w="8px" h="8px" borderRadius="full" bg="brand.500" flexShrink={0} />
              ) : (
                <Box w="8px" flexShrink={0} />
              )}

              {/* Avatar */}
              <Flex
                align="center"
                justify="center"
                w="32px"
                h="32px"
                borderRadius="full"
                bg="brand.50"
                flexShrink={0}
              >
                <Text fontSize="xs" fontWeight="bold" color="brand.600">
                  {msg.initials}
                </Text>
              </Flex>

              {/* Content */}
              <Box flex={1} minW={0}>
                <Text
                  fontSize="sm"
                  fontWeight={msg.unread ? '700' : '600'}
                  color="text.default"
                >
                  {msg.senderName}
                </Text>
                <Text
                  fontSize="sm"
                  color={msg.unread ? 'text.default' : 'text.muted'}
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  maxW="180px"
                >
                  {msg.text}
                </Text>
              </Box>

              {/* Time */}
              <Text fontSize="11px" color="text.muted" flexShrink={0} whiteSpace="nowrap">
                {msg.time}
              </Text>
            </Flex>
          ))
        )}
      </Box>
    </Box>
  )
}
