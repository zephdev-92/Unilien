import { useState, useEffect, useCallback } from 'react'
import { Box, Stack, Flex, Text, Center, Spinner, Avatar } from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/dashboard'
import { ProfileHero } from './ProfileHero'
import { ProfileJumpNav } from './ProfileJumpNav'
import { ProfileViewList } from './ProfileViewList'
import {
  PersonalInfoSection,
  EmployerSection,
  EmployeeSection,
  CaregiverSection,
} from './sections'
import {
  updateProfile,
  getEmployer,
  upsertEmployer,
  getEmployee,
  upsertEmployee,
} from '@/services/profileService'
import { logger } from '@/lib/logger'
import type { Profile, Employer, Employee } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  employer: 'Particulier employeur',
  employee: 'Auxiliaire de vie',
  caregiver: 'Aidant familial',
}

export function ProfilePage() {
  const { profile, userRole, isInitialized } = useAuth()
  const setProfile = useAuthStore((state) => state.setProfile)

  const [employer, setEmployer] = useState<Employer | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  const loadRoleData = useCallback(async () => {
    if (!profile) return
    setIsLoadingData(true)
    try {
      if (profile.role === 'employer') {
        const employerData = await getEmployer(profile.id)
        setEmployer(employerData)
      } else if (profile.role === 'employee') {
        const employeeData = await getEmployee(profile.id)
        setEmployee(employeeData)
      }
    } catch (error) {
      logger.error('Erreur chargement donnees:', error)
    } finally {
      setIsLoadingData(false)
    }
  }, [profile])

  useEffect(() => {
    if (profile && isInitialized) {
      loadRoleData()
    }
  }, [profile, isInitialized, loadRoleData])

  if (!profile) {
    return (
      <DashboardLayout title="Mon profil">
        <Center py={12}>
          <Box textAlign="center">
            <Text fontSize="xl" fontWeight="semibold" mb={2}>
              Profil incomplet
            </Text>
            <Text color="text.muted">
              Votre profil n'a pas ete trouve dans la base de donnees.
              Veuillez contacter le support ou vous reconnecter.
            </Text>
          </Box>
        </Center>
      </DashboardLayout>
    )
  }

  // Handlers
  const handleSaveProfile = async (data: Partial<Profile>) => {
    await updateProfile(profile.id, data)
    setProfile({
      ...profile,
      firstName: data.firstName ?? profile.firstName,
      lastName: data.lastName ?? profile.lastName,
      phone: data.phone ?? profile.phone,
      updatedAt: new Date(),
    })
  }

  const handleAvatarChange = (avatarUrl: string | undefined) => {
    setProfile({
      ...profile,
      avatarUrl,
      updatedAt: new Date(),
    })
  }

  const handleSaveEmployer = async (data: Partial<Employer>) => {
    await upsertEmployer(profile.id, data)
    setEmployer((prev) => ({ ...prev, ...data } as Employer))
  }

  const handleSaveEmployee = async (data: Partial<Employee>) => {
    await upsertEmployee(profile.id, data)
    setEmployee((prev) => ({ ...prev, ...data } as Employee))
  }

  // Build jump nav items based on role
  const navItems = [
    { id: 'section-profil', label: 'Mon profil' },
    ...(userRole === 'employer'
      ? [
          { id: 'section-situation', label: 'Ma situation' },
          { id: 'section-urgence', label: "Contacts d'urgence" },
        ]
      : userRole === 'employee'
        ? [{ id: 'section-metier', label: 'Mon metier' }]
        : [{ id: 'section-aidant', label: 'Mon profil aidant' }]),
  ]

  return (
    <DashboardLayout title="Profil">
      <Box maxW="900px">
        <Stack gap={6}>
          {/* Hero */}
          <ProfileHero
            profile={profile}
            isEditing={isEditing}
            onToggleEdit={() => setIsEditing(!isEditing)}
          />

          {/* Jump nav */}
          <ProfileJumpNav items={navItems} />

          {/* Section: Mon profil */}
          <Box id="section-profil" scrollMarginTop="140px">
            <SectionTitle>Mon profil</SectionTitle>
            {isEditing ? (
              <PersonalInfoSection
                profile={profile}
                onSave={handleSaveProfile}
                onAvatarChange={handleAvatarChange}
              />
            ) : (
              <Box
                bg="bg.surface"
                borderRadius="12px"
                borderWidth="1px"
                borderColor="border.default"
                overflow="hidden"
              >
                <Flex justify="space-between" align="center" px={6} py={4} borderBottomWidth="1px" borderColor="border.default">
                  <Text fontSize="md" fontWeight={700}>Informations personnelles</Text>
                </Flex>
                <Box px={6} py={5}>
                  <ProfileViewList
                    rows={[
                      { label: 'Nom complet', value: `${profile.firstName} ${profile.lastName}` },
                      { label: 'Email', value: profile.email },
                      { label: 'Téléphone', value: profile.phone },
                      { label: 'Rôle', value: ROLE_LABELS[profile.role] || profile.role },
                    ]}
                  />
                </Box>
              </Box>
            )}
          </Box>

          {/* Section: Ma situation (employer) */}
          {userRole === 'employer' && (
            <>
              <Box id="section-situation" scrollMarginTop="140px">
                <SectionTitle>Ma situation</SectionTitle>
                {isEditing ? (
                  isLoadingData ? (
                    <Center py={8}><Spinner size="lg" color="brand.500" /></Center>
                  ) : (
                    <EmployerSituationEdit employer={employer ?? undefined} onSave={handleSaveEmployer} />
                  )
                ) : (
                  <EmployerSituationView employer={employer} isLoading={isLoadingData} />
                )}
              </Box>

              <Box id="section-urgence" scrollMarginTop="140px">
                <SectionTitle>Contacts d&apos;urgence</SectionTitle>
                {isEditing ? (
                  isLoadingData ? (
                    <Center py={8}><Spinner size="lg" color="brand.500" /></Center>
                  ) : (
                    <EmergencyContactsEdit employer={employer ?? undefined} onSave={handleSaveEmployer} />
                  )
                ) : (
                  <EmergencyContactsView employer={employer} isLoading={isLoadingData} />
                )}
              </Box>
            </>
          )}

          {/* Section: Mon metier (employee) */}
          {userRole === 'employee' && (
            <Box id="section-metier" scrollMarginTop="140px">
              <SectionTitle>Mon métier</SectionTitle>
              {isEditing ? (
                isLoadingData ? (
                  <Center py={8}><Spinner size="lg" color="brand.500" /></Center>
                ) : (
                  <EmployeeSection employee={employee ?? undefined} onSave={handleSaveEmployee} />
                )
              ) : (
                <EmployeeViewMode employee={employee} isLoading={isLoadingData} />
              )}
            </Box>
          )}

          {/* Section: Mon profil aidant (caregiver) */}
          {userRole === 'caregiver' && (
            <Box id="section-aidant" scrollMarginTop="140px">
              <SectionTitle>Mon profil aidant</SectionTitle>
              {isEditing ? (
                <CaregiverSection profileId={profile.id} />
              ) : (
                <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" overflow="hidden">
                  <Box px={6} py={5}>
                    <Text color="text.muted" fontSize="sm">
                      Cliquez sur &quot;Modifier le profil&quot; pour éditer vos informations d&apos;aidant.
                    </Text>
                  </Box>
                </Box>
              )}
            </Box>
          )}

        </Stack>
      </Box>
    </DashboardLayout>
  )
}

