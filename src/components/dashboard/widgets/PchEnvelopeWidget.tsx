/**
 * Widget Enveloppe PCH — Dashboard Employeur
 * Affiche la consommation PCH du mois en cours vs l'enveloppe allouée.
 * Formule :
 *   Enveloppe = pchMonthlyHours × tarif(pchType)
 *   Consommé  = monthlyCost (brut × 1.42 — charges incluses)
 *   Reste à charge = max(0, Consommé - Enveloppe)
 */

import { useState, useEffect } from 'react'
import { Box, Stack, SimpleGrid, Flex, Text, Skeleton, Progress } from '@chakra-ui/react'
import { getEmployer } from '@/services/profileService'
import { getEmployerStats, getEmployerBudgetForecast } from '@/services/statsService'
import { calcEnveloppePch, getPchElementRate, PCH_TYPE_LABELS } from '@/lib/pch/pchTariffs'
import type { PchType } from '@/lib/pch/pchTariffs'
import { logger } from '@/lib/logger'

interface PchEnvelopeWidgetProps {
  employerId: string
}

export function PchEnvelopeWidget({ employerId }: PchEnvelopeWidgetProps) {
  const [data, setData] = useState<{
    pchType: PchType
    pchMonthlyHours: number
    envelopePch: number
    consumed: number
    resteACharge: number
    ratio: number
    completedHours: number
    plannedHours: number
    projectedHours: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notConfigured, setNotConfigured] = useState(false)

  useEffect(() => {
    if (!employerId) return

    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const [employer, stats, forecast] = await Promise.all([
          getEmployer(employerId),
          getEmployerStats(employerId),
          getEmployerBudgetForecast(employerId),
        ])

        if (cancelled) return

        if (
          !employer?.pchBeneficiary ||
          !employer.pchType ||
          !employer.pchMonthlyHours
        ) {
          setNotConfigured(true)
          return
        }

        const envelopePch = calcEnveloppePch(employer.pchMonthlyHours, employer.pchType)
        const consumed = stats.monthlyCost
        const resteACharge = Math.max(0, consumed - envelopePch)
        const ratio = envelopePch > 0 ? Math.min(consumed / envelopePch, 1) : 0

        setData({
          pchType: employer.pchType,
          pchMonthlyHours: employer.pchMonthlyHours,
          envelopePch,
          consumed,
          resteACharge,
          ratio,
          completedHours: forecast.completedHours,
          plannedHours: forecast.plannedHours,
          projectedHours: forecast.projectedHours,
        })
      } catch (err) {
        logger.error('PchEnvelopeWidget — erreur chargement:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [employerId])

  if (isLoading) {
    return (
      <Box bg="bg.surface" borderRadius="12px" borderWidth="1.5px" borderColor="border.default" p={6} boxShadow="sm">
        <Skeleton height="20px" width="60%" mb={4} />
        <Skeleton height="12px" mb={3} />
        <Skeleton height="8px" borderRadius="full" mb={4} />
        <Stack gap={2}>
          <Skeleton height="14px" />
          <Skeleton height="14px" />
          <Skeleton height="14px" />
        </Stack>
      </Box>
    )
  }

  if (notConfigured || !data) {
    return null
  }

  const { pchType, pchMonthlyHours, envelopePch, consumed, resteACharge, ratio, completedHours, plannedHours, projectedHours } = data
  const ratioPercent = Math.round(ratio * 100)
  const isWarning = ratio >= 0.9
  const isOver = consumed > envelopePch
  const tarif = getPchElementRate(pchType)

  const progressColor = isOver ? 'red' : 'green'

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const capitalMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  const fmt = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1.5px"
      borderColor="border.default"
      boxShadow="sm"
      overflow="hidden"
    >
      {/* Card header */}
      <Flex justify="space-between" align="center" px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <Box>
          <Text fontSize="15px" fontWeight="700" color="text.default">
            Enveloppe PCH — {capitalMonth}
          </Text>
          <Text fontSize="xs" color="text.muted">
            {PCH_TYPE_LABELS[pchType]} · {pchMonthlyHours}h/mois · Tarif {tarif.toFixed(2).replace('.', ',')} €/h
          </Text>
        </Box>
        {isOver && (
          <Flex
            px={3} py="4px" borderRadius="full" fontSize="12px" fontWeight="700"
            bg="#FEF2F2" color="#991B1B" borderWidth="1px" borderColor="#FCA5A5"
          >
            Dépassement
          </Flex>
        )}
        {isWarning && !isOver && (
          <Flex
            px={3} py="4px" borderRadius="10px" fontSize="12px" fontWeight="700"
            bg="#FEF9C3" color="#B45309"
          >
            Proche du plafond
          </Flex>
        )}
      </Flex>

      {/* Card body */}
      <Box p={4}>
        {/* Barre de progression */}
        <Box mb={3}>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="xs" color="text.muted">Consommé</Text>
            <Text fontSize="xs" fontWeight="700" color={isOver ? 'red.600' : 'text.default'}>
              {ratioPercent}%
            </Text>
          </Flex>
          <Progress.Root value={ratioPercent} colorPalette={progressColor} size="md">
            <Progress.Track borderRadius="full">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Box>

        {/* Heures du mois */}
        <Stack gap={1} mb={4}>
          <Flex justify="space-between">
            <Text fontSize="sm" color="text.muted">Heures effectuées</Text>
            <Text fontSize="sm" fontWeight="500" color="text.default">{completedHours}h</Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontSize="sm" color="text.muted">Heures planifiées</Text>
            <Text fontSize="sm" fontWeight="500" color="text.default">{plannedHours}h</Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontSize="sm" fontWeight="700" color="#3D5166">Total projeté</Text>
            <Text fontSize="sm" fontWeight="700" color="#3D5166">{projectedHours}h</Text>
          </Flex>
        </Stack>

        {/* 3 cartes montants */}
        <SimpleGrid columns={3} gap={3} mb={3}>
          <Box
            textAlign="center" py={3} px={2}
            borderRadius="10px" borderWidth="1px" borderColor="border.default"
            bg="#F3F6F9"
          >
            <Text fontSize="lg" fontWeight="800" color="#3D5166">
              {fmt(envelopePch)} €
            </Text>
            <Text fontSize="xs" color="text.muted">Enveloppe allouée</Text>
          </Box>
          <Box
            textAlign="center" py={3} px={2}
            borderRadius="10px" borderWidth="1px" borderColor="border.default"
            bg="#F3F6F9"
          >
            <Text fontSize="lg" fontWeight="800" color="#5E5038">
              {fmt(consumed)} €
            </Text>
            <Text fontSize="xs" color="text.muted">Coût mensuel estimé</Text>
          </Box>
          <Box
            textAlign="center" py={3} px={2}
            borderRadius="10px" borderWidth="1px" borderColor="border.default"
            bg={resteACharge > 0 ? '#FEF2F2' : '#EFF4DC'}
          >
            <Text fontSize="lg" fontWeight="800" color={resteACharge > 0 ? '#991B1B' : '#3A5210'}>
              {resteACharge > 0 ? `${fmt(resteACharge)} €` : 'Couvert'}
            </Text>
            <Text fontSize="xs" color="text.muted">Reste à charge</Text>
          </Box>
        </SimpleGrid>

        <Text fontSize="xs" color="text.muted">
          Tarif PCH {tarif.toFixed(2).replace('.', ',')} €/h · Charges ~42% incluses
        </Text>
      </Box>
    </Box>
  )
}

export default PchEnvelopeWidget
