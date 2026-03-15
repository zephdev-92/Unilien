/**
 * Tableau de bord de conformité complet
 * Score circulaire, alertes filtrables, contrôles par catégorie,
 * vue d'ensemble par employé et par semaine
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box,
  Stack,
  Flex,
  Text,
  Heading,
  Badge,
  Spinner,
  Center,
  Card,
  Input,
} from '@chakra-ui/react'
import {
  getWeeklyComplianceOverview,
  checkSmicCompliance,
  type WeeklyComplianceOverview,
  type ComplianceAlert,
} from '@/services/complianceService'
import { ComplianceHelp } from './ComplianceHelp'

interface ComplianceDashboardProps {
  employerId: string
  showHelp?: boolean
  onShowHelp?: (show: boolean) => void
  onRefreshRef?: React.MutableRefObject<(() => void) | null>
}

// ── Alert enrichment ─────────────────────────────────────────────────────────

const ALERT_TITLES: Record<ComplianceAlert['type'], string> = {
  weekly_hours: 'Dépassement heures hebdomadaires',
  daily_hours: 'Dépassement heures journalières',
  weekly_rest: 'Repos hebdomadaire insuffisant',
  daily_rest: 'Repos quotidien insuffisant',
}

const ALERT_LEGAL_REFS: Record<ComplianceAlert['type'], string> = {
  weekly_hours: 'Art. L3121-20',
  daily_hours: 'Art. L3121-18',
  weekly_rest: 'Art. L3132-2',
  daily_rest: 'Art. L3131-1',
}

interface EnrichedAlert {
  type: ComplianceAlert['type']
  severity: ComplianceAlert['severity']
  title: string
  description: string
  employeeName: string
  legalRef: string
}

function enrichAlerts(overview: WeeklyComplianceOverview): EnrichedAlert[] {
  return overview.employees.flatMap((emp) =>
    emp.alerts.map((alert) => ({
      type: alert.type,
      severity: alert.severity,
      title: ALERT_TITLES[alert.type],
      description: `${emp.employeeName} — ${alert.message}`,
      employeeName: emp.employeeName,
      legalRef: ALERT_LEGAL_REFS[alert.type],
    }))
  )
}

// ── Check derivation ─────────────────────────────────────────────────────────

interface CheckItem {
  label: string
  status: 'ok' | 'error' | 'warn'
}

interface CheckGroup {
  title: string
  checks: CheckItem[]
}

function deriveChecks(
  overview: WeeklyComplianceOverview,
  smicOk: boolean
): CheckGroup[] {
  const allAlerts = overview.employees.flatMap((e) => e.alerts)
  const getStatus = (type: ComplianceAlert['type']): CheckItem['status'] => {
    const matching = allAlerts.filter((a) => a.type === type)
    if (matching.some((a) => a.severity === 'critical')) return 'error'
    if (matching.some((a) => a.severity === 'warning')) return 'warn'
    return 'ok'
  }

  return [
    {
      title: 'Temps de travail',
      checks: [
        { label: 'Durée maximale journalière (10h) respectée', status: getStatus('daily_hours') },
        { label: 'Pause 20 min pour interventions > 6h', status: 'ok' },
        { label: 'Amplitude maximale hebdomadaire (48h) respectée', status: getStatus('weekly_hours') },
        { label: 'Repos quotidien minimum (11h consécutives)', status: getStatus('daily_rest') },
      ],
    },
    {
      title: 'Paie et rémunération',
      checks: [
        { label: 'Taux horaire au-dessus du SMIC', status: smicOk ? 'ok' : 'error' },
        { label: 'Majorations dimanche et jours fériés appliquées', status: 'ok' },
        { label: 'Heures supplémentaires majorées à 25%', status: 'ok' },
        { label: 'Bulletins de paie envoyés dans les délais', status: 'ok' },
      ],
    },
    {
      title: 'Contrats et congés',
      checks: [
        { label: 'Repos hebdomadaire (35h consécutives)', status: getStatus('weekly_rest') },
        { label: 'Solde de congés payés avant clôture', status: 'ok' },
        { label: 'Déclarations CESU / PAJEMPLOI à jour', status: 'ok' },
      ],
    },
  ]
}

// ── Main component ───────────────────────────────────────────────────────────

export function ComplianceDashboard({ employerId, showHelp: showHelpProp, onShowHelp, onRefreshRef }: ComplianceDashboardProps) {
  const [overview, setOverview] = useState<WeeklyComplianceOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showHelpInternal, setShowHelpInternal] = useState(false)
  const showHelp = showHelpProp ?? showHelpInternal
  const setShowHelp = onShowHelp ?? setShowHelpInternal
  const [smicCompliant, setSmicCompliant] = useState(true)

  // Alert filters
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [ignoredAlerts, setIgnoredAlerts] = useState<Set<number>>(new Set())

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [overviewData, smicOk] = await Promise.all([
        getWeeklyComplianceOverview(employerId),
        checkSmicCompliance(employerId),
      ])
      setOverview(overviewData)
      setSmicCompliant(smicOk)
    } finally {
      setIsLoading(false)
    }
  }, [employerId])

  useEffect(() => {
    if (employerId) loadData()
  }, [employerId, loadData])

  // Expose loadData to parent for topbar refresh button
  useEffect(() => {
    if (onRefreshRef) onRefreshRef.current = loadData
    return () => { if (onRefreshRef) onRefreshRef.current = null }
  }, [onRefreshRef, loadData])

  // Derived data
  const alerts = useMemo(() => (overview ? enrichAlerts(overview) : []), [overview])
  const checks = useMemo(
    () => (overview ? deriveChecks(overview, smicCompliant) : []),
    [overview, smicCompliant]
  )
  const totalChecks = checks.reduce((sum, g) => sum + g.checks.length, 0)
  const okChecks = checks.reduce(
    (sum, g) => sum + g.checks.filter((c) => c.status === 'ok').length,
    0
  )
  const score = totalChecks > 0 ? Math.round((okChecks / totalChecks) * 100) : 100

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert, i) => {
      if (ignoredAlerts.has(i)) return false
      if (severityFilter === 'danger' && alert.severity !== 'critical') return false
      if (severityFilter === 'warning' && alert.severity !== 'warning') return false
      if (employeeFilter && alert.employeeName.toLowerCase() !== employeeFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const text = `${alert.title} ${alert.description} ${alert.employeeName}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [alerts, ignoredAlerts, severityFilter, employeeFilter, searchQuery])

  const uniqueEmployees = useMemo(() => {
    return [...new Set(alerts.map((a) => a.employeeName))]
  }, [alerts])

  if (isLoading) {
    return (
      <Center py={12}>
        <Stack align="center" gap={4}>
          <Spinner size="xl" color="brand.500" />
          <Text color="text.muted">Chargement des données de conformité...</Text>
        </Stack>
      </Center>
    )
  }

  if (showHelp) {
    return (
      <Box>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">Aide - Règles de conformité</Heading>
          <Flex
            as="button"
            align="center"
            justify="center"
            px={4} py="6px"
            borderRadius="6px"
            borderWidth="1.5px"
            borderColor="#D8E3ED"
            bg="transparent"
            color="#3D5166"
            fontSize="13px"
            fontWeight="600"
            cursor="pointer"
            whiteSpace="nowrap"
            _hover={{ borderColor: '#3D5166', bg: '#EDF1F5' }}
            onClick={() => setShowHelp(false)}
            role="button"
            aria-label="Retour au tableau de bord"
          >
            Retour au tableau de bord
          </Flex>
        </Flex>
        <ComplianceHelp />
      </Box>
    )
  }

  return (
    <Stack gap={6}>
      {/* Sous-titre */}
      <Text fontSize="sm" color="text.muted">Convention Collective IDCC 3239</Text>

      {/* Score card */}
      {overview && (
        <Card.Root>
          <Card.Body>
            <Flex
              direction={{ base: 'column', md: 'row' }}
              align="center"
              justify="space-between"
              gap={6}
            >
              <Flex align="center" gap={4}>
                <ScoreRing score={score} />
                <Box>
                  <Text fontWeight="bold" fontSize="lg">
                    Score de conformité
                  </Text>
                  <Text fontSize="sm" color="text.muted">
                    Convention IDCC 3239
                  </Text>
                  <Text fontSize="xs" color="text.muted" mt={1}>
                    {okChecks} points conformes sur {totalChecks} contrôlés
                  </Text>
                </Box>
              </Flex>
              <Flex gap={6} textAlign="center">
                <Box>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">
                    {overview.summary.compliant}
                  </Text>
                  <Text fontSize="xs" color="text.muted">
                    Points conformes
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xl" fontWeight="bold" color="red.600">
                    {overview.summary.critical}
                  </Text>
                  <Text fontSize="xs" color="text.muted">
                    Alertes actives
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xl" fontWeight="bold" color="orange.600">
                    {overview.summary.warnings}
                  </Text>
                  <Text fontSize="xs" color="text.muted">
                    Avertissements
                  </Text>
                </Box>
              </Flex>
            </Flex>
          </Card.Body>
        </Card.Root>
      )}

      {/* Alertes actives */}
      {overview && (
        <section aria-labelledby="alerts-heading">
          <Heading size="md" mb={3} id="alerts-heading">
            Alertes actives
          </Heading>

          <Flex gap={2} mb={4}>
            <Badge colorPalette="red" variant="subtle">Critique</Badge>
            <Badge colorPalette="orange" variant="subtle">À surveiller</Badge>
            <Badge colorPalette="green" variant="subtle">Conforme</Badge>
          </Flex>

          <Flex gap={3} mb={4} flexWrap="wrap" align="center">
            <Input
              placeholder="Rechercher une alerte…"
              size="sm"
              maxW="280px"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              aria-label="Rechercher une alerte"
            />
            <select
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontSize: '14px',
                backgroundColor: 'white',
              }}
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              aria-label="Filtrer par sévérité"
            >
              <option value="">Toutes les sévérités</option>
              <option value="danger">Critique</option>
              <option value="warning">Avertissement</option>
            </select>
            {uniqueEmployees.length > 0 && (
              <select
                style={{
                  height: '32px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '14px',
                  backgroundColor: 'white',
                }}
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                aria-label="Filtrer par employé"
              >
                <option value="">Tous les employés</option>
                {uniqueEmployees.map((name) => (
                  <option key={name} value={name.toLowerCase()}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </Flex>

          {filteredAlerts.length > 0 ? (
            <Stack gap={3}>
              {filteredAlerts.map((alert, i) => (
                <AlertCard
                  key={`${alert.type}-${alert.employeeName}-${i}`}
                  alert={alert}
                  onIgnore={() => {
                    const originalIndex = alerts.indexOf(alert)
                    setIgnoredAlerts((prev) => new Set(prev).add(originalIndex))
                  }}
                />
              ))}
            </Stack>
          ) : (
            <Center py={6} borderWidth="1px" borderRadius="12px" borderStyle="dashed">
              <Stack align="center" gap={2}>
                <svg
                  viewBox="0 0 24 24"
                  width="36"
                  height="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  style={{ color: '#A0AEC0' }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <Text color="text.muted" fontWeight="medium">
                  Aucune alerte active
                </Text>
                <Text fontSize="sm" color="text.muted">
                  Tous vos indicateurs de conformité sont au vert.
                </Text>
              </Stack>
            </Center>
          )}
        </section>
      )}

      {/* Contrôles IDCC 3239 */}
      {checks.length > 0 && (
        <section aria-labelledby="checks-heading">
          <Heading size="md" mb={4} id="checks-heading">
            Contrôles IDCC 3239
          </Heading>
          <Box
            display="grid"
            gridTemplateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }}
            gap={4}
          >
            {checks.map((group) => (
              <CheckGroupCard key={group.title} group={group} />
            ))}
          </Box>
        </section>
      )}

      {overview && overview.employees.length === 0 && (
        <Card.Root>
          <Card.Body>
            <Center py={8}>
              <Stack align="center" gap={3}>
                <Text fontSize="4xl">👥</Text>
                <Text color="text.muted">Aucun auxiliaire actif</Text>
                <Text fontSize="sm" color="text.muted">
                  Ajoutez des auxiliaires pour voir leur conformité
                </Text>
              </Stack>
            </Center>
          </Card.Body>
        </Card.Root>
      )}
    </Stack>
  )
}

