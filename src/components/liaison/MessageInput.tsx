import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Box,
  Flex,
  Textarea,
  IconButton,
  Text,
  Badge,
  VisuallyHidden,
} from '@chakra-ui/react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { logger } from '@/lib/logger'

// ============================================
// PROPS
// ============================================

export interface MessageInputProps {
  onSend: (content: string) => Promise<void>
  onTyping?: (isTyping: boolean) => void
  disabled?: boolean
  placeholder?: string
}

// ============================================
// ICONS
// ============================================

function SendIcon() {
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
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function MicOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .87-.16 1.71-.46 2.49" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

// ============================================
// COMPONENT
// ============================================

export function MessageInput({
  onSend,
  onTyping,
  disabled = false,
  placeholder = 'Écrivez un message...',
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Content before voice input started (to append voice transcript to)
  const contentBeforeVoiceRef = useRef('')

  // Direct speech recognition integration
  const {
    isSupported: isVoiceSupported,
    isListening,
    transcript,
    error: voiceError,
    startListening,
    stopListening,
    reset: resetVoice,
  } = useSpeechRecognition({
    lang: 'fr-FR',
    continuous: true,
    interimResults: true,
  })

  // Real-time: write transcript into the textarea as the user speaks
  useEffect(() => {
    if (isListening && transcript) {
      const base = contentBeforeVoiceRef.current
      setContent(base ? `${base} ${transcript}` : transcript)
    }
  }, [isListening, transcript])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [content])

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    onTyping?.(true)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTyping?.(false)
    }, 2000)
  }, [onTyping])

  // Handle content change (manual typing)
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    handleTyping()
  }, [handleTyping])

  // Handle send
  const handleSend = useCallback(async () => {
    const trimmedContent = content.trim()
    if (!trimmedContent || isSending || disabled) return

    // Stop voice if active
    if (isListening) {
      stopListening()
      resetVoice()
    }

    setIsSending(true)
    onTyping?.(false)

    try {
      await onSend(trimmedContent)
      setContent('')
      contentBeforeVoiceRef.current = ''

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      logger.error('Erreur envoi message:', error)
    } finally {
      setIsSending(false)
    }
  }, [content, isSending, disabled, isListening, onSend, onTyping, stopListening, resetVoice])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Toggle voice recognition
  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      // Stopping: keep what's in the textarea, reset voice state
      stopListening()
      resetVoice()
      contentBeforeVoiceRef.current = ''
      textareaRef.current?.focus()
    } else {
      // Starting: remember current content, start recognition
      contentBeforeVoiceRef.current = content
      startListening()
    }
  }, [isListening, content, startListening, stopListening, resetVoice])

  const canSend = content.trim().length > 0 && !isSending && !disabled

  return (
    <Box
      bg="white"
      borderTopWidth="1px"
      borderColor="gray.200"
      p={4}
    >
      {/* Voice error banner */}
      {voiceError && (
        <Box
          bg="red.50"
          borderRadius="md"
          p={2}
          mb={3}
          borderWidth="1px"
          borderColor="red.200"
        >
          <Text fontSize="sm" color="red.700" role="alert">
            {voiceError}
          </Text>
        </Box>
      )}

      <Flex gap={3} align="flex-end">
        {/* Voice input button — toujours affiché, opacifié si non supporté */}
        <Box position="relative" opacity={isVoiceSupported ? 1 : 0.4}>
          <IconButton
            aria-label={
              !isVoiceSupported
                ? 'Saisie vocale (non supportée par ce navigateur)'
                : isListening
                ? 'Arrêter la saisie vocale'
                : 'Saisie vocale'
            }
            aria-pressed={isListening}
            variant={isListening ? 'solid' : 'ghost'}
            colorPalette={isListening ? 'red' : 'blue'}
            onClick={handleVoiceToggle}
            disabled={disabled || isSending}
            minW="44px"
            minH="44px"
            css={{
              ...(isListening && {
                animation: 'voicePulse 1.5s ease-in-out infinite',
                '@keyframes voicePulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(229, 62, 62, 0.4)' },
                  '70%': { boxShadow: '0 0 0 10px rgba(229, 62, 62, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(229, 62, 62, 0)' },
                },
              }),
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
              },
            }}
          >
            {isListening ? <MicOffIcon /> : <MicIcon />}
          </IconButton>

          {isListening && (
            <Badge
              colorPalette="red"
              position="absolute"
              top="-4px"
              right="-4px"
              borderRadius="full"
              fontSize="2xs"
              px={1.5}
            >
              REC
            </Badge>
          )}
        </Box>

        {/* Text input */}
        <Box flex={1} position="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Parlez maintenant...' : placeholder}
            disabled={disabled || isSending}
            rows={1}
            resize="none"
            minH="44px"
            maxH="150px"
            borderRadius="xl"
            py={3}
            px={4}
            bg={isListening ? 'red.50' : 'gray.50'}
            borderColor={isListening ? 'red.300' : 'gray.200'}
            _focus={{
              bg: 'white',
              borderColor: isListening ? 'red.500' : 'blue.500',
              boxShadow: `0 0 0 1px var(--chakra-colors-${isListening ? 'red' : 'blue'}-500)`,
            }}
            css={{
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'var(--chakra-colors-gray-300)',
                borderRadius: '3px',
              },
              ...(isListening && {
                transition: 'background-color 0.3s, border-color 0.3s',
              }),
            }}
          />

          {/* Character count */}
          {content.length > 500 && (
            <Text
              position="absolute"
              bottom={1}
              right={2}
              fontSize="xs"
              color={content.length > 2000 ? 'red.500' : 'gray.400'}
            >
              {content.length}/2000
            </Text>
          )}
        </Box>

        {/* Send button */}
        <IconButton
          aria-label="Envoyer le message"
          colorPalette="blue"
          variant="solid"
          onClick={handleSend}
          disabled={!canSend}
          loading={isSending}
          minW="44px"
          minH="44px"
          borderRadius="full"
          css={{
            transition: 'all 0.2s',
            ...(canSend && {
              transform: 'scale(1.05)',
            }),
            '&:focus-visible': {
              boxShadow: '0 0 0 3px rgba(0, 86, 224, 0.6)',
            },
          }}
        >
          <SendIcon />
        </IconButton>
      </Flex>

      {/* Keyboard hint */}
      <Text fontSize="xs" color="gray.400" mt={2} textAlign="center">
        {isListening
          ? 'Parlez... Le texte apparaît en temps réel. Cliquez sur le micro pour arrêter.'
          : 'Entrée pour envoyer, Maj+Entrée pour nouvelle ligne'}
      </Text>

      {/* Screen reader announcements */}
      <VisuallyHidden>
        <div aria-live="polite" aria-atomic="true">
          {isSending && 'Envoi du message en cours...'}
          {isListening && 'Saisie vocale activée. Parlez maintenant.'}
        </div>
      </VisuallyHidden>
    </Box>
  )
}

export default MessageInput
