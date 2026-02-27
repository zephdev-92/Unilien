import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Stack,
  Heading,
  Text,
  Link,
  Alert,
} from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { AccessibleInput, AccessibleButton } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse email est obligatoire")
    .email('Veuillez entrer une adresse email valide'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const { resetPassword, isLoading, error } = useAuth()
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    const result = await resetPassword(data.email)
    if (result.success) {
      setIsSubmitted(true)
    }
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
            Mot de passe oublié
          </Heading>
          <Text color="gray.600" fontSize="md">
            Entrez votre email pour recevoir un lien de réinitialisation
          </Text>
        </Box>

        {/* Message de succès */}
        {isSubmitted ? (
          <Stack gap={4}>
            <Alert.Root status="success" borderRadius="md">
              <Alert.Indicator />
              <Alert.Description>
                Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation.
              </Alert.Description>
            </Alert.Root>
            <Text textAlign="center" fontSize="md">
              <Link asChild color="blue.500" fontWeight="medium">
                <RouterLink to="/connexion">
                  Retour à la connexion
                </RouterLink>
              </Link>
            </Text>
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
                  label="Adresse email"
                  type="email"
                  autoComplete="email"
                  placeholder="votre@email.fr"
                  error={errors.email?.message}
                  required
                  {...register('email')}
                />

                <AccessibleButton
                  type="submit"
                  colorPalette="blue"
                  width="full"
                  loading={isLoading}
                  loadingText="Envoi en cours..."
                >
                  Envoyer le lien
                </AccessibleButton>
              </Stack>
            </Box>

            {/* Lien retour */}
            <Text textAlign="center" fontSize="md">
              <Link asChild color="blue.500" fontWeight="medium">
                <RouterLink to="/connexion">
                  Retour à la connexion
                </RouterLink>
              </Link>
            </Text>
          </>
        )}
      </Stack>
    </Box>
  )
}

export default ForgotPasswordForm
