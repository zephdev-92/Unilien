/**
 * Aide contextuelle sur les règles de conformité
 * Affiche les règles IDCC 3239 de manière accessible
 */

import {
  Box,
  Text,
  VStack,
  HStack,
  Heading,
  Badge,
  Icon,
  Table,
  Separator,
} from '@chakra-ui/react'

// Icônes simples en SVG inline
const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)

const CoffeeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 8h1a4 4 0 010 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
    <path d="M6 1v3M10 1v3M14 1v3" />
  </svg>
)

const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
)


interface RuleCardProps {
  icon: React.ReactNode
  title: string
  description: string
  limit: string
  type: 'blocking' | 'warning'
  examples?: string[]
}

function RuleCard({ icon, title, description, limit, type, examples }: RuleCardProps) {
  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="lg"
      borderColor={type === 'blocking' ? 'red.200' : 'orange.200'}
      bg={type === 'blocking' ? 'red.50' : 'orange.50'}
      _dark={{
        bg: type === 'blocking' ? 'red.900/20' : 'orange.900/20',
        borderColor: type === 'blocking' ? 'red.700' : 'orange.700',
      }}
    >
      <HStack gap={3} mb={2}>
        <Box color={type === 'blocking' ? 'red.500' : 'orange.500'}>{icon}</Box>
        <Heading size="sm">{title}</Heading>
        <Badge colorPalette={type === 'blocking' ? 'red' : 'orange'}>
          {type === 'blocking' ? 'Bloquant' : 'Avertissement'}
        </Badge>
      </HStack>
      <Text fontSize="sm" color="fg.muted" mb={2}>
        {description}
      </Text>
      <Text fontSize="sm" fontWeight="semibold">
        Limite : {limit}
      </Text>
      {examples && examples.length > 0 && (
        <Box mt={2} pl={3} borderLeftWidth="2px" borderColor="gray.300">
          {examples.map((example, i) => (
            <Text key={i} fontSize="xs" color="fg.muted">
              {example}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  )
}

export function ComplianceHelp() {
  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="lg" mb={2}>
          Bouclier Juridique
        </Heading>
        <Text color="fg.muted">
          Les règles de conformité protègent vos auxiliaires et vous assurent le respect du Code du
          travail (Convention Collective IDCC 3239).
        </Text>
      </Box>

      <Separator />

      <Box>
        <Heading size="md" mb={4}>
          Règles de temps de travail
        </Heading>
        <VStack gap={4} align="stretch">
          <RuleCard
            icon={<ClockIcon />}
            title="Repos quotidien"
            description="Chaque auxiliaire doit bénéficier d'au moins 11 heures de repos entre deux interventions."
            limit="Minimum 11h consécutives"
            type="blocking"
            examples={[
              'Fin à 22h00 → Reprise possible à 09h00',
              'Fin à 20h00 → Reprise possible à 07h00',
            ]}
          />

          <RuleCard
            icon={<CalendarIcon />}
            title="Repos hebdomadaire"
            description="Un repos de 35 heures consécutives minimum doit être accordé chaque semaine."
            limit="Minimum 35h consécutives par semaine"
            type="blocking"
            examples={['Ex: Samedi 14h à lundi 01h = 35h de repos']}
          />

          <RuleCard
            icon={<ClockIcon />}
            title="Durée quotidienne maximale"
            description="Le temps de travail effectif ne peut dépasser 10 heures par jour."
            limit="Maximum 10h par jour"
            type="blocking"
            examples={['Pauses déduites du temps effectif']}
          />

          <RuleCard
            icon={<CalendarIcon />}
            title="Durée hebdomadaire maximale"
            description="Le temps de travail ne peut dépasser 48 heures par semaine (du lundi au dimanche)."
            limit="Maximum 48h par semaine"
            type="blocking"
            examples={['Avertissement dès 44h atteintes']}
          />

          <RuleCard
            icon={<CoffeeIcon />}
            title="Pause obligatoire"
            description="Une pause de 20 minutes minimum est obligatoire pour toute intervention dépassant 6 heures."
            limit="20 min minimum si > 6h"
            type="warning"
            examples={['6h01 de travail → 20 min de pause requises', '8h de travail → 30 min recommandées']}
          />

          <RuleCard
            icon={<AlertIcon />}
            title="Chevauchement"
            description="Un auxiliaire ne peut pas avoir deux interventions en même temps."
            limit="Aucun chevauchement horaire"
            type="blocking"
          />
        </VStack>
      </Box>

      <Separator />

      <Box>
        <Heading size="md" mb={4}>
          Majorations de salaire
        </Heading>
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Condition</Table.ColumnHeader>
              <Table.ColumnHeader>Majoration</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Travail le dimanche</Table.Cell>
              <Table.Cell fontWeight="semibold">+30%</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Jour férié (habituel)</Table.Cell>
              <Table.Cell fontWeight="semibold">+60%</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Jour férié (exceptionnel)</Table.Cell>
              <Table.Cell fontWeight="semibold">+100%</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Heures de nuit (21h-6h)</Table.Cell>
              <Table.Cell fontWeight="semibold">+20%</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Heures supplémentaires (1-8h)</Table.Cell>
              <Table.Cell fontWeight="semibold">+25%</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Heures supplémentaires (&gt;8h)</Table.Cell>
              <Table.Cell fontWeight="semibold">+50%</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
        <Text fontSize="xs" color="fg.muted" mt={2}>
          Les majorations se cumulent (ex: dimanche férié = +30% + +100%)
        </Text>
      </Box>

      <Separator />

      <Box>
        <Heading size="md" mb={4}>
          Jours fériés
        </Heading>
        <Text fontSize="sm" mb={2}>
          Les jours fériés reconnus en France :
        </Text>
        <HStack flexWrap="wrap" gap={2}>
          {[
            '1er janvier',
            'Lundi de Pâques',
            '1er mai',
            '8 mai',
            'Ascension',
            'Lundi de Pentecôte',
            '14 juillet',
            '15 août',
            '1er novembre',
            '11 novembre',
            '25 décembre',
          ].map((holiday) => (
            <Badge key={holiday} variant="subtle" colorPalette="blue">
              {holiday}
            </Badge>
          ))}
        </HStack>
      </Box>

      <Box bg="blue.50" _dark={{ bg: 'blue.900/20' }} p={4} borderRadius="lg">
        <HStack gap={2} mb={2}>
          <Icon color="blue.500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </Icon>
          <Text fontWeight="semibold">Besoin d'aide ?</Text>
        </HStack>
        <Text fontSize="sm" color="fg.muted">
          En cas de doute, consultez votre conseiller URSSAF ou un avocat spécialisé. Ce module est
          fourni à titre informatif et ne constitue pas un conseil juridique.
        </Text>
      </Box>
    </VStack>
  )
}

export default ComplianceHelp
