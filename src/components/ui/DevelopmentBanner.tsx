import { useState } from 'react'
import { Box, Flex, Text, IconButton } from '@chakra-ui/react'

interface DevelopmentBannerProps {
  /** Clé unique pour le localStorage */
  storageKey?: string
  /** Callback appelé lorsque le bandeau est fermé */
  onDismiss?: () => void
}

/**
 * Bandeau d'avertissement pour informer que l'application est en développement
 * Peut être fermé par l'utilisateur et ne réapparaît pas ensuite (localStorage)
 */
export function DevelopmentBanner({ storageKey = 'unilien_dev_banner_dismissed', onDismiss }: DevelopmentBannerProps) {
  // Initialiser isVisible directement depuis localStorage
  const [isVisible, setIsVisible] = useState(() => {
    const isDismissed = localStorage.getItem(storageKey)
    return !isDismissed
  })

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true')
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) {
    return null
  }

  return (
    <Box
      bg="gray.800"
      py={3}
      px={4}
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={101}
    >
      <Flex
        align="center"
        justify="center"
        maxW="container.xl"
        mx="auto"
        gap={3}
        position="relative"
      >
        <Text fontSize="sm" fontWeight="semibold" color="white">
          Unilien <Text as="span" color="green.300">Beta 1.0</Text>
        </Text>
        <IconButton
          position="absolute"
          right={0}
          aria-label="Fermer le bandeau"
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          color="gray.300"
          borderRadius="10px"
          _hover={{
            bg: 'gray.700',
            color: 'white',
          }}
        >
          ✕
        </IconButton>
      </Flex>
    </Box>
  )
}
