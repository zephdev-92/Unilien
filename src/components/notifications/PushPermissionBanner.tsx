import { useState } from 'react'
import {
  Box,
  Flex,
  Text,
  Button,
  CloseButton,
} from '@chakra-ui/react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

// ============================================
// ICONS
// ============================================

function BellIcon() {
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
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20,6 9,17 4,12" />
    </svg>
  )
}

// ============================================
// PROPS
// ============================================

export interface PushPermissionBannerProps {
  userId: string | null
  /** Called when user dismisses the banner */
  onDismiss?: () => void
  /** Called when subscription succeeds */
  onSubscribed?: () => void
}

// ============================================
// LOCAL STORAGE KEY
// ============================================

const DISMISSED_KEY = 'unilien_push_banner_dismissed'

function wasBannerDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

function setBannerDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, 'true')
  } catch {
    // Ignore storage errors
  }
}

// ============================================
// COMPONENT
// ============================================

export function PushPermissionBanner({
  userId,
  onDismiss,
  onSubscribed,
}: PushPermissionBannerProps) {
  const [isDismissed, setIsDismissed] = useState(() => wasBannerDismissed())

  const {
    isSupported,
    isConfigured,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
  } = usePushNotifications({ userId })

  // Don't show if:
  // - Banner was dismissed
  // - Push not supported
  // - VAPID not configured
  // - Already subscribed
  // - Permission denied (user explicitly blocked)
  if (
    isDismissed ||
    !isSupported ||
    !isConfigured ||
    isSubscribed ||
    permission === 'denied'
  ) {
    return null
  }

  const handleSubscribe = async () => {
    const success = await subscribe()
    if (success) {
      onSubscribed?.()
    }
  }

  const handleDismiss = () => {
    setBannerDismissed()
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <Box
      bg="blue.50"
      borderRadius="lg"
      p={4}
      mb={4}
      borderWidth="1px"
      borderColor="blue.200"
      role="alert"
      aria-live="polite"
    >
      <Flex align="flex-start" gap={3}>
        {/* Icon */}
        <Box
          color="blue.500"
          mt={0.5}
          flexShrink={0}
        >
          <BellIcon />
        </Box>

        {/* Content */}
        <Box flex={1}>
          <Text fontWeight="semibold" color="blue.800" mb={1}>
            Activer les notifications
          </Text>
          <Text fontSize="sm" color="blue.700" mb={3}>
            Recevez des alertes en temps réel pour les nouvelles interventions,
            messages urgents et rappels importants.
          </Text>

          {/* Error message */}
          {error && (
            <Text fontSize="sm" color="red.600" mb={2}>
              {error}
            </Text>
          )}

          {/* Actions */}
          <Flex gap={2} flexWrap="wrap">
            <Button
              size="sm"
              colorPalette="blue"
              onClick={handleSubscribe}
              loading={isLoading}
              loadingText="Activation..."
            >
              <CheckIcon />
              <Text ml={1}>Activer</Text>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              colorPalette="blue"
              onClick={handleDismiss}
            >
              Plus tard
            </Button>
          </Flex>
        </Box>

        {/* Close button */}
        <CloseButton
          size="sm"
          onClick={handleDismiss}
          aria-label="Fermer"
          color="blue.600"
        />
      </Flex>
    </Box>
  )
}

export default PushPermissionBanner
