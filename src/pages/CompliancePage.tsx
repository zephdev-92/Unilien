/**
 * Page de tableau de bord de conformité
 */

import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard'
import { ComplianceDashboard } from '@/components/compliance'
import { useAuth } from '@/hooks/useAuth'
import { Center, Spinner } from '@chakra-ui/react'
import { getCaregiver } from '@/services/caregiverService'
import type { Caregiver } from '@/types'

export function CompliancePage() {
  const { profile } = useAuth()
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [caregiverLoaded, setCaregiverLoaded] = useState(false)

  // Charger les données de l'aidant si nécessaire
  useEffect(() => {
    if (profile?.role === 'caregiver') {
      getCaregiver(profile.id)
        .then(setCaregiver)
        .finally(() => setCaregiverLoaded(true))
    }
  }, [profile?.id, profile?.role])

  // Déterminer si on attend encore le chargement
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

  // Vérification fine des permissions aidant (canExportData)
  const isEmployer = profile.role === 'employer'
  const isCaregiverWithAccess = profile.role === 'caregiver' && caregiver?.permissions?.canExportData

  if (!isEmployer && !isCaregiverWithAccess) {
    return <Navigate to="/dashboard" replace />
  }

  const employerId = isEmployer ? profile.id : caregiver?.employerId

  if (!employerId) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <DashboardLayout>
      <ComplianceDashboard employerId={employerId} />
    </DashboardLayout>
  )
}

export default CompliancePage
