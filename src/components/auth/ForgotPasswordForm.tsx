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
      maxW="440px"
      w="full"
      mx="auto"
      mt={8}
      p={10}
      pb={8}
      borderRadius="20px"
      boxShadow="0 2px 8px rgba(78,100,120,.09)"
      bg="bg.surface"
    >
      <a href="#forgot-password-form" className="skip-link">
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
            Mot de passe oublié
          </Heading>
          <Text color="brand.500" fontSize="sm">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </Text>
        </Box>

        {/* Message de succès */}
        {isSubmitted ? (
          <Stack gap={4}>
            <Alert.Root status="success" borderRadius="10px">
              <Alert.Indicator />
              <Alert.Description>
                Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation.
              </Alert.Description>
            </Alert.Root>
            <Text textAlign="center" fontSize="sm" color="brand.500">
              <Link asChild color="brand.500" fontWeight="bold">
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
              <Alert.Root status="error" borderRadius="10px">
                <Alert.Indicator />
                <Alert.Description>{error}</Alert.Description>
              </Alert.Root>
            )}

            {/* Formulaire */}
            <Box
              as="form"
              id="forgot-password-form"
              onSubmit={handleSubmit(onSubmit)}
            >
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
                  bg="brand.500"
                  color="white"
                  _hover={{ bg: 'brand.600' }}
                  width="full"
                  loading={isLoading}
                  loadingText="Envoi en cours..."
                  py="13px"
                  boxShadow="0 2px 8px rgba(78,100,120,.09)"
                >
                  Envoyer le lien
                </AccessibleButton>
              </Stack>
            </Box>

            {/* Lien retour */}
            <Text textAlign="center" fontSize="sm" color="brand.500">
              <Link asChild color="brand.500" fontWeight="bold">
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
