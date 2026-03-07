import { Box, Flex, Text, Badge, Avatar, Tag } from '@chakra-ui/react'
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

function MetaRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Flex align="center" gap={2} fontSize="sm" color="gray.600">
      <Box flexShrink={0} color="gray.400">
        {icon}
      </Box>
      <Text truncate>{children}</Text>
    </Flex>
  )
}

export function AuxiliaryCard({ auxiliary, onClick }: AuxiliaryCardProps) {
  const isActive = auxiliary.contractStatus === 'active'

  return (
    <Box
      as="button"
      onClick={onClick}
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor={isActive ? 'gray.200' : 'gray.300'}
      p={5}
      boxShadow="sm"
      textAlign="left"
      transition="all 0.2s"
      opacity={isActive ? 1 : 0.7}
      _hover={{
        borderColor: 'brand.300',
        boxShadow: 'md',
        transform: 'translateY(-2px)',
      }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'brand.500',
        outlineOffset: '2px',
      }}
      css={{
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          transform: 'none !important',
        },
      }}
      w="full"
    >
      {/* Top: Avatar + Badge */}
      <Flex justify="space-between" align="flex-start" mb={3}>
        <Avatar.Root size="lg">
          <Avatar.Fallback name={`${auxiliary.firstName} ${auxiliary.lastName}`} />
          {auxiliary.avatarUrl && <Avatar.Image src={auxiliary.avatarUrl} />}
        </Avatar.Root>
        <Badge colorPalette={isActive ? 'green' : 'gray'} size="sm">
          {isActive ? 'Actif' : 'Inactif'}
        </Badge>
      </Flex>

      {/* Name + role */}
      <Text fontWeight="semibold" fontSize="lg" truncate mb={1}>
        {auxiliary.firstName} {auxiliary.lastName}
      </Text>
      <Text fontSize="sm" color="gray.500" mb={3}>
        {auxiliary.contractType === 'CDI' ? 'CDI' : 'CDD'} — {auxiliary.qualifications[0] || 'Auxiliaire de vie'}
      </Text>

      {/* Meta rows */}
      <Flex direction="column" gap={2} mb={3}>
        <MetaRow
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
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
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        >
          {auxiliary.weeklyHours}h / semaine
        </MetaRow>
        {auxiliary.email && (
          <MetaRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            }
          >
            {auxiliary.email}
          </MetaRow>
        )}
      </Flex>

      {/* Tags */}
      <Flex gap={2} flexWrap="wrap">
        <Tag.Root size="sm" variant="subtle">
          <Tag.Label>{auxiliary.hourlyRate}€/h</Tag.Label>
        </Tag.Root>
        {auxiliary.qualifications.slice(0, 2).map((qual) => (
          <Tag.Root key={qual} size="sm" variant="outline">
            <Tag.Label>{qual}</Tag.Label>
          </Tag.Root>
        ))}
      </Flex>
    </Box>
  )
}
