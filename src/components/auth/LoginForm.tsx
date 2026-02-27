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
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { AccessibleInput, AccessibleButton, PasswordToggleButton } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

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
  const { signIn, isLoading, error } = useAuth()
  const [searchParams] = useSearchParams()
  const justRegistered = searchParams.get('registered') === 'true'
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: LoginFormData) => {
    await signIn(data)
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
      {/* Skip link pour accessibilité */}
      <a href="#login-form" className="skip-link">
        Aller au formulaire de connexion
      </a>

      <Stack gap={6} align="stretch">
        {/* En-tête */}
        <Box textAlign="center">
          <Heading as="h1" size="xl" mb={2}>
            Connexion
          </Heading>
          <Text color="gray.600" fontSize="md">
            Accédez à votre espace Unilien
          </Text>
        </Box>

        {/* Message post-inscription */}
        {justRegistered && (
          <Alert.Root status="info" borderRadius="md">
            <Alert.Indicator />
            <Alert.Description>
              Votre compte a bien été créé. Veuillez vérifier votre boîte mail
              (et vos spams) pour confirmer votre adresse email avant de vous connecter.
            </Alert.Description>
          </Alert.Root>
        )}

        {/* Message d'erreur */}
        {error && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        )}

        {/* Formulaire */}
        <Box
          as="form"
          id="login-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Stack gap={5}>
            {/* Email */}
            <AccessibleInput
              label="Adresse email"
              type="email"
              autoComplete="email"
              placeholder="votre@email.fr"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            {/* Mot de passe */}
            <AccessibleInput
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Votre mot de passe"
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

            {/* Lien mot de passe oublié */}
            <Box alignSelf="flex-end">
              <Link
                asChild
                color="blue.500"
                fontSize="sm"
              >
                <RouterLink to="/mot-de-passe-oublie">
                  Mot de passe oublié ?
                </RouterLink>
              </Link>
            </Box>

            {/* Bouton de connexion */}
            <AccessibleButton
              type="submit"
              colorPalette="blue"
              width="full"
              loading={isLoading}
              loadingText="Connexion en cours..."
            >
              Se connecter
            </AccessibleButton>
          </Stack>
        </Box>

        {/* Lien inscription */}
        <Text textAlign="center" fontSize="md">
          Pas encore de compte ?{' '}
          <Link asChild color="blue.500" fontWeight="medium">
            <RouterLink to="/inscription">
              Créer un compte
            </RouterLink>
          </Link>
        </Text>
      </Stack>
    </Box>
  )
}

export default LoginForm
