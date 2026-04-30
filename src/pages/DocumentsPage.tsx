/**
 * Page Documents - Bulletins, contrats, absences, export planning, declarations CESU
 */

import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Box,
  Container,
  VStack,
  Spinner,
  Center,
  Alert,
  Tabs,
  Input,
  InputGroup,
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

const SEARCH_PLACEHOLDERS: Record<string, string> = {
  payslips: 'Rechercher un bulletin (employé, période)…',
  contracts: 'Rechercher un contrat (employé)…',
  absences: 'Rechercher une absence (employé, motif)…',
  declarations: 'Rechercher une déclaration (période)…',
}

const SearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

export function DocumentsPage() {
  const { profile } = useAuth()
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [isLoadingCaregiver, setIsLoadingCaregiver] = useState(
    () => profile?.role === 'caregiver'
  )
  const [activeTab, setActiveTab] = useState('payslips')
  const [searchTerm, setSearchTerm] = useState('')

  const handleTabChange = (details: { value: string }) => {
    setActiveTab(details.value)
    setSearchTerm('')
  }

  const searchPlaceholder = SEARCH_PLACEHOLDERS[activeTab]
  const isSearchable = !!searchPlaceholder

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

  const isEmployee = profile.role === 'employee'

  return (
    <DashboardLayout title="Documents">
      <Container maxW="container.xl" py={6}>
        <VStack gap={6} align="stretch">
          <Tabs.Root value={activeTab} onValueChange={handleTabChange} variant="enclosed">
            {isSearchable && (
              <Box mb={4}>
                <InputGroup startElement={SearchIcon}>
                  <Input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    size="md"
                  />
                </InputGroup>
              </Box>
            )}
            <Tabs.List>
              <Tabs.Trigger value="payslips">
                Bulletins de paie
              </Tabs.Trigger>
              {!isEmployee && (
                <Tabs.Trigger value="contracts">
                  Contrats
                </Tabs.Trigger>
              )}
              {!isEmployee && (
                <Tabs.Trigger value="absences">
                  Absences
                </Tabs.Trigger>
              )}
              <Tabs.Trigger value="planning">
                Export planning
              </Tabs.Trigger>
              {!isEmployee && (
                <Tabs.Trigger value="declarations">
                  Déclarations CESU
                </Tabs.Trigger>
              )}
            </Tabs.List>

            <Tabs.Content value="payslips" pt={6}>
              {isEmployee ? (
                <EmployeePayslipSection employeeId={profile.id} searchTerm={searchTerm} />
              ) : effectiveEmployerId ? (
                <PayslipSection employerId={effectiveEmployerId} searchTerm={searchTerm} />
              ) : (
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Title>Impossible de charger les bulletins</Alert.Title>
                </Alert.Root>
              )}
            </Tabs.Content>

            {!isEmployee && (
              <Tabs.Content value="contracts" pt={6}>
                {effectiveEmployerId ? (
                  <ContractsSection employerId={effectiveEmployerId} searchTerm={searchTerm} />
                ) : (
                  <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Title>Impossible de charger les contrats</Alert.Title>
                  </Alert.Root>
                )}
              </Tabs.Content>
            )}

            {!isEmployee && (
              <Tabs.Content value="absences" pt={6}>
                {effectiveEmployerId ? (
                  <DocumentManagementSection employerId={effectiveEmployerId} searchTerm={searchTerm} />
                ) : (
                  <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Title>Impossible de charger les absences</Alert.Title>
                  </Alert.Root>
                )}
              </Tabs.Content>
            )}

            <Tabs.Content value="planning" pt={6}>
              <PlanningExportSection
                employerId={effectiveEmployerId ?? ''}
                profileRole={profile.role as 'employer' | 'employee' | 'caregiver'}
                profileId={profile.id}
              />
            </Tabs.Content>

            {!isEmployee && (
              <Tabs.Content value="declarations" pt={6}>
                {effectiveEmployerId ? (
                  <CesuDeclarationSection employerId={effectiveEmployerId} searchTerm={searchTerm} />
                ) : (
                  <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Title>Impossible de charger les declarations</Alert.Title>
                  </Alert.Root>
                )}
              </Tabs.Content>
            )}
          </Tabs.Root>
        </VStack>
      </Container>
    </DashboardLayout>
  )
}

export default DocumentsPage
