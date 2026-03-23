import { forwardRef } from 'react'
import {
  Box,
  IconButton,
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

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
          variant="outline"
          onClick={onClick}
          bg="#F3F6F9"
          color="#3D5166"
          borderWidth="1.5px"
          borderColor="#D8E3ED"
          minW="38px"
          minH="38px"
          w="38px"
          h="38px"
          borderRadius="10px"
          _hover={{ bg: '#EDF1F5', borderColor: '#C2D2E0' }}
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
            // Focus styles — outline visible (WCAG 2.4.7)
            '&:focus-visible': {
              outline: '3px solid',
              outlineColor: 'blue.500',
              outlineOffset: '2px',
            },
          }}
        >
          <BellIcon />
        </IconButton>

        {/* Badge count */}
        {hasUnread && !isLoading && (
          <Box
            as="span"
            position="absolute"
            top="-4px"
            right="-4px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            minW="20px"
            h="20px"
            px="5px"
            borderRadius="full"
            bg="#E53E3E"
            color="white"
            fontSize="11px"
            fontWeight="700"
            lineHeight="1"
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
          </Box>
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
