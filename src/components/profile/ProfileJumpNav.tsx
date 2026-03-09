import { Flex, Box, Text } from '@chakra-ui/react'

interface NavItem {
  id: string
  label: string
}

interface ProfileJumpNavProps {
  items: NavItem[]
  activeId?: string
}

export function ProfileJumpNav({ items, activeId }: ProfileJumpNavProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <Box
      as="nav"
      aria-label="Sections du profil"
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      px={2}
      py={1}
      boxShadow="sm"
      position="sticky"
      top="80px"
      zIndex={5}
    >
      <Flex gap={1} overflowX="auto" py={1}>
        {items.map((item) => (
          <Box
            key={item.id}
            as="a"
            href={`#${item.id}`}
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => handleClick(e, item.id)}
            px={4}
            py={2}
            borderRadius="md"
            fontSize="sm"
            fontWeight="medium"
            color={activeId === item.id ? 'brand.700' : 'gray.600'}
            bg={activeId === item.id ? 'brand.50' : 'transparent'}
            whiteSpace="nowrap"
            transition="all 0.15s"
            _hover={{
              bg: activeId === item.id ? 'brand.50' : 'gray.50',
              color: activeId === item.id ? 'brand.700' : 'gray.800',
            }}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'brand.500',
              outlineOffset: '2px',
            }}
            textDecoration="none"
          >
            <Text>{item.label}</Text>
          </Box>
        ))}
      </Flex>
    </Box>
  )
}
