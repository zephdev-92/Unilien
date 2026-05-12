import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Flex, Grid, GridItem, Text } from '@chakra-ui/react'
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
import { AccessibleButton } from '@/components/ui'
import { getShifts } from '@/services/shiftService'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { FEATURES } from '@/lib/featureFlags'

// ─── Empty state — aucun contrat actif ───────────────────────────────────────

function EmptyEmployeeDashboardState() {
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
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </Flex>

      <Text fontWeight="700" fontSize="lg" color="text.default" mb={2}>
        Aucun contrat actif pour le moment
      </Text>
      <Text fontSize="sm" color="text.muted" maxW="420px" mx="auto" mb={7} lineHeight="1.6">
        Votre profil est prêt. Un employeur particulier pourra vous proposer des interventions
        en vous ajoutant à son équipe. Pensez à compléter votre profil pour faciliter la mise en relation.
      </Text>

      <Flex gap={3} justify="center" flexWrap="wrap">
        <AccessibleButton colorPalette="brand" asChild accessibleLabel="Compléter mon profil">
          <RouterLink to="/profil">Compléter mon profil</RouterLink>
        </AccessibleButton>
        <AccessibleButton variant="outline" asChild accessibleLabel="Consulter l'aide">
          <RouterLink to="/aide">Centre d'aide</RouterLink>
        </AccessibleButton>
      </Flex>
    </Box>
  )
}

interface EmployeeDashboardProps {
  profile: Profile
}

export function EmployeeDashboard({ profile }: EmployeeDashboardProps) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [activeShift, setActiveShift] = useState<Shift | null>(null)
  const [todayShiftCount, setTodayShiftCount] = useState(0)
  const [hasContracts, setHasContracts] = useState<boolean | null>(null)

  useEffect(() => {
    supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('employee_id', profile.id)
      .eq('status', 'active')
      .then(({ count }) => setHasContracts((count ?? 0) > 0))
      .catch(() => setHasContracts(false))
  }, [profile.id])

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

      {/* Empty state — aucun contrat actif */}
      {hasContracts === false && (
        <GridItem order={{ base: 3, lg: 0 }} gridColumn={{ base: '1', lg: '1 / -1' }} gridRow={{ lg: '3' }}>
          <EmptyEmployeeDashboardState />
        </GridItem>
      )}

      {/* Widgets principaux — uniquement si au moins un contrat actif */}
      {hasContracts && (
        <>
          {/* 3. Stats — full width */}
          <GridItem order={{ base: 8, lg: 0 }} gridColumn={{ base: '1', lg: '1 / -1' }} gridRow={{ lg: '3' }}>
            <StatsWidget userRole="employee" profileId={profile.id} />
          </GridItem>

          {/* 4. Timeline — main col */}
          <GridItem order={{ base: 2, lg: 0 }} gridColumn={{ lg: '1' }} gridRow={{ lg: '4' }}>
            <EmployeeShiftTimeline employeeId={profile.id} />
          </GridItem>

          {/* 4. Clock-in — aside col */}
          {FEATURES.clockIn && (
            <GridItem order={{ base: 4, lg: 0 }} gridColumn={{ lg: '2' }} gridRow={{ lg: '4' }}>
              <ClockInWidget
                hasActiveShift={!!activeShift}
                activeShiftLabel={activeShift ? `Intervention ${activeShift.startTime.slice(0, 5)} – ${activeShift.endTime.slice(0, 5)}` : undefined}
              />
            </GridItem>
          )}

          {/* 5. Heures du mois — main col */}
          <GridItem order={{ base: 5, lg: 0 }} gridColumn={{ lg: '1' }} gridRow={{ lg: '5' }}>
            <EmployeeHoursProgress employeeId={profile.id} />
          </GridItem>

          {/* 5. Messages — aside col (remonte d'une row si clock-in désactivé) */}
          <GridItem order={{ base: 3, lg: 0 }} gridColumn={{ lg: '2' }} gridRow={{ lg: FEATURES.clockIn ? '5' : '4' }}>
            <RecentMessagesWidget userId={profile.id} />
          </GridItem>

          {/* 6. Congés & absences — main col */}
          <GridItem order={{ base: 6, lg: 0 }} gridColumn={{ lg: '1' }} gridRow={{ lg: '6' }}>
            <EmployeeLeaveWidget employeeId={profile.id} />
          </GridItem>

          {/* 6. Mes documents — aside col (remonte d'une row si clock-in désactivé) */}
          <GridItem order={{ base: 7, lg: 0 }} gridColumn={{ lg: '2' }} gridRow={{ lg: FEATURES.clockIn ? '6' : '5' }}>
            <EmployeeDocumentsWidget employeeId={profile.id} />
          </GridItem>
        </>
      )}
    </Grid>
  )
}

export default EmployeeDashboard
