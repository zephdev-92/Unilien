import { memo } from 'react'
import { Flex, Text, Box } from '@chakra-ui/react'

interface StatItemProps {
  label: string
  value: string
  icon: string
}

export const StatItem = memo(function StatItem({ label, value, icon }: StatItemProps) {
  return (
    <Flex align="center" gap={2} minW="120px">
      <Text fontSize="lg" aria-hidden="true">{icon}</Text>
      <Box>
        <Text fontSize="lg" fontWeight="bold" color="blue.800" lineHeight="1.2">
          {value}
        </Text>
        <Text fontSize="xs" color="blue.600">
          {label}
        </Text>
      </Box>
    </Flex>
  )
})
