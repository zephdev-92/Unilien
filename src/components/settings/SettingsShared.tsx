/**
 * Composants UI partagés entre les panneaux de Paramètres.
 */

import { Box, HStack, Text, Switch, Badge } from '@chakra-ui/react'

export function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box mb={6}>
      <Text fontFamily="heading" fontSize="2xl" fontWeight="800" mb={1}>{title}</Text>
      <Text color="text.muted" fontSize="md" lineHeight="1.6">{subtitle}</Text>
    </Box>
  )
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  badge,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  badge?: string
}) {
  return (
    <HStack justify="space-between" align="start" py={3} borderBottomWidth="1px" borderColor="border.default">
      <Box flex={1} pr={4}>
        <HStack gap={2} mb={0.5}>
          <Text fontWeight="medium" fontSize="sm">{label}</Text>
          {badge && <Badge variant="subtle" size="sm">{badge}</Badge>}
        </HStack>
        <Text fontSize="xs" color="text.muted">{description}</Text>
      </Box>
      <Switch.Root
        checked={checked}
        onCheckedChange={(e) => onChange(e.checked)}
        disabled={disabled}
      >
        <Switch.HiddenInput aria-label={label} />
        <Switch.Control
          borderRadius="full"
          css={{
            '&[data-state=checked]': { background: '#9BB23B !important' },
          }}
        >
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Root>
    </HStack>
  )
}
