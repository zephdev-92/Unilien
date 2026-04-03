import { useState } from 'react'
import {
  Box,
  Stack,
  Heading,
  Text,
  Link,
  Alert,
  Image,
  Input,
  Flex,
} from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { AccessibleButton } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface MfaChallengeProps {
  factorId: string
  onSuccess: () => void
  onCancel: () => void
}

export function MfaChallenge({ factorId, onSuccess, onCancel }: MfaChallengeProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Le code doit contenir 6 chiffres.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId })
      if (challengeError || !challenge) {
        throw challengeError ?? new Error('Challenge échoué')
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })

      if (verifyError) {
        setError('Code invalide. Vérifiez et réessayez.')
        return
      }

      onSuccess()
    } catch (err) {
      logger.error('Erreur vérification MFA:', err instanceof Error ? err.message : 'unknown')
      setError('Erreur de vérification. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify()
    }
  }

  return (
    <Box
      as="main"
      maxW="440px"
      w="full"
      p={10}
      pb={8}
      borderRadius="xl"
      boxShadow="0 2px 8px rgba(78,100,120,.09)"
      bg="bg.surface"
    >
      <Stack gap={0} align="stretch">
        {/* Logo */}
        <Box mb={8}>
          <Link asChild>
            <RouterLink to="/" aria-label="Unilien — Retour à l'accueil">
              <Image src="/Logo_Unilien.svg" alt="Unilien" h="40px" />
            </RouterLink>
          </Link>
        </Box>

        {/* Badge sécurité */}
        <Flex
          align="center"
          gap={2}
          bg="accent.subtle"
          borderRadius="md"
          px={3}
          py="10px"
          mb={5}
        >
          <Box color="accent.fg" flexShrink={0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18} aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </Box>
          <Text fontSize="sm" fontWeight="600" color="accent.fg">
            Vérification en deux étapes
          </Text>
        </Flex>

        {/* En-tête */}
        <Heading as="h1" fontFamily="heading" fontSize="2xl" fontWeight="800" mb={1} color="text.default">
          Code de vérification
        </Heading>
        <Text color="text.muted" fontSize="sm" mb={6}>
          Entrez le code à 6 chiffres affiché dans votre application d&apos;authentification.
        </Text>

        {/* Erreur */}
        {error && (
          <Alert.Root status="error" borderRadius="md" mb={4}>
            <Alert.Indicator />
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        )}

        {/* Champ code */}
        <Box mb={4}>
          <Input
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={handleKeyDown}
            fontFamily="mono"
            fontSize="2xl"
            textAlign="center"
            letterSpacing="0.4em"
            py={6}
            /* eslint-disable-next-line jsx-a11y/no-autofocus */
            autoFocus
          />
        </Box>

        {/* Bouton vérifier */}
        <AccessibleButton
          onClick={handleVerify}
          bg="brand.500"
          color="white"
          _hover={{ bg: 'brand.600', boxShadow: 'md', transform: 'translateY(-1px)' }}
          _active={{ transform: 'translateY(0)' }}
          width="full"
          loading={loading}
          loadingText="Vérification…"
          py="13px"
          boxShadow="sm"
          fontFamily="heading"
          fontWeight="700"
          fontSize="sm"
          disabled={code.length !== 6}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={15} height={15} aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Vérifier
        </AccessibleButton>

        {/* Retour */}
        <Text textAlign="center" fontSize="sm" color="text.muted" mt={5}>
          <Link
            color="brand.500"
            fontWeight="600"
            cursor="pointer"
            onClick={onCancel}
          >
            Retour à la connexion
          </Link>
        </Text>
      </Stack>
    </Box>
  )
}
