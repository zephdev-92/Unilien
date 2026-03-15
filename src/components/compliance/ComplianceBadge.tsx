/**
 * Badge de conformité
 * Indicateur visuel rapide du statut de conformité
 */

import { Badge, Flex, Text, Tooltip } from '@chakra-ui/react'
import type { ComplianceResult } from '@/types'

interface ComplianceBadgeProps {
  result: ComplianceResult
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ComplianceBadge({
  result,
  showCount = true,
  size = 'md',
}: ComplianceBadgeProps) {
  const hasErrors = result.errors.length > 0
  const hasWarnings = result.warnings.length > 0

  let colorPalette: 'green' | 'orange' | 'red'
  let icon: string
  let label: string
  let description: string

  if (hasErrors) {
    colorPalette = 'red'
    icon = '🚫'
    label = 'Non conforme'
    description = `${result.errors.length} erreur${result.errors.length > 1 ? 's' : ''} bloquante${result.errors.length > 1 ? 's' : ''}`
  } else if (hasWarnings) {
    colorPalette = 'orange'
    icon = '⚠️'
    label = 'Attention'
    description = `${result.warnings.length} avertissement${result.warnings.length > 1 ? 's' : ''}`
  } else {
    colorPalette = 'green'
    icon = '✓'
    label = 'Conforme'
    description = 'Toutes les règles sont respectées'
  }

  const fontSize = size === 'sm' ? 'xs' : size === 'md' ? 'sm' : 'md'
  const py = size === 'sm' ? 0.5 : size === 'md' ? 1 : 1.5
  const px = size === 'sm' ? 2 : size === 'md' ? 3 : 4

  const badge = (
    <Badge
      colorPalette={colorPalette}
      py={py}
      px={px}
      borderRadius="full"
      fontSize={fontSize}
    >
      <Flex align="center" gap={1}>
        <Text aria-hidden="true">{icon}</Text>
        <Text>{label}</Text>
        {showCount && (hasErrors || hasWarnings) && (
          <Text fontWeight="bold">
            ({hasErrors ? result.errors.length : result.warnings.length})
          </Text>
        )}
      </Flex>
    </Badge>
  )

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span>{badge}</span>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content bg="gray.800" color="white" px={3} py={2} borderRadius="10px">
          <Text fontSize="sm">{description}</Text>
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}

/**
 * Version simplifiée - juste une icône
 */
export function ComplianceIcon({
  result,
  size = 'md',
}: {
  result: ComplianceResult
  size?: 'sm' | 'md' | 'lg'
}) {
  const hasErrors = result.errors.length > 0
  const hasWarnings = result.warnings.length > 0

  let icon: string
  let color: string
  let label: string

  if (hasErrors) {
    icon = '🚫'
    color = 'red.500'
    label = 'Non conforme'
  } else if (hasWarnings) {
    icon = '⚠️'
    color = 'orange.500'
    label = 'Attention requise'
  } else {
    icon = '✓'
    color = 'green.500'
    label = 'Conforme'
  }

  const fontSize = size === 'sm' ? 'md' : size === 'md' ? 'lg' : 'xl'

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Text
          as="span"
          fontSize={fontSize}
          color={color}
          aria-label={label}
          cursor="help"
        >
          {icon}
        </Text>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content bg="gray.800" color="white" px={3} py={2} borderRadius="10px">
          <Text fontSize="sm">{label}</Text>
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}

export default ComplianceBadge
