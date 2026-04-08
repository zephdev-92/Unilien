import { useEffect, useState } from 'react'
import {
  Box,
  Flex,
  Grid,
  Stack,
  Heading,
  Text,
  Image,
  Alert,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { AccessibleButton, AccessibleInput } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type { UserRole } from '@/types'

const roleOptions: { value: UserRole; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'employer',
    label: 'Employeur',
    description: 'Je gère les soins d\'un proche',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={28} height={28} aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    value: 'employee',
    label: 'Auxiliaire',
    description: 'Je suis salarié(e) à domicile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={28} height={28} aria-hidden="true">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    value: 'caregiver',
    label: 'Aidant',
    description: 'Je soutiens un proche handicapé',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={28} height={28} aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
]

export default function OnboardingRolePage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setUserEmail(user.email ?? null)

      // Pré-remplir depuis les métadonnées OAuth
      const fullName: string = user.user_metadata?.full_name || user.user_metadata?.name || ''
      const parts = fullName.trim().split(' ')
      setFirstName(parts[0] || '')
      setLastName(parts.slice(1).join(' ') || '')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRole || !userId) return

    const cleanFirst = sanitizeText(firstName.trim())
    const cleanLast = sanitizeText(lastName.trim())

    if (!cleanFirst) {
      setError('Le prénom est obligatoire.')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: userId,
        role: selectedRole,
        first_name: cleanFirst,
        last_name: cleanLast,
        email: userEmail,
        updated_at: new Date().toISOString(),
      })

      if (upsertError) throw upsertError

      // Recharger pour que useAuth récupère le profil à jour
      window.location.href = '/tableau-de-bord'
    } catch (err) {
      logger.error('Erreur onboarding role:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
      setIsLoading(false)
    }
  }

  if (!userId) {
    return (
      <Center minH="100vh" bg="bg.page">
        <Spinner size="xl" color="brand.500" borderWidth="4px" />
      </Center>
    )
  }

  return (
    <Box minH="100vh" bg="bg.page" display="flex" alignItems="center" justifyContent="center" p={6}>
      <Box
        as="main"
        maxW="480px"
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
            <Image src="/Logo_Unilien.svg" alt="Unilien" h="40px" />
          </Box>

          <Heading as="h1" fontFamily="heading" fontSize="2xl" fontWeight="800" mb={1} color="text.default">
            Bienvenue !
          </Heading>
          <Text color="text.muted" fontSize="sm" mb={6}>
            Complétez votre profil pour accéder à votre espace.
          </Text>

          <Box as="form" onSubmit={handleSubmit}>
            <Stack gap={5}>
              {/* Prénom + Nom */}
              <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={4}>
                <AccessibleInput
                  label="Prénom"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                  required
                />
                <AccessibleInput
                  label="Nom"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                />
              </Grid>

              {/* Sélecteur de rôle */}
              <Box>
                <Text fontSize="sm" fontWeight="600" color="text.default" mb={3}>
                  Vous êtes… <Text as="span" color="red.500" aria-label="champ obligatoire">*</Text>
                </Text>
                <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                  {roleOptions.map((opt) => {
                    const selected = selectedRole === opt.value
                    return (
                      <Flex
                        key={opt.value}
                        as="button"
                        type="button"
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
                        onClick={() => setSelectedRole(opt.value)}
                        aria-pressed={selected}
                      >
                        <Box color="brand.500">{opt.icon}</Box>
                        <Text fontSize="xs" fontWeight="700" color="text.secondary">{opt.label}</Text>
                        <Text fontSize="xs" color="text.muted" lineHeight="1.3">{opt.description}</Text>
                      </Flex>
                    )
                  })}
                </Grid>
              </Box>

              {error && (
                <Alert.Root status="error" borderRadius="md">
                  <Alert.Indicator />
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Root>
              )}

              <AccessibleButton
                type="submit"
                bg="brand.500"
                color="white"
                _hover={{ bg: 'brand.600', boxShadow: 'md', transform: 'translateY(-1px)' }}
                _active={{ transform: 'translateY(0)' }}
                width="full"
                loading={isLoading}
                loadingText="Création du profil..."
                disabled={!selectedRole}
                py="13px"
                mt={2}
                boxShadow="sm"
                fontFamily="heading"
                fontWeight="700"
                fontSize="sm"
              >
                Accéder à mon espace
              </AccessibleButton>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}
