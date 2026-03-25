import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Flex, Text } from '@chakra-ui/react'
import { PrimaryButton } from './PrimaryButton'
import { GhostButton } from './GhostButton'

const CONSENT_KEY = 'unilien-cookie-consent'

interface ConsentState {
  accepted: boolean
  date: string
}

function getConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveConsent() {
  const state: ConsentState = { accepted: true, date: new Date().toISOString() }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state))
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!getConsent()) setVisible(true)
  }, [])

  if (!visible) return null

  const handleAccept = () => {
    saveConsent()
    setVisible(false)
  }

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={9999}
      bg="bg.surface"
      borderTopWidth="1px"
      borderColor="border.default"
      boxShadow="lg"
      px={{ base: 4, md: 8 }}
      py={4}
    >
      <Flex
        maxW="1200px"
        mx="auto"
        direction={{ base: 'column', md: 'row' }}
        align={{ base: 'stretch', md: 'center' }}
        gap={4}
      >
        <Box flex={1}>
          <Text fontSize="sm" fontWeight="600" mb={1} color="text.default">
            Cookies &amp; confidentialité
          </Text>
          <Text fontSize="xs" color="text.inactive" lineHeight="1.6">
            Unilien utilise uniquement des cookies strictement nécessaires au fonctionnement
            de l&apos;application (authentification, préférences d&apos;affichage).
            Aucun cookie publicitaire ou de suivi n&apos;est utilisé.
            Vos données de santé sont protégées conformément au RGPD.
          </Text>
        </Box>
        <Flex gap={2} flexShrink={0} align="center">
          <GhostButton
            as={RouterLink}
            to="/mentions-legales"
            size="sm"
            fontSize="xs"
          >
            En savoir plus
          </GhostButton>
          <PrimaryButton
            size="sm"
            fontSize="xs"
            onClick={handleAccept}
          >
            J&apos;ai compris
          </PrimaryButton>
        </Flex>
      </Flex>
    </Box>
  )
}