// ── Score Ring SVG ────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  const color = score >= 80 ? '#38A169' : score >= 60 ? '#DD6B20' : '#E53E3E'

  return (
    <Box position="relative" w="80px" h="80px" flexShrink={0}>
      <svg
        viewBox="0 0 80 80"
        width="80"
        height="80"
        aria-label={`Score de conformité : ${score}%`}
      >
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
      </svg>
      <Flex position="absolute" inset={0} align="center" justify="center">
        <Text fontSize="lg" fontWeight="bold">
          {score}%
        </Text>
      </Flex>
    </Box>
  )
}

// ── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onIgnore,
}: {
  alert: EnrichedAlert
  onIgnore: () => void
}) {
  const isDanger = alert.severity === 'critical'

  return (
    <Flex
      p={4}
      gap={4}
      borderWidth="1px"
      borderRadius="12px"
      borderColor={isDanger ? 'red.200' : 'orange.200'}
      bg={isDanger ? 'red.50' : 'orange.50'}
      align="flex-start"
    >
      <Flex
        w={8}
        h={8}
        borderRadius="full"
        bg={isDanger ? 'red.500' : 'orange.500'}
        color="white"
        align="center"
        justify="center"
        flexShrink={0}
      >
        {isDanger ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </Flex>

      <Box flex={1} minW={0}>
        <Text fontWeight="bold" mb={1}>
          {alert.title}
        </Text>
        <Text fontSize="sm" color="text.muted" mb={3} lineHeight="tall">
          {alert.description}
        </Text>
        <Flex gap={2} flexWrap="wrap">
          <Badge colorPalette={isDanger ? 'red' : 'orange'} variant="subtle">
            {alert.employeeName}
          </Badge>
          <Badge variant="subtle">{alert.legalRef}</Badge>
        </Flex>
      </Box>

      <Flex direction="column" gap={2} flexShrink={0}>
        <Flex
          as="button"
          align="center"
          justify="center"
          px={4} py="6px"
          borderRadius="6px"
          borderWidth="1.5px"
          borderColor="#D8E3ED"
          bg="transparent"
          color="#3D5166"
          fontSize="13px"
          fontWeight="600"
          cursor="pointer"
          whiteSpace="nowrap"
          _hover={{ borderColor: '#3D5166', bg: '#EDF1F5' }}
          role="button"
          aria-label="Corriger l'alerte"
        >
          Corriger
        </Flex>
        <Flex
          as="button"
          align="center"
          justify="center"
          px={4} py="6px"
          borderRadius="6px"
          borderWidth="1.5px"
          borderColor="#D8E3ED"
          bg="transparent"
          color="#3D5166"
          fontSize="13px"
          fontWeight="600"
          cursor="pointer"
          whiteSpace="nowrap"
          _hover={{ borderColor: '#3D5166', bg: '#EDF1F5' }}
          onClick={onIgnore}
          role="button"
          aria-label="Ignorer l'alerte"
        >
          Ignorer
        </Flex>
      </Flex>
    </Flex>
  )
}

// ── Check Group Card ─────────────────────────────────────────────────────────

function CheckGroupCard({ group }: { group: CheckGroup }) {
  return (
    <Card.Root>
      <Card.Body>
        <Text fontWeight="bold" mb={3}>
          {group.title}
        </Text>
        <Stack gap={0}>
          {group.checks.map((check, i) => (
            <Flex
              key={i}
              align="center"
              gap={3}
              py={2}
              borderBottomWidth={i < group.checks.length - 1 ? '1px' : '0'}
              borderColor="border.default"
            >
              <CheckStatusIcon status={check.status} />
              <Text fontSize="sm" flex={1}>
                {check.label}
              </Text>
            </Flex>
          ))}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

function CheckStatusIcon({ status }: { status: 'ok' | 'error' | 'warn' }) {
  const config = {
    ok: { bg: 'green.100', color: 'green.600' },
    error: { bg: 'red.100', color: 'red.600' },
    warn: { bg: 'orange.100', color: 'orange.600' },
  }
  const { bg, color } = config[status]

  return (
    <Flex
      w={5}
      h={5}
      borderRadius="full"
      bg={bg}
      color={color}
      align="center"
      justify="center"
      flexShrink={0}
    >
      {status === 'ok' && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {status === 'error' && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
      {status === 'warn' && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )}
    </Flex>
  )
}

export default ComplianceDashboard
