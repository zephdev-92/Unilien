/**
 * Composant d'alerte de conformité
 * Affiche les erreurs bloquantes et avertissements de manière accessible
 */

import {
  Box,
  Stack,
  Flex,
  Text,
  Collapsible,
  Badge,
} from '@chakra-ui/react'
import type { ComplianceResult, ComplianceError, ComplianceWarning } from '@/types'
import { AccessibleButton } from '@/components/ui'

interface ComplianceAlertProps {
  result: ComplianceResult
  showSuggestions?: boolean
  onDismiss?: () => void
}

export function ComplianceAlert({
  result,
  showSuggestions: _showSuggestions = false,
  onDismiss,
}: ComplianceAlertProps) {
  if (result.valid && result.warnings.length === 0) {
    return null
  }

  const hasErrors = result.errors.length > 0
  const hasWarnings = result.warnings.length > 0

  return (
    <Box
      role="alert"
      aria-live="polite"
      borderRadius="lg"
      overflow="hidden"
    >
      {/* Erreurs bloquantes */}
      {hasErrors && (
        <Box
          bg="red.50"
          borderWidth="1px"
          borderColor="red.200"
          p={4}
          mb={hasWarnings ? 3 : 0}
        >
          <Flex align="center" gap={2} mb={2}>
            <Text fontSize="xl" aria-hidden="true">
              🚫
            </Text>
            <Text fontWeight="bold" color="red.700" fontSize="lg">
              Intervention non conforme
            </Text>
            <Badge colorPalette="red" ml="auto">
              {result.errors.length} erreur{result.errors.length > 1 ? 's' : ''}
            </Badge>
          </Flex>

          <Stack gap={2}>
            {result.errors.map((error, index) => (
              <ErrorItem key={`${error.code}-${index}`} error={error} />
            ))}
          </Stack>
        </Box>
      )}

      {/* Avertissements */}
      {hasWarnings && (
        <Box
          bg="orange.50"
          borderWidth="1px"
          borderColor="orange.200"
          p={4}
        >
          <Flex align="center" gap={2} mb={2}>
            <Text fontSize="xl" aria-hidden="true">
              ⚠️
            </Text>
            <Text fontWeight="bold" color="orange.700" fontSize="lg">
              Attention
            </Text>
            <Badge colorPalette="orange" ml="auto">
              {result.warnings.length} avertissement{result.warnings.length > 1 ? 's' : ''}
            </Badge>
          </Flex>

          <Stack gap={2}>
            {result.warnings.map((warning, index) => (
              <WarningItem key={`${warning.code}-${index}`} warning={warning} />
            ))}
          </Stack>

          {onDismiss && (
            <Flex justify="flex-end" mt={3}>
              <AccessibleButton
                size="sm"
                variant="ghost"
                onClick={onDismiss}
              >
                Continuer quand même
              </AccessibleButton>
            </Flex>
          )}
        </Box>
      )}
    </Box>
  )
}

// Composant pour une erreur
function ErrorItem({ error }: { error: ComplianceError }) {
  return (
    <Collapsible.Root>
      <Collapsible.Trigger asChild>
        <Box
          as="button"
          w="full"
          textAlign="left"
          p={3}
          bg="white"
          borderRadius="md"
          borderWidth="1px"
          borderColor="red.200"
          _hover={{ borderColor: 'red.400' }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'red.500',
            outlineOffset: '2px',
          }}
        >
          <Text color="red.800" fontWeight="medium">
            {error.message}
          </Text>
          <Text color="red.600" fontSize="sm" mt={1}>
            Cliquez pour voir la règle applicable
          </Text>
        </Box>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box
          p={3}
          bg="red.100"
          borderRadius="md"
          borderTopRadius={0}
          mt={-1}
        >
          <Text fontSize="sm" color="red.700" fontStyle="italic">
            📖 {error.rule}
          </Text>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

// Composant pour un avertissement
function WarningItem({ warning }: { warning: ComplianceWarning }) {
  return (
    <Collapsible.Root>
      <Collapsible.Trigger asChild>
        <Box
          as="button"
          w="full"
          textAlign="left"
          p={3}
          bg="white"
          borderRadius="md"
          borderWidth="1px"
          borderColor="orange.200"
          _hover={{ borderColor: 'orange.400' }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'orange.500',
            outlineOffset: '2px',
          }}
        >
          <Text color="orange.800" fontWeight="medium">
            {warning.message}
          </Text>
          <Text color="orange.600" fontSize="sm" mt={1}>
            Cliquez pour voir la règle applicable
          </Text>
        </Box>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box
          p={3}
          bg="orange.100"
          borderRadius="md"
          borderTopRadius={0}
          mt={-1}
        >
          <Text fontSize="sm" color="orange.700" fontStyle="italic">
            📖 {warning.rule}
          </Text>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

export default ComplianceAlert
