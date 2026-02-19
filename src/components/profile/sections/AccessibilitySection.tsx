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

const SCALE_MIN = 80
const SCALE_MAX = 150
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
        {accessibilitySettings.map((setting) => (
          <Box key={setting.key}>
            <Flex
              justify="space-between"
              align="center"
              p={4}
              bg="gray.50"
              borderRadius={settings.largeText && setting.key === 'largeText' ? 'md md 0 0' : 'md'}
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

            {/* Slider taille de police — affiché sous le toggle largeText quand actif */}
            {setting.key === 'largeText' && settings.largeText && (
              <Box
                px={4}
                pt={3}
                pb={4}
                bg="gray.50"
                borderTopWidth="1px"
                borderTopColor="gray.200"
                borderRadius="0 0 md md"
              >
                <HStack justify="space-between" mb={3}>
                  <Text fontSize="sm" color="gray.600">Taille choisie</Text>
                  <Text fontSize="sm" fontWeight="semibold" color="brand.600">
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
                    <Slider.Marker value={150}><Text fontSize="xs" color="gray.400">150%</Text></Slider.Marker>
                  </Slider.MarkerGroup>
                </Slider.Root>
              </Box>
            )}
          </Box>
        ))}
      </Stack>

      <Text fontSize="sm" color="gray.500" mt={6}>
        Ces paramètres sont enregistrés localement sur votre appareil.
      </Text>
    </Box>
  )
}

export default AccessibilitySection
