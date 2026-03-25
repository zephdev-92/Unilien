/**
 * Section "Contrats" dans la page Documents.
 * Pattern doc-list : icône SVG + doc-info (nom + meta) + actions (télécharger + statut pill).
 */

import { useState, useEffect, useCallback } from 'react'
import {
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Spinner,
  Center,
  Alert,
  EmptyState,
  Box,
  Icon,
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

function DocIcon() {
  return (
    <Icon asChild boxSize="20px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </Icon>
  )
}

function DownloadIcon() {
  return (
    <Icon asChild boxSize="16px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </Icon>
  )
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
            Ajoutez un employe depuis la page Equipe pour creer son contrat de travail.
          </EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  return (
    <VStack gap={0} align="stretch">
      {contracts.map((contract) => (
        <Box
          key={contract.id}
          py={4}
          px={4}
          borderBottomWidth="1px"
          borderColor="border.default"
          _last={{ borderBottomWidth: 0 }}
        >
          <HStack gap={4} align="center" flexWrap="wrap">
            {/* Doc icon */}
            <Box
              w="40px"
              h="40px"
              borderRadius="10px"
              bg="brand.subtle"
              color="brand.600"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <DocIcon />
            </Box>

            {/* Doc info */}
            <VStack align="start" gap={0} flex={1} minW="200px">
              <Text fontWeight="semibold" fontSize="sm">
                Contrat {contract.contractType}
                {contract.employee && ` — ${contract.employee.firstName} ${contract.employee.lastName}`}
              </Text>
              <Text fontSize="xs" color="text.muted">
                {contract.weeklyHours}h/semaine · Signe le{' '}
                {format(contract.startDate, 'd MMM yyyy', { locale: fr })}
                {contract.endDate && ` · Fin le ${format(contract.endDate, 'd MMM yyyy', { locale: fr })}`}
              </Text>
            </VStack>

            {/* Doc actions */}
            <HStack gap={3} flexShrink={0}>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Telecharger contrat ${contract.employee?.firstName ?? ''} ${contract.employee?.lastName ?? ''}`}
              >
                <DownloadIcon />
                Telecharger
              </Button>
              <Badge
                colorPalette={STATUS_COLORS[contract.status] || 'gray'}
                variant="subtle"
              >
                {STATUS_LABELS[contract.status] || contract.status}
              </Badge>
            </HStack>
          </HStack>
        </Box>
      ))}
    </VStack>
  )
}

export default ContractsSection
