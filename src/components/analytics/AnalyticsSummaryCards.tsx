import { Box, SimpleGrid, Flex, Text } from '@chakra-ui/react'
import type { AnalyticsSummary } from '@/services/analyticsService'

interface AnalyticsSummaryCardsProps {
  data: AnalyticsSummary
  isEmployer: boolean
}

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}

interface CardData {
  label: string
  value: string
  sub: string
  iconPath: string
  iconBg: string
  iconColor: string
}

export function AnalyticsSummaryCards({ data, isEmployer }: AnalyticsSummaryCardsProps) {
  const { totals, monthlyData, presenceRates } = data

  const currentMonth = monthlyData[monthlyData.length - 1]
  const prevMonth = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null

  const hoursDiff = currentMonth && prevMonth
    ? currentMonth.totalHours - prevMonth.totalHours
    : 0

  const avgPresence = presenceRates.length > 0
    ? Math.round(presenceRates.reduce((s, p) => s + p.rate, 0) / presenceRates.length)
    : 0

  const cards: CardData[] = [
    {
      label: 'Total heures',
      value: `${totals.totalHours}h`,
      sub: `Moy. ${totals.avgHoursPerMonth}h/mois`,
      iconPath: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-13h-2v6l5.25 3.15.75-1.23-4-2.42V7z',
      iconBg: 'blue.50',
      iconColor: 'blue.500',
    },
    {
      label: isEmployer ? 'Cout total' : 'Revenu total',
      value: formatCurrency(totals.totalCost),
      sub: `Moy. ${formatCurrency(totals.avgCostPerMonth)}/mois`,
      iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.96-3.12 3.19z',
      iconBg: 'green.50',
      iconColor: 'green.500',
    },
    {
      label: 'Heures ce mois',
      value: currentMonth ? `${currentMonth.totalHours}h` : '0h',
      sub: hoursDiff > 0 ? `+${hoursDiff}h vs mois dernier` : hoursDiff < 0 ? `${hoursDiff}h vs mois dernier` : '= mois dernier',
      iconPath: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z',
      iconBg: 'blue.50',
      iconColor: 'blue.500',
    },
    {
      label: 'Taux de presence',
      value: `${avgPresence}%`,
      sub: avgPresence >= 90 ? 'Excellent' : avgPresence >= 70 ? 'Correct' : 'A ameliorer',
      iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      iconBg: avgPresence >= 90 ? 'green.50' : 'orange.50',
      iconColor: avgPresence >= 90 ? 'green.500' : 'orange.500',
    },
  ]

  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
      {cards.map((card) => (
        <Box
          key={card.label}
          bg="bg.surface"
          borderRadius="12px"
          borderWidth="1px"
          borderColor="border.default"
          p={4}
          boxShadow="sm"
          transition="all 0.2s"
          _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
          css={{
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              transform: 'none !important',
            },
          }}
        >
          <Flex mb={3}>
            <Flex
              align="center"
              justify="center"
              w={10}
              h={10}
              borderRadius="12px"
              bg={card.iconBg}
              flexShrink={0}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ color: `var(--chakra-colors-${card.iconColor.replace('.', '-')})` }}>
                <path d={card.iconPath} />
              </svg>
            </Flex>
          </Flex>
          <Text fontSize="2xl" fontWeight="bold" color="brand.600">
            {card.value}
          </Text>
          <Text fontSize="sm" fontWeight="medium" color="text.secondary">
            {card.label}
          </Text>
          <Text fontSize="xs" color="text.muted" mt={1}>
            {card.sub}
          </Text>
        </Box>
      ))}
    </SimpleGrid>
  )
}
