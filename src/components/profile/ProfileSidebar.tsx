import { Box, Flex, Text, Stack, Button, Avatar } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { ProfileCompletionWidget } from './ProfileCompletionWidget'
import { GhostButton } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import type { Profile, Employer, Employee, Caregiver } from '@/types'

interface ProfileSidebarProps {
  profile: Profile
  employer?: Employer | null
  employee?: Employee | null
  caregiver?: Caregiver | null
}

function SecurityWidget() {
  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      overflow="hidden"
    >
      <Flex px={5} py={4} borderBottomWidth="1px" borderColor="border.default">
        <Text fontSize="sm" fontWeight={700}>Sécurité</Text>
      </Flex>
      <Box px={5} py={4}>
        <Stack gap={3}>
          {/* Mot de passe */}
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="sm" fontWeight={600}>Mot de passe</Text>
              <Text fontSize="11px" color="text.muted">Modifié récemment</Text>
            </Box>
            <GhostButton asChild size="xs">
              <RouterLink to="/parametres#securite">Modifier</RouterLink>
            </GhostButton>
          </Flex>

          {/* 2FA */}
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="sm" fontWeight={600}>Double authentification</Text>
              <Text fontSize="11px" color="text.muted">Non activée</Text>
            </Box>
            <GhostButton asChild size="xs">
              <RouterLink to="/parametres#securite">Activer</RouterLink>
            </GhostButton>
          </Flex>
        </Stack>
      </Box>
    </Box>
  )
}

function EmployerWidget({ employer }: { employer: Employer }) {
  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      overflow="hidden"
    >
      <Flex px={5} py={4} borderBottomWidth="1px" borderColor="border.default">
        <Text fontSize="sm" fontWeight={700}>Mon employeur</Text>
      </Flex>
      <Box px={5} py={4}>
        <Stack gap={3}>
          <Flex align="center" gap={3}>
            <Avatar.Root size="sm">
              <Avatar.Fallback bg="brand.500" color="white">EP</Avatar.Fallback>
            </Avatar.Root>
            <Box>
              <Text fontSize="sm" fontWeight={600}>Employeur particulier</Text>
              {employer.address?.city && (
                <Text fontSize="11px" color="text.muted">{employer.address.city}</Text>
              )}
            </Box>
          </Flex>
          <GhostButton asChild w="100%">
            <RouterLink to="/liaison">Envoyer un message</RouterLink>
          </GhostButton>
        </Stack>
      </Box>
    </Box>
  )
}

function PchWidget({ caregiver }: { caregiver: Caregiver }) {
  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      overflow="hidden"
    >
      <Flex px={5} py={4} borderBottomWidth="1px" borderColor="border.default" justify="space-between" align="center">
        <Text fontSize="sm" fontWeight={700}>Mon enveloppe PCH</Text>
        <Box fontSize="11px" fontWeight={600} px="8px" py="2px" borderRadius="full" bg="warning.subtle" color="warning.600">
          2025–2026
        </Box>
      </Flex>
      <Box px={5} py={4}>
        <Stack gap={2}>
          {caregiver.availabilityHours && (
            <Flex justify="space-between" align="baseline">
              <Text fontSize="xs" color="text.muted">Disponibilités</Text>
              <Text fontSize="sm" fontWeight={600}>{caregiver.availabilityHours}</Text>
            </Flex>
          )}
          <GhostButton asChild w="100%" mt={1}>
            <RouterLink to="/documents">Voir les documents PCH</RouterLink>
          </GhostButton>
        </Stack>
      </Box>
    </Box>
  )
}

function LogoutButton() {
  const { signOut } = useAuth()

  return (
    <Box
      borderRadius="12px"
      borderWidth="1px"
      borderColor="red.200"
      overflow="hidden"
    >
      <Box px={5} py={4}>
        <Button
          variant="outline"
          colorPalette="red"
          size="sm"
          w="100%"
          fontWeight={600}
          onClick={signOut}
        >
          Se déconnecter
        </Button>
      </Box>
    </Box>
  )
}

export function ProfileSidebar({ profile, employer, employee, caregiver }: ProfileSidebarProps) {
  return (
    <Stack gap={4} position="sticky" top="100px">
      {/* Widget complétude */}
      <ProfileCompletionWidget
        profile={profile}
        employer={employer}
        employee={employee}
        caregiver={caregiver}
      />

      {/* Widget sécurité */}
      <SecurityWidget />

      {/* Widget employeur (employé uniquement) */}
      {profile.role === 'employee' && employer && (
        <EmployerWidget employer={employer} />
      )}

      {/* Widget PCH (aidant uniquement) */}
      {profile.role === 'caregiver' && caregiver && (
        <PchWidget caregiver={caregiver} />
      )}

      {/* Déconnexion */}
      <LogoutButton />
    </Stack>
  )
}
