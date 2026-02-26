import { Box, Flex, Text, Badge, Avatar, Tag } from '@chakra-ui/react'
import type { AuxiliarySummary } from '@/services/auxiliaryService'

interface AuxiliaryCardProps {
  auxiliary: AuxiliarySummary
  onClick: () => void
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
      <Flex gap={4} align="flex-start">
        <Avatar.Root size="lg">
          <Avatar.Fallback name={`${auxiliary.firstName} ${auxiliary.lastName}`} />
          {auxiliary.avatarUrl && <Avatar.Image src={auxiliary.avatarUrl} />}
        </Avatar.Root>

        <Box flex={1} minW={0}>
          <Flex align="center" gap={2} mb={1}>
            <Text fontWeight="semibold" fontSize="lg" truncate>
              {auxiliary.firstName} {auxiliary.lastName}
            </Text>
            <Badge colorPalette={isActive ? 'green' : 'gray'} size="sm">
              {isActive ? 'Actif' : 'Inactif'}
            </Badge>
          </Flex>

          <Flex gap={2} mb={3} flexWrap="wrap">
            <Tag.Root size="sm" colorPalette="blue" variant="subtle">
              <Tag.Label>{auxiliary.contractType}</Tag.Label>
            </Tag.Root>
            <Tag.Root size="sm" variant="subtle">
              <Tag.Label>{auxiliary.weeklyHours}h/sem</Tag.Label>
            </Tag.Root>
            <Tag.Root size="sm" variant="subtle">
              <Tag.Label>{auxiliary.hourlyRate}€/h</Tag.Label>
            </Tag.Root>
          </Flex>

          {auxiliary.qualifications.length > 0 && (
            <Flex gap={1} flexWrap="wrap">
              {auxiliary.qualifications.slice(0, 3).map((qual) => (
                <Tag.Root key={qual} size="sm" variant="outline">
                  <Tag.Label>{qual}</Tag.Label>
                </Tag.Root>
              ))}
              {auxiliary.qualifications.length > 3 && (
                <Tag.Root size="sm" variant="outline">
                  <Tag.Label>+{auxiliary.qualifications.length - 3}</Tag.Label>
                </Tag.Root>
              )}
            </Flex>
          )}

          {auxiliary.phone && (
            <Text fontSize="sm" color="gray.500" mt={2}>
              {auxiliary.phone}
            </Text>
          )}
        </Box>
      </Flex>
    </Box>
  )
}
