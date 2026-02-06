import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { Box, Tabs, Text, Center, Spinner } from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/dashboard'
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

export function ProfilePage() {
  const { profile, userRole, isAuthenticated, isLoading, isInitialized } = useAuth()
  const setProfile = useAuthStore((state) => state.setProfile)

  const [employer, setEmployer] = useState<Employer | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Charger les données employer/employee au montage
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
      logger.error('Erreur chargement données:', error)
    } finally {
      setIsLoadingData(false)
    }
  }, [profile])

  useEffect(() => {
    if (profile && isInitialized) {
      loadRoleData()
    }
  }, [profile, isInitialized, loadRoleData])

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

  // Profile not loaded - show message to complete profile
  if (!profile) {
    return (
      <DashboardLayout title="Paramètres">
        <Center py={12}>
          <Box textAlign="center">
            <Text fontSize="xl" fontWeight="semibold" mb={2}>
              Profil incomplet
            </Text>
            <Text color="gray.600">
              Votre profil n'a pas été trouvé dans la base de données.
              Veuillez contacter le support ou vous reconnecter.
            </Text>
          </Box>
        </Center>
      </DashboardLayout>
    )
  }

  // Handler pour sauvegarder le profil personnel
  const handleSaveProfile = async (data: Partial<Profile>) => {
    await updateProfile(profile.id, data)
    // Mettre à jour le store
    setProfile({
      ...profile,
      firstName: data.firstName ?? profile.firstName,
      lastName: data.lastName ?? profile.lastName,
      phone: data.phone ?? profile.phone,
      updatedAt: new Date(),
    })
  }

  // Handler pour le changement d'avatar
  const handleAvatarChange = (avatarUrl: string | undefined) => {
    setProfile({
      ...profile,
      avatarUrl,
      updatedAt: new Date(),
    })
  }

  // Handler pour sauvegarder le profil employeur
  const handleSaveEmployer = async (data: Partial<Employer>) => {
    await upsertEmployer(profile.id, data)
    setEmployer((prev) => ({ ...prev, ...data } as Employer))
  }

  // Handler pour sauvegarder le profil employé
  const handleSaveEmployee = async (data: Partial<Employee>) => {
    await upsertEmployee(profile.id, data)
    setEmployee((prev) => ({ ...prev, ...data } as Employee))
  }

  // Build tabs based on role
  const tabs = [
    {
      value: 'personal',
      label: 'Informations',
      content: (
        <PersonalInfoSection
          profile={profile}
          onSave={handleSaveProfile}
          onAvatarChange={handleAvatarChange}
        />
      ),
    },
    {
      value: 'accessibility',
      label: 'Accessibilité',
      content: <AccessibilitySection />,
    },
  ]

  // Add role-specific tabs
  if (userRole === 'employer') {
    tabs.push({
      value: 'employer',
      label: 'Mon profil employeur',
      content: isLoadingData ? (
        <Center py={8}>
          <Spinner size="lg" color="brand.500" />
        </Center>
      ) : (
        <EmployerSection employer={employer ?? undefined} onSave={handleSaveEmployer} />
      ),
    })
  }

  if (userRole === 'employee') {
    tabs.push({
      value: 'employee',
      label: 'Mon profil auxiliaire',
      content: isLoadingData ? (
        <Center py={8}>
          <Spinner size="lg" color="brand.500" />
        </Center>
      ) : (
        <EmployeeSection employee={employee ?? undefined} onSave={handleSaveEmployee} />
      ),
    })
  }

  if (userRole === 'caregiver') {
    tabs.push({
      value: 'caregiver',
      label: 'Mon profil aidant',
      content: <CaregiverSection profileId={profile.id} />,
    })
  }

  return (
    <DashboardLayout title="Paramètres">
      <Box maxW="800px">
        <Tabs.Root defaultValue="personal" variant="line">
          <Tabs.List mb={6}>
            {tabs.map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                px={4}
                py={3}
                fontWeight="medium"
                _selected={{
                  color: 'brand.600',
                  borderBottomColor: 'brand.500',
                }}
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {tabs.map((tab) => (
            <Tabs.Content key={tab.value} value={tab.value}>
              {tab.content}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </Box>
    </DashboardLayout>
  )
}

export default ProfilePage
