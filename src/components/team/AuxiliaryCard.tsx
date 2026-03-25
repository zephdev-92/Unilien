import { Box, Flex, Text, Avatar } from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import type { AuxiliarySummary } from '@/services/auxiliaryService'

interface AuxiliaryCardProps {
  auxiliary: AuxiliarySummary
  onClick: () => void
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <Flex align="center" gap="8px" fontSize="xs" color="text.muted">
      <Flex align="center" gap="5px" color="text.muted" fontWeight={600} minW="60px" flexShrink={0}>
        {icon}
        <Text>{label}</Text>
      </Flex>
      <Text truncate color="text.secondary">{children}</Text>
    </Flex>
  )
}

function StatusPill({ status, isOnLeave }: { status: string; isOnLeave: boolean }) {
  if (isOnLeave) {
    return (
      <Box fontSize="xs" fontWeight={600} px="10px" py="3px" borderRadius="full" bg="warning.subtle" color="warning.500">
        En congé
      </Box>
    )
  }
  const isActive = status === 'active'
  return (
    <Box fontSize="xs" fontWeight={600} px="10px" py="3px" borderRadius="full"
      bg={isActive ? 'success.subtle' : 'gray.100'}
      color={isActive ? 'success.700' : 'gray.500'}
    >
      {isActive ? 'Actif' : 'Inactif'}
    </Box>
  )
}

export function AuxiliaryCard({ auxiliary, onClick }: AuxiliaryCardProps) {
  const isActive = auxiliary.contractStatus === 'active'

  return (
    <Box
      as="article"
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="sm"
      overflow="hidden"
      transition="box-shadow 0.2s, transform 0.2s"
      opacity={isActive || auxiliary.isOnLeave ? 1 : 0.7}
      _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
      css={{
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          transform: 'none !important',
        },
      }}
    >
      {/* Card top */}
      <Flex px={4} pt={4} pb={3} bg="bg.page" justify="space-between" align="flex-start">
        <Avatar.Root size="lg">
          <Avatar.Fallback
            name={`${auxiliary.firstName} ${auxiliary.lastName}`}
            bg="brand.500"
            color="white"
          />
          {auxiliary.avatarUrl && <Avatar.Image src={auxiliary.avatarUrl} />}
        </Avatar.Root>
        <StatusPill status={auxiliary.contractStatus} isOnLeave={auxiliary.isOnLeave} />
      </Flex>

      {/* Card body */}
      <Box px={4} pb={3}>
        <Text fontWeight={800} fontSize="md" mt={3} mb="2px" lineHeight="short">
          {auxiliary.firstName} {auxiliary.lastName}
        </Text>
        <Text fontSize="xs" color="text.muted" fontWeight={500} mb={3}>
          {auxiliary.contractType === 'CDI' ? 'CDI' : 'CDD'} — {auxiliary.qualifications[0] || 'Auxiliaire de vie'}
        </Text>

        <Flex direction="column" gap={2}>
          <MetaRow
            label="Début"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
          >
            {formatDate(auxiliary.contractStartDate)}
          </MetaRow>
          <MetaRow
            label="Heures"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          >
            {auxiliary.weeklyHours}h / semaine
          </MetaRow>
          {auxiliary.email && (
            <MetaRow
              label="Email"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              }
            >
              {auxiliary.email}
            </MetaRow>
          )}
        </Flex>
      </Box>

      {/* Card footer — proto: .employee-card-footer bg #F3F6F9 */}
      <Flex gap={2} px={4} py={2} borderTopWidth="1px" borderColor="border.default" bg="bg.page">
        <AccessibleButton
          variant="outline"
          size="sm"
          onClick={onClick}
          flex={1}
          borderWidth="1.5px"
          borderColor="border.default"
          color="text.secondary"
          bg="transparent"
          fontSize="xs"
          borderRadius="6px"
          py="7px"
          _hover={{ borderColor: 'brand.500', color: 'brand.500', bg: 'brand.subtle' }}
        >
          Voir le profil
        </AccessibleButton>
        <AccessibleButton
          variant="outline"
          size="sm"
          onClick={onClick}
          flex={1}
          borderWidth="1.5px"
          borderColor="border.default"
          color="text.secondary"
          bg="transparent"
          fontSize="xs"
          borderRadius="6px"
          py="7px"
          _hover={{ borderColor: 'brand.500', color: 'brand.500', bg: 'brand.subtle' }}
        >
          Planning
        </AccessibleButton>
      </Flex>
    </Box>
  )
}
