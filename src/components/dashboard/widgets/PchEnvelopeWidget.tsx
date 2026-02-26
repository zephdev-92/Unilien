/**
 * Widget Enveloppe PCH — Dashboard Employeur
 * Affiche la consommation PCH du mois en cours vs l'enveloppe allouée.
 * Formule :
 *   Enveloppe = pchMonthlyHours × tarif(pchType)
 *   Consommé  = monthlyCost (brut × 1.42 — charges incluses)
 *   Reste à charge = max(0, Consommé - Enveloppe)
 */

import { useState, useEffect } from 'react'
import { Box, Stack, Flex, Text, Skeleton, Progress } from '@chakra-ui/react'
import { getEmployer } from '@/services/profileService'
import { getEmployerStats } from '@/services/statsService'
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
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notConfigured, setNotConfigured] = useState(false)

  useEffect(() => {
    if (!employerId) return

    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const [employer, stats] = await Promise.all([
          getEmployer(employerId),
          getEmployerStats(employerId),
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
      <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" p={6} boxShadow="sm">
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

  const { pchType, pchMonthlyHours, envelopePch, consumed, resteACharge, ratio } = data
  const ratioPercent = Math.round(ratio * 100)
  const isWarning = ratio >= 0.9
  const isOver = consumed > envelopePch
  const tarif = getPchElementRate(pchType)

  const progressColor = isOver ? 'red' : isWarning ? 'orange' : 'green'

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor={isOver ? 'red.300' : isWarning ? 'orange.300' : 'gray.200'}
      p={6}
      boxShadow="sm"
    >
      <Flex justify="space-between" align="flex-start" mb={4}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold" color="gray.900">
            Enveloppe PCH
          </Text>
          <Text fontSize="sm" color="gray.500">
            {PCH_TYPE_LABELS[pchType]} · {pchMonthlyHours}h/mois
          </Text>
        </Box>
        {isOver && (
          <Box
            px={2}
            py={1}
            bg="red.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="red.200"
          >
            <Text fontSize="xs" fontWeight="medium" color="red.700">
              Dépassement
            </Text>
          </Box>
        )}
        {isWarning && !isOver && (
          <Box
            px={2}
            py={1}
            bg="orange.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="orange.200"
          >
            <Text fontSize="xs" fontWeight="medium" color="orange.700">
              Proche du plafond
            </Text>
          </Box>
        )}
      </Flex>

      {/* Barre de progression */}
      <Box mb={2}>
        <Flex justify="space-between" mb={1}>
          <Text fontSize="xs" color="gray.500">
            Consommé
          </Text>
          <Text fontSize="xs" fontWeight="medium" color={isOver ? 'red.600' : 'gray.700'}>
            {ratioPercent}%
          </Text>
        </Flex>
        <Progress.Root value={ratioPercent} colorPalette={progressColor} size="md">
          <Progress.Track borderRadius="full">
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      </Box>

      {/* Lignes détail */}
      <Stack gap={2} mt={4}>
        <Flex justify="space-between">
          <Text fontSize="sm" color="gray.600">
            Enveloppe allouée
          </Text>
          <Text fontSize="sm" fontWeight="medium" color="green.700">
            {envelopePch.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </Text>
        </Flex>

        <Flex justify="space-between">
          <Text fontSize="sm" color="gray.600">
            Coût mensuel estimé
          </Text>
          <Text fontSize="sm" fontWeight="medium" color={isOver ? 'red.600' : 'gray.900'}>
            {consumed.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </Text>
        </Flex>

        <Box borderTopWidth="1px" borderColor="gray.100" pt={2}>
          <Flex justify="space-between">
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
              Reste à charge
            </Text>
            <Text
              fontSize="sm"
              fontWeight="bold"
              color={resteACharge > 0 ? 'red.600' : 'green.600'}
            >
              {resteACharge > 0
                ? resteACharge.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
                : 'Couvert'}
            </Text>
          </Flex>
        </Box>
      </Stack>

      <Text fontSize="xs" color="gray.400" mt={3}>
        Tarif PCH {tarif.toFixed(2).replace('.', ',')} €/h · Charges ~42% incluses
      </Text>
    </Box>
  )
}

export default PchEnvelopeWidget
