import { Box, Stack, Flex, Text, Switch, Slider, HStack } from '@chakra-ui/react'
import { useAccessibilityStore } from '@/stores/authStore'
import type { AccessibilitySettings } from '@/types'

interface AccessibilitySetting {
  key: keyof Omit<AccessibilitySettings, 'textScale'>
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

const SCALE_MIN = 80
const SCALE_MAX = 130
const SCALE_STEP = 5

export function AccessibilitySection() {
  const { settings, updateSettings } = useAccessibilityStore()

  const handleToggle = (key: keyof Omit<AccessibilitySettings, 'textScale'>) => {
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
        {/* Taille du texte — slider */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <HStack justify="space-between" mb={3}>
            <Box>
              <Text fontWeight="medium" mb={1}>Taille du texte</Text>
              <Text fontSize="sm" color="gray.600">
                Ajustez la taille de police dans toute l'application
              </Text>
            </Box>
            <Text fontWeight="semibold" minW="45px" textAlign="right" color="brand.600">
              {settings.textScale}%
            </Text>
          </HStack>
          <Slider.Root
            min={SCALE_MIN}
            max={SCALE_MAX}
            step={SCALE_STEP}
            value={[settings.textScale]}
            onValueChange={(details) => updateSettings({ textScale: details.value[0] })}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0}>
                <Slider.HiddenInput aria-label="Taille du texte" />
              </Slider.Thumb>
            </Slider.Control>
            <Slider.MarkerGroup>
              <Slider.Marker value={80}><Text fontSize="xs" color="gray.400">80%</Text></Slider.Marker>
              <Slider.Marker value={100}><Text fontSize="xs" color="gray.400">100%</Text></Slider.Marker>
              <Slider.Marker value={130}><Text fontSize="xs" color="gray.400">130%</Text></Slider.Marker>
            </Slider.MarkerGroup>
          </Slider.Root>
        </Box>

        {/* Toggles */}
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
