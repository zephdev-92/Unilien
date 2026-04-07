import { useState, useEffect } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import type { Profile, UserRole } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface OnboardingStep {
  id: string
  label: string
  description: string
  href: string
  done: boolean
}

interface OnboardingWidgetProps {
  profile: Profile
  userRole: UserRole
}

const CheckIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export function OnboardingWidget({ profile, userRole }: OnboardingWidgetProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(`unilien_onboarding_dismissed_${profile.id}`) === 'true'
  })

  useEffect(() => {
    if (dismissed) return

    async function checkOnboarding() {
      setLoading(true)
      try {
        const profileDone = await isProfileComplete(profile.id, profile, userRole)
        const teamDone = await checkTeamSetup(profile.id, userRole)
        const shiftsDone = await checkHasShifts(profile.id, userRole)

        const newSteps: OnboardingStep[] = [
          {
            id: 'profile',
            label: 'Completer votre profil',
            description: profileDone
              ? 'Profil complete'
              : 'Ajoutez vos informations personnelles et votre adresse',
            href: '/profil',
            done: profileDone,
          },
          userRole === 'employer'
            ? {
                id: 'team',
                label: 'Ajouter un auxiliaire',
                description: teamDone
                  ? 'Equipe configuree'
                  : 'Ajoutez votre premier auxiliaire de vie et creez son contrat',
                href: '/equipe',
                done: teamDone,
              }
            : userRole === 'employee'
              ? {
                  id: 'team',
                  label: 'Lien avec votre employeur',
                  description: teamDone
                    ? 'Contrat actif'
                    : "Demandez a votre employeur de vous ajouter depuis son espace",
                  href: '/profil',
                  done: teamDone,
                }
              : {
                  id: 'team',
                  label: 'Lien avec votre proche',
                  description: teamDone
                    ? 'Lie a un employeur'
                    : "Demandez a votre proche de vous ajouter comme aidant",
                  href: '/profil',
                  done: teamDone,
                },
          {
            id: 'shifts',
            label: userRole === 'employer'
              ? 'Creer une intervention'
              : 'Premiere intervention',
            description: shiftsDone
              ? 'Interventions enregistrees'
              : userRole === 'employer'
                ? 'Planifiez votre premiere intervention depuis le planning'
                : "Une fois lie, vos interventions apparaitront ici",
            href: '/planning',
            done: shiftsDone,
          },
        ]

        setSteps(newSteps)
      } catch (err) {
        logger.error('Erreur chargement onboarding:', err)
      } finally {
        setLoading(false)
      }
    }

    checkOnboarding()
  }, [profile, userRole, dismissed])

  if (dismissed || loading) return null

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length

  // Auto-dismiss si tout est fait
  if (allDone) {
    localStorage.setItem(`unilien_onboarding_dismissed_${profile.id}`, 'true')
    return null
  }

  const progress = Math.round((completedCount / steps.length) * 100)

  const handleDismiss = () => {
    localStorage.setItem(`unilien_onboarding_dismissed_${profile.id}`, 'true')
    setDismissed(true)
  }

  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="14px"
      p={5}
      position="relative"
    >
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Text fontWeight="700" fontSize="md">
            Bienvenue sur Unilien
          </Text>
          <Text fontSize="sm" color="text.muted">
            {completedCount}/{steps.length} etapes completees
          </Text>
        </Box>
        <Flex
          as="button"
          onClick={handleDismiss}
          align="center"
          justify="center"
          w="28px"
          h="28px"
          borderRadius="6px"
          fontSize="sm"
          color="text.muted"
          _hover={{ bg: 'bg.page', color: 'text.default' }}
          aria-label="Masquer le guide"
        >
          ✕
        </Flex>
      </Flex>

      {/* Progress bar */}
      <Box
        h="6px"
        bg="bg.page"
        borderRadius="full"
        overflow="hidden"
        mb={5}
      >
        <Box
          h="full"
          bg="brand.500"
          borderRadius="full"
          transition="width 0.3s ease"
          style={{ width: `${progress}%` }}
        />
      </Box>

      {/* Steps */}
      <Stack gap={0}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1
          return (
            <Flex key={step.id} gap={3} position="relative">
              {/* Step indicator */}
              <Flex direction="column" align="center" flexShrink={0}>
                <Flex
                  w="32px"
                  h="32px"
                  borderRadius="full"
                  align="center"
                  justify="center"
                  bg={step.done ? 'green.500' : 'bg.page'}
                  borderWidth={step.done ? '0' : '2px'}
                  borderColor={step.done ? 'transparent' : 'border.default'}
                  color={step.done ? 'white' : 'text.muted'}
                  fontSize="sm"
                  fontWeight="700"
                  flexShrink={0}
                >
                  {step.done ? CheckIcon : idx + 1}
                </Flex>
                {!isLast && (
                  <Box
                    w="2px"
                    flex={1}
                    minH="16px"
                    bg={step.done ? 'green.200' : 'border.default'}
                  />
                )}
              </Flex>

              {/* Content */}
              <Box
                as={step.done ? 'div' : RouterLink}
                {...(step.done ? {} : { to: step.href })}
                flex={1}
                pb={isLast ? 0 : 4}
                textDecoration="none"
                cursor={step.done ? 'default' : 'pointer'}
                borderRadius="8px"
                _hover={step.done ? {} : { '& .step-label': { color: 'brand.600' } }}
              >
                <Text
                  className="step-label"
                  fontWeight="600"
                  fontSize="sm"
                  color={step.done ? 'text.muted' : 'text.default'}
                  textDecoration={step.done ? 'line-through' : 'none'}
                  transition="color 0.15s"
                >
                  {step.label}
                  {!step.done && (
                    <Text as="span" color="brand.500" ml={1} fontSize="xs">
                      →
                    </Text>
                  )}
                </Text>
                <Text fontSize="xs" color="text.muted" lineHeight="1.5">
                  {step.description}
                </Text>
              </Box>
            </Flex>
          )
        })}
      </Stack>
    </Box>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function isProfileComplete(profileId: string, profile: Profile, role: UserRole): Promise<boolean> {
  const baseComplete = !!(profile.firstName && profile.lastName && profile.phone)
  if (!baseComplete) return false

  if (role === 'employer') {
    const { data } = await supabase
      .from('employers')
      .select('address')
      .eq('profile_id', profileId)
      .maybeSingle()

    const addr = data?.address as { street?: string; city?: string; postalCode?: string } | null
    return !!(addr?.street && addr?.city && addr?.postalCode)
  }

  if (role === 'employee') {
    const { data } = await supabase
      .from('employees')
      .select('address')
      .eq('profile_id', profileId)
      .maybeSingle()

    const addr = data?.address as { street?: string; city?: string } | null
    return !!(addr?.street && addr?.city)
  }

  // caregiver — pas d'adresse obligatoire
  return true
}

