import { useEffect, useState } from 'react'
import { Box, Flex, IconButton, Spinner, Text, VStack, HStack, Badge } from '@chakra-ui/react'
import { NavIcon } from '@/components/ui'
import { VoiceWave } from '@/components/voice/VoiceWave'
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation'
import { listAvailableCommands } from '@/lib/voice/voiceCommands'
import { useAuth } from '@/hooks/useAuth'

export function VoiceNavButton() {
  const { profile } = useAuth()
  const { enabled, status, engine, transcript, matched, error, modelProgress, speechDetected, toggle } = useVoiceNavigation()
  const [showHelp, setShowHelp] = useState(false)

  // Raccourci clavier : Ctrl/Cmd + Shift + V
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        // Affiche le popover même au raccourci clavier, sinon l'utilisateur n'a
        // aucun feedback visuel pendant les 2-4s de transcription Whisper.
        setShowHelp(true)
        toggle()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, toggle])

  if (!enabled || engine === 'unsupported') return null

  const isListening = status === 'listening'
  const isTranscribing = status === 'transcribing'
  const isLoading = status === 'loading-engine' || isTranscribing
  const commands = listAvailableCommands(profile?.role ?? null)

  const statusLabel = (() => {
    switch (status) {
      case 'loading-engine': return modelProgress > 0 ? `Chargement du moteur… ${modelProgress}%` : 'Chargement du moteur…'
      case 'listening': return speechDetected ? 'Je vous écoute…' : 'Parlez maintenant…'
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

          <HStack gap={2} mb={3} align="center" role="status" aria-live="polite">
            {(isLoading || isTranscribing) && (
              <Spinner size="xs" color="brand.500" borderWidth="2px" />
            )}
            <Text fontSize="xs" color="text.muted">
              {statusLabel}
            </Text>
          </HStack>

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
            // Pulse plus douce en couleur brand pendant la transcription :
            // signale visuellement que ça mouline (vs FAB neutre + spinner discret).
            ...(isTranscribing && {
              animation: 'voice-pulse-brand 1.2s ease-in-out infinite',
              '@keyframes voice-pulse-brand': {
                '0%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.45)' },
                '70%': { boxShadow: '0 0 0 12px rgba(99, 102, 241, 0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)' },
              },
            }),
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          {isListening ? (
            <VoiceWave size={22} active={speechDetected} />
          ) : (
            <NavIcon name="mic" size={22} />
          )}
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

        {isTranscribing && (
          <Badge
            colorPalette="brand"
            position="absolute"
            top="-4px"
            right="-4px"
            borderRadius="full"
            fontSize="2xs"
            px={2}
            zIndex={1}
          >
            ANALYSE
          </Badge>
        )}
      </Box>
    </Box>
  )
}

export default VoiceNavButton
