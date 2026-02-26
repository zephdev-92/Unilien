import { Box, Flex, Text, Badge, IconButton } from '@chakra-ui/react'

const AVAILABLE_LANGUAGES = [
  'Français',
  'Anglais',
  'Espagnol',
  'Portugais',
  'Arabe',
  'Chinois',
  'Allemand',
  'Italien',
  'Langue des signes (LSF)',
]

interface Props {
  languages: string[]
  onAdd: (lang: string) => void
  onRemove: (lang: string) => void
}

export function LanguagesSubSection({ languages, onAdd, onRemove }: Props) {
  return (
    <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" p={6}>
      <Text fontSize="xl" fontWeight="semibold" mb={2}>Langues parlées</Text>
      <Text fontSize="sm" color="gray.600" mb={4}>
        Langues dans lesquelles vous pouvez communiquer
      </Text>

      {/* Tags sélectionnés */}
      <Flex wrap="wrap" gap={2} mb={4}>
        {languages.map((lang) => (
          <Badge
            key={lang}
            colorPalette="green"
            px={3}
            py={1}
            borderRadius="full"
            display="flex"
            alignItems="center"
            gap={1}
          >
            {lang}
            <IconButton
              aria-label={`Retirer ${lang}`}
              size="xs"
              variant="ghost"
              minW="auto"
              h="auto"
              p={0}
              ml={1}
              onClick={() => onRemove(lang)}
            >
              ✕
            </IconButton>
          </Badge>
        ))}
      </Flex>

      {/* Suggestions */}
      <Text fontSize="sm" fontWeight="medium" mb={2}>Ajouter une langue :</Text>
      <Flex wrap="wrap" gap={2}>
        {AVAILABLE_LANGUAGES.filter((l) => !languages.includes(l)).map((lang) => (
          <Badge
            key={lang}
            variant="outline"
            colorPalette="gray"
            px={3}
            py={1}
            borderRadius="full"
            cursor="pointer"
            _hover={{ bg: 'gray.100' }}
            onClick={() => onAdd(lang)}
          >
            + {lang}
          </Badge>
        ))}
      </Flex>
    </Box>
  )
}
