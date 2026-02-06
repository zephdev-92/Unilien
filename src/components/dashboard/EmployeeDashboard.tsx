import { useState, useEffect } from 'react'
import { Stack } from '@chakra-ui/react'
import type { Profile, Shift } from '@/types'
import {
  WelcomeCard,
  UpcomingShiftsWidget,
  RecentLogsWidget,
  QuickActionsWidget,
  StatsWidget,
} from './widgets'
import { getShifts } from '@/services/shiftService'
import { logger } from '@/lib/logger'

interface EmployeeDashboardProps {
  profile: Profile
}

export function EmployeeDashboard({ profile }: EmployeeDashboardProps) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)

  useEffect(() => {
    async function loadUpcomingShifts() {
      setIsLoadingShifts(true)
      try {
        const today = new Date()
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)

        const data = await getShifts(profile.id, 'employee', today, nextWeek)
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
      <StatsWidget userRole="employee" profileId={profile.id} />
      <QuickActionsWidget userRole="employee" />
      <UpcomingShiftsWidget
        shifts={shifts}
        loading={isLoadingShifts}
        userRole="employee"
      />
      <RecentLogsWidget employerId={profile.id} />
    </Stack>
  )
}

export default EmployeeDashboard
