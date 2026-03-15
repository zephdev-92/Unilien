import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Flex,
  Text,
  Center,
  Spinner,
  VisuallyHidden,
  IconButton,
  Button,
} from '@chakra-ui/react'

import { supabase } from '@/lib/supabase/client'
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
import { uploadAttachments } from '@/services/attachmentService'
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
              bg="border.strong"
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
        <Text fontSize="sm" color="text.muted" fontStyle="italic">
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
    <Flex justify="center" my={3} role="separator" aria-hidden="true">
      <Text
        fontSize="xs"
        fontWeight="700"
        color="text.muted"
        bg="bg.surface"
        px={4}
        py="3px"
        borderRadius="full"
        borderWidth="1px"
        borderColor="border.default"
      >
        {label}
      </Text>
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
  const selectedConvRef = useRef<string | null>(null)

  // Garder selectedConvRef à jour
  useEffect(() => {
    selectedConvRef.current = selectedConv?.id ?? null
  }, [selectedConv?.id])

  // ---- Realtime: écouter les nouveaux messages pour TOUTES les conversations ----
  useEffect(() => {
    if (!resolvedEmployerId || !profile) return

    const channel = supabase
      .channel(`unread-${resolvedEmployerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'liaison_messages',
          filter: `employer_id=eq.${resolvedEmployerId}`,
        },
        (payload) => {
          const msg = payload.new as { conversation_id: string; sender_id: string; content?: string; created_at?: string }
          // Ignorer ses propres messages
          if (msg.sender_id === profile.id) return
          // Si c'est la conv ouverte, ne pas incrémenter (on la lit en direct)
          if (msg.conversation_id === selectedConvRef.current) return

          // Incrémenter unreadCount + mettre à jour lastMessage/updatedAt
          setConversations(prev =>
            prev.map(c =>
              c.id === msg.conversation_id
                ? {
                    ...c,
                    unreadCount: c.unreadCount + 1,
                    lastMessage: msg.content || c.lastMessage,
                    updatedAt: msg.created_at ? new Date(msg.created_at) : new Date(),
                  }
                : c
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [resolvedEmployerId, profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
        // Mettre à jour le compteur non lu localement
        setConversations(prev =>
          prev.map(c => c.id === selectedConv.id ? { ...c, unreadCount: 0 } : c)
        )

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

  // ---- Envoyer depuis la modale Nouveau message ----
  const handleSendFromModal = useCallback(
    async (
      recipient: { type: 'team' } | { type: 'member'; memberId: string },
      content: string
    ) => {
      if (!profile || !resolvedEmployerId) return

      let conv: Conversation | null = null

      if (recipient.type === 'team') {
        const team = conversations.find(c => c.type === 'team')
        if (!team) return
        conv = team
      } else {
        conv = await getOrCreatePrivateConversation(
          resolvedEmployerId,
          profile.id,
          recipient.memberId
        )
        if (conv) {
          setConversations(prev => {
            const exists = prev.find(c => c.id === conv!.id)
            if (exists) return prev
            return [...prev, conv!]
          })
        }
      }

      if (!conv) return

      await createLiaisonMessage(
        resolvedEmployerId,
        conv.id,
        profile.id,
        profile.role,
        content,
        undefined,
        undefined
      )

      setSelectedConv(conv)
      setShowConvList(false)
      setIsNewConvOpen(false)
    },
    [profile, resolvedEmployerId, conversations]
  )

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
  const handleSend = useCallback(async (content: string, files?: File[]) => {
    if (!profile || !resolvedEmployerId || !selectedConv) return

    let attachments
    if (files && files.length > 0) {
      attachments = await uploadAttachments(selectedConv.id, profile.id, files)
    }

    await createLiaisonMessage(
      resolvedEmployerId,
      selectedConv.id,
      profile.id,
      profile.role,
      content,
      undefined,
      attachments
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
      <DashboardLayout title="Messagerie">
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      </DashboardLayout>
    )
  }

  if (accessDenied) {
    return (
      <DashboardLayout title="Messagerie">
        <Box
          bg="orange.50"
          borderRadius="12px"
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

  // Titre et sous-titre de la conversation sélectionnée (prototype)
  const convTitle = selectedConv?.type === 'team'
    ? 'Équipe'
    : selectedConv?.otherParticipant
      ? `${selectedConv.otherParticipant.firstName} ${selectedConv.otherParticipant.lastName}`
      : 'Conversation'
  const convSubtitle = selectedConv?.type === 'team'
    ? (selectedConv.participantIds.length > 0
        ? `${selectedConv.participantIds.length} participants`
        : 'Conversation d\u2019équipe')
    : 'Conversation privée'

  const topbarRight = canWrite ? (
    <Button
      size="sm"
      bg="brand.500"
      color="white"
      fontWeight="600"
      borderRadius="6px"
      _hover={{ bg: 'brand.600' }}
      onClick={() => setIsNewConvOpen(true)}
      aria-label="Nouveau message"
      display="inline-flex"
      alignItems="center"
      gap={2}
      px={3}
      py={2}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={16} height={16} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <Box as="span" display={{ base: 'none', sm: 'inline' }}>Nouveau</Box>
    </Button>
  ) : undefined

  return (
    <DashboardLayout title="Messagerie" topbarRight={topbarRight}>
      <Flex
        direction={{ base: 'column', md: 'row' }}
        flex={1}
        minH={0}
        mx={-6}
        mt={-6}
        mb={-6}
        bg="bg.surface"
        borderTopWidth="0"
        borderColor="border.default"
        overflow="hidden"
      >
        {/* ===== LISTE CONVERSATIONS ===== */}
        {/* Desktop : toujours visible | Mobile : togglé par showConvList */}
        <Box
          w={{ base: '100%', md: '340px' }}
          flex={{ base: 1, md: '0 0 auto' }}
          display={{ base: showConvList ? 'flex' : 'none', md: 'flex' }}
          flexDirection="column"
          flexShrink={0}
          minH={0}
        >
          {isLoadingConvs ? (
            <Center flex={1}>
              <Spinner size="md" color="brand.500" />
            </Center>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedConv?.id ?? null}
              onSelect={handleSelectConv}
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
          borderLeftColor={{ md: 'border.default' }}
        >
          {/* Header conversation — prototype: conv-thread-header + avatar 32px + sous-titre */}
          <Flex
            align="center"
            gap={3}
            px={4}
            py={3}
            borderBottomWidth="1px"
            borderColor="border.default"
            bg="bg.surface"
            flexShrink={0}
          >
            {/* Bouton retour (mobile) */}
            <IconButton
              aria-label="Retour aux conversations"
              variant="ghost"
              size="sm"
              display={{ base: 'flex', md: 'none' }}
              w="34px"
              h="34px"
              minW="34px"
              minH="34px"
              borderRadius="10px"
              color="text.muted"
              _hover={{ bg: 'bg.page', color: 'text.default' }}
              onClick={() => setShowConvList(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </IconButton>

            {/* Avatar 32px — prototype conv-avatar-sm */}
            {selectedConv && (
              <Flex
                w="32px"
                h="32px"
                borderRadius="full"
                bg={selectedConv.type === 'team' ? 'brand.500' : 'brand.500'}
                color="white"
                align="center"
                justify="center"
                flexShrink={0}
                fontSize="xs"
                fontWeight="800"
                fontFamily="heading"
                overflow="hidden"
              >
                {selectedConv.type === 'team' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                ) : selectedConv.otherParticipant?.avatarUrl ? (
                  <Box as="img" src={selectedConv.otherParticipant.avatarUrl} alt="" w="100%" h="100%" objectFit="cover" />
                ) : (
                  <span>
                    {selectedConv.otherParticipant
                      ? `${selectedConv.otherParticipant.firstName[0] || ''}${selectedConv.otherParticipant.lastName[0] || ''}`.toUpperCase()
                      : '?'}
                  </span>
                )}
              </Flex>
            )}

            <Box flex={1} minW={0}>
              <Text fontWeight="700" fontSize="md">
                {selectedConv ? convTitle : 'Messagerie'}
              </Text>
              {selectedConv && (
                <Text fontSize="xs" color="text.muted" mt="1px">
                  {convSubtitle}
                </Text>
              )}
            </Box>
          </Flex>

          {/* Messages container */}
          {!selectedConv ? (
            <Center flex={1}>
              <Box textAlign="center">
                <Box color="text.muted" mb={4} mx="auto" w="fit-content">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </Box>
                <Text color="text.muted" fontSize="sm">
                  Sélectionnez une conversation
                </Text>
              </Box>
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
                    backgroundColor: 'var(--chakra-colors-border-default)',
                    borderRadius: '4px',
                  },
                }}
              >
                {isLoadingMore && (
                  <Center py={4}>
                    <Spinner size="sm" color="brand.500" />
                  </Center>
                )}

                {hasMore && !isLoadingMore && (
                  <Center py={4}>
                    <Text
                      as="button"
                      fontSize="sm"
                      color="brand.500"
                      onClick={handleLoadMore}
                      _hover={{ textDecoration: 'underline' }}
                    >
                      Charger les messages précédents
                    </Text>
                  </Center>
                )}

                {isLoadingMessages ? (
                  <Center py={12}>
                    <Spinner size="lg" color="brand.500" />
                  </Center>
                ) : messages.length === 0 ? (
                  <Center py={12}>
                    <Box textAlign="center">
                      <Text fontSize="lg" color="text.muted" mb={2}>
                        Aucun message
                      </Text>
                      <Text fontSize="sm" color="text.muted">
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
                  bg="bg.page"
                  borderTopWidth="1px"
                  borderColor="border.default"
                  textAlign="center"
                >
                  <Text fontSize="sm" color="text.muted">
                    Vous n'avez pas la permission d'envoyer des messages.
                  </Text>
                </Box>
              )}
            </>
          )}
        </Flex>
      </Flex>

      {/* Modal nouveau message — prototype: destinataire + message + Envoyer */}
      <NewConversationModal
        isOpen={isNewConvOpen}
        onClose={() => setIsNewConvOpen(false)}
        employerId={resolvedEmployerId}
        currentUserId={profile.id}
        teamConversationId={conversations.find(c => c.type === 'team')?.id ?? null}
        onSend={handleSendFromModal}
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
