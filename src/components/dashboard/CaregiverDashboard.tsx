/**
 * Dashboard Aidant — aligné sur le prototype dashboard-aidant.html
 *
 * Layout :
 *  - WelcomeCard (warm)
 *  - Stats (4 cartes)
 *  - 2 colonnes :
 *    - Gauche : Timeline du jour, Enveloppe PCH, Semaine en cours
 *    - Droite  : ClockIn widget, PCH mini, Messages
 */

import { useState, useEffect } from 'react'
import { Grid, GridItem, Stack, Box, Text, Center, Spinner } from '@chakra-ui/react'
import type { Profile, Shift, Caregiver } from '@/types'
import {
  WelcomeCard,
  StatsWidget,
  QuickActionsWidget,
  ClockInWidget,
  PchEnvelopeWidget,
  PchMiniWidget,
  WeekSummaryWidget,
  RecentMessagesWidget,
  CaregiverShiftTimeline,
} from './widgets'
import {
  getCaregiver,
  getUpcomingShiftsForCaregiver,
} from '@/services/caregiverService'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface CaregiverDashboardProps {
  profile: Profile
}

export function CaregiverDashboard({ profile }: CaregiverDashboardProps) {
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [todayCareCount, setTodayCareCount] = useState(0)
  const [employerName, setEmployerName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setError(null)

      try {
        const caregiverData = await getCaregiver(profile.id)
        setCaregiver(caregiverData)

        if (caregiverData) {
          // Charger les prochains shifts
          if (caregiverData.permissions.canViewPlanning) {
            const shiftsData = await getUpcomingShiftsForCaregiver(profile.id, 5)
            setShifts(shiftsData)

            // Compter les temps d'aide du jour
            const today = new Date().toISOString().split('T')[0]
            const todayShifts = shiftsData.filter((s) => s.date === today)
            setTodayCareCount(todayShifts.length)
          }

          // Charger le nom de l'employeur
          if (caregiverData.employerId) {
            const { data } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', caregiverData.employerId)
              .maybeSingle()

            if (data) {
              setEmployerName(`${data.first_name} ${data.last_name}`)
            }
          }
        }
      } catch (err) {
        logger.error('Erreur chargement données aidant:', err)
        setError('Erreur lors du chargement des données')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [profile.id])

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="xl" color="warm.500" />
      </Center>
    )
  }

  // Pas de profil aidant
  if (!caregiver) {
    return (
      <Stack gap={6}>
        <WelcomeCard profile={profile} />
        <Box p={6} bg="warm.50" borderRadius="12px" borderWidth="1px" borderColor="warm.200">
          <Text fontWeight="medium" color="warm.700" mb={2}>
            Profil aidant non configuré
          </Text>
          <Text color="warm.500">
            Votre profil aidant n'est pas encore associé à un employeur.
            Veuillez contacter la personne que vous accompagnez pour qu'elle vous ajoute
            comme aidant depuis son espace Unilien.
          </Text>
        </Box>
      </Stack>
    )
  }

  const hasViewPermission = caregiver.permissions.canViewPlanning || caregiver.permissions.canViewLiaison
  const hasAdvancedPermissions = caregiver.permissions.canManageTeam || caregiver.permissions.canEditPlanning || caregiver.permissions.canExportData

  return (
    <Stack gap={6}>
      {/* Greeting Banner — warm */}
      <WelcomeCard
        profile={profile}
        nextShift={shifts[0] ?? null}
        todayCareCount={todayCareCount}
        loading={isLoading}
      />

      {/* Message si aucune permission */}
      {!hasViewPermission && !hasAdvancedPermissions && (
        <Box p={6} bg="warm.50" borderRadius="12px" borderWidth="1px" borderColor="warm.200">
          <Text fontWeight="medium" color="warm.700" mb={2}>
            Accès limité
          </Text>
          <Text color="warm.500">
            Vous êtes enregistré comme aidant mais vous n'avez pas encore de permissions
            pour accéder au planning ou au cahier de liaison. Contactez votre proche
            pour qu'il vous accorde les accès nécessaires.
          </Text>
        </Box>
      )}

      {/* ── LAYOUT DESKTOP : Stats + 2 colonnes ── */}
      <Box display={{ base: 'none', lg: 'block' }}>
        <Stack gap={6}>
          <StatsWidget
            userRole="caregiver"
            profileId={profile.id}
            employerId={hasAdvancedPermissions ? caregiver.employerId : undefined}
          />
          <Grid templateColumns="1fr 340px" gap={6}>
            <GridItem minW={0}>
              <Stack gap={6}>
                {caregiver.permissions.canViewPlanning && (
                  <CaregiverShiftTimeline profileId={profile.id} employerName={employerName} />
                )}
                <PchEnvelopeWidget employerId={caregiver.employerId} />
                <WeekSummaryWidget userId={profile.id} accentColor="var(--chakra-colors-warm-500)" />
              </Stack>
            </GridItem>
            <GridItem minW={0}>
              <Stack gap={6}>
                <ClockInWidget variant="warm" />
                <PchMiniWidget employerId={caregiver.employerId} />
                <RecentMessagesWidget userId={profile.id} />
                <QuickActionsWidget userRole="caregiver" permissions={caregiver.permissions} />
              </Stack>
            </GridItem>
          </Grid>
        </Stack>
      </Box>

      {/* ── LAYOUT MOBILE : ordre spécifique ── */}
      <Stack gap={6} display={{ base: 'flex', lg: 'none' }}>
        {caregiver.permissions.canViewPlanning && (
          <CaregiverShiftTimeline profileId={profile.id} employerName={employerName} />
        )}
        <ClockInWidget variant="warm" />
        <RecentMessagesWidget userId={profile.id} />
        <PchEnvelopeWidget employerId={caregiver.employerId} />
        <QuickActionsWidget userRole="caregiver" permissions={caregiver.permissions} />
        <WeekSummaryWidget userId={profile.id} accentColor="var(--chakra-colors-warm-500)" />
        <StatsWidget
          userRole="caregiver"
          profileId={profile.id}
          employerId={hasAdvancedPermissions ? caregiver.employerId : undefined}
        />
      </Stack>

      {/* Erreur */}
      {error && (
        <Box p={4} bg="red.50" borderRadius="10px">
          <Text color="red.700">{error}</Text>
        </Box>
      )}
    </Stack>
  )
}

export default CaregiverDashboard
