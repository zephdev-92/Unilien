import {
  Box,
  HStack,
  VStack,
  Text,
  Card,
} from '@chakra-ui/react'
import { useAccessibilityStore } from '@/stores/authStore'
import type { AccessibilitySettings } from '@/types'
import { VoiceDiagnosticsCard } from '@/components/voice/VoiceDiagnosticsCard'
import { PanelHeader, ToggleRow } from './SettingsShared'

export function AccessibilitePanel() {
  const { settings, updateSettings } = useAccessibilityStore()

  const handleToggle = (key: keyof Omit<AccessibilitySettings, 'textScale'>) => {
    updateSettings({ [key]: !settings[key] })
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Accessibilité"
        subtitle="Adaptez l'interface à vos besoins pour une meilleure expérience d'utilisation."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Affichage</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow
              label="Contraste élevé"
              description="Renforce le contraste des couleurs pour améliorer la lisibilité."
              checked={settings.highContrast}
              onChange={() => handleToggle('highContrast')}
            />
            <ToggleRow
              label="Texte agrandi"
              description="Augmente la taille du texte dans l'ensemble de l'application."
              checked={settings.largeText}
              onChange={() => handleToggle('largeText')}
            />
            {settings.largeText && (
              <Box py={3} borderBottomWidth="1px" borderColor="border.default">
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" color="text.muted">Taille du texte</Text>
                  <Text fontSize="sm" fontWeight="600" color="brand.500">{settings.textScale}%</Text>
                </HStack>
                <input
                  type="range"
                  min={80}
                  max={150}
                  step={5}
                  value={settings.textScale}
                  onChange={(e) => updateSettings({ textScale: Number(e.target.value) })}
                  aria-label="Taille du texte en pourcentage"
                  style={{ width: '100%', accentColor: 'var(--chakra-colors-brand-500)' }}
                />
                <HStack justify="space-between" mt={1}>
                  <Text fontSize="xs" color="text.muted">80%</Text>
                  <Text fontSize="xs" color="text.muted">150%</Text>
                </HStack>
              </Box>
            )}
            <ToggleRow
              label="Réduire les animations"
              description="Limite les transitions et effets animés pour réduire la fatigue visuelle."
              checked={settings.reducedMotion}
              onChange={() => handleToggle('reducedMotion')}
            />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Assistance</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow
              label="Optimisé lecteur d'écran"
              description="Améliore la compatibilité avec les technologies d'assistance (NVDA, VoiceOver…)."
              checked={settings.screenReaderOptimized}
              onChange={() => handleToggle('screenReaderOptimized')}
            />
            <ToggleRow
              label="Navigation vocale"
              description="Affiche un micro flottant en bas à droite. Dites « planning », « messagerie », « paramètres »… pour naviguer. Sur Chrome/Edge/Safari : reconnaissance native (audio traité par votre navigateur). Sur Firefox : moteur Whisper local (~40 Mo téléchargés une fois, 100 % hors ligne ensuite). Raccourci : Ctrl+Maj+V."
              checked={settings.voiceControlEnabled}
              onChange={() => handleToggle('voiceControlEnabled')}
            />
          </VStack>
        </Card.Body>
      </Card.Root>

      <VoiceDiagnosticsCard />

      <HStack gap={2} align="center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14} aria-hidden="true" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
        <Text fontSize="sm" color="text.muted">Ces paramètres sont enregistrés localement sur votre appareil.</Text>
      </HStack>
    </VStack>
  )
}
