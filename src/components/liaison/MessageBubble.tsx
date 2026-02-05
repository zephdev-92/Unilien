import { memo } from 'react'
import {
  Box,
  Flex,
  Text,
  Avatar,
  Badge,
  IconButton,
  Menu,
  Portal,
} from '@chakra-ui/react'
import { format, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { LiaisonMessageWithSender, UserRole } from '@/types'

// ============================================
// PROPS
// ============================================

export interface MessageBubbleProps {
  message: LiaisonMessageWithSender
  isOwnMessage: boolean
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
}

// ============================================
// ROLE BADGE COLORS
// ============================================

const roleBadgeColors: Record<UserRole, string> = {
  employer: 'purple',
  employee: 'blue',
  caregiver: 'green',
}

const roleLabels: Record<UserRole, string> = {
  employer: 'Employeur',
  employee: 'Auxiliaire',
  caregiver: 'Aidant',
}

// ============================================
// MENU ICON
// ============================================

function MoreIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}

// ============================================
// FORMAT DATE
// ============================================

function formatMessageDate(date: Date): string {
  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: fr })
  }
  if (isYesterday(date)) {
    return `Hier ${format(date, 'HH:mm', { locale: fr })}`
  }
  return format(date, 'dd MMM HH:mm', { locale: fr })
}

// ============================================
// COMPONENT
// ============================================

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const senderName = message.sender
    ? `${message.sender.firstName} ${message.sender.lastName}`
    : 'Utilisateur'

  const isRead = message.readBy.length > 1 ||
    (message.readBy.length === 1 && message.readBy[0] !== message.senderId)

  return (
    <Flex
      justify={isOwnMessage ? 'flex-end' : 'flex-start'}
      w="full"
      px={2}
      mb={3}
    >
      <Flex
        maxW={{ base: '85%', md: '70%' }}
        direction={isOwnMessage ? 'row-reverse' : 'row'}
        gap={2}
      >
        {/* Avatar */}
        {!isOwnMessage && (
          <Avatar.Root size="sm" mt={1}>
            <Avatar.Fallback>
              {message.sender?.firstName?.[0] || '?'}
            </Avatar.Fallback>
            {message.sender?.avatarUrl && (
              <Avatar.Image src={message.sender.avatarUrl} alt={senderName} />
            )}
          </Avatar.Root>
        )}

        {/* Message content */}
        <Box>
          {/* Sender info (for others' messages) */}
          {!isOwnMessage && (
            <Flex align="center" gap={2} mb={1} px={1}>
              <Text fontSize="xs" fontWeight="medium" color="gray.600">
                {senderName}
              </Text>
              <Badge
                colorPalette={roleBadgeColors[message.senderRole]}
                size="sm"
                fontSize="2xs"
              >
                {roleLabels[message.senderRole]}
              </Badge>
            </Flex>
          )}

          {/* Bubble */}
          <Box
            bg={isOwnMessage ? 'blue.500' : 'gray.100'}
            color={isOwnMessage ? 'white' : 'gray.900'}
            borderRadius="2xl"
            borderTopRightRadius={isOwnMessage ? 'sm' : '2xl'}
            borderTopLeftRadius={isOwnMessage ? '2xl' : 'sm'}
            px={4}
            py={2}
            position="relative"
            css={{
              // Ensure proper text wrapping
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            {/* Message text */}
            <Text fontSize="md" whiteSpace="pre-wrap">
              {message.content}
            </Text>

            {/* Edited indicator */}
            {message.isEdited && (
              <Text
                as="span"
                fontSize="xs"
                color={isOwnMessage ? 'blue.100' : 'gray.500'}
                ml={1}
              >
                (modifié)
              </Text>
            )}
          </Box>

          {/* Timestamp and status */}
          <Flex
            justify={isOwnMessage ? 'flex-end' : 'flex-start'}
            align="center"
            gap={1}
            mt={1}
            px={1}
          >
            <Text fontSize="xs" color="gray.500">
              {formatMessageDate(message.createdAt)}
            </Text>

            {/* Read indicator for own messages */}
            {isOwnMessage && (
              <Text fontSize="xs" color={isRead ? 'blue.500' : 'gray.400'}>
                {isRead ? '✓✓' : '✓'}
              </Text>
            )}
          </Flex>
        </Box>

        {/* Actions menu (own messages only) */}
        {isOwnMessage && (onEdit || onDelete) && (
          <Menu.Root>
            <Menu.Trigger asChild>
              <IconButton
                aria-label="Options du message"
                variant="ghost"
                size="xs"
                opacity={0}
                _groupHover={{ opacity: 1 }}
                css={{
                  transition: 'opacity 0.2s',
                }}
              >
                <MoreIcon />
              </IconButton>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content minW="120px">
                  {onEdit && (
                    <Menu.Item
                      value="edit"
                      onClick={() => onEdit(message.id)}
                    >
                      Modifier
                    </Menu.Item>
                  )}
                  {onDelete && (
                    <Menu.Item
                      value="delete"
                      onClick={() => onDelete(message.id)}
                      color="red.600"
                    >
                      Supprimer
                    </Menu.Item>
                  )}
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        )}
      </Flex>
    </Flex>
  )
})

export default MessageBubble
