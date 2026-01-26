/**
 * Page de tableau de bord de conformité
 */

import { Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard'
import { ComplianceDashboard } from '@/components/compliance'
import { useAuth } from '@/hooks/useAuth'
import { Center, Spinner } from '@chakra-ui/react'

export function CompliancePage() {
  const { profile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <DashboardLayout>
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      </DashboardLayout>
    )
  }

  // Seuls les employeurs peuvent accéder à cette page
  if (!profile || profile.role !== 'employer') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <DashboardLayout>
      <ComplianceDashboard employerId={profile.id} />
    </DashboardLayout>
  )
}

export default CompliancePage
