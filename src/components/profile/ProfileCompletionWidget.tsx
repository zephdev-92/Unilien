import { Box, Flex, Text, Stack } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import type { Profile, Employer, Employee, Caregiver } from '@/types'

interface CheckItem {
  label: string
  done: boolean
  /** Lien "Compléter →" si non rempli */
  link?: { label: string; to: string }
}

interface ProfileCompletionWidgetProps {
  profile: Profile
  employer?: Employer | null
  employee?: Employee | null
  caregiver?: Caregiver | null
}

function getEmployerChecklist(profile: Profile, employer?: Employer | null): CheckItem[] {
  const hasAddress = !!(employer?.address?.street && employer?.address?.city)
  const hasHandicap = !!employer?.handicapType
  const hasPch = !!employer?.pchBeneficiary
  const hasEmergencyContacts = (employer?.emergencyContacts?.length ?? 0) > 0
  const hasCesu = !!employer?.cesuNumber

  return [
    { label: 'Informations personnelles', done: !!(profile.firstName && profile.lastName && profile.phone) },
    { label: 'Adresse', done: hasAddress, link: { label: 'Renseigner', to: '#section-situation' } },
    { label: 'Informations médicales', done: hasHandicap, link: { label: 'Renseigner', to: '#section-situation' } },
    { label: 'Numéro CESU', done: hasCesu, link: { label: 'Renseigner', to: '#section-situation' } },
    { label: 'PCH configurée', done: hasPch, link: { label: 'Configurer', to: '#section-situation' } },
    { label: "Contacts d'urgence", done: hasEmergencyContacts, link: { label: 'Ajouter', to: '#section-urgence' } },
  ]
}

function getEmployeeChecklist(profile: Profile, employee?: Employee | null): CheckItem[] {
  const hasSSN = !!employee?.socialSecurityNumber
  const hasEmergencyContacts = (employee?.emergencyContacts?.length ?? 0) > 0
  const hasLicense = !!employee?.driversLicense?.hasLicense
  const hasIban = !!employee?.iban
  const hasQualifications = (employee?.qualifications?.length ?? 0) > 0

  return [
    { label: 'Informations personnelles', done: !!(profile.firstName && profile.lastName && profile.phone) },
    { label: 'Qualifications', done: hasQualifications, link: { label: 'Compléter', to: '#section-metier' } },
    { label: 'N° sécurité sociale', done: hasSSN, link: { label: 'Renseigner', to: '#section-metier' } },
    { label: "Contacts d'urgence", done: hasEmergencyContacts, link: { label: 'Ajouter', to: '#section-urgence-employee' } },
    { label: 'Permis / mobilité', done: hasLicense, link: { label: 'Renseigner', to: '#section-metier' } },
    { label: 'IBAN', done: hasIban, link: { label: 'Renseigner', to: '#section-metier' } },
  ]
}

function getCaregiverChecklist(profile: Profile, caregiver?: Caregiver | null): CheckItem[] {
  const hasRelationship = !!caregiver?.relationship
  const hasPermissions = !!caregiver?.permissions

  return [
    { label: 'Informations personnelles', done: !!(profile.firstName && profile.lastName && profile.phone) },
    { label: 'Lien de parenté', done: hasRelationship, link: { label: 'Renseigner', to: '#section-aidant' } },
    { label: "Droits d'accès", done: hasPermissions },
  ]
}

export function ProfileCompletionWidget({ profile, employer, employee, caregiver }: ProfileCompletionWidgetProps) {
  const checklist =
    profile.role === 'employer'
      ? getEmployerChecklist(profile, employer)
      : profile.role === 'employee'
        ? getEmployeeChecklist(profile, employee)
        : getCaregiverChecklist(profile, caregiver)

  const doneCount = checklist.filter((item) => item.done).length
  const percentage = Math.round((doneCount / checklist.length) * 100)

  const percentageColor =
    percentage >= 80 ? 'success.600' : percentage >= 50 ? 'warning.600' : 'danger.600'
  const percentageBg =
    percentage >= 80 ? 'success.subtle' : percentage >= 50 ? 'warning.subtle' : 'danger.subtle'
  const barColor =
    percentage >= 80 ? 'success.500' : percentage >= 50 ? 'warning.500' : 'danger.500'

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      overflow="hidden"
    >
      {/* Header */}
      <Flex justify="space-between" align="center" px={5} py={4} borderBottomWidth="1px" borderColor="border.default">
        <Text fontSize="sm" fontWeight={700}>Complétude du profil</Text>
        <Box fontSize="xs" fontWeight={700} px="8px" py="2px" borderRadius="full" bg={percentageBg} color={percentageColor}>
          {percentage} %
        </Box>
      </Flex>

      {/* Body */}
      <Box px={5} py={4}>
        {/* Progress bar */}
        <Box h="8px" bg="bg.muted" borderRadius="full" overflow="hidden" mb={4}>
          <Box
            h="100%"
            w={`${percentage}%`}
            bg={barColor}
            borderRadius="full"
            transition="width 0.6s ease"
          />
        </Box>

        {/* Checklist */}
        <Stack gap={2}>
          {checklist.map((item) => (
            <Flex key={item.label} align="center" gap={2} opacity={item.done ? 1 : 0.7}>
              {/* Icon */}
              <Flex
                align="center"
                justify="center"
                w="20px"
                h="20px"
                borderRadius="full"
                flexShrink={0}
                bg={item.done ? 'success.subtle' : 'warning.subtle'}
                color={item.done ? 'success.600' : 'warning.600'}
                fontSize="11px"
                fontWeight={700}
              >
                {item.done ? '✓' : '⚠'}
              </Flex>

              {/* Label */}
              <Text fontSize="xs" fontWeight={500} flex={1} color={item.done ? 'text.default' : 'text.muted'}>
                {item.label}
              </Text>

              {/* Action link */}
              {!item.done && item.link && (
                <Text
                  as={item.link.to.startsWith('/') ? RouterLink : 'a'}
                  {...(item.link.to.startsWith('/') ? { to: item.link.to } : { href: item.link.to })}
                  fontSize="11px"
                  fontWeight={600}
                  color="brand.500"
                  _hover={{ textDecoration: 'underline' }}
                  flexShrink={0}
                >
                  {item.link.label} →
                </Text>
              )}
            </Flex>
          ))}
        </Stack>
      </Box>
    </Box>
  )
}
