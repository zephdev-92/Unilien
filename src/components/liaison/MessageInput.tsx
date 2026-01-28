import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Box,
  Flex,
  Textarea,
  IconButton,
  Text,
  VisuallyHidden,
} from '@chakra-ui/react'
import { VoiceInput } from '@/components/ui'

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
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      onTyping?.(false)
    }, 2000)
  }, [onTyping])

  // Handle content change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    handleTyping()
  }, [handleTyping])

  // Handle send
  const handleSend = useCallback(async () => {
    const trimmedContent = content.trim()
    if (!trimmedContent || isSending || disabled) return

    setIsSending(true)
    onTyping?.(false)

    try {
      await onSend(trimmedContent)
      setContent('')

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Erreur envoi message:', error)
    } finally {
      setIsSending(false)
    }
  }, [content, isSending, disabled, onSend, onTyping])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Handle voice transcript
  const handleVoiceTranscript = useCallback((transcript: string) => {
    setContent(prev => {
      const newContent = prev ? `${prev} ${transcript}` : transcript
      return newContent
    })
    // Don't close voice mode here - let the user explicitly close it
  }, [])

  // Handle voice listening change
  const handleVoiceListeningChange = useCallback((isListening: boolean) => {
    setIsVoiceActive(isListening)
  }, [])

  // Close voice mode explicitly
  const closeVoiceMode = useCallback(() => {
    setIsVoiceMode(false)
    setIsVoiceActive(false)
    textareaRef.current?.focus()
  }, [])

  const canSend = content.trim().length > 0 && !isSending && !disabled

  return (
    <Box
      bg="white"
      borderTopWidth="1px"
      borderColor="gray.200"
      p={4}
    >
      {/* Voice mode overlay */}
      {isVoiceMode && (
        <Box
          position="absolute"
          bottom="100%"
          left={0}
          right={0}
          bg="blue.50"
          p={4}
          borderTopWidth="1px"
          borderColor="blue.200"
          textAlign="center"
        >
          <Flex justify="flex-end" mb={2}>
            <IconButton
              aria-label="Fermer la saisie vocale"
              variant="ghost"
              size="sm"
              onClick={closeVoiceMode}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </IconButton>
          </Flex>
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            onListeningChange={handleVoiceListeningChange}
            size="lg"
            showPreview
            autoStart
          />
        </Box>
      )}

      <Flex gap={3} align="flex-end">
        {/* Voice input button (toggles voice mode) */}
        <IconButton
          aria-label="Saisie vocale"
          variant="ghost"
          colorPalette="blue"
          onClick={() => setIsVoiceMode(!isVoiceMode)}
          disabled={disabled || isSending}
          minW="44px"
          minH="44px"
        >
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
        </IconButton>

        {/* Text input */}
        <Box flex={1} position="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            resize="none"
            minH="44px"
            maxH="150px"
            borderRadius="xl"
            py={3}
            px={4}
            bg="gray.50"
            borderColor="gray.200"
            _focus={{
              bg: 'white',
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
            }}
            css={{
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'var(--chakra-colors-gray-300)',
                borderRadius: '3px',
              },
            }}
          />

          {/* Character count (optional, for long messages) */}
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
            // Smooth transition
            transition: 'all 0.2s',
            // Scale up when can send
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
        Entrée pour envoyer, Maj+Entrée pour nouvelle ligne
      </Text>

      {/* Screen reader announcements */}
      <VisuallyHidden>
        <div aria-live="polite" aria-atomic="true">
          {isSending && 'Envoi du message en cours...'}
          {isVoiceMode && 'Mode saisie vocale activé'}
          {isVoiceMode && !isVoiceActive && 'Reconnaissance vocale en pause. Cliquez sur le microphone pour reprendre.'}
        </div>
      </VisuallyHidden>
    </Box>
  )
}

export default MessageInput
