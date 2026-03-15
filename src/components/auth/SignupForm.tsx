import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Flex,
  Grid,
  Stack,
  Heading,
  Text,
  Link,
  Alert,
  Image,
} from '@chakra-ui/react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { AccessibleInput, AccessibleButton, PasswordToggleButton } from '@/components/ui'
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
    label: 'Employeur',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={24} height={24} aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    value: 'employee',
    label: 'Auxiliaire',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={24} height={24} aria-hidden="true">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    value: 'caregiver',
    label: 'Aidant',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={24} height={24} aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
]

export function SignupForm() {
  const { signUp, isLoading, error } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
  })

  const watchedRole = watch('role')

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
      navigate('/connexion?registered=true')
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
      <a href="#signup-form" className="skip-link">
        Aller au formulaire d&apos;inscription
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
          Créer un compte
        </Heading>
        <Text color="text.muted" fontSize="sm" mb={6}>
          14 jours gratuits, aucune carte bancaire requise.
        </Text>

        {/* Message d'erreur */}
        {error && (
          <Alert.Root status="error" borderRadius="md" mb={4}>
            <Alert.Indicator />
            <Alert.Description>
              {error}
              {error.includes('déjà associée') && (
                <>
                  {' '}
                  <Link asChild color="red.700" fontWeight="600" textDecoration="underline">
                    <RouterLink to="/connexion">Se connecter</RouterLink>
                  </Link>
                </>
              )}
            </Alert.Description>
          </Alert.Root>
        )}

        {/* Formulaire */}
        <Box
          as="form"
          id="signup-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Stack gap={4}>
            {/* Sélecteur de rôle */}
            <Box>
              <Text as="label" fontSize="sm" fontWeight="600" color="text.default" mb="6px" display="block">
                Vous êtes… <Text as="span" color="red.500" aria-label="champ obligatoire">*</Text>
              </Text>
              <Grid templateColumns="repeat(3, 1fr)" gap={3} mb={4}>
                {roleOptions.map((opt) => {
                  const selected = watchedRole === opt.value
                  return (
                    <Flex
                      key={opt.value}
                      as="label"
                      direction="column"
                      align="center"
                      gap={2}
                      p={3}
                      borderWidth="1.5px"
                      borderRadius="md"
                      borderColor={selected ? 'brand.500' : 'border.default'}
                      bg={selected ? 'brand.subtle' : 'bg.page'}
                      cursor="pointer"
                      textAlign="center"
                      transition="border-color 0.15s ease, background 0.15s ease"
                      _hover={{ borderColor: 'brand.400', bg: 'brand.subtle' }}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register('role')}
                        style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
                      />
                      <Box color="brand.500">{opt.icon}</Box>
                      <Text fontSize="xs" fontWeight="700" color="text.secondary">{opt.label}</Text>
                    </Flex>
                  )
                })}
              </Grid>
              {errors.role?.message && (
                <Text fontSize="xs" color="red.500" fontWeight="600">{errors.role.message}</Text>
              )}
            </Box>

            {/* Prénom + Nom en grille */}
            <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={4}>
              <AccessibleInput
                label="Prénom"
                type="text"
                autoComplete="given-name"
                placeholder="Marie"
                error={errors.firstName?.message}
                required
                {...register('firstName')}
              />
              <AccessibleInput
                label="Nom"
                type="text"
                autoComplete="family-name"
                placeholder="Fontaine"
                error={errors.lastName?.message}
                required
                {...register('lastName')}
              />
            </Grid>

            {/* Email */}
            <AccessibleInput
              label="Adresse e-mail"
              type="email"
              autoComplete="email"
              placeholder="marie@exemple.fr"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            {/* Mot de passe */}
            <AccessibleInput
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Minimum 12 caractères"
              helperText="Minimum 12 caractères, 1 majuscule, 1 chiffre."
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

            {/* Confirmation mot de passe */}
            <AccessibleInput
              label="Confirmer le mot de passe"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirmez votre mot de passe"
              error={errors.confirmPassword?.message}
              required
              rightElement={
                <PasswordToggleButton
                  visible={showConfirmPassword}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
              {...register('confirmPassword')}
            />

            {/* CGU */}
            <Flex as="label" align="center" gap={2} fontSize="sm" fontWeight="500" cursor="pointer" mt={2}>
              <input type="checkbox" required style={{ width: 'auto' }} />
              <Text fontSize="sm">
                J&apos;accepte les{' '}
                <Link href="#" color="brand.500" fontWeight="700">Conditions d&apos;utilisation</Link>
                {' '}et la{' '}
                <Link href="#" color="brand.500" fontWeight="700">Politique de confidentialité</Link>
              </Text>
            </Flex>

            {/* Bouton d'inscription */}
            <AccessibleButton
              type="submit"
              bg="brand.500"
              color="white"
              _hover={{ bg: 'brand.600', boxShadow: 'md', transform: 'translateY(-1px)' }}
              _active={{ transform: 'translateY(0)' }}
              width="full"
              loading={isLoading}
              loadingText="Création du compte..."
              py="13px"
              mt={2}
              boxShadow="sm"
              fontFamily="heading"
              fontWeight="700"
              fontSize="sm"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={15} height={15} aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Créer mon compte
            </AccessibleButton>
          </Stack>
        </Box>

        {/* Lien connexion */}
        <Text textAlign="center" fontSize="sm" color="text.muted" mt={5}>
          Déjà un compte ?{' '}
          <Link asChild color="brand.500" fontWeight="700" textDecoration="none" _hover={{ textDecoration: 'underline' }}>
            <RouterLink to="/connexion">
              Se connecter
            </RouterLink>
          </Link>
        </Text>
      </Stack>
    </Box>
  )
}

export default SignupForm
