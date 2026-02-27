import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Flex,
  Text,
  Center,
  Spinner,
  Badge,
  VisuallyHidden,
} from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { useEmployerResolution } from '@/hooks/useEmployerResolution'
import { DashboardLayout } from '@/components/dashboard'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import {
  getLiaisonMessages,
  getOlderMessages,
  createLiaisonMessage,
  deleteLiaisonMessage,
  markAllMessagesAsRead,
  subscribeLiaisonMessages,
  subscribeTypingIndicator,
  type TypingUser,
} from '@/services/liaisonService'
import { logger } from '@/lib/logger'
import type { LiaisonMessageWithSender } from '@/types'

// ============================================
// TYPING INDICATOR COMPONENT
// ============================================

function TypingIndicator({ users }: { users: TypingUser[] }) {
  if (users.length === 0) return null

  const names = users.map(u => u.name).join(', ')
  const text = users.length === 1
    ? `${names} écrit...`
    : `${names} écrivent...`

  return (
    <Box px={4} py={2}>
      <Flex align="center" gap={2}>
        <Flex gap={1}>
          {[0, 1, 2].map(i => (
            <Box
              key={i}
              w="6px"
              h="6px"
              bg="gray.400"
              borderRadius="full"
              css={{
                animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
                '@keyframes bounce': {
                  '0%, 60%, 100%': { transform: 'translateY(0)' },
                  '30%': { transform: 'translateY(-4px)' },
                },
              }}
            />
          ))}
        </Flex>
        <Text fontSize="sm" color="gray.500" fontStyle="italic">
          {text}
        </Text>
      </Flex>
    </Box>
  )
}

// ============================================
// DATE SEPARATOR COMPONENT
// ============================================

