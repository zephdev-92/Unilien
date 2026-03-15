import { Flex, Box, Text } from '@chakra-ui/react'

type StatusVariant = 'active' | 'pending' | 'off' | 'danger' | 'success'

const VARIANT_STYLES: Record<StatusVariant, { bg: string; color: string; dot: string }> = {
  active:  { bg: '#EDF1F5', color: '#3D5166', dot: '#3D5166' },
  pending: { bg: '#F2EDE5', color: '#4A3D2B', dot: '#5E5038' },
  off:     { bg: '#F0F4F8', color: '#6B7A8D', dot: '#6B7A8D' },
  danger:  { bg: '#FEF2F2', color: '#991B1B', dot: '#991B1B' },
  success: { bg: '#EFF4DC', color: '#3A5210', dot: '#9BB23B' },
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
