import { memo } from 'react'
import {
  Box,
  Flex,
  Text,
  Avatar,
  IconButton,
  Image,
  Link,
  Menu,
  Portal,
} from '@chakra-ui/react'
import { format, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { sanitizeText } from '@/lib/sanitize'
import { formatSize } from '@/services/attachmentService'
import type { Attachment, LiaisonMessageWithSender } from '@/types'

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

        {/* Message content — prototype: msg-bubble avec msg-time DANS la bulle */}
        <Box>
          {/* Bubble — prototype: msg-bubble-in / msg-bubble-out, fontSize sm */}
          <Box
            bg={isOwnMessage ? 'brand.500' : 'bg.page'}
            color={isOwnMessage ? 'white' : 'text.default'}
            borderWidth={isOwnMessage ? 0 : '1px'}
            borderColor={isOwnMessage ? undefined : 'border.default'}
            borderRadius="12px"
            borderBottomRightRadius={isOwnMessage ? '4px' : '12px'}
            borderBottomLeftRadius={isOwnMessage ? '12px' : '4px'}
            px={4}
            py={3}
            position="relative"
            css={{
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            {/* Message text — prototype: var(--fs-sm) */}
            {message.content && (
              <Text as="p" fontSize="sm" lineHeight="1.6" whiteSpace="pre-wrap">
                {sanitizeText(message.content)}
              </Text>
            )}

            {/* Attachments */}
            {message.attachments.length > 0 && (
              <Flex direction="column" gap={2} mt={message.content ? 2 : 0}>
                {message.attachments.map((att) => (
                  <AttachmentPreview key={att.id} attachment={att} isOwnMessage={isOwnMessage} />
                ))}
              </Flex>
            )}

            {/* Edited indicator */}
            {message.isEdited && (
              <Text
                as="span"
                fontSize="xs"
                color={isOwnMessage ? 'rgba(255,255,255,0.8)' : 'text.muted'}
                ml={1}
              >
                (modifié)
              </Text>
            )}

            {/* Timestamp — prototype: msg-time DANS la bulle */}
            <Text
              as="time"
              fontSize="xs"
              color={isOwnMessage ? 'rgba(255,255,255,0.6)' : 'text.muted'}
              display="block"
              mt={1}
              dateTime={message.createdAt.toISOString()}
            >
              {formatMessageDate(message.createdAt)}
            </Text>
          </Box>
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
                      color="danger.500"
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

// ============================================
// ATTACHMENT PREVIEW
// ============================================

function AttachmentPreview({ attachment, isOwnMessage }: { attachment: Attachment; isOwnMessage: boolean }) {
  if (attachment.type === 'image') {
    return (
      <Link href={attachment.url} target="_blank" rel="noopener noreferrer">
        <Image
          src={attachment.url}
          alt={attachment.name}
          maxH="200px"
          maxW="300px"
          borderRadius="10px"
          objectFit="cover"
          cursor="pointer"
          _hover={{ opacity: 0.9 }}
        />
      </Link>
    )
  }

  return (
    <Link
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      _hover={{ textDecoration: 'none' }}
    >
      <Flex
        align="center"
        gap={2}
        bg={isOwnMessage ? 'brand.600' : 'bg.page'}
        borderRadius="10px"
        px={3}
        py={2}
        _hover={{ opacity: 0.85 }}
        cursor="pointer"
      >
        <Text flexShrink={0}>
          {attachment.name.endsWith('.pdf') ? '📄' : '📎'}
        </Text>
        <Box flex={1} minW={0}>
          <Text
            fontSize="sm"
            fontWeight="medium"
            color={isOwnMessage ? 'white' : 'text.default'}
            truncate
          >
            {attachment.name}
          </Text>
          <Text fontSize="xs" color={isOwnMessage ? 'whiteAlpha.700' : 'text.muted'}>
            {formatSize(attachment.size)}
          </Text>
        </Box>
      </Flex>
    </Link>
  )
}

export default MessageBubble
