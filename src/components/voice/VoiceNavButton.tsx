import { useEffect, useState } from 'react'
import { Box, Flex, IconButton, Text, VStack, HStack, Badge } from '@chakra-ui/react'
import { NavIcon } from '@/components/ui'
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation'
import { listAvailableCommands } from '@/lib/voice/voiceCommands'
import { useAuth } from '@/hooks/useAuth'

export function VoiceNavButton() {
  const { profile } = useAuth()
  const { enabled, status, engine, transcript, matched, error, modelProgress, toggle } = useVoiceNavigation()
  const [showHelp, setShowHelp] = useState(false)

  // Raccourci clavier : Ctrl/Cmd + Shift + V
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, toggle])

  if (!enabled || engine === 'unsupported') return null

  const isListening = status === 'listening'
  const isLoading = status === 'loading-engine' || status === 'transcribing'
  const commands = listAvailableCommands(profile?.role ?? null)

  const statusLabel = (() => {
    switch (status) {
      case 'loading-engine': return modelProgress > 0 ? `Chargement du moteur… ${modelProgress}%` : 'Chargement du moteur…'
      case 'listening': return 'Parlez maintenant…'
      case 'transcribing': return 'Transcription en cours…'
      case 'error': return error ?? 'Erreur'
      default: return 'Cliquez pour parler'
    }
  })()

  return (
    <Box position="fixed" bottom={{ base: '20px', md: '24px' }} right={{ base: '20px', md: '24px' }} zIndex={400}>
      {(showHelp || transcript || error || isListening || isLoading) && (
        <Box
          position="absolute"
          bottom="72px"
          right={0}
          minW="280px"
          maxW="340px"
          bg="bg.surface"
          borderRadius="md"
          borderWidth="1px"
          borderColor="border.default"
          boxShadow="lg"
          p={4}
        >
          <Flex justify="space-between" align="start" mb={2}>
            <Text fontSize="sm" fontWeight="600" color="text.primary">Navigation vocale</Text>
            <IconButton
              aria-label="Fermer l'aide vocale"
              size="2xs"
              variant="ghost"
              onClick={() => setShowHelp(false)}
            >
              <NavIcon name="close" size={14} />
            </IconButton>
          </Flex>

          <Text fontSize="xs" color="text.muted" mb={3} role="status" aria-live="polite">
            {statusLabel}
          </Text>

          {transcript && (
            <Box mb={3} p={2} bg="bg.surface.hover" borderRadius="sm">
              <Text fontSize="xs" color="text.muted" fontStyle="italic">"{transcript}"</Text>
              {matched && (
                <Text fontSize="xs" color="brand.500" mt={1}>→ {matched.path}</Text>
              )}
            </Box>
          )}

          {error && (
            <Box mb={3} p={2} bg="red.50" borderRadius="sm" borderWidth="1px" borderColor="red.200">
              <Text fontSize="xs" color="red.700" role="alert">{error}</Text>
            </Box>
          )}

          {!isListening && !isLoading && (
            <VStack align="stretch" gap={1}>
              <Text fontSize="2xs" fontWeight="600" color="text.muted" textTransform="uppercase">Commandes disponibles</Text>
              {commands.slice(0, 6).map((cmd) => (
                <HStack key={cmd.path} justify="space-between" gap={2}>
                  <Text fontSize="xs" color="text.secondary" truncate>"{cmd.phrases[0]}"</Text>
                  <Text fontSize="2xs" color="text.muted">{cmd.path}</Text>
                </HStack>
              ))}
              {commands.length > 6 && (
                <Text fontSize="2xs" color="text.muted">+ {commands.length - 6} autres</Text>
              )}
              <Text fontSize="2xs" color="text.muted" mt={2}>
                Raccourci : <kbd>Ctrl</kbd>+<kbd>Maj</kbd>+<kbd>V</kbd>
              </Text>
            </VStack>
          )}
        </Box>
      )}

      <Box position="relative">
        <IconButton
          aria-label={isListening ? 'Arrêter la navigation vocale' : 'Démarrer la navigation vocale'}
          aria-pressed={isListening}
          onClick={() => {
            setShowHelp(true)
            toggle()
          }}
          loading={isLoading}
          colorPalette={isListening ? 'red' : 'brand'}
          variant="solid"
          borderRadius="full"
          size="lg"
          boxShadow="lg"
          css={{
            ...(isListening && {
              animation: 'voice-pulse 1.5s ease-in-out infinite',
              '@keyframes voice-pulse': {
                '0%': { boxShadow: '0 0 0 0 rgba(229, 62, 62, 0.5)' },
                '70%': { boxShadow: '0 0 0 16px rgba(229, 62, 62, 0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(229, 62, 62, 0)' },
              },
            }),
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <NavIcon name={isListening ? 'mic-off' : 'mic'} size={22} />
        </IconButton>

        {isListening && (
          <Badge
            colorPalette="red"
            position="absolute"
            top="-4px"
            right="-4px"
            borderRadius="full"
            fontSize="2xs"
            px={2}
            zIndex={1}
          >
            REC
          </Badge>
        )}
      </Box>
    </Box>
  )
}

export default VoiceNavButton
