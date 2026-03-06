import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Flex,
  Text,
  Center,
  Spinner,
  Badge,
  VisuallyHidden,
  IconButton,
} from '@chakra-ui/react'
import { LuArrowLeft } from 'react-icons/lu'
import { useAuth } from '@/hooks/useAuth'
import { useEmployerResolution } from '@/hooks/useEmployerResolution'
import { DashboardLayout } from '@/components/dashboard'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { ConversationList } from './ConversationList'
import { NewConversationModal } from './NewConversationModal'
import {
  getConversations,
  getOrCreatePrivateConversation,
  ensureTeamConversation,
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
import type { Conversation, LiaisonMessageWithSender } from '@/types'

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

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [isLoadingConvs, setIsLoadingConvs] = useState(true)
  const [isNewConvOpen, setIsNewConvOpen] = useState(false)
  // Mobile: afficher la liste ou le thread
  const [showConvList, setShowConvList] = useState(true)

  // Messages
  const [messages, setMessages] = useState<LiaisonMessageWithSender[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
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
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null)

  // ---- Charger les conversations au mount ----
  useEffect(() => {
    async function loadConversations() {
      if (!profile || !resolvedEmployerId) return

      setIsLoadingConvs(true)
      try {
        // S'assurer que la conv équipe existe
        await ensureTeamConversation(resolvedEmployerId)

        const convs = await getConversations(resolvedEmployerId, profile.id)
        setConversations(convs)

        // Sélectionner automatiquement la conv d'équipe
        const team = convs.find(c => c.type === 'team')
        if (team && !selectedConv) {
          setSelectedConv(team)
        }
      } catch (error) {
        logger.error('Erreur chargement conversations:', error)
      } finally {
        setIsLoadingConvs(false)
      }
    }

    if (profile && isInitialized && resolvedEmployerId) {
      loadConversations()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isInitialized, resolvedEmployerId])

  // ---- Charger les messages quand la conversation change ----
  useEffect(() => {
    if (!selectedConv || !profile) return

    // Annuler les subscriptions précédentes
    if (unsubscribeMessagesRef.current) {
      unsubscribeMessagesRef.current()
      unsubscribeMessagesRef.current = null
    }
    if (typingControlRef.current) {
      typingControlRef.current.unsubscribe()
      typingControlRef.current = null
    }

    setMessages([])
    setHasMore(false)
    setTypingUsers([])
    setIsLoadingMessages(true)

    async function loadAndSubscribe() {
      if (!selectedConv || !profile) return

      try {
        const result = await getLiaisonMessages(selectedConv.id)
        setMessages(result.messages)
        setHasMore(result.hasMore)
        await markAllMessagesAsRead(selectedConv.id, profile.id)

        // Scroll to bottom
        setTimeout(() => {
          messagesContainerRef.current?.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
          })
        }, 50)
      } catch (error) {
        logger.error('Erreur chargement messages:', error)
      } finally {
        setIsLoadingMessages(false)
      }

      // Subscription realtime
      const unsubMessages = subscribeLiaisonMessages(
        selectedConv.id,
        (eventType, message) => {
          if (eventType === 'INSERT') {
            setMessages(prev => [...prev, message])
            // Mettre à jour le dernier message dans la liste
            setConversations(prev =>
              prev.map(c =>
                c.id === selectedConv.id
                  ? { ...c, lastMessage: message.content, updatedAt: message.createdAt, unreadCount: 0 }
                  : c
              )
            )
            setTimeout(() => {
              messagesContainerRef.current?.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth',
              })
            }, 100)
          } else if (eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === message.id ? message : m))
          } else if (eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== message.id))
          }
        }
      )
      unsubscribeMessagesRef.current = unsubMessages

      // Typing indicator
      const userName = `${profile.firstName} ${profile.lastName}`
      const control = subscribeTypingIndicator(selectedConv.id, profile.id, userName, setTypingUsers)
      typingControlRef.current = control
    }

    loadAndSubscribe()

    return () => {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current()
        unsubscribeMessagesRef.current = null
      }
      if (typingControlRef.current) {
        typingControlRef.current.unsubscribe()
        typingControlRef.current = null
      }
    }
  }, [selectedConv?.id, profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Sélection conversation ----
  const handleSelectConv = useCallback((conv: Conversation) => {
    setSelectedConv(conv)
    setShowConvList(false) // mobile: passer au thread
  }, [])

  // ---- Nouvelle conversation privée ----
  const handleNewConversationSelect = useCallback(async (memberId: string) => {
    if (!profile || !resolvedEmployerId) return

    const conv = await getOrCreatePrivateConversation(resolvedEmployerId, profile.id, memberId)
    if (!conv) return

    // Ajouter ou mettre à jour dans la liste
    setConversations(prev => {
      const exists = prev.find(c => c.id === conv.id)
      if (exists) return prev
      return [...prev, conv]
    })
    setSelectedConv(conv)
    setShowConvList(false)
  }, [profile, resolvedEmployerId])

  // ---- Charger messages plus anciens ----
  const handleLoadMore = useCallback(async () => {
    if (!selectedConv || isLoadingMore || messages.length === 0) return

    setIsLoadingMore(true)
    try {
      const oldestMessage = messages[0]
      const olderMessages = await getOlderMessages(selectedConv.id, oldestMessage.createdAt)

      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev])
      }
      setHasMore(olderMessages.length >= 20)
    } catch (error) {
      logger.error('Erreur chargement anciens messages:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [selectedConv, isLoadingMore, messages])

  // ---- Scroll infini ----
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    if (target.scrollTop < 100 && hasMore && !isLoadingMore) {
      handleLoadMore()
    }
  }, [hasMore, isLoadingMore, handleLoadMore])

  // ---- Envoyer un message ----
  const handleSend = useCallback(async (content: string) => {
    if (!profile || !resolvedEmployerId || !selectedConv) return

    await createLiaisonMessage(
      resolvedEmployerId,
      selectedConv.id,
      profile.id,
      profile.role,
      content
    )
  }, [profile, resolvedEmployerId, selectedConv])

  // ---- Supprimer un message ----
  const handleDelete = useCallback(async (messageId: string) => {
    try {
      await deleteLiaisonMessage(messageId)
    } catch (error) {
      logger.error('Erreur suppression message:', error)
    }
  }, [])

  // ---- Typing ----
  const handleTyping = useCallback((isTyping: boolean) => {
    typingControlRef.current?.setTyping(isTyping)
  }, [])

  // ---- Groupage par date ----
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

  // ---- États d'erreur / chargement global ----
  if (!profile || isResolvingEmployer) {
    return (
      <DashboardLayout title="Liaison">
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      </DashboardLayout>
    )
  }

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

  const canWrite =
    profile.role === 'employer' ||
    profile.role === 'employee' ||
    (profile.role === 'caregiver' && caregiverPermissions?.canWriteLiaison === true)

  // IDs des membres déjà en conv privée
  const existingPrivateMemberIds = conversations
    .filter(c => c.type === 'private' && c.otherParticipant)
    .map(c => c.otherParticipant!.id)

  // Titre de la conversation sélectionnée
  const convTitle = selectedConv?.type === 'team'
    ? 'Équipe'
    : selectedConv?.otherParticipant
      ? `${selectedConv.otherParticipant.firstName} ${selectedConv.otherParticipant.lastName}`
      : 'Conversation'

  return (
    <DashboardLayout title="Liaison">
      <Flex
        h="calc(100vh - 200px)"
        minH="400px"
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        overflow="hidden"
      >
        {/* ===== LISTE CONVERSATIONS ===== */}
        {/* Desktop : toujours visible | Mobile : togglé par showConvList */}
        <Box
          w={{ base: '100%', md: '280px' }}
          display={{ base: showConvList ? 'flex' : 'none', md: 'flex' }}
          flexDirection="column"
          flexShrink={0}
        >
          {isLoadingConvs ? (
            <Center flex={1}>
              <Spinner size="md" color="blue.500" />
            </Center>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedConv?.id ?? null}
              onSelect={handleSelectConv}
              onNewPrivate={() => setIsNewConvOpen(true)}
              currentUserId={profile.id}
            />
          )}
        </Box>

        {/* ===== THREAD DE MESSAGES ===== */}
        <Flex
          direction="column"
          flex={1}
          minW={0}
          display={{ base: showConvList ? 'none' : 'flex', md: 'flex' }}
          borderLeftWidth={{ md: '1px' }}
          borderLeftColor={{ md: 'gray.200' }}
        >
          {/* Header conversation */}
          <Flex
            align="center"
            gap={3}
            px={4}
            py={3}
            borderBottomWidth="1px"
            borderColor="gray.200"
            bg="gray.50"
          >
            {/* Bouton retour (mobile) */}
            <IconButton
              aria-label="Retour aux conversations"
              variant="ghost"
              size="sm"
              display={{ base: 'flex', md: 'none' }}
              onClick={() => setShowConvList(true)}
            >
              <LuArrowLeft />
            </IconButton>

            <Box>
              <Text fontWeight="semibold" fontSize="md">
                {selectedConv ? convTitle : 'Messagerie'}
              </Text>
              {selectedConv?.type === 'team' && (
                <Text fontSize="xs" color="gray.500">
                  Conversation d'équipe
                </Text>
              )}
            </Box>
          </Flex>

          {/* Messages container */}
          {!selectedConv ? (
            <Center flex={1}>
              <Text color="gray.400" fontSize="sm">
                Sélectionnez une conversation
              </Text>
            </Center>
          ) : (
            <>
              <Box
                ref={messagesContainerRef}
                flex={1}
                overflowY="auto"
                onScroll={handleScroll}
                py={4}
                css={{
                  '&::-webkit-scrollbar': { width: '8px' },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'var(--chakra-colors-gray-300)',
                    borderRadius: '4px',
                  },
                }}
              >
                {isLoadingMore && (
                  <Center py={4}>
                    <Spinner size="sm" color="blue.500" />
                  </Center>
                )}

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

                <TypingIndicator users={typingUsers} />
              </Box>

              {/* Message input */}
              {canWrite ? (
                <MessageInput onSend={handleSend} onTyping={handleTyping} />
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
            </>
          )}
        </Flex>
      </Flex>

      {/* Modal nouvelle conversation */}
      <NewConversationModal
        isOpen={isNewConvOpen}
        onClose={() => setIsNewConvOpen(false)}
        employerId={resolvedEmployerId}
        currentUserId={profile.id}
        existingConversationMemberIds={existingPrivateMemberIds}
        onSelect={handleNewConversationSelect}
      />

      {/* Screen reader announcements */}
      <VisuallyHidden>
        <div aria-live="polite" aria-atomic="true">
          {messages.length > 0 && `${messages.length} messages dans la conversation`}
        </div>
      </VisuallyHidden>
    </DashboardLayout>
  )
}

export default LiaisonPage
