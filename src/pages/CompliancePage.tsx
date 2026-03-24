/**
 * Page de tableau de bord de conformité
 */

import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard'
import { ComplianceDashboard } from '@/components/compliance'
import { useAuth } from '@/hooks/useAuth'
import { Box, Center, Flex, Spinner } from '@chakra-ui/react'
import { getCaregiver } from '@/services/caregiverService'
import type { Caregiver } from '@/types'

export function CompliancePage() {
  const { profile } = useAuth()
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [caregiverLoaded, setCaregiverLoaded] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const refreshRef = useRef<(() => void) | null>(null)

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
      <DashboardLayout title="Conformité">
        <Center py={12} role="status" aria-live="polite">
          <Spinner size="xl" color="brand.500" />
        </Center>
      </DashboardLayout>
    )
  }

  // Vérification fine des permissions aidant (canExportData)
  const isEmployer = profile.role === 'employer'
  const isCaregiverWithAccess = profile.role === 'caregiver' && caregiver?.permissions?.canExportData

  if (!isEmployer && !isCaregiverWithAccess) {
    return <Navigate to="/tableau-de-bord" replace />
  }

  const employerId = isEmployer ? profile.id : caregiver?.employerId

  if (!employerId) {
    return <Navigate to="/tableau-de-bord" replace />
  }

  const topbarRight = (
    <Flex gap={2}>
      <Flex
        as="button"
        align="center"
        gap={1}
        px={3} py="6px"
        borderRadius="6px"
        borderWidth="1.5px"
        borderColor="border.default"
        bg="transparent"
        color="brand.500"
        fontSize="13px"
        fontWeight="600"
        cursor="pointer"
        _hover={{ borderColor: 'brand.500', bg: 'brand.50' }}
        onClick={() => setShowHelp(true)}
        role="button"
        aria-label="Aide"
      >
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <Box as="span" display={{ base: 'none', sm: 'inline' }}>Aide</Box>
      </Flex>
      <Flex
        as="button"
        align="center"
        gap={1}
        px={3} py="6px"
        borderRadius="6px"
        bg="brand.500"
        color="white"
        fontSize="13px"
        fontWeight="700"
        cursor="pointer"
        _hover={{ bg: 'brand.600' }}
        onClick={() => refreshRef.current?.()}
        role="button"
        aria-label="Actualiser"
      >
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        <Box as="span" display={{ base: 'none', sm: 'inline' }}>Actualiser</Box>
      </Flex>
    </Flex>
  )

  return (
    <DashboardLayout title="Conformité" topbarRight={topbarRight}>
      <ComplianceDashboard
        employerId={employerId}
        showHelp={showHelp}
        onShowHelp={setShowHelp}
        onRefreshRef={refreshRef}
      />
    </DashboardLayout>
  )
}

export default CompliancePage
