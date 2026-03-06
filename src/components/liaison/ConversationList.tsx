import { Box, Flex, Text, Badge, Avatar, IconButton, Stack } from '@chakra-ui/react'

import type { Conversation } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (conv: Conversation) => void
  onNewPrivate: () => void
  currentUserId: string
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewPrivate,
}: ConversationListProps) {
  const team = conversations.find((c) => c.type === 'team')
  const privates = conversations.filter((c) => c.type === 'private')

  return (
    <Flex
      direction="column"
      h="100%"
      borderRightWidth="1px"
      borderColor="gray.200"
      bg="white"
      minW={0}
    >
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py={3}
        borderBottomWidth="1px"
        borderColor="gray.100"
      >
        <Text fontWeight="semibold" fontSize="sm" color="gray.700">
          Messages
        </Text>
        <IconButton
          aria-label="Nouvelle conversation"
          size="sm"
          variant="ghost"
          onClick={onNewPrivate}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </IconButton>
      </Flex>

      {/* Liste */}
      <Stack gap={0} flex={1} overflowY="auto">
        {/* Équipe */}
        {team && (
          <ConvItem
            conv={team}
            isSelected={selectedId === team.id}
            onSelect={onSelect}
            label="Équipe"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
        )}

        {/* Séparateur si conversations privées */}
        {privates.length > 0 && (
          <Box px={4} py={2}>
            <Text fontSize="xs" color="gray.400" fontWeight="medium" textTransform="uppercase">
              Conversations
            </Text>
          </Box>
        )}

        {/* Conversations privées */}
        {privates.map((conv) => (
          <ConvItem
            key={conv.id}
            conv={conv}
            isSelected={selectedId === conv.id}
            onSelect={onSelect}
            label={
              conv.otherParticipant
                ? `${conv.otherParticipant.firstName} ${conv.otherParticipant.lastName}`
                : 'Conversation'
            }
            avatarUrl={conv.otherParticipant?.avatarUrl}
          />
        ))}

        {/* État vide */}
        {privates.length === 0 && (
          <Box px={4} py={3}>
            <Text fontSize="xs" color="gray.400">
              Aucune conversation privée
            </Text>
          </Box>
        )}
      </Stack>

      {/* Bouton nouveau */}
      <Box p={3} borderTopWidth="1px" borderColor="gray.100">
        <Flex
          align="center"
          gap={2}
          px={3}
          py={2}
          borderRadius="md"
          cursor="pointer"
          _hover={{ bg: 'blue.50' }}
          color="blue.600"
          fontSize="sm"
          fontWeight="medium"
          onClick={onNewPrivate}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Nouvelle conversation
        </Flex>
      </Box>
    </Flex>
  )
}

// ---- Item individuel ----

interface ConvItemProps {
  conv: Conversation
  isSelected: boolean
  onSelect: (conv: Conversation) => void
  label: string
  icon?: React.ReactNode
  avatarUrl?: string
}

function ConvItem({ conv, isSelected, onSelect, label, icon, avatarUrl }: ConvItemProps) {
  return (
    <Flex
      align="center"
      gap={3}
      px={4}
      py={3}
      cursor="pointer"
      bg={isSelected ? 'blue.50' : 'transparent'}
      borderLeftWidth="3px"
      borderLeftColor={isSelected ? 'blue.500' : 'transparent'}
      _hover={{ bg: isSelected ? 'blue.50' : 'gray.50' }}
      onClick={() => onSelect(conv)}
      transition="background 0.15s"
    >
      {/* Avatar ou icône */}
      {icon ? (
        <Flex
          w={9}
          h={9}
          borderRadius="full"
          bg="blue.100"
          align="center"
          justify="center"
          color="blue.600"
          flexShrink={0}
          fontSize="lg"
        >
          {icon}
        </Flex>
      ) : (
        <Avatar.Root size="sm" flexShrink={0}>
          {avatarUrl ? <Avatar.Image src={avatarUrl} /> : null}
          <Avatar.Fallback name={label} />
        </Avatar.Root>
      )}

      {/* Texte */}
      <Box flex={1} minW={0}>
        <Text
          fontSize="sm"
          fontWeight={conv.unreadCount > 0 ? 'semibold' : 'medium'}
          color="gray.800"
          truncate
        >
          {label}
        </Text>
        {conv.lastMessage && (
          <Text fontSize="xs" color="gray.500" truncate>
            {conv.lastMessage}
          </Text>
        )}
      </Box>

      {/* Badge unread + date */}
      <Flex direction="column" align="flex-end" gap={1} flexShrink={0}>
        {conv.unreadCount > 0 && (
          <Badge colorPalette="red" borderRadius="full" fontSize="xs" px={1.5}>
            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
          </Badge>
        )}
        <Text fontSize="10px" color="gray.400">
          {format(conv.updatedAt, 'HH:mm', { locale: fr })}
        </Text>
      </Flex>
    </Flex>
  )
}
