/**
 * Page Paramètres — navigation latérale + 9 panneaux
 *
 * Panneaux :
 *  Compte  : Profil, Sécurité, Abonnement (employer)
 *  Application : Notifications, Convention (employer), PCH (caregiver), Apparence, Accessibilité
 *  Avancé : Données
 */

import { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Switch,
  Input,
  Badge,
  Separator,
  Grid,
  NativeSelect,
  Field,
  Table,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { DashboardLayout } from '@/components/dashboard'
import { AccessibilitySection } from '@/components/profile/sections'
import { useAuth } from '@/hooks/useAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

type PanelId =
  | 'profil'
  | 'securite'
  | 'abonnement'
  | 'notifications'
  | 'convention'
  | 'pch'
  | 'apparence'
  | 'accessibilite'
  | 'donnees'

interface NavItem {
  id: PanelId
  label: string
  roles?: string[]
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Compte',
    items: [
      { id: 'profil', label: 'Informations' },
      { id: 'securite', label: 'Sécurité' },
      { id: 'abonnement', label: 'Abonnement', roles: ['employer'] },
    ],
  },
  {
    label: 'Application',
    items: [
      { id: 'notifications', label: 'Notifications' },
      { id: 'convention', label: 'Convention', roles: ['employer'] },
      { id: 'pch', label: 'PCH', roles: ['caregiver'] },
      { id: 'apparence', label: 'Apparence' },
      { id: 'accessibilite', label: 'Accessibilité' },
    ],
  },
  {
    label: 'Avancé',
    items: [{ id: 'donnees', label: 'Données' }],
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { profile, userRole } = useAuth()
  const [activePanel, setActivePanel] = useState<PanelId>('profil')

  if (!profile) {
    return (
      <DashboardLayout title="Paramètres">
        <Center py={12}><Spinner size="lg" color="brand.500" /></Center>
      </DashboardLayout>
    )
  }

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || item.roles.includes(userRole ?? '')
    ),
  })).filter((section) => section.items.length > 0)

  return (
    <DashboardLayout title="Paramètres">
      <HStack align="start" gap={6} flexDirection={{ base: 'column', md: 'row' }}>
        {/* Navigation latérale */}
        <Box
          minW={{ md: '200px' }}
          w={{ base: '100%', md: '200px' }}
          flexShrink={0}
        >
          <Box
            overflowX={{ base: 'auto', md: 'visible' }}
            display={{ base: 'flex', md: 'block' }}
            gap={1}
            pb={{ base: 2, md: 0 }}
          >
            {visibleSections.map((section) => (
              <Box key={section.label} mb={{ md: 4 }}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  color="gray.500"
                  mb={1}
                  display={{ base: 'none', md: 'block' }}
                >
                  {section.label}
                </Text>
                <VStack gap={0.5} align="stretch" display={{ base: 'flex', md: 'flex' }} flexDirection={{ base: 'row', md: 'column' }}>
                  {section.items.map((item) => (
                    <Button
                      key={item.id}
                      variant={activePanel === item.id ? 'subtle' : 'ghost'}
                      colorPalette={activePanel === item.id ? 'brand' : undefined}
                      size="sm"
                      justifyContent="flex-start"
                      fontWeight={activePanel === item.id ? 'semibold' : 'normal'}
                      onClick={() => setActivePanel(item.id)}
                      whiteSpace="nowrap"
                    >
                      {item.label}
                    </Button>
                  ))}
                </VStack>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Contenu */}
        <Box flex={1} minW={0} maxW="800px">
          {activePanel === 'profil' && <ProfilPanel profile={profile} />}
          {activePanel === 'securite' && <SecuritePanel />}
          {activePanel === 'abonnement' && <AbonnementPanel />}
          {activePanel === 'notifications' && <NotificationsPanel />}
          {activePanel === 'convention' && <ConventionPanel />}
          {activePanel === 'pch' && <PchPanel />}
          {activePanel === 'apparence' && <ApparencePanel />}
          {activePanel === 'accessibilite' && <AccessibilitePanel />}
          {activePanel === 'donnees' && <DonneesPanel />}
        </Box>
      </HStack>
    </DashboardLayout>
  )
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box mb={6}>
      <Text fontSize="2xl" fontWeight="bold" mb={1}>{title}</Text>
      <Text color="gray.600" fontSize="sm">{subtitle}</Text>
    </Box>
  )
}

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  badge,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  badge?: string
}) {
  return (
    <HStack justify="space-between" align="start" py={3} borderBottomWidth="1px" borderColor="gray.100">
      <Box flex={1} pr={4}>
        <HStack gap={2} mb={0.5}>
          <Text fontWeight="medium" fontSize="sm">{label}</Text>
          {badge && <Badge variant="subtle" size="sm">{badge}</Badge>}
        </HStack>
        <Text fontSize="xs" color="gray.500">{description}</Text>
      </Box>
      <Switch.Root
        checked={checked}
        onCheckedChange={(e) => onChange(e.checked)}
        disabled={disabled}
      >
        <Switch.HiddenInput aria-label={label} />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Root>
    </HStack>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PANNEAUX
// ══════════════════════════════════════════════════════════════════════════════

// ── Profil ────────────────────────────────────────────────────────────────────

function ProfilPanel({ profile }: { profile: { firstName: string; lastName: string; email: string; phone?: string | null } }) {
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [email] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [address, setAddress] = useState('')
  const [lang, setLang] = useState('fr')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Informations"
        subtitle="Gérez vos informations personnelles et les détails de votre compte."
      />

      <Card.Root>
        <Card.Header>
          <Card.Title>Informations personnelles</Card.Title>
          <Text fontSize="sm" color="gray.500">Ces informations apparaissent sur vos documents exportés.</Text>
        </Card.Header>
        <Card.Body>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Field.Root>
              <Field.Label>Prénom</Field.Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Nom</Field.Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Adresse e-mail</Field.Label>
              <Input value={email} readOnly />
            </Field.Root>
            <Field.Root>
              <Field.Label>Téléphone</Field.Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field.Root>
            <Field.Root gridColumn={{ md: '1 / -1' }}>
              <Field.Label>Adresse</Field.Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              <Field.HelperText>Utilisée pour les bulletins de paie.</Field.HelperText>
            </Field.Root>
          </Grid>
          <HStack mt={4} gap={3} justify="flex-end">
            <Button variant="ghost" size="sm">Annuler</Button>
            <Button colorPalette="brand" size="sm">Enregistrer</Button>
          </HStack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Langue et format</Card.Title>
        </Card.Header>
        <Card.Body>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Field.Root>
              <Field.Label>Langue de l'interface</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Format de date</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                  <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
                  <option value="MM/DD/YYYY">MM/JJ/AAAA</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          </Grid>
          <HStack mt={4} justify="flex-end">
            <Button colorPalette="brand" size="sm">Enregistrer</Button>
          </HStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── Sécurité ──────────────────────────────────────────────────────────────────

function SecuritePanel() {
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Sécurité"
        subtitle="Gérez votre mot de passe et la sécurité de votre compte."
      />

      {/* Mot de passe */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Changer le mot de passe</Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap={4} align="stretch">
            <Field.Root>
              <Field.Label>Mot de passe actuel</Field.Label>
              <Input type="password" placeholder="••••••••••••" autoComplete="current-password" />
            </Field.Root>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <Field.Root>
                <Field.Label>Nouveau mot de passe</Field.Label>
                <Input type="password" placeholder="••••••••••••" autoComplete="new-password" />
                <Field.HelperText>Minimum 12 caractères, dont 1 majuscule et 1 chiffre.</Field.HelperText>
              </Field.Root>
              <Field.Root>
                <Field.Label>Confirmer le mot de passe</Field.Label>
                <Input type="password" placeholder="••••••••••••" autoComplete="new-password" />
              </Field.Root>
            </Grid>
            <HStack justify="flex-end">
              <Button colorPalette="brand" size="sm">Mettre à jour</Button>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* 2FA */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Double authentification (2FA)</Card.Title>
        </Card.Header>
        <Card.Body>
          <ToggleRow
            label="Activer la 2FA"
            description="Protégez votre compte avec Google Authenticator, Authy ou tout autre app d'authentification."
            checked={twoFaEnabled}
            onChange={setTwoFaEnabled}
          />
        </Card.Body>
      </Card.Root>

      {/* Zone de danger */}
      <Card.Root borderColor="red.200">
        <Card.Header bg="red.50" borderBottomWidth="1px" borderColor="red.200">
          <Card.Title color="red.600">Zone de danger</Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap={4} align="stretch">
            <HStack justify="space-between" align="start">
              <Box>
                <Text fontWeight="medium" fontSize="sm">Supprimer toutes les données</Text>
                <Text fontSize="xs" color="gray.500">Efface définitivement les interventions et données employés.</Text>
              </Box>
              <Button
                colorPalette="red"
                size="xs"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Supprimer
              </Button>
            </HStack>
            {showDeleteConfirm && (
              <Box p={4} bg="red.50" borderRadius="md">
                <Text fontSize="sm" mb={2}>
                  Tapez <strong>SUPPRIMER</strong> pour confirmer
                </Text>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  size="sm"
                  mb={2}
                />
                <HStack gap={2}>
                  <Button
                    colorPalette="red"
                    size="xs"
                    disabled={deleteConfirmText !== 'SUPPRIMER'}
                  >
                    Supprimer définitivement
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                  >
                    Annuler
                  </Button>
                </HStack>
              </Box>
            )}
            <Separator />
            <HStack justify="space-between" align="start">
              <Box>
                <Text fontWeight="medium" fontSize="sm">Désactiver le compte</Text>
                <Text fontSize="xs" color="gray.500">Votre compte sera suspendu. Les données restent 30 jours.</Text>
              </Box>
              <Button colorPalette="red" size="xs" variant="outline">
                Désactiver
              </Button>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── Abonnement ────────────────────────────────────────────────────────────────

function AbonnementPanel() {
  const currentPlan = 'Essentiel'

  const plans = [
    {
      name: 'Gratuit',
      price: '0 €',
      desc: 'Pour découvrir Unilien.',
      features: ['1 employé', 'Planning basique', 'Pointage horaire'],
      disabled: ['Bulletins de paie', 'Conformité IDCC'],
      isCurrent: false,
      cta: 'Rétrograder',
    },
    {
      name: 'Essentiel',
      price: '9,90 €',
      desc: 'Pour les familles employeurs.',
      features: ['3 employés', 'Bulletins de paie', 'Conformité IDCC 3239', 'Export planning', 'Cahier de liaison'],
      disabled: [],
      isCurrent: true,
      cta: 'Plan actuel',
    },
    {
      name: 'Pro',
      price: '24,90 €',
      desc: 'Pour les aidants professionnels.',
      features: ['Employés illimités', "Tout l'Essentiel", 'Exports avancés', 'Multi-comptes', 'Support prioritaire'],
      disabled: [],
      isCurrent: false,
      cta: 'Passer au Pro',
      recommended: true,
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

      {/* Plan actuel */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Plan actuel</Card.Title>
        </Card.Header>
        <Card.Body>
          <HStack justify="space-between" mb={4} flexWrap="wrap" gap={3}>
            <Box>
              <HStack gap={2} mb={1}>
                <Text fontWeight="bold" fontSize="lg">{currentPlan}</Text>
                <Badge colorPalette="green" size="sm">Actif</Badge>
              </HStack>
              <Text fontWeight="bold" fontSize="2xl">9,90 €<Text as="span" fontSize="sm" fontWeight="normal" color="gray.500"> / mois</Text></Text>
              <Text fontSize="sm" color="gray.500" mt={1}>
                Prochain renouvellement le <strong>1 avril 2026</strong> — Visa ····&nbsp;4242
              </Text>
            </Box>
            <Button variant="ghost" size="sm">Résilier</Button>
          </HStack>

          <VStack gap={3} align="stretch">
            <UsageBar label="Employés" value="3 / 3" percent={100} />
            <UsageBar label="Bulletins de paie ce mois" value="2 / ∞" percent={20} />
            <UsageBar label="Espace documents" value="1,2 Go / 5 Go" percent={24} />
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Plans disponibles */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Plans disponibles</Card.Title>
          <Text fontSize="sm" color="gray.500">Changez de plan à tout moment, sans engagement.</Text>
        </Card.Header>
        <Card.Body>
          <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={4}>
            {plans.map((plan) => (
              <Box
                key={plan.name}
                borderWidth="2px"
                borderColor={plan.isCurrent ? 'brand.500' : 'gray.200'}
                borderRadius="lg"
                p={5}
                position="relative"
              >
                <HStack justify="space-between" mb={2}>
                  <Text fontWeight="bold">{plan.name}</Text>
                  {plan.isCurrent && <Badge colorPalette="green" size="sm">Plan actuel</Badge>}
                  {plan.recommended && <Badge colorPalette="blue" size="sm">Recommandé</Badge>}
                </HStack>
                <Text fontWeight="bold" fontSize="xl" mb={1}>
                  {plan.price}<Text as="span" fontSize="sm" fontWeight="normal" color="gray.500"> / mois</Text>
                </Text>
                <Text fontSize="sm" color="gray.500" mb={3}>{plan.desc}</Text>
                <VStack align="start" gap={1.5} mb={4}>
                  {plan.features.map((f) => (
                    <Text key={f} fontSize="sm">✓ {f}</Text>
                  ))}
                  {plan.disabled.map((f) => (
                    <Text key={f} fontSize="sm" color="gray.400" textDecoration="line-through">✗ {f}</Text>
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

      {/* Moyen de paiement */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Moyen de paiement</Card.Title>
        </Card.Header>
        <Card.Body>
          <HStack justify="space-between">
            <Box>
              <Text fontWeight="medium" fontSize="sm">Visa ····&nbsp;4242</Text>
              <Text fontSize="xs" color="gray.500">Expire le 03/2028</Text>
            </Box>
            <Button variant="ghost" size="sm">Modifier</Button>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Historique de facturation */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Historique de facturation</Card.Title>
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
        <Text fontSize="sm" color="gray.600">{label}</Text>
        <Text fontSize="sm" fontWeight="medium">{value}</Text>
      </HStack>
      <Box bg="gray.100" borderRadius="full" h="6px">
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

// ── Notifications ─────────────────────────────────────────────────────────────

function NotificationsPanel() {
  const [pushReminders, setPushReminders] = useState(true)
  const [pushCompliance, setPushCompliance] = useState(true)
  const [pushLeave, setPushLeave] = useState(true)
  const [pushWeekly, setPushWeekly] = useState(false)
  const [emailPayslips, setEmailPayslips] = useState(true)
  const [emailSecurity, setEmailSecurity] = useState(true)
  const [emailMessages, setEmailMessages] = useState(false)

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Notifications"
        subtitle="Choisissez comment et quand vous souhaitez être notifié."
      />

      <Card.Root>
        <Card.Header>
          <Card.Title>Notifications push</Card.Title>
          <Text fontSize="sm" color="gray.500">Reçues directement sur votre appareil.</Text>
        </Card.Header>
        <Card.Body>
          <VStack gap={0} align="stretch">
            <ToggleRow label="Rappels d'intervention" description="30 minutes avant le début d'une intervention." checked={pushReminders} onChange={setPushReminders} />
            <ToggleRow label="Alertes de conformité" description="Notifications immédiates en cas de non-conformité détectée." checked={pushCompliance} onChange={setPushCompliance} />
            <ToggleRow label="Congés à solder" description="Rappel 30 jours avant expiration des congés payés." checked={pushLeave} onChange={setPushLeave} />
            <ToggleRow label="Résumé hebdomadaire" description="Récapitulatif des heures et de la conformité chaque lundi." checked={pushWeekly} onChange={setPushWeekly} />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Notifications e-mail</Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap={0} align="stretch">
            <ToggleRow label="Bulletins de paie générés" description="Envoi automatique par e-mail après génération." checked={emailPayslips} onChange={setEmailPayslips} />
            <ToggleRow label="Alertes de sécurité" description="Connexion depuis un nouvel appareil ou une nouvelle localisation." checked={emailSecurity} onChange={setEmailSecurity} />
            <ToggleRow label="Nouveaux messages" description="Notification par e-mail quand vous recevez un nouveau message." checked={emailMessages} onChange={setEmailMessages} />
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── Convention ─────────────────────────────────────────────────────────────────

function ConventionPanel() {
  const [ruleBreak, setRuleBreak] = useState(true)
  const [ruleDailyMax, setRuleDailyMax] = useState(true)
  const [ruleOvertime, setRuleOvertime] = useState(true)
  const [ruleNight, setRuleNight] = useState(true)

  const [majDimanche, setMajDimanche] = useState('30')
  const [majFerie, setMajFerie] = useState('60')
  const [majNuit, setMajNuit] = useState('25')
  const [majSupp, setMajSupp] = useState('25')

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Convention collective"
        subtitle="Paramètres de conformité liés à l'IDCC 3239 — Particuliers employeurs et emploi à domicile."
      />

      <Card.Root>
        <Card.Header>
          <Card.Title>Règles de validation</Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap={0} align="stretch">
            <ToggleRow label="Pause obligatoire (Art. L3121-16)" description="Alerte si aucune pause de 20 min pour une intervention supérieure à 6h." checked={ruleBreak} onChange={setRuleBreak} />
            <ToggleRow label="Durée maximale journalière" description="Avertissement si le total dépasse 10h par jour." checked={ruleDailyMax} onChange={setRuleDailyMax} />
            <ToggleRow label="Heures supplémentaires" description="Calcul automatique des majorations au-delà de 40h/semaine." checked={ruleOvertime} onChange={setRuleOvertime} />
            <ToggleRow label="Présence nuit / Garde 24h" description="Alerte si la présence de nuit dépasse 12h consécutives." checked={ruleNight} onChange={setRuleNight} />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Majorations par défaut</Card.Title>
          <Text fontSize="sm" color="gray.500">Modifiables par employé dans la fiche contrat.</Text>
        </Card.Header>
        <Card.Body>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Field.Root>
              <Field.Label>Majoration dimanche (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majDimanche} onChange={(e) => setMajDimanche(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration jour férié (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majFerie} onChange={(e) => setMajFerie(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration nuit (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majNuit} onChange={(e) => setMajNuit(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration heures sup (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majSupp} onChange={(e) => setMajSupp(e.target.value)} />
            </Field.Root>
          </Grid>
          <HStack mt={4} gap={3} justify="flex-end">
            <Button variant="ghost" size="sm">Réinitialiser</Button>
            <Button colorPalette="brand" size="sm">Enregistrer</Button>
          </HStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── PCH ───────────────────────────────────────────────────────────────────────

function PchPanel() {
  const [alertQuota, setAlertQuota] = useState(true)
  const [alertRenewal, setAlertRenewal] = useState(true)
  const [alertAttestation, setAlertAttestation] = useState(true)
  const [alertReleve, setAlertReleve] = useState(true)

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="PCH — Alertes & paiement"
        subtitle="Configurez vos alertes liées au quota PCH et vos coordonnées bancaires de versement."
      />

      <Card.Root>
        <Card.Header>
          <Card.Title>Alertes PCH</Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap={0} align="stretch">
            <ToggleRow label="Quota atteint à 90 %" description="Alerte quand vous approchez du plafond mensuel PCH (55h36 sur 62h)." checked={alertQuota} onChange={setAlertQuota} />
            <ToggleRow label="Rappel renouvellement PCH" description="Notification 3 mois avant l'expiration de votre accord MDPH." checked={alertRenewal} onChange={setAlertRenewal} />
            <ToggleRow label="Attestation annuelle à signer" description="Rappel 30 jours avant la date limite de renouvellement de l'attestation." checked={alertAttestation} onChange={setAlertAttestation} />
            <ToggleRow label="Relevé mensuel disponible" description="Notification quand le relevé d'heures du mois précédent est généré." checked={alertReleve} onChange={setAlertReleve} />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>IBAN de versement</Card.Title>
          <Text fontSize="sm" color="gray.500">Coordonnées bancaires pour le versement de la PCH par le CDAPH.</Text>
        </Card.Header>
        <Card.Body>
          <Field.Root>
            <Field.Label>IBAN</Field.Label>
            <Input
              value="FR76 1234 5678 9012 3456 7890 123"
              readOnly
              fontFamily="mono"
              bg="gray.50"
            />
            <Field.HelperText>
              Pour modifier votre IBAN, rendez-vous dans votre profil aidant.
            </Field.HelperText>
          </Field.Root>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── Apparence ─────────────────────────────────────────────────────────────────

function ApparencePanel() {
  const [darkMode, setDarkMode] = useState(false)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Apparence"
        subtitle="Personnalisez l'interface selon vos préférences visuelles."
      />

      <Card.Root>
        <Card.Header>
          <Card.Title>Thème</Card.Title>
        </Card.Header>
        <Card.Body>
          <ToggleRow
            label="Mode sombre"
            description="Réduit la fatigue visuelle en environnement peu éclairé."
            checked={darkMode}
            onChange={setDarkMode}
          />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Densité de l'interface</Card.Title>
        </Card.Header>
        <Card.Body>
          <HStack gap={4}>
            {(['comfortable', 'compact'] as const).map((d) => (
              <Box
                key={d}
                flex={1}
                borderWidth="2px"
                borderColor={density === d ? 'brand.500' : 'gray.200'}
                borderRadius="md"
                p={4}
                cursor="pointer"
                onClick={() => setDensity(d)}
                role="radio"
                aria-checked={density === d}
              >
                <Text fontWeight="medium" fontSize="sm" mb={1}>
                  {d === 'comfortable' ? 'Confortable' : 'Compact'}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {d === 'comfortable'
                    ? "Plus d'espace entre les éléments"
                    : "Interface plus dense, plus d'informations visibles"}
                </Text>
              </Box>
            ))}
          </HStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── Accessibilité ─────────────────────────────────────────────────────────────

function AccessibilitePanel() {
  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Accessibilité"
        subtitle="Adaptez l'interface à vos besoins pour une meilleure expérience d'utilisation."
      />
      <AccessibilitySection />
    </VStack>
  )
}

// ── Données ───────────────────────────────────────────────────────────────────

function DonneesPanel() {
  const [analytics, setAnalytics] = useState(true)
  const [cookies, setCookies] = useState(true)

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Données"
        subtitle="Export, import et gestion de vos données personnelles."
      />

      <Card.Root>
        <Card.Header>
          <Card.Title>Export des données</Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap={3} align="start">
            <Button variant="ghost" size="sm">
              Exporter toutes les données (JSON)
            </Button>
            <Button variant="ghost" size="sm">
              Exporter le planning (CSV)
            </Button>
            <Button variant="ghost" size="sm">
              Exporter les bulletins de paie (ZIP)
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Confidentialité</Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap={0} align="stretch">
            <ToggleRow
              label="Analyses anonymisées"
              description="Contribuez à améliorer Unilien en partageant des données d'usage anonymisées."
              checked={analytics}
              onChange={setAnalytics}
            />
            <ToggleRow
              label="Cookies de performance"
              description="Cookies pour optimiser les temps de chargement."
              checked={cookies}
              onChange={setCookies}
            />
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

export default SettingsPage
