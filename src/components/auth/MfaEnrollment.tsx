import { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Alert,
  Image,
  Input,
  Flex,
  Button,
} from '@chakra-ui/react'
import { PrimaryButton, GhostButton } from '@/components/ui'

interface MfaEnrollmentProps {
  onEnroll: () => Promise<{ factorId: string; qrCode: string; uri: string }>
  onVerify: (factorId: string, code: string) => Promise<void>
  onCancel: () => void
  onSuccess: () => void
}

type Step = 'qrcode' | 'verify' | 'done'

export function MfaEnrollment({ onEnroll, onVerify, onCancel, onSuccess }: MfaEnrollmentProps) {
  const [step, setStep] = useState<Step>('qrcode')
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [uri, setUri] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleStartEnroll = async () => {
    setEnrolling(true)
    setError(null)
    try {
      const result = await onEnroll()
      setFactorId(result.factorId)
      setQrCode(result.qrCode)
      setUri(result.uri)
      setStep('verify')
    } catch {
      setError('Impossible de générer le QR code. Réessayez.')
    } finally {
      setEnrolling(false)
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Le code doit contenir 6 chiffres.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onVerify(factorId, code)
      setStep('done')
    } catch {
      setError('Code invalide. Vérifiez et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'qrcode') {
    return (
      <VStack gap={4} align="stretch">
        <Heading as="h3" fontSize="md" fontWeight="700">
          Activer la double authentification
        </Heading>
        <Text fontSize="sm" color="text.muted">
          Scannez le QR code avec votre application d&apos;authentification
          (Google Authenticator, Authy, 1Password…) pour sécuriser votre compte.
        </Text>

        {error && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        )}

        <HStack gap={3} justify="flex-end">
          <GhostButton size="sm" onClick={onCancel}>Annuler</GhostButton>
          <PrimaryButton size="sm" onClick={handleStartEnroll} disabled={enrolling}>
            {enrolling ? 'Génération…' : 'Générer le QR code'}
          </PrimaryButton>
        </HStack>
      </VStack>
    )
  }

  if (step === 'verify') {
    return (
      <VStack gap={4} align="stretch">
        <Heading as="h3" fontSize="md" fontWeight="700">
          Scannez ce QR code
        </Heading>
        <Text fontSize="sm" color="text.muted">
          Ouvrez votre application d&apos;authentification et scannez le QR code ci-dessous.
        </Text>

        {/* QR Code */}
        <Box
          p={4}
          bg="white"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.default"
          alignSelf="center"
        >
          <Image
            src={qrCode}
            alt="QR code pour l'authentification à deux facteurs"
            w="200px"
            h="200px"
          />
        </Box>

        {/* URI manuelle */}
        <Box>
          <Text fontSize="xs" color="text.muted" mb={1}>
            Si vous ne pouvez pas scanner, copiez cette clé :
          </Text>
          <Flex
            p={2}
            bg="bg.page"
            borderRadius="md"
            align="center"
            gap={2}
          >
            <Text
              fontSize="xs"
              fontFamily="mono"
              wordBreak="break-all"
              color="text.secondary"
              flex={1}
            >
              {uri}
            </Text>
            <Button
              size="xs"
              variant="outline"
              flexShrink={0}
              onClick={() => {
                navigator.clipboard.writeText(uri)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? '✓ Copié' : 'Copier'}
            </Button>
          </Flex>
        </Box>

        {/* Saisie du code */}
        <Box>
          <Text fontSize="sm" fontWeight="600" mb={2}>
            Entrez le code à 6 chiffres affiché dans votre application :
          </Text>
          <Input
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            fontFamily="mono"
            fontSize="xl"
            textAlign="center"
            letterSpacing="0.3em"
            maxW="200px"
            /* eslint-disable-next-line jsx-a11y/no-autofocus */
            autoFocus
          />
        </Box>

        {error && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        )}

        <HStack gap={3} justify="flex-end">
          <GhostButton size="sm" onClick={onCancel}>Annuler</GhostButton>
          <PrimaryButton
            size="sm"
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
          >
            {loading ? 'Vérification…' : 'Vérifier et activer'}
          </PrimaryButton>
        </HStack>
      </VStack>
    )
  }

  // Step: done
  return (
    <VStack gap={4} align="stretch">
      <Alert.Root status="success" borderRadius="md">
        <Alert.Indicator />
        <Alert.Description>
          La double authentification est activée. Votre compte est désormais protégé.
        </Alert.Description>
      </Alert.Root>

      <Text fontSize="sm" color="text.muted">
        Un code vous sera demandé à chaque connexion. Conservez l&apos;accès à votre application
        d&apos;authentification.
      </Text>

      <HStack justify="flex-end">
        <PrimaryButton size="sm" onClick={onSuccess}>
          Terminé
        </PrimaryButton>
      </HStack>
    </VStack>
  )
}
