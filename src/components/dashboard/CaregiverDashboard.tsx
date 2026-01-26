import { useState, useEffect } from 'react'
import { Stack, Box, Text, Center, Spinner } from '@chakra-ui/react'
import type { Profile, Shift, Caregiver } from '@/types'
import {
  WelcomeCard,
  UpcomingShiftsWidget,
  RecentLogsWidget,
  QuickActionsWidget,
} from './widgets'
import {
  getCaregiver,
  getUpcomingShiftsForCaregiver,
} from '@/services/caregiverService'

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
        console.error('Erreur chargement données aidant:', err)
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
        <Box p={6} bg="orange.50" borderRadius="lg" borderWidth="1px" borderColor="orange.200">
          <Text fontWeight="medium" color="orange.800" mb={2}>
            Profil aidant non configuré
          </Text>
          <Text color="orange.700">
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

  return (
    <Stack gap={6}>
      <WelcomeCard profile={profile} />

      {/* Message si aucune permission */}
      {!hasAnyViewPermission && (
        <Box p={6} bg="blue.50" borderRadius="lg" borderWidth="1px" borderColor="blue.200">
          <Text fontWeight="medium" color="blue.800" mb={2}>
            Accès limité
          </Text>
          <Text color="blue.700">
            Vous êtes enregistré comme aidant mais vous n'avez pas encore de permissions
            pour accéder au planning ou au cahier de liaison. Contactez votre proche
            pour qu'il vous accorde les accès nécessaires.
          </Text>
        </Box>
      )}

      {/* Actions rapides */}
      <QuickActionsWidget userRole="caregiver" permissions={caregiver.permissions} />

      {/* Prochaines interventions (si permission) */}
      {caregiver.permissions.canViewPlanning && (
        <UpcomingShiftsWidget shifts={shifts} userRole="caregiver" />
      )}

      {/* Cahier de liaison récent (si permission) */}
      {caregiver.permissions.canViewLiaison && (
        <RecentLogsWidget employerId={caregiver.employerId} />
      )}

      {/* Message d'erreur si présent */}
      {error && (
        <Box p={4} bg="red.50" borderRadius="md">
          <Text color="red.700">{error}</Text>
        </Box>
      )}
    </Stack>
  )
}

export default CaregiverDashboard
