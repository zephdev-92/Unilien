import { useState, useEffect } from 'react'
import { Stack, Grid, GridItem } from '@chakra-ui/react'
import type { Profile, Shift, Employer } from '@/types'
import {
  WelcomeCard,
  ActionNudgesWidget,
  // UpcomingShiftsWidget,
  // RecentLogsWidget,
  QuickActionsWidget,
  StatsWidget,
  // TeamWidget,
  ComplianceWidget,
  PchEnvelopeWidget,
  TodayPlanningWidget,
  BudgetForecastWidget,
  OnboardingWidget,
} from './widgets'
import { getShifts } from '@/services/shiftService'
import { getEmployer } from '@/services/profileService'
import { getWeeklyComplianceOverview } from '@/services/complianceService'
import { useComplianceMonitor } from '@/hooks/useComplianceMonitor'
import { logger } from '@/lib/logger'

interface EmployerDashboardProps {
  profile: Profile
}

export function EmployerDashboard({ profile }: EmployerDashboardProps) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [employer, setEmployer] = useState<Employer | null>(null)
  const [complianceAlertCount, setComplianceAlertCount] = useState(0)

  // Monitor compliance and create notifications for threshold violations
  useComplianceMonitor({
    employerId: profile.id,
    userId: profile.id,
    enabled: true,
    pollingInterval: 5 * 60 * 1000, // Check every 5 minutes
  })

  useEffect(() => {
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
        // Filter only planned/future shifts and limit to 5
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
      {/* Mobile: 1 — Desktop: full width row */}
      <GridItem colSpan={{ base: 1, lg: 2 }} order={{ base: 1, lg: 0 }}>
        <WelcomeCard
          profile={profile}
          nextShift={shifts[0] ?? null}
          complianceAlertCount={complianceAlertCount}
          loading={isLoadingShifts}
        />
      </GridItem>

      {/* Onboarding — full width, before nudges */}
      <GridItem colSpan={{ base: 1, lg: 2 }} order={{ base: 2, lg: 1 }}>
        <OnboardingWidget profile={profile} userRole="employer" />
      </GridItem>

      {/* Mobile: 5 — Desktop: 3e (full width) */}
      <GridItem colSpan={{ base: 1, lg: 2 }} order={{ base: 5, lg: 2 }}>
        <ActionNudgesWidget employerId={profile.id} />
      </GridItem>

      {/* Mobile: 8 (dernier) — Desktop: 3e (full width, avant la grille) */}
      <GridItem colSpan={{ base: 1, lg: 2 }} order={{ base: 8, lg: 2 }}>
        <StatsWidget userRole="employer" profileId={profile.id} />
      </GridItem>

      {/* Mobile: 2 — Desktop: col gauche */}
      <GridItem order={{ base: 2, lg: 3 }} minW={0}>
        <TodayPlanningWidget employerId={profile.id} />
      </GridItem>

      {/* Mobile: 3 — Desktop: col droite, span rows */}
      <GridItem order={{ base: 3, lg: 3 }} gridRow={{ lg: 'span 3' }} minW={0}>
        <Stack gap={6}>
          <ComplianceWidget employerId={profile.id} />
          <QuickActionsWidget userRole="employer" />
        </Stack>
      </GridItem>

      {/* Mobile: 6 — Desktop: col gauche */}
      {employer?.pchBeneficiary && employer.pchType && employer.pchMonthlyHours && (
        <GridItem order={{ base: 6, lg: 4 }} minW={0}>
          <PchEnvelopeWidget employerId={profile.id} />
        </GridItem>
      )}

      {/* Mobile: 7 — Desktop: col gauche */}
      <GridItem order={{ base: 7, lg: 5 }} minW={0}>
        <BudgetForecastWidget employerId={profile.id} />
      </GridItem>
    </Grid>
  )
}

export default EmployerDashboard
