import { Box, Button, Card, HStack, Stack, Text, VStack } from '@chakra-ui/react'
import { useAccessibilityStore } from '@/stores/authStore'
import { useVoiceDiagnosticsStore } from '@/stores/voiceDiagnosticsStore'

/**
 * Carte "Diagnostic vocal" — visible uniquement quand le contrôle vocal
 * est activé. Affiche les 10 dernières transcriptions Whisper qui n'ont
 * pas matché une commande, pour aider à identifier les variantes
 * phonétiques manquantes (ex : Whisper transcrit "tablo de bord" au
 * lieu de "tableau de bord").
 *
 * Les données sont en RAM (non persistées) et vidées au reload — pas
 * de fuite dans localStorage. Cible : utilisateurs à élocution
 * atypique qui veulent comprendre pourquoi une commande échoue.
 */
export function VoiceDiagnosticsCard() {
  const voiceEnabled = useAccessibilityStore((s) => s.settings.voiceControlEnabled)
  const entries = useVoiceDiagnosticsStore((s) => s.entries)
  const clear = useVoiceDiagnosticsStore((s) => s.clear)

  if (!voiceEnabled) return null

  return (
    <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
      <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <HStack justify="space-between" align="center">
          <Box>
            <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">
              Diagnostic vocal
            </Card.Title>
            <Text fontSize="sm" color="text.muted" mt={1}>
              {entries.length === 0
                ? 'Aucune commande non reconnue pour le moment.'
                : `${entries.length} commande${entries.length > 1 ? 's' : ''} non reconnue${entries.length > 1 ? 's' : ''} dans cette session.`}
            </Text>
          </Box>
          {entries.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clear}>
              Effacer
            </Button>
          )}
        </HStack>
      </Card.Header>

      {entries.length > 0 && (
        <Card.Body p={4}>
          <Stack gap={3}>
            {entries.map((entry) => (
              <Box
                key={entry.id}
                p={3}
                borderRadius="md"
                borderWidth="1px"
                borderColor="border.default"
                bg="bg.subtle"
              >
                <HStack justify="space-between" align="baseline" mb={1}>
                  <Text fontWeight="600" fontSize="sm">
                    « {entry.primary} »
                  </Text>
                  <Text fontSize="xs" color="text.muted">
                    {new Date(entry.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </Text>
                </HStack>
                {entry.alternatives.length > 1 && (
                  <VStack align="stretch" gap={0} mt={1}>
                    <Text fontSize="xs" color="text.muted">
                      Autres possibilités entendues :
                    </Text>
                    <Text fontSize="xs" color="text.muted" fontStyle="italic">
                      {entry.alternatives
                        .slice(1)
                        .map((alt) => `« ${alt} »`)
                        .join(' · ')}
                    </Text>
                  </VStack>
                )}
              </Box>
            ))}
          </Stack>
          <Text fontSize="xs" color="text.muted" mt={4}>
            Ces données sont temporaires et ne quittent pas votre appareil. Elles servent à
            comprendre pourquoi une commande échoue et à enrichir la reconnaissance vocale.
          </Text>
        </Card.Body>
      )}
    </Card.Root>
  )
}

export default VoiceDiagnosticsCard
