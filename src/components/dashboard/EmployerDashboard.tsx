import { useState, useEffect } from 'react'
import { Stack, SimpleGrid } from '@chakra-ui/react'
import type { Profile, Shift, Employer } from '@/types'
import {
  WelcomeCard,
  UpcomingShiftsWidget,
  RecentLogsWidget,
  QuickActionsWidget,
  StatsWidget,
  TeamWidget,
  ComplianceWidget,
  PchEnvelopeWidget,
} from './widgets'
import { getShifts } from '@/services/shiftService'
import { getEmployer } from '@/services/profileService'
import { useComplianceMonitor } from '@/hooks/useComplianceMonitor'
import { logger } from '@/lib/logger'

interface EmployerDashboardProps {
  profile: Profile
}

export function EmployerDashboard({ profile }: EmployerDashboardProps) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [employer, setEmployer] = useState<Employer | null>(null)

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
      <WelcomeCard profile={profile} />
      <StatsWidget userRole="employer" profileId={profile.id} />
      <QuickActionsWidget userRole="employer" />
      {employer?.pchBeneficiary && employer.pchType && employer.pchMonthlyHours && (
        <PchEnvelopeWidget employerId={profile.id} />
      )}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
        <TeamWidget employerId={profile.id} />
        <ComplianceWidget employerId={profile.id} />
      </SimpleGrid>
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
        <UpcomingShiftsWidget
          shifts={shifts}
          loading={isLoadingShifts}
          userRole="employer"
        />
        <RecentLogsWidget employerId={profile.id} />
      </SimpleGrid>
    </Stack>
  )
}

export default EmployerDashboard
