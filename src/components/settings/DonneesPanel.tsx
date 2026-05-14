import { useState } from 'react'
import {
  Box,
  HStack,
  VStack,
  Text,
  Button,
  Card,
  Link as ChakraLink,
} from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { exportUserDataJSON, exportUserShiftsCSV } from '@/services/dataExportService'
import { logger } from '@/lib/logger'
import { useHealthConsent } from '@/hooks/useHealthConsent'
import { usePrivacySettings } from '@/hooks/usePrivacySettings'
import { GhostButton } from '@/components/ui'
import { PanelHeader, ToggleRow } from './SettingsShared'

export function DonneesPanel({ userId }: { userId: string }) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const handleExportJSON = async () => {
    setExporting('json')
    setFeedback(null)
    try {
      const data = await exportUserDataJSON(userId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `unilien-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setFeedback({ type: 'success', msg: 'Export JSON téléchargé.' })
    } catch (err) {
      logger.error('Erreur export JSON:', err)
      setFeedback({ type: 'error', msg: 'Erreur lors de l\'export.' })
    } finally {
      setExporting(null)
    }
  }

  const handleExportCSV = async () => {
    setExporting('csv')
    setFeedback(null)
    try {
      const csv = await exportUserShiftsCSV(userId)
      if (!csv) {
        setFeedback({ type: 'error', msg: 'Aucune intervention à exporter.' })
        setExporting(null)
        return
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `unilien-planning-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setFeedback({ type: 'success', msg: 'Export CSV téléchargé.' })
    } catch (err) {
      logger.error('Erreur export CSV:', err)
      setFeedback({ type: 'error', msg: 'Erreur lors de l\'export.' })
    } finally {
      setExporting(null)
    }
  }

  const downloadIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Données"
        subtitle="Export, import et gestion de vos données personnelles."
      />

      {feedback && (
        <Box px={4} py={3} borderRadius="md" bg={feedback.type === 'success' ? 'accent.subtle' : 'red.50'} borderWidth="1px" borderColor={feedback.type === 'success' ? 'green.200' : 'red.200'}>
          <Text fontSize="sm" color={feedback.type === 'success' ? 'green.700' : 'red.700'}>{feedback.msg}</Text>
        </Box>
      )}

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Export des données</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={3} align="start">
            <GhostButton size="sm" w="fit-content" gap={2} onClick={handleExportJSON} disabled={exporting !== null}>
              {downloadIcon}
              {exporting === 'json' ? 'Export en cours…' : 'Exporter toutes les données (JSON)'}
            </GhostButton>
            <GhostButton size="sm" w="fit-content" gap={2} onClick={handleExportCSV} disabled={exporting !== null}>
              {downloadIcon}
              {exporting === 'csv' ? 'Export en cours…' : 'Exporter le planning (CSV)'}
            </GhostButton>
          </VStack>
        </Card.Body>
      </Card.Root>

      <HealthConsentCard />

      <PrivacySettingsCard />
    </VStack>
  )
}

function HealthConsentCard() {
  const { hasConsent, loading, grantedAt, revokeConsent, grantConsent } = useHealthConsent()
  const [revoking, setRevoking] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  const handleRevoke = async () => {
    setRevoking(true)
    await revokeConsent()
    setRevoking(false)
    setConfirmRevoke(false)
  }

  const handleGrant = async () => {
    await grantConsent()
  }

  if (loading) return null

  return (
    <Card.Root borderRadius="md" borderWidth="1px" borderColor={hasConsent ? 'green.200' : 'orange.200'} boxShadow="sm">
      <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor={hasConsent ? 'green.200' : 'orange.200'} bg={hasConsent ? 'green.50' : 'orange.50'}>
        <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700" color={hasConsent ? 'green.700' : 'orange.700'}>
          Consentement données de santé (RGPD)
        </Card.Title>
      </Card.Header>
      <Card.Body p={4}>
        {hasConsent ? (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="text.secondary">
              Vous avez consenti au traitement de vos données de santé le{' '}
              <Text as="span" fontWeight="600">
                {grantedAt ? new Date(grantedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </Text>.
            </Text>
            <Text fontSize="xs" color="text.muted">
              Conformément à l&apos;article 9 du RGPD, vous pouvez retirer ce consentement à tout moment.
              Vos données de santé (type de handicap, besoins, PCH) ne seront plus accessibles.
            </Text>
            {!confirmRevoke ? (
              <Button
                colorPalette="red"
                variant="outline"
                size="xs"
                w="fit-content"
                onClick={() => setConfirmRevoke(true)}
              >
                Retirer mon consentement
              </Button>
            ) : (
              <Box p={3} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
                <Text fontSize="sm" color="red.700" mb={2} fontWeight="500">
                  Vos données de santé ne seront plus accessibles. Elles resteront en base mais ne seront plus affichées.
                </Text>
                <HStack gap={2}>
                  <Button
                    colorPalette="red"
                    size="xs"
                    onClick={handleRevoke}
                    loading={revoking}
                    loadingText="Révocation..."
                  >
                    Confirmer la révocation
                  </Button>
                  <GhostButton size="xs" onClick={() => setConfirmRevoke(false)}>
                    Annuler
                  </GhostButton>
                </HStack>
              </Box>
            )}
          </VStack>
        ) : (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="text.secondary">
              Vous n&apos;avez pas consenti au traitement de vos données de santé.
              Sans consentement, vous ne pouvez pas renseigner vos informations de handicap et PCH.
            </Text>
            <Button
              colorPalette="brand"
              variant="outline"
              size="xs"
              w="fit-content"
              onClick={handleGrant}
            >
              Donner mon consentement
            </Button>
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}

function PrivacySettingsCard() {
  const { analyticsEnabled, updateSettings } = usePrivacySettings()

  return (
    <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
      <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">
          Confidentialité
        </Card.Title>
      </Card.Header>
      <Card.Body p={4}>
        <VStack gap={3} align="stretch">
          <ToggleRow
            label="Mesure d'audience"
            description="Pages visitées, source de visite, pays — sans cookie ni identifiant personnel. Données auto-hébergées (UE), traitées par Plausible Analytics."
            checked={analyticsEnabled}
            onChange={(checked) => updateSettings({ analyticsEnabled: checked })}
          />
          <Text fontSize="xs" color="text.muted">
            En savoir plus dans la{' '}
            <ChakraLink as={RouterLink} to="/politique-confidentialite#10" color="brand.solid" textDecoration="underline">
              politique de confidentialité
            </ChakraLink>
            .
          </Text>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
