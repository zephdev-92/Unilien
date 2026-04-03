import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Link,
  Alert,
  Image,
} from '@chakra-ui/react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { AccessibleInput, AccessibleButton, PasswordToggleButton } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase/client'
import { MfaChallenge } from './MfaChallenge'

// Schéma de validation
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'adresse email est obligatoire')
    .email('Veuillez entrer une adresse email valide'),
  password: z
    .string()
    .min(1, 'Le mot de passe est obligatoire')
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const { signIn, isLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const justRegistered = searchParams.get('registered') === 'true'
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: LoginFormData) => {
    setLocalError(null)
    const result = await signIn(data)

    if (!result.success) {
      setLocalError(result.error || 'Erreur de connexion')
      return
    }

    // Si MFA requis, récupérer le facteur et afficher le challenge
    if (result.mfaRequired) {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.find((f) => f.status === 'verified')
      if (totpFactor) {
        setMfaFactorId(totpFactor.id)
      }
    }
  }

  // Afficher le challenge MFA si nécessaire
  if (mfaFactorId) {
    return (
      <MfaChallenge
        factorId={mfaFactorId}
        onSuccess={() => {
          useAuthStore.getState().setMfaPending(false)
          window.location.href = '/tableau-de-bord'
        }}
        onCancel={() => {
          setMfaFactorId(null)
          useAuthStore.getState().setMfaPending(false)
          supabase.auth.signOut()
        }}
      />
    )
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
      <a href="#login-form" className="skip-link">
        Aller au formulaire de connexion
      </a>

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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18} aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </Box>
          <Text fontSize="sm" fontWeight="600" color="accent.fg">
            Accès sécurisé — Convention IDCC 3239
          </Text>
        </Flex>

        {/* En-tête */}
        <Heading as="h1" fontFamily="heading" fontSize="2xl" fontWeight="800" mb={1} color="text.default">
          Connexion
        </Heading>
        <Text color="text.muted" fontSize="sm" mb={6}>
          Bienvenue. Entrez vos identifiants pour accéder à votre espace.
        </Text>

        {/* Message post-inscription */}
        {justRegistered && (
          <Alert.Root status="info" borderRadius="md" mb={4}>
            <Alert.Indicator />
            <Alert.Description>
              Votre compte a bien été créé. Veuillez vérifier votre boîte mail
              (et vos spams) pour confirmer votre adresse email avant de vous connecter.
            </Alert.Description>
          </Alert.Root>
        )}

        {/* Message d'erreur */}
        {localError && (
          <Alert.Root status="error" borderRadius="md" mb={4}>
            <Alert.Indicator />
            <Alert.Description>{localError}</Alert.Description>
          </Alert.Root>
        )}

        {/* Formulaire */}
        <form
          id="login-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Stack gap={4}>
            {/* Email */}
            <AccessibleInput
              label="Adresse e-mail"
              type="email"
              autoComplete="email"
              placeholder="marie@exemple.fr"
              helperText="L'adresse utilisée à l'inscription."
              error={errors.email?.message}
              required
              {...register('email')}
            />

            {/* Mot de passe + lien oublié */}
            <Box w="100%">
              <Flex justify="space-between" align="center" mb="6px">
                <Text as="label" fontSize="sm" fontWeight="600" color="text.default">
                  Mot de passe <Text as="span" color="red.500" aria-label="champ obligatoire">*</Text>
                </Text>
                <Link
                  asChild
                  color="brand.500"
                  fontSize="xs"
                  fontWeight="600"
                >
                  <RouterLink to="/mot-de-passe-oublie">
                    Mot de passe oublié ?
                  </RouterLink>
                </Link>
              </Flex>
              <AccessibleInput
                label="Mot de passe"
                hideLabel
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                error={errors.password?.message}
                rightElement={
                  <PasswordToggleButton
                    visible={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  />
                }
                {...register('password')}
              />
            </Box>

            {/* Bouton de connexion */}
            <AccessibleButton
              type="submit"
              bg="brand.500"
              color="white"
              _hover={{ bg: 'brand.600', boxShadow: 'md', transform: 'translateY(-1px)' }}
              _active={{ transform: 'translateY(0)' }}
              width="full"
              loading={isLoading}
              loadingText="Connexion en cours..."
              py="13px"
              mt={2}
              boxShadow="sm"
              fontFamily="heading"
              fontWeight="700"
              fontSize="sm"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={15} height={15} aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
              Se connecter
            </AccessibleButton>
          </Stack>
        </form>

        {/* Lien inscription */}
        <Text textAlign="center" fontSize="sm" color="text.muted" mt={5}>
          Pas encore de compte ?{' '}
          <Link asChild color="brand.500" fontWeight="700" textDecoration="none" _hover={{ textDecoration: 'underline' }}>
            <RouterLink to="/inscription">
              Créer un compte gratuit
            </RouterLink>
          </Link>
        </Text>
      </Stack>
    </Box>
  )
}

export default LoginForm