async function checkTeamSetup(profileId: string, role: UserRole): Promise<boolean> {
  if (role === 'employer') {
    const { count } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('employer_id', profileId)

    return (count ?? 0) > 0
  }

  if (role === 'employee') {
    const { count } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('employee_id', profileId)

    return (count ?? 0) > 0
  }

  // caregiver
  const { count } = await supabase
    .from('caregivers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profileId)

  return (count ?? 0) > 0
}

async function checkHasShifts(profileId: string, role: UserRole): Promise<boolean> {
  // Les shifts sont liés aux contrats, pas directement au profil
  const column = role === 'employer' ? 'employer_id' : 'employee_id'

  if (role === 'caregiver') {
    const { data: caregiver } = await supabase
      .from('caregivers')
      .select('employer_id')
      .eq('user_id', profileId)
      .maybeSingle()

    if (!caregiver?.employer_id) return false

    // Trouver les contrats de cet employeur puis vérifier s'il y a des shifts
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('employer_id', caregiver.employer_id)
      .limit(1)

    if (!contracts?.length) return false

    const { count } = await supabase
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .eq('contract_id', contracts[0].id)

    return (count ?? 0) > 0
  }

  // Employer ou employee : trouver les contrats puis les shifts
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id')
    .eq(column, profileId)

  if (!contracts?.length) return false

  const contractIds = contracts.map((c) => c.id)

  const { count } = await supabase
    .from('shifts')
    .select('id', { count: 'exact', head: true })
    .in('contract_id', contractIds)

  return (count ?? 0) > 0
}

export default OnboardingWidget
