import { useState } from 'react'
import {
  HStack,
  VStack,
  Text,
  Card,
  Input,
  Field,
} from '@chakra-ui/react'
import { PanelHeader, ToggleRow } from './SettingsShared'

const PCH_ALERTS_KEY = 'unilien-pch-alerts'
const PCH_ALERTS_DEFAULTS = { alertQuota: true, alertRenewal: true, alertAttestation: true, alertReleve: true }

function loadPchAlerts() {
  try {
    const raw = localStorage.getItem(PCH_ALERTS_KEY)
    return raw ? { ...PCH_ALERTS_DEFAULTS, ...JSON.parse(raw) } : { ...PCH_ALERTS_DEFAULTS }
  } catch { return { ...PCH_ALERTS_DEFAULTS } }
}

export function PchPanel() {
  const [alerts, setAlerts] = useState(loadPchAlerts)

  const toggle = (key: keyof typeof alerts) => {
    setAlerts((prev: typeof alerts) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(PCH_ALERTS_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="PCH — Alertes & paiement"
        subtitle="Configurez vos alertes liées au quota PCH et vos coordonnées bancaires de versement."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Alertes PCH</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow label="Quota atteint à 90 %" description="Alerte quand vous approchez du plafond mensuel PCH (55h36 sur 62h)." checked={alerts.alertQuota} onChange={() => toggle('alertQuota')} />
            <ToggleRow label="Rappel renouvellement PCH" description="Notification 3 mois avant l'expiration de votre accord MDPH." checked={alerts.alertRenewal} onChange={() => toggle('alertRenewal')} />
            <ToggleRow label="Attestation annuelle à signer" description="Rappel 30 jours avant la date limite de renouvellement de l'attestation." checked={alerts.alertAttestation} onChange={() => toggle('alertAttestation')} />
            <ToggleRow label="Relevé mensuel disponible" description="Notification quand le relevé d'heures du mois précédent est généré." checked={alerts.alertReleve} onChange={() => toggle('alertReleve')} />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">IBAN de versement</Card.Title>
          <Text fontSize="sm" color="text.muted">Coordonnées bancaires pour le versement de la PCH par le CDAPH.</Text>
        </Card.Header>
        <Card.Body p={4}>
          <Field.Root>
            <Field.Label>IBAN</Field.Label>
            <Input
              value="FR76 1234 5678 9012 3456 7890 123"
              readOnly
              fontFamily="mono"
              bg="bg.page"
            />
            <Field.HelperText>
              Pour modifier votre IBAN, rendez-vous dans votre profil aidant.
            </Field.HelperText>
          </Field.Root>
        </Card.Body>
      </Card.Root>

      <HStack gap={2} align="center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14} aria-hidden="true" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
        <Text fontSize="sm" color="text.muted">Les alertes sont enregistrées automatiquement sur votre appareil.</Text>
      </HStack>
    </VStack>
  )
}