// --- Shared sub-components ---

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Flex align="center" gap={3} mb={4}>
      <Text fontSize="md" fontWeight={700}>{children}</Text>
      <Box flex={1} h="1px" bg="border.default" />
    </Flex>
  )
}

// --- Employer view-mode sub-components ---

function EmployerSituationView({ employer, isLoading }: { employer: Employer | null; isLoading: boolean }) {
  if (isLoading) {
    return <Center py={8}><Spinner size="lg" color="brand.500" /></Center>
  }

  const handicapLabel = employer?.handicapType
    ? ({
        moteur: 'Handicap moteur',
        visuel: 'Handicap visuel',
        auditif: 'Handicap auditif',
        cognitif: 'Handicap cognitif',
        psychique: 'Handicap psychique',
        polyhandicap: 'Polyhandicap',
        maladie_invalidante: 'Maladie invalidante',
        autre: 'Autre',
      }[employer.handicapType] || employer.handicapType)
    : undefined

  return (
    <Stack gap={4}>
      {/* Adresse */}
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" overflow="hidden">
        <Box px={6} py={4} borderBottomWidth="1px" borderColor="border.default">
          <Text fontSize="md" fontWeight={700}>Adresse</Text>
        </Box>
        <Box px={6} py={5}>
          <ProfileViewList
            rows={[
              { label: 'Rue', value: employer?.address?.street },
              { label: 'Ville', value: employer?.address?.city },
              { label: 'Code postal', value: employer?.address?.postalCode },
            ]}
          />
        </Box>
      </Box>

      {/* Informations complémentaires */}
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" overflow="hidden">
        <Flex px={6} py={4} borderBottomWidth="1px" borderColor="border.default" justify="space-between" align="center">
          <Text fontSize="md" fontWeight={700}>Informations complémentaires</Text>
        </Flex>
        <Box px={6} py={5}>
          <ProfileViewList
            rows={[
              { label: 'Type de handicap', value: handicapLabel },
              { label: 'Précision', value: employer?.handicapName },
              { label: 'Besoins spécifiques', value: employer?.specificNeeds },
              { label: 'Numéro CESU', value: employer?.cesuNumber },
            ]}
          />

          {/* PCH */}
          <Box mt={4} p={4} bg="bg.page" borderRadius="10px" borderWidth="1px" borderColor="border.default">
            <Flex justify="space-between" align="center" mb={2}>
              <Text fontWeight={600} fontSize="sm">PCH (Prestation de Compensation du Handicap)</Text>
              <Box fontSize="xs" fontWeight={600} px="10px" py="3px" borderRadius="full"
                bg={employer?.pchBeneficiary ? 'success.50' : 'bg.page'}
                color={employer?.pchBeneficiary ? 'success.700' : 'text.muted'}
              >
                {employer?.pchBeneficiary ? 'Bénéficiaire' : 'Non bénéficiaire'}
              </Box>
            </Flex>
            {employer?.pchBeneficiary && (
              <ProfileViewList
                rows={[
                  { label: 'Montant mensuel', value: employer.pchMonthlyAmount ? `${employer.pchMonthlyAmount} €` : undefined },
                  { label: 'Heures allouées', value: employer.pchMonthlyHours ? `${employer.pchMonthlyHours}h / mois` : undefined },
                  { label: 'Type dispositif', value: employer.pchType || undefined },
                ]}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Stack>
  )
}

function EmployerSituationEdit({ employer, onSave }: { employer?: Employer; onSave: (data: Partial<Employer>) => Promise<void> }) {
  return <EmployerSection employer={employer} onSave={onSave} section="situation" />
}

function EmergencyContactsView({ employer, isLoading }: { employer: Employer | null; isLoading: boolean }) {
  if (isLoading) {
    return <Center py={8}><Spinner size="lg" color="brand.500" /></Center>
  }

  const contacts = employer?.emergencyContacts || []

  return (
    <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" overflow="hidden">
      <Box px={6} py={4} borderBottomWidth="1px" borderColor="border.default">
        <Text fontSize="md" fontWeight={700}>Personnes à contacter lors des interventions</Text>
      </Box>
      <Box px={6} py={5}>
        {contacts.length === 0 ? (
          <Text color="text.muted" textAlign="center" py={4}>
            Aucun contact d&apos;urgence enregistré
          </Text>
        ) : (
          <Stack gap={3}>
            {contacts.map((contact, index) => (
              <Flex
                key={index}
                p={4}
                bg="bg.page"
                borderRadius="10px"
                borderWidth="1px"
                borderColor="border.default"
                align="center"
                gap={4}
              >
                <Avatar.Root size="sm">
                  <Avatar.Fallback name={contact.name} bg="brand.500" color="white" />
                </Avatar.Root>
                <Box flex={1}>
                  <Text fontWeight={600} fontSize="sm">{contact.name}</Text>
                  <Text fontSize="xs" color="text.muted">{contact.relationship}</Text>
                </Box>
                <Text fontSize="sm" color="text.muted">{contact.phone}</Text>
              </Flex>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  )
}

function EmergencyContactsEdit({ employer, onSave }: { employer?: Employer; onSave: (data: Partial<Employer>) => Promise<void> }) {
  return <EmployerSection employer={employer} onSave={onSave} section="emergency" />
}

function EmployeeViewMode({ employee, isLoading }: { employee: Employee | null; isLoading: boolean }) {
  if (isLoading) {
    return <Center py={8}><Spinner size="lg" color="brand.500" /></Center>
  }

  return (
    <Stack gap={4}>
      {/* Qualifications */}
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" overflow="hidden">
        <Box px={6} py={4} borderBottomWidth="1px" borderColor="border.default">
          <Text fontSize="md" fontWeight={700}>Compétences</Text>
        </Box>
        <Box px={6} py={5}>
          {(employee?.qualifications?.length ?? 0) > 0 ? (
            <Flex gap={2} flexWrap="wrap">
              {employee?.qualifications.map((q) => (
                <Box key={q} fontSize="xs" fontWeight={600} px="10px" py="3px" borderRadius="full" bg="brand.50" color="brand.500">{q}</Box>
              ))}
            </Flex>
          ) : (
            <Text color="text.muted" fontSize="sm">Aucune qualification renseignée</Text>
          )}

          {(employee?.languages?.length ?? 0) > 0 && (
            <Box mt={4}>
              <Text fontSize="sm" fontWeight={600} color="text.muted" mb={2}>Langues</Text>
              <Flex gap={2} flexWrap="wrap">
                {employee?.languages.map((l) => (
                  <Box key={l} fontSize="xs" fontWeight={600} px="10px" py="3px" borderRadius="full" borderWidth="1px" borderColor="border.default" color="text.secondary">{l}</Box>
                ))}
              </Flex>
            </Box>
          )}
        </Box>
      </Box>

      {/* Adresse & déplacement */}
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" overflow="hidden">
        <Box px={6} py={4} borderBottomWidth="1px" borderColor="border.default">
          <Text fontSize="md" fontWeight={700}>Adresse & déplacement</Text>
        </Box>
        <Box px={6} py={5}>
          <ProfileViewList
            rows={[
              { label: 'Rue', value: employee?.address?.street },
              { label: 'Ville', value: employee?.address?.city },
              { label: 'Code postal', value: employee?.address?.postalCode },
              { label: 'Distance max', value: employee?.maxDistanceKm ? `${employee.maxDistanceKm} km` : undefined },
            ]}
          />
        </Box>
      </Box>

      {/* Permis */}
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" overflow="hidden">
        <Box px={6} py={4} borderBottomWidth="1px" borderColor="border.default">
          <Text fontSize="md" fontWeight={700}>Permis de conduire</Text>
        </Box>
        <Box px={6} py={5}>
          <ProfileViewList
            rows={[
              { label: 'Permis', value: employee?.driversLicense?.hasLicense ? 'Oui' : 'Non' },
              ...(employee?.driversLicense?.hasLicense
                ? [
                    { label: 'Type', value: employee.driversLicense.licenseType },
                    { label: 'Véhicule personnel', value: employee.driversLicense.hasVehicle ? 'Oui' : 'Non' },
                  ]
                : []),
            ]}
          />
        </Box>
      </Box>
    </Stack>
  )
}

export default ProfilePage
