import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
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
import { Link as RouterLink } from 'react-router-dom'
import { AccessibleInput, AccessibleButton, PasswordToggleButton } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'Le mot de passe est obligatoire')
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z
    .string()
    .min(1, 'La confirmation est obligatoire'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

const AUTH_CARD_PROPS = {
  as: 'main' as const,
  maxW: '440px',
  w: 'full',
  mx: 'auto',
  mt: 8,
  p: 10,
  pb: 8,
  borderRadius: '20px',
  boxShadow: '0 2px 8px rgba(78,100,120,.09)',
  bg: 'bg.surface',
}

export function ResetPasswordForm() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
  })

  // Vérifier si l'utilisateur a une session valide (venant du lien email)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsValidSession(!!session)
    }
    checkSession()

    // Écouter les changements d'auth (quand le token est traité)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true)
      setError(null)

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (updateError) {
        throw updateError
      }

      setIsSuccess(true)

      // Rediriger vers login après 3 secondes
      setTimeout(() => {
        navigate('/connexion')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation')
    } finally {
      setIsLoading(false)
    }
  }

  // Chargement initial
  if (isValidSession === null) {
    return (
      <Box {...AUTH_CARD_PROPS} textAlign="center">
        <Text>Vérification en cours...</Text>
      </Box>
    )
  }

  // Pas de session valide
  if (!isValidSession) {
    return (
      <Box {...AUTH_CARD_PROPS}>
        <Stack gap={4} align="center">
          <Alert.Root status="error" borderRadius="10px">
            <Alert.Indicator />
            <Alert.Description>
              Le lien de réinitialisation est invalide ou a expiré.
            </Alert.Description>
          </Alert.Root>
          <Link asChild color="brand.500" fontWeight="bold">
            <RouterLink to="/mot-de-passe-oublie">
              Demander un nouveau lien
            </RouterLink>
          </Link>
        </Stack>
      </Box>
    )
  }

  return (
    <Box {...AUTH_CARD_PROPS}>
      <a href="#reset-password-form" className="skip-link">
        Aller au formulaire de réinitialisation
      </a>

      <Stack gap={6} align="stretch">
        {/* Logo */}
        <Box mb={2}>
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
          borderRadius="10px"
          px={3}
          py={2}
        >
          <Box color="accent.700" flexShrink={0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18} aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </Box>
          <Text fontSize="sm" fontWeight="semibold" color="accent.700">
            Accès sécurisé — Convention IDCC 3239
          </Text>
        </Flex>

        {/* En-tête */}
        <Box>
          <Heading as="h1" fontSize="2xl" fontWeight="800" mb={1} color="text.default">
            Nouveau mot de passe
          </Heading>
          <Text color="brand.500" fontSize="sm">
            Choisissez un nouveau mot de passe sécurisé.
          </Text>
        </Box>

        {/* Message de succès */}
        {isSuccess ? (
          <Stack gap={4}>
            <Alert.Root status="success" borderRadius="10px">
              <Alert.Indicator />
              <Alert.Description>
                Votre mot de passe a été modifié avec succès. Redirection vers la connexion...
              </Alert.Description>
            </Alert.Root>
          </Stack>
        ) : (
          <>
            {/* Message d'erreur */}
            {error && (
              <Alert.Root status="error" borderRadius="10px">
                <Alert.Indicator />
                <Alert.Description>{error}</Alert.Description>
              </Alert.Root>
            )}

            {/* Formulaire */}
            <Box
              as="form"
              id="reset-password-form"
              onSubmit={handleSubmit(onSubmit)}
            >
              <Stack gap={5}>
                <AccessibleInput
                  label="Nouveau mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minimum 8 caractères"
                  error={errors.password?.message}
                  required
                  rightElement={
                    <PasswordToggleButton
                      visible={showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  }
                  {...register('password')}
                />

                <AccessibleInput
                  label="Confirmer le mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Retapez votre mot de passe"
                  error={errors.confirmPassword?.message}
                  required
                  {...register('confirmPassword')}
                />

                <AccessibleButton
                  type="submit"
                  bg="brand.500"
                  color="white"
                  _hover={{ bg: 'brand.600' }}
                  width="full"
                  loading={isLoading}
                  loadingText="Modification en cours..."
                  py="13px"
                  boxShadow="0 2px 8px rgba(78,100,120,.09)"
                >
                  Modifier le mot de passe
                </AccessibleButton>
              </Stack>
            </Box>
          </>
        )}
      </Stack>
    </Box>
  )
}

export default ResetPasswordForm
