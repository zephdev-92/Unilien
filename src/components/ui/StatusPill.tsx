import { Flex, Box, Text } from '@chakra-ui/react'

type StatusVariant = 'active' | 'pending' | 'off' | 'danger' | 'success'

const VARIANT_STYLES: Record<StatusVariant, { bg: string; color: string; dot: string }> = {
  active:  { bg: 'brand.50', color: 'brand.500', dot: 'brand.500' },
  pending: { bg: 'warm.50', color: 'warm.600', dot: 'warm.500' },
  off:     { bg: 'bg.muted', color: 'text.inactive', dot: 'text.inactive' },
  danger:  { bg: 'danger.50', color: 'danger.500', dot: 'danger.500' },
  success: { bg: 'accent.50', color: 'accent.700', dot: 'accent.500' },
}

interface StatusPillProps {
  variant: StatusVariant
  children: React.ReactNode
  size?: 'sm' | 'md'
}

export function StatusPill({ variant, children, size = 'md' }: StatusPillProps) {
  const styles = VARIANT_STYLES[variant]
  const isSmall = size === 'sm'

  return (
    <Flex
      display="inline-flex"
      align="center"
      gap="5px"
      px={isSmall ? '8px' : '12px'}
      py={isSmall ? '2px' : '4px'}
      borderRadius="999px"
      bg={styles.bg}
      fontSize={isSmall ? '11px' : '12px'}
      fontWeight="700"
      lineHeight="1"
      whiteSpace="nowrap"
    >
      <Box
        w="6px"
        h="6px"
        borderRadius="50%"
        bg={styles.dot}
        flexShrink={0}
      />
      <Text fontSize="inherit" fontWeight="inherit" color={styles.color}>
        {children}
      </Text>
    </Flex>
  )
}