function DateSeparator({ date }: { date: Date }) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let label: string
  if (date.toDateString() === today.toDateString()) {
    label = "Aujourd'hui"
  } else if (date.toDateString() === yesterday.toDateString()) {
    label = 'Hier'
  } else {
    label = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  return (
    <Flex justify="center" my={4}>
      <Badge
        colorPalette="gray"
        variant="subtle"
        fontSize="xs"
        px={3}
        py={1}
        borderRadius="full"
      >
        {label}
      </Badge>
    </Flex>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LiaisonPage() {
  const { profile, isInitialized } = useAuth()

  const [messages, setMessages] = useState<LiaisonMessageWithSender[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  const {
    resolvedEmployerId,
    caregiverPermissions,
    isResolving: isResolvingEmployer,
    accessDenied,
  } = useEmployerResolution({ requiredCaregiverPermission: 'canViewLiaison' })

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const typingControlRef = useRef<{ setTyping: (v: boolean) => void; unsubscribe: () => void } | null>(null)
  const isInitialLoad = useRef(true)

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      if (!profile || !resolvedEmployerId) return

      setIsLoadingMessages(true)
      try {
        const result = await getLiaisonMessages(resolvedEmployerId)
        setMessages(result.messages)
        setHasMore(result.hasMore)

        // Mark all as read
        await markAllMessagesAsRead(resolvedEmployerId, profile.id)
      } catch (error) {
        logger.error('Erreur chargement messages:', error)
      } finally {
        setIsLoadingMessages(false)
        isInitialLoad.current = false
      }
    }

    if (profile && isInitialized && resolvedEmployerId) {
      loadMessages()
    }
  }, [profile, isInitialized, resolvedEmployerId])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!profile || !resolvedEmployerId) return

    const unsubscribe = subscribeLiaisonMessages(
      resolvedEmployerId,
      (eventType, message) => {
        if (eventType === 'INSERT') {
          setMessages(prev => [...prev, message])
          // Auto-scroll to bottom for new messages
          setTimeout(() => {
            messagesContainerRef.current?.scrollTo({
              top: messagesContainerRef.current.scrollHeight,
              behavior: 'smooth',
            })
          }, 100)
        } else if (eventType === 'UPDATE') {
          setMessages(prev =>
            prev.map(m => m.id === message.id ? message : m)
          )
        } else if (eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== message.id))
        }
      }
    )

    return unsubscribe
  }, [profile, resolvedEmployerId])

  // Subscribe to typing indicator
  useEffect(() => {
    if (!profile || !resolvedEmployerId) return

    const userName = `${profile.firstName} ${profile.lastName}`
    const control = subscribeTypingIndicator(
      resolvedEmployerId,
      profile.id,
      userName,
      setTypingUsers
    )

    typingControlRef.current = control

    return () => {
      control.unsubscribe()
      typingControlRef.current = null
    }
  }, [profile, resolvedEmployerId])

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoadingMessages && messages.length > 0 && isInitialLoad.current === false) {
      messagesContainerRef.current?.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
      })
    }
  }, [isLoadingMessages, messages.length])

  // Load older messages
  const handleLoadMore = useCallback(async () => {
    if (!resolvedEmployerId || isLoadingMore || messages.length === 0) return

    setIsLoadingMore(true)
    try {
      const oldestMessage = messages[0]
      const olderMessages = await getOlderMessages(
        resolvedEmployerId,
        oldestMessage.createdAt
      )

      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev])
      }
      setHasMore(olderMessages.length >= 20)
    } catch (error) {
      logger.error('Erreur chargement anciens messages:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [resolvedEmployerId, isLoadingMore, messages])

  // Handle scroll for infinite loading
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    if (target.scrollTop < 100 && hasMore && !isLoadingMore) {
      handleLoadMore()
    }
  }, [hasMore, isLoadingMore, handleLoadMore])

  // Send message
  const handleSend = useCallback(async (content: string) => {
    if (!profile || !resolvedEmployerId) return

    await createLiaisonMessage(
      resolvedEmployerId,
      profile.id,
      profile.role,
      content
    )
  }, [profile, resolvedEmployerId])

  // Delete message
  const handleDelete = useCallback(async (messageId: string) => {
    try {
      await deleteLiaisonMessage(messageId)
    } catch (error) {
      logger.error('Erreur suppression message:', error)
    }
  }, [])

  // Handle typing
  const handleTyping = useCallback((isTyping: boolean) => {
    typingControlRef.current?.setTyping(isTyping)
  }, [])

  // Group messages by date
  const groupedMessages = messages.reduce<{
    date: string
    messages: LiaisonMessageWithSender[]
  }[]>((groups, message) => {
    const dateKey = message.createdAt.toDateString()
    const lastGroup = groups[groups.length - 1]

    if (lastGroup && lastGroup.date === dateKey) {
      lastGroup.messages.push(message)
    } else {
      groups.push({ date: dateKey, messages: [message] })
    }

    return groups
  }, [])

  // Loading state (resolving employer for caregivers)
  if (!profile || isResolvingEmployer) {
    return (
      <DashboardLayout title="Liaison">
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      </DashboardLayout>
    )
  }

  // Access denied
  if (accessDenied) {
    return (
      <DashboardLayout title="Liaison">
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
              ? "Vous n'avez pas la permission d'accéder à la messagerie. Contactez votre proche pour qu'il vous accorde cet accès."
              : "Vous n'avez pas accès à cette messagerie."}
          </Text>
        </Box>
      </DashboardLayout>
    )
  }

  // Check write permission
  const canWrite =
    profile.role === 'employer' ||
    profile.role === 'employee' ||
    (profile.role === 'caregiver' && caregiverPermissions?.canWriteLiaison === true)

  return (
    <DashboardLayout title="Liaison">
      <Flex
        direction="column"
        h="calc(100vh - 200px)"
        minH="400px"
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        overflow="hidden"
      >
        {/* Header */}
        <Box
          px={4}
          py={3}
          borderBottomWidth="1px"
          borderColor="gray.200"
          bg="gray.50"
        >
          <Text fontWeight="semibold" fontSize="lg">
            Messagerie
          </Text>
          <Text fontSize="sm" color="gray.600">
            Communication en temps réel avec votre équipe
          </Text>
        </Box>

        {/* Messages container */}
        <Box
          ref={messagesContainerRef}
          flex={1}
          overflowY="auto"
          onScroll={handleScroll}
          py={4}
          css={{
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'var(--chakra-colors-gray-300)',
              borderRadius: '4px',
            },
          }}
        >
          {/* Load more indicator */}
          {isLoadingMore && (
            <Center py={4}>
              <Spinner size="sm" color="blue.500" />
            </Center>
          )}

          {/* Load more button */}
          {hasMore && !isLoadingMore && (
            <Center py={4}>
              <Text
                as="button"
                fontSize="sm"
                color="blue.500"
                onClick={handleLoadMore}
                _hover={{ textDecoration: 'underline' }}
              >
                Charger les messages précédents
              </Text>
            </Center>
          )}

          {/* Messages */}
          {isLoadingMessages ? (
            <Center py={12}>
              <Spinner size="lg" color="blue.500" />
            </Center>
          ) : messages.length === 0 ? (
            <Center py={12}>
              <Box textAlign="center">
                <Text fontSize="lg" color="gray.500" mb={2}>
                  Aucun message
                </Text>
                <Text fontSize="sm" color="gray.400">
                  Commencez la conversation !
                </Text>
              </Box>
            </Center>
          ) : (
            groupedMessages.map((group) => (
              <Box key={group.date}>
                <DateSeparator date={new Date(group.date)} />
                {group.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={message.senderId === profile.id}
                    onDelete={message.senderId === profile.id ? handleDelete : undefined}
                  />
                ))}
              </Box>
            ))
          )}

          {/* Typing indicator */}
          <TypingIndicator users={typingUsers} />
        </Box>

        {/* Message input */}
        {canWrite ? (
          <MessageInput
            onSend={handleSend}
            onTyping={handleTyping}
          />
        ) : (
          <Box
            p={4}
            bg="gray.50"
            borderTopWidth="1px"
            borderColor="gray.200"
            textAlign="center"
          >
            <Text fontSize="sm" color="gray.500">
              Vous n'avez pas la permission d'envoyer des messages.
            </Text>
          </Box>
        )}

        {/* Screen reader announcements */}
        <VisuallyHidden>
          <div aria-live="polite" aria-atomic="true">
            {messages.length > 0 && `${messages.length} messages dans la conversation`}
          </div>
        </VisuallyHidden>
      </Flex>
    </DashboardLayout>
  )
}

export default LiaisonPage
