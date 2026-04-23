/**
 * Page Documents - Bulletins, contrats, absences, export planning, declarations CESU
 */

import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Container,
  VStack,
  Spinner,
  Center,
  Alert,
  Tabs,
} from '@chakra-ui/react'
import { DashboardLayout } from '@/components/dashboard'
import { useAuth } from '@/hooks/useAuth'
import { getCaregiver } from '@/services/caregiverService'
import {
  CesuDeclarationSection,
  ContractsSection,
  DocumentManagementSection,
  EmployeePayslipSection,
  PayslipSection,
  PlanningExportSection,
} from '@/components/documents'
import type { Caregiver } from '@/types'

export function DocumentsPage() {
  const { profile } = useAuth()
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [isLoadingCaregiver, setIsLoadingCaregiver] = useState(
    () => profile?.role === 'caregiver'
  )

  useEffect(() => {
    if (profile?.role !== 'caregiver') return
    let cancelled = false
    getCaregiver(profile.id)
      .then((data) => { if (!cancelled) setCaregiver(data) })
      .finally(() => { if (!cancelled) setIsLoadingCaregiver(false) })
    return () => { cancelled = true }
  }, [profile?.id, profile?.role])

  const effectiveEmployerId = profile?.role === 'employer'
    ? profile.id
    : caregiver?.employerId

  const canExport = profile?.role === 'employer' ||
    (profile?.role === 'caregiver' && caregiver?.permissions?.canExportData)

  if (!profile || isLoadingCaregiver) {
    return (
      <DashboardLayout title="Documents">
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      </DashboardLayout>
    )
  }

  if (!profile || (!canExport && profile.role !== 'employee')) {
    return <Navigate to="/tableau-de-bord" replace />
  }

  return (
    <DashboardLayout title="Documents">
      <Container maxW="container.xl" py={6}>
        <VStack gap={6} align="stretch">
          <Tabs.Root defaultValue="payslips" variant="enclosed">
            <Tabs.List>
              <Tabs.Trigger value="payslips">
                Bulletins de paie
              </Tabs.Trigger>
              <Tabs.Trigger value="contracts">
                Contrats
              </Tabs.Trigger>
              <Tabs.Trigger value="absences">
                Absences
              </Tabs.Trigger>
              <Tabs.Trigger value="planning">
                Export planning
              </Tabs.Trigger>
              <Tabs.Trigger value="declarations">
                Déclarations CESU
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="payslips" pt={6}>
              {profile.role === 'employee' ? (
                <EmployeePayslipSection employeeId={profile.id} />
              ) : effectiveEmployerId ? (
                <PayslipSection employerId={effectiveEmployerId} />
              ) : (
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Title>Impossible de charger les bulletins</Alert.Title>
                </Alert.Root>
              )}
            </Tabs.Content>

            <Tabs.Content value="contracts" pt={6}>
              {effectiveEmployerId ? (
                <ContractsSection employerId={effectiveEmployerId} />
              ) : (
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Title>Impossible de charger les contrats</Alert.Title>
                </Alert.Root>
              )}
            </Tabs.Content>

            <Tabs.Content value="absences" pt={6}>
              {effectiveEmployerId ? (
                <DocumentManagementSection employerId={effectiveEmployerId} />
              ) : (
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Title>Impossible de charger les absences</Alert.Title>
                </Alert.Root>
              )}
            </Tabs.Content>

            <Tabs.Content value="planning" pt={6}>
              <PlanningExportSection
                employerId={effectiveEmployerId ?? ''}
                profileRole={profile.role as 'employer' | 'employee' | 'caregiver'}
                profileId={profile.id}
              />
            </Tabs.Content>

            <Tabs.Content value="declarations" pt={6}>
              {effectiveEmployerId ? (
                <CesuDeclarationSection employerId={effectiveEmployerId} />
              ) : (
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Title>Impossible de charger les declarations</Alert.Title>
                </Alert.Root>
              )}
            </Tabs.Content>
          </Tabs.Root>
        </VStack>
      </Container>
    </DashboardLayout>
  )
}

export default DocumentsPage
