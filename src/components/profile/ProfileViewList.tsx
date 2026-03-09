import { Box, Flex, Text, Stack } from '@chakra-ui/react'

interface ViewRow {
  label: string
  value: string | undefined
}

interface ProfileViewListProps {
  rows: ViewRow[]
}

export function ProfileViewList({ rows }: ProfileViewListProps) {
  return (
    <Stack as="dl" gap={0} divideY="1px" divideColor="gray.100">
      {rows.map((row) => (
        <Flex
          key={row.label}
          direction={{ base: 'column', sm: 'row' }}
          gap={{ base: 0, sm: 4 }}
          py={3}
          px={1}
        >
          <Box as="dt" w={{ sm: '180px' }} flexShrink={0}>
            <Text fontSize="sm" color="gray.500" fontWeight="medium">
              {row.label}
            </Text>
          </Box>
          <Box as="dd" flex={1}>
            <Text fontSize="sm" color={row.value ? 'gray.800' : 'gray.400'}>
              {row.value || 'Non renseigne'}
            </Text>
          </Box>
        </Flex>
      ))}
    </Stack>
  )
}
