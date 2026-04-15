import { Box, Flex, Text, Badge, IconButton } from '@chakra-ui/react'
import { AccessibleInput, AccessibleButton } from '@/components/ui'

const AVAILABLE_QUALIFICATIONS = [
  'Aide à la toilette',
  'Aide au repas',
  'Aide au lever/coucher',
  'Accompagnement sorties',
  'Entretien du logement',
  'Courses',
  'Garde de nuit',
  'Soins infirmiers',
  'Kinésithérapie',
  'Ergothérapie',
]

interface Props {
  qualifications: string[]
  newQualification: string
  onNewQualificationChange: (v: string) => void
  onAdd: (q: string) => void
  onRemove: (q: string) => void
}

export function QualificationsSubSection({
  qualifications,
  newQualification,
  onNewQualificationChange,
  onAdd,
  onRemove,
}: Props) {
  return (
    <Box bg="bg.surface" borderRadius="12px" borderWidth="1px" borderColor="border.default" p={6}>
      <Text fontSize="xl" fontWeight="semibold" mb={2}>Qualifications</Text>
      <Text fontSize="sm" color="text.muted" mb={4}>Vos compétences et services proposés</Text>

      {/* Tags sélectionnés */}
      <Flex wrap="wrap" gap={2} mb={4}>
        {qualifications.map((qual) => (
          <Badge
            key={qual}
            variant="plain"
            bg="brand.500"
            color="white"
            _dark={{ bg: 'brand.200', color: 'brand.900' }}
            px={3}
            py={1}
            borderRadius="full"
            display="flex"
            alignItems="center"
            gap={1}
          >
            {qual}
            <IconButton
              aria-label={`Retirer ${qual}`}
              size="xs"
              variant="ghost"
              minW="auto"
              h="auto"
              p={0}
              ml={1}
              onClick={() => onRemove(qual)}
            >
              ✕
            </IconButton>
          </Badge>
        ))}
        {qualifications.length === 0 && (
          <Text color="text.muted" fontSize="sm">Aucune qualification sélectionnée</Text>
        )}
      </Flex>

      {/* Suggestions */}
      <Text fontSize="sm" fontWeight="medium" mb={2}>Suggestions :</Text>
      <Flex wrap="wrap" gap={2} mb={4}>
        {AVAILABLE_QUALIFICATIONS.filter((q) => !qualifications.includes(q)).map((qual) => (
          <Badge
            key={qual}
            variant="plain"
            bg="transparent"
            color="text.default"
            borderWidth="1px"
            borderColor="border.strong"
            _dark={{ borderColor: 'brand.200', color: 'brand.200' }}
            px={3}
            py={1}
            borderRadius="full"
            cursor="pointer"
            _hover={{ bg: 'brand.subtle' }}
            onClick={() => onAdd(qual)}
          >
            + {qual}
          </Badge>
        ))}
      </Flex>

      {/* Ajout personnalisé */}
      <Flex gap={2}>
        <Box flex={1}>
          <AccessibleInput
            label="Ajouter une qualification"
            hideLabel
            placeholder="Autre qualification..."
            value={newQualification}
            onChange={(e) => onNewQualificationChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); onAdd(newQualification) }
            }}
          />
        </Box>
        <AccessibleButton
          variant="outline"
          onClick={() => onAdd(newQualification)}
          disabled={!newQualification}
        >
          Ajouter
        </AccessibleButton>
      </Flex>
    </Box>
  )
}
