import { useState } from 'react'
import { Button, Flex, Separator, Text } from '@chakra-ui/react'
import { signInWithGoogle, signInWithMicrosoft } from '@/lib/supabase/auth'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 21 21" width={18} height={18} aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

export function SocialLoginButtons() {
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingMicrosoft, setLoadingMicrosoft] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogle() {
    setError(null)
    setLoadingGoogle(true)
    try {
      await signInWithGoogle()
    } catch {
      setError('Impossible de se connecter avec Google. Réessayez.')
      setLoadingGoogle(false)
    }
  }

  async function handleMicrosoft() {
    setError(null)
    setLoadingMicrosoft(true)
    try {
      await signInWithMicrosoft()
    } catch {
      setError('Impossible de se connecter avec Microsoft. Réessayez.')
      setLoadingMicrosoft(false)
    }
  }

  return (
    <Flex direction="column" gap={3} w="100%">
      <Flex align="center" gap={3} w="100%">
        <Separator flex={1} />
        <Text fontSize="xs" color="text.muted" whiteSpace="nowrap">
          ou continuer avec
        </Text>
        <Separator flex={1} />
      </Flex>

      {error && (
        <Text fontSize="xs" color="red.500" textAlign="center">
          {error}
        </Text>
      )}

      <Flex gap={3} w="100%">
        <Button
          flex={1}
          variant="outline"
          borderColor="border.default"
          bg="bg.surface"
          _hover={{ bg: 'bg.subtle', borderColor: 'border.emphasized' }}
          onClick={handleGoogle}
          loading={loadingGoogle}
          disabled={loadingMicrosoft}
          gap={2}
          fontSize="sm"
          fontWeight="600"
        >
          <GoogleIcon />
          Google
        </Button>

        <Button
          flex={1}
          variant="outline"
          borderColor="border.default"
          bg="bg.surface"
          _hover={{ bg: 'bg.subtle', borderColor: 'border.emphasized' }}
          onClick={handleMicrosoft}
          loading={loadingMicrosoft}
          disabled={loadingGoogle}
          gap={2}
          fontSize="sm"
          fontWeight="600"
        >
          <MicrosoftIcon />
          Microsoft
        </Button>
      </Flex>
    </Flex>
  )
}
