import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Badge,
  Grid,
  Table,
} from '@chakra-ui/react'
import { PanelHeader } from './SettingsShared'

export function AbonnementPanel() {
  const currentPlan = 'Essentiel'

  const plans = [
    {
      name: 'Essentiel',
      price: '9,90 €',
      desc: 'Pour les particuliers employeurs.',
      features: ['Auxiliaires illimités', 'Bulletins de paie PDF', 'Conformité IDCC 3239 automatique', 'Export planning (PDF, iCal)', 'Dashboard PCH', 'Cahier de liaison'],
      disabled: [] as string[],
      isCurrent: true,
      recommended: false,
      cta: 'Plan actuel',
    },
  ]

  const invoices = [
    { date: '3 mars 2026', desc: 'Plan Essentiel — mars 2026', amount: '9,90 €', status: 'Payé' },
    { date: '1 fév 2026', desc: 'Plan Essentiel — février 2026', amount: '9,90 €', status: 'Payé' },
    { date: '1 janv 2026', desc: 'Plan Essentiel — janvier 2026', amount: '9,90 €', status: 'Payé' },
    { date: '1 déc 2025', desc: 'Plan Essentiel — décembre 2025', amount: '9,90 €', status: 'Payé' },
  ]

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Abonnement"
        subtitle="Gérez votre plan, votre moyen de paiement et consultez vos factures."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Plan actuel</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <HStack justify="space-between" mb={4} flexWrap="wrap" gap={3}>
            <Box>
              <HStack gap={2} mb={1}>
                <Text fontWeight="bold" fontSize="lg">{currentPlan}</Text>
                <Badge colorPalette="green" size="sm">Actif</Badge>
              </HStack>
              <Text fontWeight="bold" fontSize="2xl">9,90 €<Text as="span" fontSize="sm" fontWeight="normal" color="text.muted"> / mois</Text></Text>
              <Text fontSize="sm" color="text.muted" mt={1}>
                Prochain renouvellement le <strong>1 avril 2026</strong> — Visa ····&nbsp;4242
              </Text>
            </Box>
            <Button variant="ghost" size="sm">Résilier</Button>
          </HStack>

          <VStack gap={3} align="stretch">
            <UsageBar label="Employés" value="Illimité" percent={0} />
            <UsageBar label="Bulletins de paie ce mois" value="2 / ∞" percent={20} />
            <UsageBar label="Espace documents" value="1,2 Go / 5 Go" percent={24} />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Plans disponibles</Card.Title>
          <Text fontSize="sm" color="text.muted">Changez de plan à tout moment, sans engagement.</Text>
        </Card.Header>
        <Card.Body p={4}>
          <Grid templateColumns="1fr" gap={4} maxW="480px">
            {plans.map((plan) => (
              <Box
                key={plan.name}
                borderWidth="2px"
                borderColor={plan.isCurrent ? 'brand.500' : 'border.default'}
                borderRadius="12px"
                p={5}
                position="relative"
              >
                <HStack gap={2} mb={2}>
                  <Text fontWeight="700" fontSize="md">{plan.name}</Text>
                  {plan.isCurrent && <Badge colorPalette="green" size="sm">Plan actuel</Badge>}
                  {plan.recommended && <Badge colorPalette="brand" size="sm">Recommandé</Badge>}
                </HStack>
                <Text fontWeight="bold" fontSize="xl" mb={1}>
                  {plan.price}<Text as="span" fontSize="sm" fontWeight="normal" color="text.muted"> / mois</Text>
                </Text>
                <Text fontSize="sm" color="text.muted" mb={3}>{plan.desc}</Text>
                <VStack align="start" gap={1.5} mb={4}>
                  {plan.features.map((f) => (
                    <Text key={f} fontSize="sm">✓ {f}</Text>
                  ))}
                  {plan.disabled.map((f) => (
                    <Text key={f} fontSize="sm" color="text.muted" textDecoration="line-through">✗ {f}</Text>
                  ))}
                </VStack>
                <Button
                  w="100%"
                  colorPalette={plan.isCurrent ? 'gray' : 'brand'}
                  variant={plan.isCurrent ? 'outline' : 'solid'}
                  disabled={plan.isCurrent}
                  size="sm"
                >
                  {plan.cta}
                </Button>
              </Box>
            ))}
          </Grid>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Moyen de paiement</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <HStack justify="space-between">
            <Box>
              <Text fontWeight="medium" fontSize="sm">Visa ····&nbsp;4242</Text>
              <Text fontSize="xs" color="text.muted">Expire le 03/2028</Text>
            </Box>
            <Button variant="ghost" size="sm">Modifier</Button>
          </HStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Historique de facturation</Card.Title>
        </Card.Header>
        <Card.Body p={0}>
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Date</Table.ColumnHeader>
                  <Table.ColumnHeader>Description</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Montant</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center">Statut</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center">Facture</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {invoices.map((inv) => (
                  <Table.Row key={inv.date}>
                    <Table.Cell><Text fontSize="sm">{inv.date}</Text></Table.Cell>
                    <Table.Cell><Text fontSize="sm">{inv.desc}</Text></Table.Cell>
                    <Table.Cell textAlign="right"><Text fontSize="sm">{inv.amount}</Text></Table.Cell>
                    <Table.Cell textAlign="center">
                      <Badge colorPalette="green" size="sm">{inv.status}</Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Button variant="ghost" size="xs">PDF</Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

function UsageBar({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <Box>
      <HStack justify="space-between" mb={1}>
        <Text fontSize="sm" color="text.muted">{label}</Text>
        <Text fontSize="sm" fontWeight="medium">{value}</Text>
      </HStack>
      <Box bg="bg.surface.hover" borderRadius="full" h="6px">
        <Box
          bg={percent >= 90 ? 'red.400' : 'brand.500'}
          h="100%"
          borderRadius="full"
          w={`${Math.min(percent, 100)}%`}
          transition="width 0.3s"
        />
      </Box>
    </Box>
  )
}
