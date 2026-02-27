import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Stack,
  Flex,
  Text,
  Avatar,
  Tag,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import {
  getActiveAuxiliariesForEmployer,
  type AuxiliarySummary,
} from '@/services/auxiliaryService'

interface TeamWidgetProps {
  employerId: string
}

export function TeamWidget({ employerId }: TeamWidgetProps) {
  const [auxiliaries, setAuxiliaries] = useState<AuxiliarySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!employerId) return

    let cancelled = false

    const loadData = async () => {
      try {
        const data = await getActiveAuxiliariesForEmployer(employerId)
        if (!cancelled) {
          setAuxiliaries(data)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [employerId])

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
      boxShadow="sm"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="semibold" color="gray.900">
          Mon équipe
        </Text>
        <RouterLink to="/equipe">
          <AccessibleButton size="sm" variant="ghost" colorPalette="blue">
            Voir tout
          </AccessibleButton>
        </RouterLink>
      </Flex>

      {isLoading ? (
        <Center py={8}>
          <Spinner size="lg" color="brand.500" />
        </Center>
      ) : auxiliaries.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text fontSize="3xl" mb={2}>
            👥
          </Text>
          <Text color="gray.600" mb={4}>
            Aucun auxiliaire actif
          </Text>
          <RouterLink to="/equipe">
            <AccessibleButton size="sm" colorPalette="blue">
              Ajouter un auxiliaire
            </AccessibleButton>
          </RouterLink>
        </Box>
      ) : (
        <Stack gap={3}>
          {auxiliaries.slice(0, 4).map((auxiliary) => (
            <AuxiliaryRow key={auxiliary.contractId} auxiliary={auxiliary} />
          ))}

          {auxiliaries.length > 4 && (
            <Text fontSize="sm" color="gray.500" textAlign="center" pt={2}>
              +{auxiliaries.length - 4} autre{auxiliaries.length - 4 > 1 ? 's' : ''}
            </Text>
          )}
        </Stack>
      )}
    </Box>
  )
}

function AuxiliaryRow({ auxiliary }: { auxiliary: AuxiliarySummary }) {
  return (
    <Flex
      align="center"
      gap={3}
      p={3}
      bg="gray.50"
      borderRadius="md"
      transition="background 0.2s"
      _hover={{ bg: 'gray.100' }}
    >
      <Avatar.Root size="sm">
        <Avatar.Fallback name={`${auxiliary.firstName} ${auxiliary.lastName}`} />
        {auxiliary.avatarUrl && <Avatar.Image src={auxiliary.avatarUrl} />}
      </Avatar.Root>

      <Box flex={1} minW={0}>
        <Text fontWeight="medium" fontSize="sm" truncate>
          {auxiliary.firstName} {auxiliary.lastName}
        </Text>
        <Flex gap={1} mt={0.5}>
          <Tag.Root size="sm" colorPalette="blue" variant="subtle">
            <Tag.Label>{auxiliary.contractType}</Tag.Label>
          </Tag.Root>
          <Tag.Root size="sm" variant="subtle">
            <Tag.Label>{auxiliary.weeklyHours}h/sem</Tag.Label>
          </Tag.Root>
        </Flex>
      </Box>

      {auxiliary.phone && (
        <Text fontSize="xs" color="gray.500" display={{ base: 'none', sm: 'block' }}>
          {auxiliary.phone}
        </Text>
      )}
    </Flex>
  )
}

export default TeamWidget
