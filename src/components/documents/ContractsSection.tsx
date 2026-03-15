/**
 * Section "Contrats" dans la page Documents.
 * Affiche la liste des contrats actifs avec statut et informations clés.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Center,
  Alert,
  EmptyState,
  Box,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getContractsForEmployer, type ContractWithEmployee } from '@/services/contractService'
import { logger } from '@/lib/logger'

interface Props {
  employerId: string
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  terminated: 'Résilié',
  suspended: 'Suspendu',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  terminated: 'red',
  suspended: 'orange',
}

export function ContractsSection({ employerId }: Props) {
  const [contracts, setContracts] = useState<ContractWithEmployee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadContracts = useCallback(async () => {
    try {
      const list = await getContractsForEmployer(employerId)
      setContracts(list)
    } catch (err) {
      logger.error('Erreur chargement contrats:', err)
      setError('Erreur lors du chargement des contrats')
    } finally {
      setIsLoading(false)
    }
  }, [employerId])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  if (isLoading) {
    return (
      <Center py={8}>
        <Spinner size="lg" color="brand.500" />
      </Center>
    )
  }

  if (error) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Title>{error}</Alert.Title>
      </Alert.Root>
    )
  }

  if (contracts.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Title>Aucun contrat</EmptyState.Title>
          <EmptyState.Description>
            Aucun contrat actif trouvé. Ajoutez un employé depuis la page Équipe.
          </EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  return (
    <VStack gap={3} align="stretch">
      {contracts.map((contract) => (
        <Box
          key={contract.id}
          p={4}
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="12px"
          _hover={{ bg: 'bg.page' }}
        >
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <HStack gap={3} flex={1} minW="200px">
              {/* Icône document */}
              <Box
                w="40px"
                h="40px"
                borderRadius="10px"
                bg="brand.50"
                color="brand.600"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
                fontSize="lg"
              >
                📄
              </Box>

              {/* Infos contrat */}
              <VStack align="start" gap={0}>
                <Text fontWeight="semibold" fontSize="sm">
                  Contrat {contract.contractType}
                  {contract.employee && ` — ${contract.employee.firstName} ${contract.employee.lastName}`}
                </Text>
                <Text fontSize="xs" color="text.muted">
                  {contract.weeklyHours}h/semaine · Depuis le{' '}
                  {format(contract.startDate, 'd MMMM yyyy', { locale: fr })}
                  {contract.endDate && ` · Fin le ${format(contract.endDate, 'd MMMM yyyy', { locale: fr })}`}
                </Text>
              </VStack>
            </HStack>

            {/* Statut */}
            <Badge
              colorPalette={STATUS_COLORS[contract.status] || 'gray'}
              variant="subtle"
            >
              {STATUS_LABELS[contract.status] || contract.status}
            </Badge>
          </HStack>
        </Box>
      ))}
    </VStack>
  )
}

export default ContractsSection
