import { Navigate } from 'react-router-dom'
import { Box, Text, Center, Spinner } from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { useShiftReminders } from '@/hooks/useShiftReminders'
import { DashboardLayout } from './DashboardLayout'
import { EmployerDashboard } from './EmployerDashboard'
import { EmployeeDashboard } from './EmployeeDashboard'
import { CaregiverDashboard } from './CaregiverDashboard'
import { PushPermissionBanner } from '@/components/notifications'

export function Dashboard() {
  const { profile, userRole, isAuthenticated, isLoading, isInitialized } = useAuth()

  // Créer les rappels de shift pour les auxiliaires
  useShiftReminders(profile?.id, userRole ?? undefined)

  // Loading state
  if (!isInitialized || isLoading) {
    return (
      <Center minH="100vh">
        <Box textAlign="center">
          <Spinner size="xl" color="brand.500" borderWidth="4px" mb={4} />
          <Text fontSize="lg" color="gray.600">
            Chargement...
          </Text>
        </Box>
      </Center>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Profile not loaded
  if (!profile) {
    return (
      <DashboardLayout title="Tableau de bord">
        <Center py={12}>
          <Box textAlign="center">
            <Text fontSize="lg" color="gray.600" mb={4}>
              Chargement du profil...
            </Text>
            <Spinner size="lg" color="brand.500" />
          </Box>
        </Center>
      </DashboardLayout>
    )
  }

  // Render role-specific dashboard
  return (
    <DashboardLayout title="Tableau de bord">
      {/* Bannière d'invitation aux notifications push */}
      <PushPermissionBanner userId={profile.id} />

      {userRole === 'employer' && <EmployerDashboard profile={profile} />}
      {userRole === 'employee' && <EmployeeDashboard profile={profile} />}
      {userRole === 'caregiver' && <CaregiverDashboard profile={profile} />}
    </DashboardLayout>
  )
}

export default Dashboard
