import { forwardRef } from 'react'
import {
  Box,
  IconButton,
  Badge,
  VisuallyHidden,
} from '@chakra-ui/react'

// ============================================
// PROPS
// ============================================

export interface NotificationBellProps {
  /** Number of unread notifications */
  unreadCount: number
  /** Click handler */
  onClick: () => void
  /** Whether the panel is open */
  isOpen?: boolean
  /** Whether notifications are loading */
  isLoading?: boolean
}

// ============================================
// BELL ICON
// ============================================

function BellIcon({ hasUnread }: { hasUnread: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      {hasUnread && (
        <circle
          cx="18"
          cy="6"
          r="3"
          fill="currentColor"
          stroke="none"
        >
          <animate
            attributeName="opacity"
            values="1;0.5;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </svg>
  )
}

// ============================================
// COMPONENT
// ============================================

export const NotificationBell = forwardRef<HTMLButtonElement, NotificationBellProps>(
  ({ unreadCount, onClick, isOpen = false, isLoading = false }, ref) => {
    const hasUnread = unreadCount > 0
    const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString()

    return (
      <Box position="relative">
        <IconButton
          ref={ref}
          aria-label={
            hasUnread
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Notifications'
          }
          aria-expanded={isOpen}
          aria-haspopup="menu"
          variant="ghost"
          onClick={onClick}
          color={hasUnread ? 'blue.500' : 'gray.600'}
          minW="44px"
          minH="44px"
          borderRadius="full"
          position="relative"
          css={{
            // Subtle animation when has unread
            ...(hasUnread && {
              animation: 'subtle-shake 3s ease-in-out infinite',
              '@keyframes subtle-shake': {
                '0%, 100%': { transform: 'rotate(0deg)' },
                '5%': { transform: 'rotate(10deg)' },
                '10%': { transform: 'rotate(-10deg)' },
                '15%': { transform: 'rotate(5deg)' },
                '20%': { transform: 'rotate(0deg)' },
              },
            }),
            // Reduced motion
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
            // Focus styles
            '&:focus-visible': {
              boxShadow: '0 0 0 3px rgba(0, 86, 224, 0.6)',
              outline: 'none',
            },
          }}
        >
          <BellIcon hasUnread={hasUnread} />
        </IconButton>

        {/* Badge */}
        {hasUnread && !isLoading && (
          <Badge
            colorPalette="red"
            position="absolute"
            top="-2px"
            right="-2px"
            borderRadius="full"
            minW="20px"
            h="20px"
            fontSize="xs"
            fontWeight="bold"
            display="flex"
            alignItems="center"
            justifyContent="center"
            pointerEvents="none"
            css={{
              animation: 'badge-pop 0.3s ease-out',
              '@keyframes badge-pop': {
                '0%': { transform: 'scale(0)' },
                '50%': { transform: 'scale(1.2)' },
                '100%': { transform: 'scale(1)' },
              },
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
              },
            }}
          >
            {displayCount}
          </Badge>
        )}

        {/* Screen reader announcement */}
        <VisuallyHidden>
          <span role="status" aria-live="polite">
            {hasUnread
              ? `Vous avez ${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Aucune nouvelle notification'}
          </span>
        </VisuallyHidden>
      </Box>
    )
  }
)

NotificationBell.displayName = 'NotificationBell'

export default NotificationBell
