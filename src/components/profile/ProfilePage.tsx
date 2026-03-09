import { useState, useEffect, useCallback } from 'react'
import { Box, Stack, Flex, Text, Center, Spinner, Avatar, Badge } from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/dashboard'
import { ProfileHero } from './ProfileHero'
import { ProfileJumpNav } from './ProfileJumpNav'
import { ProfileViewList } from './ProfileViewList'
import {
  PersonalInfoSection,
  AccessibilitySection,
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
            <Text color="gray.600">
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
    { id: 'section-accessibilite', label: 'Accessibilite' },
  ]

  return (
    <DashboardLayout title="Mon profil">
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
            {isEditing ? (
              <PersonalInfoSection
                profile={profile}
                onSave={handleSaveProfile}
                onAvatarChange={handleAvatarChange}
              />
            ) : (
              <Box
                bg="white"
                borderRadius="lg"
                borderWidth="1px"
                borderColor="gray.200"
                p={6}
              >
                <Flex justify="space-between" align="center" mb={4}>
                  <Text fontSize="xl" fontWeight="semibold">Informations personnelles</Text>
                </Flex>
                <ProfileViewList
                  rows={[
                    { label: 'Nom complet', value: `${profile.firstName} ${profile.lastName}` },
                    { label: 'Email', value: profile.email },
                    { label: 'Telephone', value: profile.phone },
                    { label: 'Role', value: ROLE_LABELS[profile.role] || profile.role },
                  ]}
                />
              </Box>
            )}
          </Box>

          {/* Section: Ma situation (employer) */}
          {userRole === 'employer' && (
            <>
              <Box id="section-situation" scrollMarginTop="140px">
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
              {isEditing ? (
                <CaregiverSection profileId={profile.id} />
              ) : (
                <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" p={6}>
                  <Text fontSize="xl" fontWeight="semibold" mb={4}>Mon profil aidant</Text>
                  <Text color="gray.500" fontSize="sm">
                    Cliquez sur "Modifier le profil" pour editer vos informations d'aidant.
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* Section: Accessibilite */}
          <Box id="section-accessibilite" scrollMarginTop="140px">
            <AccessibilitySection />
          </Box>
        </Stack>
      </Box>
    </DashboardLayout>
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
      <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" p={6}>
        <Text fontSize="xl" fontWeight="semibold" mb={4}>Adresse</Text>
        <ProfileViewList
          rows={[
            { label: 'Rue', value: employer?.address?.street },
            { label: 'Ville', value: employer?.address?.city },
            { label: 'Code postal', value: employer?.address?.postalCode },
          ]}
        />
      </Box>

      {/* Informations complementaires */}
      <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" p={6}>
        <Text fontSize="xl" fontWeight="semibold" mb={4}>Informations complementaires</Text>
        <ProfileViewList
          rows={[
            { label: 'Type de handicap', value: handicapLabel },
            { label: 'Precision', value: employer?.handicapName },
            { label: 'Besoins specifiques', value: employer?.specificNeeds },
            { label: 'Numero CESU', value: employer?.cesuNumber },
          ]}
        />

        {/* PCH */}
        <Box mt={4} p={4} bg="gray.50" borderRadius="md">
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontWeight="medium">PCH (Prestation de Compensation du Handicap)</Text>
            <Badge colorPalette={employer?.pchBeneficiary ? 'green' : 'gray'} size="sm">
              {employer?.pchBeneficiary ? 'Beneficiaire' : 'Non beneficiaire'}
            </Badge>
          </Flex>
          {employer?.pchBeneficiary && (
            <ProfileViewList
              rows={[
                { label: 'Montant mensuel', value: employer.pchMonthlyAmount ? `${employer.pchMonthlyAmount} EUR` : undefined },
                { label: 'Heures allouees', value: employer.pchMonthlyHours ? `${employer.pchMonthlyHours}h / mois` : undefined },
                { label: 'Type dispositif', value: employer.pchType || undefined },
              ]}
            />
          )}
        </Box>
      </Box>
    </Stack>
  )
}

function EmployerSituationEdit({ employer, onSave }: { employer?: Employer; onSave: (data: Partial<Employer>) => Promise<void> }) {
  // Reuse EmployerSection but without emergency contacts (they're in a separate section)
  return <EmployerSection employer={employer} onSave={onSave} />
}

function EmergencyContactsView({ employer, isLoading }: { employer: Employer | null; isLoading: boolean }) {
  if (isLoading) {
    return <Center py={8}><Spinner size="lg" color="brand.500" /></Center>
  }

  const contacts = employer?.emergencyContacts || []

  return (
    <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" p={6}>
      <Text fontSize="xl" fontWeight="semibold" mb={4}>Contacts d'urgence</Text>
      {contacts.length === 0 ? (
        <Text color="gray.500" textAlign="center" py={4}>
          Aucun contact d'urgence enregistre
        </Text>
      ) : (
        <Stack gap={3}>
          {contacts.map((contact, index) => (
            <Flex
              key={index}
              p={4}
              bg="gray.50"
              borderRadius="md"
              align="center"
              gap={4}
            >
              <Avatar.Root size="sm">
                <Avatar.Fallback name={contact.name} />
              </Avatar.Root>
              <Box flex={1}>
                <Text fontWeight="medium" fontSize="sm">{contact.name}</Text>
                <Text fontSize="xs" color="gray.500">{contact.relationship}</Text>
              </Box>
              <Text fontSize="sm" color="gray.600">{contact.phone}</Text>
            </Flex>
          ))}
        </Stack>
      )}
    </Box>
  )
}

function EmergencyContactsEdit({ employer, onSave }: { employer?: Employer; onSave: (data: Partial<Employer>) => Promise<void> }) {
  // The EmployerSection already has emergency contacts management
  // For edit mode, we show just the emergency contacts part from EmployerSection
  // Since EmployerSection includes everything, we'll reuse it — it handles its own save
  return <EmployerSection employer={employer} onSave={onSave} />
}

function EmployeeViewMode({ employee, isLoading }: { employee: Employee | null; isLoading: boolean }) {
  if (isLoading) {
    return <Center py={8}><Spinner size="lg" color="brand.500" /></Center>
  }

  return (
    <Stack gap={4}>
      {/* Qualifications */}
      <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" p={6}>
        <Text fontSize="xl" fontWeight="semibold" mb={4}>Competences</Text>
        {(employee?.qualifications?.length ?? 0) > 0 ? (
          <Flex gap={2} flexWrap="wrap">
            {employee?.qualifications.map((q) => (
              <Badge key={q} colorPalette="blue" size="sm">{q}</Badge>
            ))}
          </Flex>
        ) : (
          <Text color="gray.500" fontSize="sm">Aucune qualification renseignee</Text>
        )}

        {(employee?.languages?.length ?? 0) > 0 && (
          <Box mt={4}>
            <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>Langues</Text>
            <Flex gap={2} flexWrap="wrap">
              {employee?.languages.map((l) => (
                <Badge key={l} variant="outline" size="sm">{l}</Badge>
              ))}
            </Flex>
          </Box>
        )}
      </Box>

      {/* Adresse & deplacement */}
      <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" p={6}>
        <Text fontSize="xl" fontWeight="semibold" mb={4}>Adresse & deplacement</Text>
        <ProfileViewList
          rows={[
            { label: 'Rue', value: employee?.address?.street },
            { label: 'Ville', value: employee?.address?.city },
            { label: 'Code postal', value: employee?.address?.postalCode },
            { label: 'Distance max', value: employee?.maxDistanceKm ? `${employee.maxDistanceKm} km` : undefined },
          ]}
        />
      </Box>

      {/* Permis */}
      <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" p={6}>
        <Text fontSize="xl" fontWeight="semibold" mb={4}>Permis de conduire</Text>
        <ProfileViewList
          rows={[
            { label: 'Permis', value: employee?.driversLicense?.hasLicense ? 'Oui' : 'Non' },
            ...(employee?.driversLicense?.hasLicense
              ? [
                  { label: 'Type', value: employee.driversLicense.licenseType },
                  { label: 'Vehicule personnel', value: employee.driversLicense.hasVehicle ? 'Oui' : 'Non' },
                ]
              : []),
          ]}
        />
      </Box>
    </Stack>
  )
}

export default ProfilePage
