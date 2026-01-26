import { useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Flex,
  Text,
  IconButton,
  Badge,
  VisuallyHidden,
} from '@chakra-ui/react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

// ============================================
// PROPS
// ============================================

export interface VoiceInputProps {
  /** Callback when transcript is ready */
  onTranscript: (text: string) => void
  /** Callback when listening state changes */
  onListeningChange?: (isListening: boolean) => void
  /** Language for recognition */
  lang?: string
  /** Custom label for accessibility */
  label?: string
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg'
  /** Whether the input is disabled */
  disabled?: boolean
  /** Show transcript preview */
  showPreview?: boolean
  /** Auto-start listening when mounted */
  autoStart?: boolean
}

// ============================================
// MICROPHONE ICON
// ============================================

function MicrophoneIcon({ isListening }: { isListening: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
      {isListening && (
        <circle cx="12" cy="8" r="2" fill="currentColor">
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </svg>
  )
}

// ============================================
// COMPONENT
// ============================================

export function VoiceInput({
  onTranscript,
  onListeningChange,
  lang = 'fr-FR',
  label = 'Saisie vocale',
  size = 'md',
  disabled = false,
  showPreview = true,
  autoStart = false,
}: VoiceInputProps) {
  const {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    reset,
  } = useSpeechRecognition({
    lang,
    continuous: true,
    interimResults: true,
  })

  // Ref to track if we've already sent transcript
  const lastSentTranscriptRef = useRef('')

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && isSupported && !disabled) {
      startListening()
    }
  }, [autoStart, isSupported, disabled, startListening])

  // Notify parent of listening state changes
  useEffect(() => {
    onListeningChange?.(isListening)
  }, [isListening, onListeningChange])

  // Handle button click
  const handleClick = useCallback(() => {
    if (isListening) {
      // Stopping - send transcript if any and different from last sent
      if (transcript.trim() && transcript.trim() !== lastSentTranscriptRef.current) {
        onTranscript(transcript.trim())
        lastSentTranscriptRef.current = transcript.trim()
      }
      stopListening()
      reset()
    } else {
      // Starting
      lastSentTranscriptRef.current = ''
      startListening()
    }
  }, [isListening, transcript, onTranscript, startListening, stopListening, reset])

  // Size configurations
  const sizeConfig = {
    sm: { button: '40px', icon: '16px' },
    md: { button: '60px', icon: '24px' },
    lg: { button: '80px', icon: '32px' },
  }

  const config = sizeConfig[size]

  // If not supported, show message
  if (!isSupported) {
    return (
      <Box
        p={3}
        bg="orange.50"
        borderRadius="md"
        borderWidth="1px"
        borderColor="orange.200"
      >
        <Text fontSize="sm" color="orange.700">
          La reconnaissance vocale n'est pas supportée par votre navigateur.
          Utilisez Chrome, Edge ou Safari pour cette fonctionnalité.
        </Text>
      </Box>
    )
  }

  return (
    <Flex direction="column" align="center" gap={2}>
      {/* Voice button */}
      <Box position="relative">
        <IconButton
          aria-label={isListening ? 'Arrêter la saisie vocale' : label}
          aria-pressed={isListening}
          onClick={handleClick}
          disabled={disabled}
          colorPalette={isListening ? 'red' : 'blue'}
          variant={isListening ? 'solid' : 'outline'}
          borderRadius="full"
          minW={config.button}
          minH={config.button}
          css={{
            // Pulsing animation when listening
            ...(isListening && {
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%': { boxShadow: '0 0 0 0 rgba(229, 62, 62, 0.4)' },
                '70%': { boxShadow: '0 0 0 15px rgba(229, 62, 62, 0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(229, 62, 62, 0)' },
              },
            }),
            // Focus styles for accessibility
            '&:focus-visible': {
              boxShadow: '0 0 0 3px rgba(0, 86, 224, 0.6)',
              outline: '2px solid transparent',
            },
            // Reduced motion
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          }}
        >
          <MicrophoneIcon isListening={isListening} />
        </IconButton>

        {/* Listening indicator badge */}
        {isListening && (
          <Badge
            colorPalette="red"
            position="absolute"
            top="-2px"
            right="-2px"
            borderRadius="full"
            fontSize="xs"
            px={2}
          >
            REC
          </Badge>
        )}
      </Box>

      {/* Status text */}
      <Text
        fontSize="sm"
        color={isListening ? 'red.600' : 'gray.600'}
        fontWeight={isListening ? 'medium' : 'normal'}
        role="status"
        aria-live="polite"
      >
        {isListening ? 'Parlez maintenant...' : label}
      </Text>

      {/* Transcript preview */}
      {showPreview && isListening && transcript && (
        <Box
          bg="gray.100"
          borderRadius="md"
          p={3}
          maxW="300px"
          w="full"
        >
          <Text fontSize="sm" color="gray.700" fontStyle="italic">
            "{transcript}"
          </Text>
        </Box>
      )}

      {/* Error display */}
      {error && (
        <Box
          bg="red.50"
          borderRadius="md"
          p={3}
          maxW="300px"
          w="full"
          borderWidth="1px"
          borderColor="red.200"
        >
          <Text fontSize="sm" color="red.700" role="alert">
            {error}
          </Text>
        </Box>
      )}

      {/* Screen reader announcements */}
      <VisuallyHidden>
        <div aria-live="assertive" aria-atomic="true">
          {isListening && 'Écoute en cours. Parlez maintenant.'}
          {!isListening && transcript && `Transcription: ${transcript}`}
          {error && `Erreur: ${error}`}
        </div>
      </VisuallyHidden>
    </Flex>
  )
}

export default VoiceInput
