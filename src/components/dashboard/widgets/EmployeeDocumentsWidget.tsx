import { useState, useEffect } from 'react'
import { Box, Flex, Text, Stack, Skeleton } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { NavIcon } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface EmployeeDocumentsWidgetProps {
  employeeId: string
}

interface DocItem {
  id: string
  label: string
  type: 'payslip' | 'contract' | 'other'
  isNew: boolean
  createdAt: Date
}

export function EmployeeDocumentsWidget({ employeeId }: EmployeeDocumentsWidgetProps) {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false

    async function load() {
      try {
        // Récupérer les contrats de l'employé
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id, employer_id, start_date')
          .eq('employee_id', employeeId)
          .eq('status', 'active')

        if (!contracts || contracts.length === 0) {
          if (!cancelled) setIsLoading(false)
          return
        }

        const items: DocItem[] = []

        // Ajouter les contrats de travail
        for (const contract of contracts) {
          items.push({
            id: `contract-${contract.id}`,
            label: 'Contrat de travail',
            type: 'contract',
            isNew: false,
            createdAt: new Date(contract.start_date),
          })
        }

        // Récupérer les bulletins de paie (payslips) si la table existe
        const { data: payslips } = await supabase
          .from('payslips')
          .select('id, period_label, created_at')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false })
          .limit(3)

        if (payslips) {
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

          for (const p of payslips) {
            items.push({
              id: `payslip-${p.id}`,
              label: `Bulletin ${p.period_label || ''}`.trim(),
              type: 'payslip',
              isNew: new Date(p.created_at) > sevenDaysAgo,
              createdAt: new Date(p.created_at),
            })
          }
        }

        // Trier par date décroissante, prendre les 3 premiers
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        if (!cancelled) {
          setDocs(items.slice(0, 3))
        }
      } catch (err) {
        // La table payslips peut ne pas exister
        logger.error('Erreur chargement documents employé:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [employeeId])

  if (isLoading) {
    return (
      <Box
        bg="bg.surface"
        borderRadius="12px"
        borderWidth="1.5px"
        borderColor="border.default"
        boxShadow="sm"
        p={4}
      >
        <Skeleton height="16px" width="50%" mb={4} />
        <Stack gap={3}>
          {[1, 2].map((i) => (
            <Skeleton key={i} height="40px" borderRadius="8px" />
          ))}
        </Stack>
      </Box>
    )
  }

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1.5px"
      borderColor="border.default"
      boxShadow="sm"
      overflow="hidden"
    >
      <Flex
        justify="space-between"
        align="center"
        px={4}
        py={3}
        borderBottomWidth="1px"
        borderColor="border.default"
      >
        <Text fontSize="15px" fontWeight="700" color="text.default">
          Mes documents
        </Text>
        <RouterLink to="/documents" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--chakra-colors-brand-500)' }}>
          Tout voir
        </RouterLink>
      </Flex>

      <Stack gap="8px" p={4}>
        {docs.length === 0 ? (
          <Text color="text.muted" textAlign="center" py={4} fontSize="sm">
            Aucun document disponible
          </Text>
        ) : (
          docs.map((doc) => (
            <Flex
              key={doc.id}
              as={RouterLink}
              to="/documents"
              align="center"
              gap="12px"
              px="16px"
              py="7px"
              borderRadius="6px"
              borderWidth="1.5px"
              borderColor="border.default"
              bg="transparent"
              color="text.secondary"
              fontSize="xs"
              fontWeight="700"
              textDecoration="none"
              transition="all 0.15s"
              _hover={{ borderColor: 'brand.500', color: 'brand.500', bg: 'brand.subtle' }}
            >
              <NavIcon name={doc.type === 'contract' ? 'shield' : 'file'} size={16} />
              <Text flex={1} truncate>
                {doc.label}
              </Text>
              {doc.isNew && (
                <Text
                  as="span"
                  fontSize="10px"
                  fontWeight="600"
                  bg="accent.subtle"
                  color="accent.700"
                  px="12px"
                  py="4px"
                  borderRadius="6px"
                  flexShrink={0}
                  ml="auto"
                >
                  Nouveau
                </Text>
              )}
            </Flex>
          ))
        )}
      </Stack>
    </Box>
  )
}
