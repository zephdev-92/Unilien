import { useEffect } from 'react'
import { Box, HStack } from '@chakra-ui/react'

interface VoiceWaveProps {
  /** Hauteur totale de l'onde en px (default 22, aligné sur l'icône mic). */
  size?: number
  /** Couleur des barres (default white pour fond rouge). */
  color?: string
  /**
   * `true` = parole détectée → barres dansent.
   * `false` = mic ouvert mais silence → barres figées basses (état d'attente).
   */
  active?: boolean
}

const BARS = [
  { duration: '0.65s', delay: '0s', anim: 'voice-wave-a' },
  { duration: '0.78s', delay: '0.08s', anim: 'voice-wave-b' },
  { duration: '0.55s', delay: '0.18s', anim: 'voice-wave-b' },
  { duration: '0.70s', delay: '0.04s', anim: 'voice-wave-a' },
]

const STYLE_ID = 'voice-wave-keyframes'
const KEYFRAMES_CSS = `
@keyframes voice-wave-a {
  0%, 100% { transform: scaleY(0.30); }
  50% { transform: scaleY(0.85); }
}
@keyframes voice-wave-b {
  0%, 100% { transform: scaleY(0.40); }
  50% { transform: scaleY(1.0); }
}
`

/**
 * Onde animée pendant l'écoute. En mode passif (silence) : barres basses figées.
 * En mode actif (parole détectée par Silero VAD) : barres montent/descendent
 * avec timings individualisés. Respecte prefers-reduced-motion.
 */
export function VoiceWave({ size = 22, color = 'white', active = false }: VoiceWaveProps) {
  // Injecte les @keyframes globaux une seule fois — le css prop de Chakra
  // n'extrait pas les règles @keyframes définies dynamiquement par clé.
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = KEYFRAMES_CSS
    document.head.appendChild(style)
  }, [])

  const barWidth = 3
  const gap = 3

  return (
    <HStack
      gap={`${gap}px`}
      align="center"
      justify="center"
      h={`${size}px`}
      w="auto"
      aria-hidden
    >
      {BARS.map((bar, i) => (
        <Box
          key={i}
          w={`${barWidth}px`}
          h={`${size}px`}
          bg={color}
          borderRadius="full"
          opacity={active ? 1 : 0.55}
          css={{
            transformOrigin: 'center',
            willChange: active ? 'transform' : undefined,
            ...(active
              ? {
                  animation: `${bar.anim} ${bar.duration} cubic-bezier(0.4, 0, 0.6, 1) ${bar.delay} infinite`,
                }
              : {
                  transform: 'scaleY(0.35)',
                }),
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              transform: 'scaleY(0.6)',
            },
          }}
        />
      ))}
    </HStack>
  )
}

export default VoiceWave
