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
  IconButton,
} from '@chakra-ui/react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { AccessibleInput, AccessibleButton, AccessibleSelect } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

// Schéma de validation
const signupSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'Le prénom est obligatoire')
      .min(2, 'Le prénom doit contenir au moins 2 caractères'),
    lastName: z
      .string()
      .min(1, 'Le nom est obligatoire')
      .min(2, 'Le nom doit contenir au moins 2 caractères'),
    email: z
      .string()
      .min(1, 'L\'adresse email est obligatoire')
      .email('Veuillez entrer une adresse email valide'),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^(\+33|0)[1-9](\d{2}){4}$/.test(val.replace(/\s/g, '')),
        'Numéro de téléphone invalide'
      ),
    role: z
      .string()
      .min(1, 'Veuillez sélectionner un type de compte'),
    password: z
      .string()
      .min(1, 'Le mot de passe est obligatoire')
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
      ),
    confirmPassword: z.string().min(1, 'Veuillez confirmer votre mot de passe'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

type SignupFormData = z.infer<typeof signupSchema>

const roleOptions = [
  {
    value: 'employer',
    label: 'Employeur (personne en situation de handicap)',
  },
  {
    value: 'employee',
    label: 'Auxiliaire de vie',
  },
]

export function SignupForm() {
  const { signUp, isLoading, error } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: SignupFormData) => {
    const result = await signUp({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as UserRole,
      phone: data.phone,
    })

    if (result.success) {
      setSuccess(true)
      // Rediriger après un délai pour laisser le temps de lire le message
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    }
  }

  if (success) {
    return (
      <Box
        maxW="md"
        mx="auto"
        mt={8}
        p={8}
        borderWidth="1px"
        borderRadius="lg"
        boxShadow="lg"
        bg="white"
      >
        <Alert.Root status="success" borderRadius="md" flexDirection="column" py={6}>
          <Alert.Indicator boxSize={10} mb={4} />
          <Heading as="h2" size="md" mb={2}>
            Inscription réussie !
          </Heading>
          <Alert.Description textAlign="center">
            Un email de confirmation vous a été envoyé. Veuillez vérifier votre
            boîte de réception pour activer votre compte.
          </Alert.Description>
        </Alert.Root>
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
      <a href="#signup-form" className="skip-link">
        Aller au formulaire d'inscription
      </a>

      <Stack gap={6} align="stretch">
        {/* En-tête */}
        <Box textAlign="center">
          <Heading as="h1" size="xl" mb={2}>
            Créer un compte
          </Heading>
          <Text color="gray.600" fontSize="md">
            Rejoignez Unilien pour gérer vos auxiliaires de vie
          </Text>
        </Box>

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
          id="signup-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Stack gap={5}>
            {/* Type de compte */}
            <AccessibleSelect
              label="Type de compte"
              options={roleOptions}
              placeholder="Sélectionnez votre profil"
              error={errors.role?.message}
              required
              {...register('role')}
            />

            {/* Prénom */}
            <AccessibleInput
              label="Prénom"
              type="text"
              autoComplete="given-name"
              placeholder="Votre prénom"
              error={errors.firstName?.message}
              required
              {...register('firstName')}
            />

            {/* Nom */}
            <AccessibleInput
              label="Nom"
              type="text"
              autoComplete="family-name"
              placeholder="Votre nom"
              error={errors.lastName?.message}
              required
              {...register('lastName')}
            />

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

            {/* Téléphone */}
            <AccessibleInput
              label="Téléphone"
              type="tel"
              autoComplete="tel"
              placeholder="06 12 34 56 78"
              helperText="Optionnel - pour recevoir des notifications SMS"
              error={errors.phone?.message}
              {...register('phone')}
            />

            {/* Mot de passe */}
            <AccessibleInput
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Créez un mot de passe sécurisé"
              helperText="Minimum 8 caractères avec majuscule, minuscule et chiffre"
              error={errors.password?.message}
              required
              rightElement={
                <IconButton
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </IconButton>
              }
              {...register('password')}
            />

            {/* Confirmation mot de passe */}
            <AccessibleInput
              label="Confirmer le mot de passe"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirmez votre mot de passe"
              error={errors.confirmPassword?.message}
              required
              rightElement={
                <IconButton
                  aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </IconButton>
              }
              {...register('confirmPassword')}
            />

            {/* Bouton d'inscription */}
            <AccessibleButton
              type="submit"
              colorPalette="blue"
              width="full"
              loading={isLoading}
              loadingText="Création du compte..."
            >
              Créer mon compte
            </AccessibleButton>
          </Stack>
        </Box>

        {/* Lien connexion */}
        <Text textAlign="center" fontSize="md">
          Déjà un compte ?{' '}
          <Link asChild color="blue.500" fontWeight="medium">
            <RouterLink to="/login">
              Se connecter
            </RouterLink>
          </Link>
        </Text>
      </Stack>
    </Box>
  )
}

export default SignupForm
