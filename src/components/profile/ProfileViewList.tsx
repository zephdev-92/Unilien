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
    <Stack as="dl" gap={0}>
      {rows.map((row, index) => (
        <Flex
          key={row.label}
          direction={{ base: 'column', sm: 'row' }}
          align={{ base: 'flex-start', sm: 'baseline' }}
          gap={{ base: 1, sm: 4 }}
          py={3}
          borderBottomWidth={index < rows.length - 1 ? '1px' : '0'}
          borderColor="border.default"
          css={{
            '&:first-of-type': { paddingTop: 0 },
            '&:last-of-type': { paddingBottom: 0 },
          }}
        >
          <Box as="dt" minW={{ sm: '120px' }} flexShrink={0}>
            <Text fontSize="xs" color="text.muted" fontWeight={500}>
              {row.label}
            </Text>
          </Box>
          <Box as="dd" flex={1}>
            <Text fontSize="sm" color={row.value ? 'text.default' : 'text.muted'} fontWeight={500}>
              {row.value || 'Non renseigné'}
            </Text>
          </Box>
        </Flex>
      ))}
    </Stack>
  )
}
