import { Box, Stack, Flex, Text, Switch } from '@chakra-ui/react'
import { useAccessibilityStore } from '@/stores/authStore'
import type { AccessibilitySettings } from '@/types'

interface AccessibilitySetting {
  key: keyof AccessibilitySettings
  label: string
  description: string
}

const accessibilitySettings: AccessibilitySetting[] = [
  {
    key: 'highContrast',
    label: 'Contraste élevé',
    description: 'Augmente le contraste des couleurs pour une meilleure lisibilité',
  },
  {
    key: 'largeText',
    label: 'Texte agrandi',
    description: 'Augmente la taille du texte dans toute l\'application',
  },
  {
    key: 'reducedMotion',
    label: 'Réduire les animations',
    description: 'Désactive ou réduit les animations et transitions',
  },
  {
    key: 'screenReaderOptimized',
    label: 'Optimisé lecteur d\'écran',
    description: 'Améliore la compatibilité avec les lecteurs d\'écran',
  },
  {
    key: 'voiceControlEnabled',
    label: 'Contrôle vocal',
    description: 'Active les commandes vocales (bientôt disponible)',
  },
]

export function AccessibilitySection() {
  const { settings, updateSettings } = useAccessibilityStore()

  const handleToggle = (key: keyof AccessibilitySettings) => {
    updateSettings({ [key]: !settings[key] })
  }

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
    >
      <Text fontSize="xl" fontWeight="semibold" mb={2}>
        Accessibilité
      </Text>
      <Text color="gray.600" mb={6}>
        Personnalisez l'application selon vos besoins
      </Text>

      <Stack gap={4}>
        {accessibilitySettings.map((setting) => (
          <Flex
            key={setting.key}
            justify="space-between"
            align="center"
            p={4}
            bg="gray.50"
            borderRadius="md"
            _hover={{ bg: 'gray.100' }}
          >
            <Box flex={1} pr={4}>
              <Text fontWeight="medium" mb={1}>
                {setting.label}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {setting.description}
              </Text>
            </Box>
            <Switch.Root
              checked={settings[setting.key]}
              onCheckedChange={() => handleToggle(setting.key)}
              disabled={setting.key === 'voiceControlEnabled'}
            >
              <Switch.HiddenInput aria-label={setting.label} />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </Flex>
        ))}
      </Stack>

      <Text fontSize="sm" color="gray.500" mt={6}>
        Ces paramètres sont enregistrés localement sur votre appareil.
      </Text>
    </Box>
  )
}

export default AccessibilitySection
