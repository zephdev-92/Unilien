import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Flex,
  Text,
  Stack,
  Badge,
  IconButton,
  Spinner,
  Center,
  VisuallyHidden,
} from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { sanitizeText } from '@/lib/sanitize'
import type { Notification, NotificationType, NotificationPriority } from '@/types'

// ============================================
// PROPS
// ============================================

export interface NotificationsPanelProps {
  /** List of notifications */
  notifications: Notification[]
  /** Whether panel is open */
  isOpen: boolean
  /** Close panel handler */
  onClose: () => void
  /** Mark notification as read */
  onMarkAsRead: (id: string) => void
  /** Mark all as read */
  onMarkAllAsRead: () => void
  /** Dismiss notification */
  onDismiss: (id: string) => void
  /** Dismiss all notifications */
  onDismissAll: () => void
  /** Loading state */
  isLoading?: boolean
}

// ============================================
// ICONS
// ============================================

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

// ============================================
// TYPE ICONS & COLORS
// ============================================

const typeConfig: Record<NotificationType, { icon: string; color: string }> = {
  compliance_critical: { icon: '🚨', color: 'red' },
  compliance_warning: { icon: '⚠️', color: 'orange' },
  compliance_resolved: { icon: '✅', color: 'green' },
  shift_created: { icon: '📅', color: 'blue' },
  shift_cancelled: { icon: '❌', color: 'gray' },
  shift_reminder: { icon: '⏰', color: 'purple' },
  message_received: { icon: '💬', color: 'cyan' },
  team_member_added: { icon: '👥', color: 'teal' },
  team_member_removed: { icon: '👤', color: 'red' },
  contract_created: { icon: '📝', color: 'green' },
  contract_terminated: { icon: '📋', color: 'red' },
  logbook_urgent: { icon: '🚨', color: 'red' },
  logbook_entry_directed: { icon: '📌', color: 'blue' },
  permissions_updated: { icon: '🔑', color: 'purple' },
  shift_modified: { icon: '✏️', color: 'orange' },
  absence_requested: { icon: '🏥', color: 'orange' },
  absence_resolved: { icon: '📋', color: 'green' },
  system: { icon: '🔔', color: 'gray' },
}

const priorityColors: Record<NotificationPriority, string> = {
  low: 'gray',
  normal: 'blue',
  high: 'orange',
  urgent: 'red',
}

