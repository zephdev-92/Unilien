/**
 * Page Analytique — statistiques detaillees multi-mois
 * Accessible aux employeurs et aidants avec permission canExportData
 */

import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard'
import { AnalyticsDashboard } from '@/components/analytics'
import { useAuth } from '@/hooks/useAuth'
import { Center, Spinner } from '@chakra-ui/react'
import { getCaregiver } from '@/services/caregiverService'
import type { Caregiver } from '@/types'

export function AnalyticsPage() {
  const { profile } = useAuth()
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [caregiverLoaded, setCaregiverLoaded] = useState(false)

  useEffect(() => {
    if (profile?.role === 'caregiver') {
      getCaregiver(profile.id)
        .then(setCaregiver)
        .finally(() => setCaregiverLoaded(true))
    }
  }, [profile?.id, profile?.role])

  const isLoadingCaregiver = profile?.role === 'caregiver' && !caregiverLoaded

  if (!profile || isLoadingCaregiver) {
    return (
      <DashboardLayout>
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      </DashboardLayout>
    )
  }

  const isEmployer = profile.role === 'employer'
  const isEmployee = profile.role === 'employee'
  const isCaregiverWithAccess = profile.role === 'caregiver' && caregiver?.permissions?.canExportData

  if (!isEmployer && !isEmployee && !isCaregiverWithAccess) {
    return <Navigate to="/tableau-de-bord" replace />
  }

  const employerId = isEmployer ? profile.id : caregiver?.employerId
  const role = isEmployee ? 'employee' : 'employer'

  return (
    <DashboardLayout>
      <AnalyticsDashboard
        profileId={profile.id}
        role={role}
        employerId={employerId}
      />
    </DashboardLayout>
  )
}

export default AnalyticsPage
