import { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  Input,
  Grid,
  Field,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { GhostButton } from '@/components/ui'
import { useConventionSettings } from '@/hooks/useConventionSettings'
import { PanelHeader, ToggleRow } from './SettingsShared'

export function ConventionPanel() {
  const {
    ruleBreak, ruleDailyMax, ruleOvertime, ruleNight,
    majDimanche, majFerie, majNuit, majSupp,
    isLoading, updateSettings, resetToDefaults,
  } = useConventionSettings()

  const [feedback, setFeedback] = useState<string | null>(null)

  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleReset = () => {
    resetToDefaults()
    showFeedback('Valeurs réinitialisées.')
  }

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" />
      </Center>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Convention collective"
        subtitle="Paramètres de conformité liés à l'IDCC 3239 — Particuliers employeurs et emploi à domicile."
      />

      {feedback && (
        <Box px={4} py={3} borderRadius="md" bg="accent.subtle" borderWidth="1px" borderColor="accent.muted">
          <Text fontSize="sm" color="accent.fg">{feedback}</Text>
        </Box>
      )}

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Règles de validation</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow label="Pause obligatoire (Art. L3121-16)" description="Alerte si aucune pause de 20 min pour une intervention supérieure à 6h." checked={ruleBreak} onChange={() => updateSettings({ ruleBreak: !ruleBreak })} />
            <ToggleRow label="Durée maximale journalière" description="Avertissement si le total dépasse 10h par jour." checked={ruleDailyMax} onChange={() => updateSettings({ ruleDailyMax: !ruleDailyMax })} />
            <ToggleRow label="Heures supplémentaires" description="Calcul automatique des majorations au-delà de 40h/semaine." checked={ruleOvertime} onChange={() => updateSettings({ ruleOvertime: !ruleOvertime })} />
            <ToggleRow label="Présence nuit / Garde 24h" description="Alerte si la présence de nuit dépasse 12h consécutives." checked={ruleNight} onChange={() => updateSettings({ ruleNight: !ruleNight })} />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Majorations par défaut</Card.Title>
          <Text fontSize="sm" color="text.muted">Modifiables par employé dans la fiche contrat.</Text>
        </Card.Header>
        <Card.Body p={4}>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Field.Root>
              <Field.Label>Majoration dimanche (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majDimanche} onChange={(e) => updateSettings({ majDimanche: Number(e.target.value) })} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration jour férié (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majFerie} onChange={(e) => updateSettings({ majFerie: Number(e.target.value) })} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration nuit (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majNuit} onChange={(e) => updateSettings({ majNuit: Number(e.target.value) })} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration heures sup (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majSupp} onChange={(e) => updateSettings({ majSupp: Number(e.target.value) })} />
            </Field.Root>
          </Grid>
          <HStack mt={5} gap={3} justify="flex-end">
            <GhostButton size="sm" onClick={handleReset}>Réinitialiser</GhostButton>
          </HStack>
        </Card.Body>
      </Card.Root>

      <HStack gap={2} align="center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14} aria-hidden="true" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
        <Text fontSize="sm" color="text.muted">Tous les paramètres sont sauvegardés automatiquement et synchronisés avec votre compte.</Text>
      </HStack>
    </VStack>
  )
}
