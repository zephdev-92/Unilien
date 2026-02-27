import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Stack,
  Heading,
  Text,
  Link,
  Alert,
  IconButton,
} from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { AccessibleInput, AccessibleButton } from '@/components/ui'
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
      <Box
        as="main"
        maxW="md"
        mx="auto"
        mt={8}
        p={8}
        borderWidth="1px"
        borderRadius="lg"
        boxShadow="lg"
        bg="white"
        textAlign="center"
      >
        <Text>Vérification en cours...</Text>
      </Box>
    )
  }

  // Pas de session valide
  if (!isValidSession) {
    return (
      <Box
        as="main"
        maxW="md"
        mx="auto"
        mt={8}
        p={8}
        borderWidth="1px"
        borderRadius="lg"
        boxShadow="lg"
        bg="white"
      >
        <Stack gap={4} align="center">
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Description>
              Le lien de réinitialisation est invalide ou a expiré.
            </Alert.Description>
          </Alert.Root>
          <Link asChild color="blue.500" fontWeight="medium">
            <RouterLink to="/mot-de-passe-oublie">
              Demander un nouveau lien
            </RouterLink>
          </Link>
        </Stack>
      </Box>
    )
  }

  return (
    <Box
      as="main"
      maxW="md"
      mx="auto"
      mt={8}
      p={8}
      borderWidth="1px"
      borderRadius="lg"
      boxShadow="lg"
      bg="white"
    >
      <Stack gap={6} align="stretch">
        {/* En-tête */}
        <Box textAlign="center">
          <Heading as="h1" size="xl" mb={2}>
            Nouveau mot de passe
          </Heading>
          <Text color="gray.600" fontSize="md">
            Choisissez un nouveau mot de passe sécurisé
          </Text>
        </Box>

        {/* Message de succès */}
        {isSuccess ? (
          <Stack gap={4}>
            <Alert.Root status="success" borderRadius="md">
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
              <Alert.Root status="error" borderRadius="md">
                <Alert.Indicator />
                <Alert.Description>{error}</Alert.Description>
              </Alert.Root>
            )}

            {/* Formulaire */}
            <Box as="form" onSubmit={handleSubmit(onSubmit)}>
              <Stack gap={5}>
                <AccessibleInput
                  label="Nouveau mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minimum 8 caractères"
                  error={errors.password?.message}
                  required
                  rightElement={
                    <IconButton
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={0}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </IconButton>
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
                  colorPalette="blue"
                  width="full"
                  loading={isLoading}
                  loadingText="Modification en cours..."
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