// ============================================
// NOTIFICATION ITEM
// ============================================

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: () => void
  onDismiss: () => void
  onClick: () => void
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onClick,
}: NotificationItemProps) {
  const config = typeConfig[notification.type] || typeConfig.system
  const timeAgo = formatDistanceToNow(notification.createdAt, {
    addSuffix: true,
    locale: fr,
  })

  return (
    <Box
      as="article"
      bg={notification.isRead ? 'white' : 'blue.50'}
      borderRadius="md"
      p={3}
      borderLeftWidth="3px"
      borderLeftColor={`${config.color}.500`}
      position="relative"
      role="listitem"
      aria-label={notification.title}
      css={{
        transition: 'background-color 0.2s',
        '&:hover': {
          bg: notification.isRead ? 'gray.50' : 'blue.100',
        },
      }}
    >
      <Flex gap={3}>
        {/* Type icon */}
        <Text fontSize="xl" aria-hidden="true">
          {config.icon}
        </Text>

        {/* Content */}
        <Box flex={1} minW={0}>
          <Flex align="center" gap={2} mb={1}>
            <Text
              fontWeight={notification.isRead ? 'normal' : 'semibold'}
              fontSize="sm"
              lineClamp={1}
              cursor={notification.actionUrl ? 'pointer' : 'default'}
              onClick={notification.actionUrl ? onClick : undefined}
              _hover={notification.actionUrl ? { textDecoration: 'underline' } : {}}
            >
              {notification.title}
            </Text>
            {notification.priority !== 'normal' && (
              <Badge
                colorPalette={priorityColors[notification.priority]}
                size="sm"
                fontSize="2xs"
              >
                {notification.priority === 'urgent' ? 'Urgent' :
                 notification.priority === 'high' ? 'Important' : 'Info'}
              </Badge>
            )}
          </Flex>

          <Text
            fontSize="sm"
            color="gray.600"
            lineClamp={2}
            cursor={notification.actionUrl ? 'pointer' : 'default'}
            onClick={notification.actionUrl ? onClick : undefined}
          >
            {sanitizeText(notification.message)}
          </Text>

          <Text fontSize="xs" color="gray.500" mt={1}>
            {timeAgo}
          </Text>
        </Box>

        {/* Actions */}
        <Flex direction="column" gap={1}>
          {!notification.isRead && (
            <IconButton
              aria-label="Marquer comme lu"
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation()
                onMarkAsRead()
              }}
              color="blue.500"
            >
              <CheckIcon />
            </IconButton>
          )}
          <IconButton
            aria-label="Supprimer"
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            color="gray.500"
            _hover={{ color: 'red.500' }}
          >
            <CloseIcon />
          </IconButton>
        </Flex>
      </Flex>
    </Box>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function NotificationsPanel({
  notifications,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onDismissAll,
  isLoading = false,
}: NotificationsPanelProps) {
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    // Delay to avoid immediate close on bell click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
      onClose()
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const hasNotifications = notifications.length > 0

  if (!isOpen) return null

  return (
    <Box
      ref={panelRef}
      position="absolute"
      top="100%"
      right={0}
      mt={2}
      w={{ base: '100vw', sm: '380px' }}
      maxW="100vw"
      maxH="500px"
      bg="white"
      borderRadius="lg"
      boxShadow="xl"
      borderWidth="1px"
      borderColor="gray.200"
      overflow="hidden"
      zIndex={1000}
      role="dialog"
      aria-label="Panneau des notifications"
    >
      {/* Header */}
      <Flex
        px={4}
        py={3}
        bg="gray.50"
        borderBottomWidth="1px"
        borderColor="gray.200"
        justify="space-between"
        align="center"
      >
        <Flex align="center" gap={2}>
          <Text fontWeight="semibold">Notifications</Text>
          {unreadCount > 0 && (
            <Badge colorPalette="blue" borderRadius="full">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
        </Flex>

        <Flex gap={1}>
          {unreadCount > 0 && (
            <IconButton
              aria-label="Tout marquer comme lu"
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              title="Tout marquer comme lu"
            >
              <CheckIcon />
            </IconButton>
          )}
          {hasNotifications && (
            <IconButton
              aria-label="Effacer tout"
              variant="ghost"
              size="sm"
              onClick={onDismissAll}
              title="Effacer toutes les notifications"
              color="gray.500"
              _hover={{ color: 'red.500' }}
            >
              <TrashIcon />
            </IconButton>
          )}
          <IconButton
            aria-label="Fermer"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </Flex>
      </Flex>

      {/* Content */}
      <Box maxH="400px" overflowY="auto" p={2}>
        {isLoading ? (
          <Center py={8}>
            <Spinner size="md" color="blue.500" />
          </Center>
        ) : !hasNotifications ? (
          <Center py={8}>
            <Box textAlign="center">
              <Text fontSize="3xl" mb={2}>🔔</Text>
              <Text color="gray.500" fontSize="sm">
                Aucune notification
              </Text>
            </Box>
          </Center>
        ) : (
          <Stack gap={2} role="list">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => onMarkAsRead(notification.id)}
                onDismiss={() => onDismiss(notification.id)}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </Stack>
        )}
      </Box>

      {/* Screen reader announcements */}
      <VisuallyHidden>
        <div aria-live="polite" aria-atomic="true">
          {isOpen && `Panneau de notifications ouvert. ${notifications.length} notifications.`}
        </div>
      </VisuallyHidden>
    </Box>
  )
}

export default NotificationsPanel
