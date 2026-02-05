import { useState, useEffect } from 'react'
import { Box, Flex, Text, Link, IconButton } from '@chakra-ui/react'

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
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Vérifier si le bandeau a déjà été fermé
    const isDismissed = localStorage.getItem(storageKey)
    if (!isDismissed) {
      setIsVisible(true)
    }
  }, [storageKey])

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
      bg="orange.50"
      borderBottomWidth="1px"
      borderColor="orange.200"
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
        justify="space-between"
        maxW="container.xl"
        mx="auto"
        gap={3}
      >
        <Flex align="center" gap={3} flex={1}>
          <Text fontSize="xl" aria-hidden="true">
            ⚠️
          </Text>
          <Box flex={1}>
            <Text fontSize="sm" fontWeight="medium" color="orange.900">
              Application en cours de développement
            </Text>
            <Text fontSize="sm" color="orange.800">
              Nous travaillons activement sur Unilien. Vos retours sont précieux !{' '}
              <Link
                href="https://airtable.com/invite/l?inviteId=invV4a4jDNkNNtEV2&inviteToken=4e81236d51b20c1ae3753617ad54269e90d82a40eae96781197bdd5f80556238&utm_medium=email&utm_source=product_team&utm_content=transactional-alerts"
                target="_blank"
                rel="noopener noreferrer"
                color="orange.700"
                fontWeight="semibold"
                textDecoration="underline"
                _hover={{
                  color: 'orange.900',
                }}
              >
                Donnez votre avis ici
              </Link>
            </Text>
          </Box>
        </Flex>
        <IconButton
          aria-label="Fermer le bandeau"
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          color="orange.700"
          _hover={{
            bg: 'orange.100',
          }}
        >
          ✕
        </IconButton>
      </Flex>
    </Box>
  )
}
