import { Box, Button, Card, HStack, Stack, Text, VStack } from '@chakra-ui/react'
import { useAccessibilityStore } from '@/stores/authStore'
import { useVoiceDiagnosticsStore } from '@/stores/voiceDiagnosticsStore'
import { isProdHost } from '@/lib/env'

/**
 * Carte "Diagnostic vocal" — masquée en production, visible en préprod et en
 * dev quand le contrôle vocal est activé. Affiche :
 *  - les 10 dernières transcriptions Whisper qui n'ont pas matché une
 *    commande (variantes phonétiques manquantes) ;
 *  - les 5 derniers classements du classifier acoustique : pour chaque
 *    commande candidate, sa log-probabilité moyenne (forced-decoding
 *    Whisper). Permet de calibrer le scoring sans la console devtools.
 *
 * Les données sont en RAM (non persistées) et vidées au reload — pas
 * de fuite dans localStorage. Cible : utilisateurs à élocution
 * atypique qui veulent comprendre pourquoi une commande échoue.
 */
export function VoiceDiagnosticsCard() {
  const voiceEnabled = useAccessibilityStore((s) => s.settings.voiceControlEnabled)
  const entries = useVoiceDiagnosticsStore((s) => s.entries)
  const classifications = useVoiceDiagnosticsStore((s) => s.classifications)
  const clear = useVoiceDiagnosticsStore((s) => s.clear)

  // Outil de calibration : masqué en prod, gardé en préprod et en dev.
  if (!voiceEnabled || isProdHost()) return null

  const hasData = entries.length > 0 || classifications.length > 0

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

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
          {hasData && (
            <Button size="sm" variant="ghost" onClick={clear}>
              Effacer
            </Button>
          )}
        </HStack>
      </Card.Header>

      {hasData && (
        <Card.Body p={4}>
          <Stack gap={6}>
            {entries.length > 0 && (
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
                        {formatTime(entry.timestamp)}
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
            )}

            {classifications.length > 0 && (
              <Stack gap={3}>
                <Text fontWeight="700" fontSize="sm" fontFamily="heading">
                  Classement du classifier acoustique
                </Text>
                {classifications.map((entry) => (
                  <ClassificationBlock key={entry.id} entry={entry} formatTime={formatTime} />
                ))}
              </Stack>
            )}
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

function ClassificationBlock({
  entry,
  formatTime,
}: {
  entry: { id: string; timestamp: number; scores: { phrase: string; avgLogProb: number }[] }
  formatTime: (ts: number) => string
}) {
  // Scores triés meilleur d'abord ; on borne l'échelle de la barre entre le
  // meilleur et le pire score de cet essai pour rendre l'écart lisible.
  const best = entry.scores[0]?.avgLogProb ?? 0
  const worst = entry.scores[entry.scores.length - 1]?.avgLogProb ?? -1
  const span = best - worst || 1

  return (
    <Box
      p={3}
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.default"
      bg="bg.subtle"
    >
      <HStack justify="space-between" align="baseline" mb={2}>
        <Text fontWeight="600" fontSize="sm">
          Gagnant : « {entry.scores[0]?.phrase} »
        </Text>
        <Text fontSize="xs" color="text.muted">
          {formatTime(entry.timestamp)}
        </Text>
      </HStack>
      <VStack align="stretch" gap={1}>
        {entry.scores.map((score, i) => {
          const ratio = (score.avgLogProb - worst) / span
          return (
            <HStack key={score.phrase} gap={2} align="center">
              <Text
                fontSize="xs"
                fontWeight={i === 0 ? '700' : '500'}
                color={i === 0 ? 'brand.fg' : 'text.default'}
                minW="110px"
              >
                {score.phrase}
              </Text>
              <Box flex="1" h="6px" borderRadius="full" bg="bg.muted" overflow="hidden">
                <Box
                  h="full"
                  borderRadius="full"
                  bg={i === 0 ? 'brand.solid' : 'border.emphasized'}
                  width={`${Math.max(2, ratio * 100)}%`}
                />
              </Box>
              <Text fontSize="xs" color="text.muted" minW="48px" textAlign="right">
                {score.avgLogProb.toFixed(2)}
              </Text>
            </HStack>
          )
        })}
      </VStack>
    </Box>
  )
}

export default VoiceDiagnosticsCard
