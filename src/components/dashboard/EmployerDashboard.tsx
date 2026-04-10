import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Stack, Grid, GridItem, Box, Flex, Text } from '@chakra-ui/react'
import type { Profile, Shift, Employer } from '@/types'
import {
  WelcomeCard,
  ActionNudgesWidget,
  QuickActionsWidget,
  StatsWidget,
  ComplianceWidget,
  PchEnvelopeWidget,
  TodayPlanningWidget,
  BudgetForecastWidget,
  OnboardingWidget,
} from './widgets'
import { AccessibleButton } from '@/components/ui'
import { getShifts } from '@/services/shiftService'
import { getEmployer } from '@/services/profileService'
import { getWeeklyComplianceOverview } from '@/services/complianceService'
import { useComplianceMonitor } from '@/hooks/useComplianceMonitor'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface EmployerDashboardProps {
  profile: Profile
}

// ─── Empty state — aucun employé ─────────────────────────────────────────────

function EmptyDashboardState() {
  return (
    <Box
      bg="bg.surface"
      borderWidth="1.5px"
      borderColor="border.default"
      borderRadius="14px"
      boxShadow="sm"
      textAlign="center"
      py={14}
      px={8}
    >
      {/* Icône */}
      <Flex
        align="center"
        justify="center"
        w="64px"
        h="64px"
        mx="auto"
        mb={5}
        bg="bg.muted"
        borderRadius="16px"
        color="text.muted"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      </Flex>

      {/* Texte */}
      <Text fontWeight="700" fontSize="lg" color="text.default" mb={2}>
        Ajoutez votre premier auxiliaire
      </Text>
      <Text fontSize="sm" color="text.muted" maxW="360px" mx="auto" mb={7} lineHeight="1.6">
        Pour commencer à planifier des interventions, ajoutez un auxiliaire de vie et créez son contrat.
      </Text>

      {/* CTAs */}
      <Flex gap={3} justify="center" flexWrap="wrap">
        <AccessibleButton colorPalette="brand" asChild accessibleLabel="Ajouter un auxiliaire">
          <RouterLink to="/equipe">Ajouter un auxiliaire</RouterLink>
        </AccessibleButton>
        <AccessibleButton variant="outline" asChild accessibleLabel="Voir le planning">
          <RouterLink to="/planning">Voir le planning</RouterLink>
        </AccessibleButton>
      </Flex>
    </Box>
  )
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export function EmployerDashboard({ profile }: EmployerDashboardProps) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [employer, setEmployer] = useState<Employer | null>(null)
  const [complianceAlertCount, setComplianceAlertCount] = useState(0)
  const [hasEmployees, setHasEmployees] = useState<boolean | null>(null)

  // Monitor compliance and create notifications for threshold violations
  useComplianceMonitor({
    employerId: profile.id,
    userId: profile.id,
    enabled: true,
    pollingInterval: 5 * 60 * 1000,
  })

  useEffect(() => {
    // Vérifier s'il existe au moins un contrat actif
    supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('employer_id', profile.id)
      .eq('status', 'active')
      .then(({ count }) => setHasEmployees((count ?? 0) > 0))
      .catch(() => setHasEmployees(false))

    getEmployer(profile.id)
      .then(setEmployer)
      .catch((err) => logger.error('Erreur chargement profil employeur:', err))

    getWeeklyComplianceOverview(profile.id)
      .then((overview) => {
        const alertCount = (overview.summary.critical ?? 0) + (overview.summary.warnings ?? 0)
        setComplianceAlertCount(alertCount)
      })
      .catch((err) => logger.error('Erreur chargement conformité:', err))
  }, [profile.id])

  useEffect(() => {
    async function loadUpcomingShifts() {
      setIsLoadingShifts(true)
      try {
        const today = new Date()
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)

        const data = await getShifts(profile.id, 'employer', today, nextWeek)
        const upcomingShifts = data
          .filter((s) => s.status === 'planned')
          .slice(0, 5)
        setShifts(upcomingShifts)
      } catch (error) {
        logger.error('Erreur chargement shifts:', error)
      } finally {
        setIsLoadingShifts(false)
      }
    }

    loadUpcomingShifts()
  }, [profile.id])

  return (
    <Grid
      templateColumns={{ base: '1fr', lg: '1fr 340px' }}
      gap={6}
    >
      {/* WelcomeCard — toujours affiché */}
      <GridItem colSpan={{ base: 1, lg: 2 }} order={{ base: 1, lg: 0 }}>
        <WelcomeCard
          profile={profile}
          nextShift={shifts[0] ?? null}
          complianceAlertCount={complianceAlertCount}
          loading={isLoadingShifts}
        />
      </GridItem>

      {/* Onboarding — toujours affiché (se masque auto quand terminé) */}
      <GridItem colSpan={{ base: 1, lg: 2 }} order={{ base: 2, lg: 1 }}>
        <OnboardingWidget profile={profile} userRole="employer" />
      </GridItem>

      {/* Empty state — aucun employé */}
      {hasEmployees === false && (
        <GridItem colSpan={{ base: 1, lg: 2 }} order={{ base: 3, lg: 2 }}>
          <EmptyDashboardState />
        </GridItem>
      )}

      {/* Widgets principaux — uniquement si au moins un employé */}
      {hasEmployees && (
        <>
          {/* Nudges — collapse si vide */}
          <GridItem colSpan={{ base: 1, lg: 2 }} order={{ base: 4, lg: 3 }} css={{ '&:has(> [data-empty])': { display: 'none' } }}>
            <ActionNudgesWidget employerId={profile.id} />
          </GridItem>

          {/* Stats */}
          <GridItem colSpan={{ base: 1, lg: 2 }} order={{ base: 8, lg: 3 }}>
            <StatsWidget userRole="employer" profileId={profile.id} />
          </GridItem>

          {/* Planning du jour — col gauche */}
          <GridItem order={{ base: 5, lg: 4 }} minW={0}>
            <TodayPlanningWidget employerId={profile.id} />
          </GridItem>

          {/* Compliance + Actions rapides — col droite */}
          <GridItem order={{ base: 6, lg: 4 }} gridRow={{ lg: 'span 3' }} minW={0}>
            <Stack gap={6}>
              <ComplianceWidget employerId={profile.id} />
              <QuickActionsWidget userRole="employer" />
            </Stack>
          </GridItem>

          {/* PCH — col gauche */}
          {employer?.pchBeneficiary && employer.pchType && employer.pchMonthlyHours && (
            <GridItem order={{ base: 6, lg: 5 }} minW={0}>
              <PchEnvelopeWidget employerId={profile.id} />
            </GridItem>
          )}

          {/* Budget — col gauche */}
          <GridItem order={{ base: 7, lg: 6 }} minW={0}>
            <BudgetForecastWidget employerId={profile.id} />
          </GridItem>
        </>
      )}
    </Grid>
  )
}

export default EmployerDashboard
