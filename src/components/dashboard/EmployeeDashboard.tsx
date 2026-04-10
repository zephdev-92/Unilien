import { useState, useEffect } from 'react'
import { Grid, GridItem } from '@chakra-ui/react'
import type { Profile, Shift } from '@/types'
import {
  WelcomeCard,
  StatsWidget,
  EmployeeShiftTimeline,
  EmployeeHoursProgress,
  EmployeeLeaveWidget,
  EmployeeDocumentsWidget,
  RecentMessagesWidget,
  ClockInWidget,
  OnboardingWidget,
} from './widgets'
import { getShifts } from '@/services/shiftService'
import { logger } from '@/lib/logger'

interface EmployeeDashboardProps {
  profile: Profile
}

export function EmployeeDashboard({ profile }: EmployeeDashboardProps) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [activeShift, setActiveShift] = useState<Shift | null>(null)
  const [todayShiftCount, setTodayShiftCount] = useState(0)

  useEffect(() => {
    async function loadUpcomingShifts() {
      setIsLoadingShifts(true)
      try {
        const today = new Date()
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)

        const data = await getShifts(profile.id, 'employee', today, nextWeek)

        // Find currently active shift
        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]
        const currentShift = data.find((s) => {
          if (s.date.toISOString().split('T')[0] !== todayStr) return false
          if (s.status !== 'planned' && s.status !== 'completed') return false
          const [sh, sm] = s.startTime.split(':').map(Number)
          const [eh, em] = s.endTime.split(':').map(Number)
          const start = new Date(todayStr + `T${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}:00`)
          const end = new Date(todayStr + `T${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}:00`)
          return now >= start && now <= end
        })
        setActiveShift(currentShift ?? null)

        // Compter les shifts d'aujourd'hui
        const todayShifts = data.filter((s) => {
          const shiftDate = new Date(s.date)
          return shiftDate.toISOString().split('T')[0] === todayStr && s.status !== 'cancelled'
        })
        setTodayShiftCount(todayShifts.length)

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
      templateRows={{ lg: 'repeat(6, auto)' }}
      gap={5}
      alignItems="start"
    >
      {/* 1. Greeting — full width */}
      <GridItem order={{ base: 1, lg: 0 }} gridColumn={{ base: '1', lg: '1 / -1' }} gridRow={{ lg: '1' }}>
        <WelcomeCard
          profile={profile}
          nextShift={shifts[0] ?? null}
          todayShiftCount={todayShiftCount}
          loading={isLoadingShifts}
        />
      </GridItem>

      {/* Onboarding — full width */}
      <GridItem order={{ base: 2, lg: 0 }} gridColumn={{ base: '1', lg: '1 / -1' }} gridRow={{ lg: '2' }}>
        <OnboardingWidget profile={profile} userRole="employee" />
      </GridItem>

      {/* 3. Stats — full width */}
      <GridItem order={{ base: 8, lg: 0 }} gridColumn={{ base: '1', lg: '1 / -1' }} gridRow={{ lg: '3' }}>
        <StatsWidget userRole="employee" profileId={profile.id} />
      </GridItem>

      {/* 4. Timeline — main col */}
      <GridItem order={{ base: 2, lg: 0 }} gridColumn={{ lg: '1' }} gridRow={{ lg: '4' }}>
        <EmployeeShiftTimeline employeeId={profile.id} />
      </GridItem>

      {/* 4. Clock-in — aside col */}
      <GridItem order={{ base: 4, lg: 0 }} gridColumn={{ lg: '2' }} gridRow={{ lg: '4' }}>
        <ClockInWidget
          hasActiveShift={!!activeShift}
          activeShiftLabel={activeShift ? `Intervention ${activeShift.startTime.slice(0, 5)} – ${activeShift.endTime.slice(0, 5)}` : undefined}
        />
      </GridItem>

      {/* 5. Heures du mois — main col */}
      <GridItem order={{ base: 5, lg: 0 }} gridColumn={{ lg: '1' }} gridRow={{ lg: '5' }}>
        <EmployeeHoursProgress employeeId={profile.id} />
      </GridItem>

      {/* 5. Messages — aside col */}
      <GridItem order={{ base: 3, lg: 0 }} gridColumn={{ lg: '2' }} gridRow={{ lg: '5' }}>
        <RecentMessagesWidget userId={profile.id} />
      </GridItem>

      {/* 6. Congés & absences — main col */}
      <GridItem order={{ base: 6, lg: 0 }} gridColumn={{ lg: '1' }} gridRow={{ lg: '6' }}>
        <EmployeeLeaveWidget employeeId={profile.id} />
      </GridItem>

      {/* 6. Mes documents — aside col */}
      <GridItem order={{ base: 7, lg: 0 }} gridColumn={{ lg: '2' }} gridRow={{ lg: '6' }}>
        <EmployeeDocumentsWidget employeeId={profile.id} />
      </GridItem>
    </Grid>
  )
}

export default EmployeeDashboard
