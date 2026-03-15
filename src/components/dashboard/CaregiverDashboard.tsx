import { useState, useEffect } from 'react'
import { Stack, Box, Text, Center, Spinner, SimpleGrid } from '@chakra-ui/react'
import type { Profile, Shift, Caregiver } from '@/types'
import {
  WelcomeCard,
  UpcomingShiftsWidget,
  RecentLogsWidget,
  QuickActionsWidget,
  StatsWidget,
  TeamWidget,
  ComplianceWidget,
} from './widgets'
import {
  getCaregiver,
  getUpcomingShiftsForCaregiver,
} from '@/services/caregiverService'
import { logger } from '@/lib/logger'

interface CaregiverDashboardProps {
  profile: Profile
}

export function CaregiverDashboard({ profile }: CaregiverDashboardProps) {
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setError(null)

      try {
        // Charger le profil aidant
        const caregiverData = await getCaregiver(profile.id)
        setCaregiver(caregiverData)

        if (caregiverData) {
          // Charger les prochains shifts si l'aidant a la permission
          if (caregiverData.permissions.canViewPlanning) {
            const shiftsData = await getUpcomingShiftsForCaregiver(profile.id, 5)
            setShifts(shiftsData)
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
        <Spinner size="xl" color="brand.500" />
      </Center>
    )
  }

  // Si pas de profil aidant trouvé
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

  // Afficher les permissions de l'aidant
  const hasAnyViewPermission =
    caregiver.permissions.canViewPlanning || caregiver.permissions.canViewLiaison

  // Vérifier si l'aidant a des permissions avancées (tuteur/curateur)
  const hasAdvancedPermissions =
    caregiver.permissions.canManageTeam ||
    caregiver.permissions.canEditPlanning ||
    caregiver.permissions.canExportData

  return (
    <Stack gap={6}>
      <WelcomeCard
        profile={profile}
        nextShift={shifts[0] ?? null}
        loading={isLoading}
      />

      {/* Message si aucune permission */}
      {!hasAnyViewPermission && !hasAdvancedPermissions && (
        <Box p={6} bg="brand.50" borderRadius="12px" borderWidth="1px" borderColor="brand.200">
          <Text fontWeight="medium" color="brand.700" mb={2}>
            Accès limité
          </Text>
          <Text color="brand.500">
            Vous êtes enregistré comme aidant mais vous n'avez pas encore de permissions
            pour accéder au planning ou au cahier de liaison. Contactez votre proche
            pour qu'il vous accorde les accès nécessaires.
          </Text>
        </Box>
      )}

      {/* Stats widget pour les aidants avec permissions avancées */}
      {hasAdvancedPermissions && (
        <StatsWidget userRole="caregiver" profileId={profile.id} employerId={caregiver.employerId} />
      )}

      {/* Actions rapides */}
      <QuickActionsWidget userRole="caregiver" permissions={caregiver.permissions} />

      {/* Widgets équipe et conformité pour les aidants avec permissions avancées */}
      {hasAdvancedPermissions && (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
          {caregiver.permissions.canManageTeam && (
            <TeamWidget employerId={caregiver.employerId} />
          )}
          {caregiver.permissions.canExportData && (
            <ComplianceWidget employerId={caregiver.employerId} />
          )}
        </SimpleGrid>
      )}

      {/* Prochaines interventions et cahier de liaison */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
        {caregiver.permissions.canViewPlanning && (
          <UpcomingShiftsWidget shifts={shifts} userRole="caregiver" />
        )}
        {caregiver.permissions.canViewLiaison && (
          <RecentLogsWidget employerId={caregiver.employerId} />
        )}
      </SimpleGrid>

      {/* Message d'erreur si présent */}
      {error && (
        <Box p={4} bg="red.50" borderRadius="10px">
          <Text color="red.700">{error}</Text>
        </Box>
      )}
    </Stack>
  )
}

export default CaregiverDashboard
