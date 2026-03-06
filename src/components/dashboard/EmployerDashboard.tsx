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
    <Stack gap={6}>
      <WelcomeCard
        profile={profile}
        nextShift={shifts[0] ?? null}
        complianceAlertCount={complianceAlertCount}
        loading={isLoadingShifts}
      />
      <ActionNudgesWidget employerId={profile.id} />
      <StatsWidget userRole="employer" profileId={profile.id} />
      <Grid templateColumns={{ base: '1fr', lg: '1fr 340px' }} gap={6}>
        <GridItem minW={0}>
          <Stack gap={6}>
            <TodayPlanningWidget employerId={profile.id} />
            {employer?.pchBeneficiary && employer.pchType && employer.pchMonthlyHours && (
              <PchEnvelopeWidget employerId={profile.id} />
            )}
          </Stack>
        </GridItem>
        <GridItem minW={0}>
          <Stack gap={6}>
            <ComplianceWidget employerId={profile.id} />
            <QuickActionsWidget userRole="employer" />
          </Stack>
        </GridItem>
      </Grid>
      {/* TODO: réactiver quand les données seront disponibles
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
        <TeamWidget employerId={profile.id} />
        <UpcomingShiftsWidget
          shifts={shifts}
          loading={isLoadingShifts}
          userRole="employer"
        />
      </SimpleGrid>
      <RecentLogsWidget employerId={profile.id} />
      */}
    </Stack>
  )
}

export default EmployerDashboard
