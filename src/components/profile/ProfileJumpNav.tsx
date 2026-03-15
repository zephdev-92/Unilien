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
      display="flex"
      gap={2}
      flexWrap="wrap"
      mb={6}
    >
      {items.map((item) => (
        <Box
          key={item.id}
          as="a"
          href={`#${item.id}`}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => handleClick(e, item.id)}
          display="inline-flex"
          alignItems="center"
          px={4}
          py={2}
          bg={activeId === item.id ? 'brand.50' : 'bg.page'}
          borderWidth="1px"
          borderColor={activeId === item.id ? 'brand.500' : 'border.default'}
          borderRadius="20px"
          fontSize="sm"
          fontWeight={600}
          color={activeId === item.id ? 'brand.500' : 'text.muted'}
          whiteSpace="nowrap"
          transition="background 0.15s, color 0.15s, border-color 0.15s"
          _hover={{
            bg: 'brand.50',
            borderColor: 'brand.500',
            color: 'brand.500',
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
    </Box>
  )
}
