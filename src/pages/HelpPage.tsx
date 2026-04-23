import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Container, Flex, Stack, Text, Link, Collapsible } from '@chakra-ui/react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

// ── Types ────────────────────────────────────────────────────────────────────

interface GuideSection {
  id: string
  title: string
  icon: string
  items: { question: string; answer: React.ReactNode }[]
}

// ── Données ──────────────────────────────────────────────────────────────────

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Premiers pas',
    icon: '🚀',
    items: [
      {
        question: 'Comment créer mon compte ?',
        answer: (
          <Stack gap={2}>
            <Text>Rendez-vous sur la page d'inscription et choisissez votre rôle :</Text>
            <Text><strong>Employeur particulier</strong> — vous employez un ou plusieurs auxiliaires de vie</Text>
            <Text><strong>Auxiliaire de vie</strong> — vous travaillez au domicile d'un particulier</Text>
            <Text><strong>Aidant familial</strong> — vous accompagnez un proche en situation de handicap</Text>
            <Text>Remplissez le formulaire puis confirmez votre adresse e-mail.</Text>
          </Stack>
        ),
      },
      {
        question: 'Comment compléter mon profil ?',
        answer: (
          <Text>
            Allez dans <strong>Mon profil</strong> depuis le menu latéral. Renseignez vos informations personnelles,
            votre adresse et les informations spécifiques à votre rôle. Un profil complet permet une meilleure expérience.
          </Text>
        ),
      },
      {
        question: "Comment naviguer dans l'application ?",
        answer: (
          <Stack gap={2}>
            <Text>Le menu latéral (à gauche sur desktop, via le bouton ☰ sur mobile) donne accès à toutes les sections.</Text>
            <Text>Utilisez la <strong>recherche rapide</strong> (<Kbd>Ctrl+K</Kbd>) pour accéder à n'importe quelle page en tapant son nom.</Text>
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'planning',
    title: 'Planning & interventions',
    icon: '📅',
    items: [
      {
        question: 'Comment créer une intervention ?',
        answer: (
          <Stack gap={2}>
            <Text>Depuis la page <strong>Planning</strong>, cliquez sur <strong>Ajouter une intervention</strong>.</Text>
            <Text>Renseignez la date, les horaires, le type d'intervention et l'employé concerné.</Text>
            <Text>Vous pouvez aussi créer des interventions récurrentes avec l'option <strong>Répéter</strong>.</Text>
          </Stack>
        ),
      },
      {
        question: 'Comment gérer une garde de 24h ?',
        answer: (
          <Stack gap={2}>
            <Text>Lors de la création d'une intervention, sélectionnez le type <strong>Garde 24h</strong>.</Text>
            <Text>Vous pouvez découper la garde en segments (effectif, astreinte, pause) via l'interface visuelle.</Text>
            <Text>Les majorations de nuit sont calculées automatiquement sur les segments effectifs entre 21h et 6h.</Text>
          </Stack>
        ),
      },
      {
        question: 'Comment demander une absence ?',
        answer: (
          <Text>
            Depuis le <strong>Planning</strong>, cliquez sur <strong>Demander une absence</strong>.
            Choisissez le type (congé payé, maladie, etc.), les dates et ajoutez un justificatif si nécessaire.
            L'employeur sera notifié pour validation.
          </Text>
        ),
      },
    ],
  },
  {
    id: 'hours',
    title: 'Enregistrement des heures',
    icon: '⏱️',
    items: [
      {
        question: 'Comment enregistrer mes heures ?',
        answer: (
          <Stack gap={2}>
            <Text>Rendez-vous sur <strong>Suivi des heures</strong> depuis le menu.</Text>
            <Text>Vous pouvez pointer en temps réel (début/fin) ou saisir vos heures rétroactivement.</Text>
            <Text>Les heures enregistrées apparaissent dans l'historique avec leur statut de validation.</Text>
          </Stack>
        ),
      },
      {
        question: "Comment l'employeur valide les heures ?",
        answer: (
          <Text>
            L'employeur reçoit une notification sur le tableau de bord l'invitant à valider les heures de la semaine.
            Il peut confirmer, modifier ou refuser chaque pointage depuis la page <strong>Planning</strong>.
          </Text>
        ),
      },
    ],
  },
  {
    id: 'documents',
    title: 'Documents & bulletins de paie',
    icon: '📄',
    items: [
      {
        question: 'Comment archiver un bulletin de paie ?',
        answer: (
          <Stack gap={2}>
            <Text>Une fois votre déclaration CESU faite, l'URSSAF vous envoie le bulletin officiel par mail ou sur votre compte.</Text>
            <Text>Depuis <strong>Documents</strong>, section <strong>Bulletins de paie</strong>, cliquez sur <strong>Uploader un bulletin</strong>.</Text>
            <Text>Sélectionnez l'employé, la période et le PDF reçu de l'URSSAF (5 Mo max).</Text>
            <Text>L'employé concerné peut ensuite le télécharger depuis son espace Documents.</Text>
          </Stack>
        ),
      },
      {
        question: 'Pourquoi le bulletin n\'est plus généré par l\'application ?',
        answer: (
          <Text>
            Avec le CESU déclaratif, c'est l'URSSAF qui calcule les cotisations et édite le bulletin officiel.
            Générer un second bulletin côté app créerait un risque d'incohérence avec le document qui fait foi légalement.
            L'app se concentre donc sur l'archivage et le partage du bulletin officiel reçu.
          </Text>
        ),
      },
      {
        question: 'Comment fonctionne la déclaration CESU ?',
        answer: (
          <Text>
            Depuis <strong>Documents</strong>, section <strong>CESU</strong>, vous pouvez générer une déclaration
            mensuelle récapitulant les heures et salaires pour chaque employé. Le PDF est conforme au format CESU.
          </Text>
        ),
      },
    ],
  },
  {
    id: 'team',
    title: "Gestion d'équipe",
    icon: '👥',
    items: [
      {
        question: 'Comment ajouter un auxiliaire de vie ?',
        answer: (
          <Stack gap={2}>
            <Text>Depuis <strong>Équipe</strong>, cliquez sur <strong>Ajouter un auxiliaire</strong>.</Text>
            <Text>Renseignez les informations de l'employé et créez un contrat (CDI ou CDD).</Text>
            <Text>L'auxiliaire recevra une invitation pour rejoindre votre espace.</Text>
          </Stack>
        ),
      },
      {
        question: 'Comment gérer les contrats ?',
        answer: (
          <Text>
            Chaque auxiliaire a un contrat associé avec ses conditions (type, heures hebdomadaires, taux horaire, taux PAS).
            Vous pouvez modifier ces informations depuis la fiche de l'auxiliaire dans <strong>Équipe</strong>.
          </Text>
        ),
      },
    ],
  },
  {
    id: 'compliance',
    title: 'Conformité IDCC 3239',
    icon: '⚖️',
    items: [
      {
        question: "Qu'est-ce que la conformité IDCC 3239 ?",
        answer: (
          <Stack gap={2}>
            <Text>
              La Convention Collective IDCC 3239 régit le <strong>salariat direct</strong> des employeurs particuliers.
              Elle définit les règles de temps de travail, repos et majorations.
            </Text>
            <Text>Unilien vérifie automatiquement le respect de ces règles :</Text>
            <Text>• Maximum 10h de travail effectif par jour</Text>
            <Text>• Repos quotidien minimum de 11h consécutives</Text>
            <Text>• Repos hebdomadaire de 24h + 11h = 35h consécutives</Text>
            <Text>• Maximum 48h par semaine (44h en moyenne sur 12 semaines)</Text>
            <Text>• Pause de 20 minutes toutes les 6h de travail effectif</Text>
          </Stack>
        ),
      },
      {
        question: 'Comment fonctionnent les majorations ?',
        answer: (
          <Stack gap={2}>
            <Text><strong>Dimanche</strong> : +30% du taux horaire</Text>
            <Text><strong>Jours fériés</strong> : selon la convention (travaillé ou chômé)</Text>
            <Text><strong>Nuit (21h-6h)</strong> : +20% du taux horaire</Text>
            <Text><strong>Heures supplémentaires</strong> : +25% (8 premières) puis +50%</Text>
            <Text><strong>Présence responsable</strong> : rémunération à 2/3 du taux horaire</Text>
          </Stack>
        ),
      },
      {
        question: 'Où voir les alertes de conformité ?',
        answer: (
          <Text>
            La page <strong>Conformité</strong> affiche un tableau de bord avec toutes les anomalies détectées.
            Des alertes apparaissent aussi sur le tableau de bord principal quand des règles sont enfreintes.
          </Text>
        ),
      },
    ],
  },
  {
    id: 'messaging',
    title: 'Messagerie & cahier de liaison',
    icon: '💬',
    items: [
      {
        question: 'Quelle différence entre messagerie et cahier de liaison ?',
        answer: (
          <Stack gap={2}>
            <Text><strong>Messagerie</strong> : conversations en temps réel entre employeur, auxiliaire et aidant. Pour les échanges du quotidien.</Text>
            <Text><strong>Cahier de liaison</strong> : notes structurées sur les soins, repas, activités. C'est le carnet de suivi du bénéficiaire.</Text>
          </Stack>
        ),
      },
      {
        question: 'Comment créer une conversation ?',
        answer: (
          <Text>
            Depuis <strong>Messagerie</strong>, cliquez sur <strong>Nouvelle conversation</strong> et sélectionnez
            les participants. Vous pouvez envoyer des messages texte.
          </Text>
        ),
      },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibilité & raccourcis clavier',
    icon: '♿',
    items: [
      {
        question: 'Quels raccourcis clavier sont disponibles ?',
        answer: (
          <Stack gap={2}>
            <Text fontWeight="semibold" mb={1}>Navigation</Text>
            <ShortcutRow keys="Ctrl + K" desc="Ouvrir la recherche rapide (Spotlight)" />
            <ShortcutRow keys="Échap" desc="Fermer un modal ou la recherche" />
            <ShortcutRow keys="Tab" desc="Naviguer entre les éléments interactifs" />
            <ShortcutRow keys="Maj + Tab" desc="Naviguer en arrière" />
            <ShortcutRow keys="Entrée" desc="Activer l'élément sélectionné" />
            <ShortcutRow keys="Espace" desc="Cocher/décocher une case, ouvrir un menu" />
            <Text fontWeight="semibold" mt={3} mb={1}>Recherche rapide (Spotlight)</Text>
            <ShortcutRow keys="↑ / ↓" desc="Naviguer dans les résultats" />
            <ShortcutRow keys="Entrée" desc="Aller à la page sélectionnée" />
            <ShortcutRow keys="Échap" desc="Fermer la recherche" />
          </Stack>
        ),
      },
      {
        question: "Comment personnaliser l'accessibilité ?",
        answer: (
          <Stack gap={2}>
            <Text>Rendez-vous dans <strong>Paramètres &gt; Accessibilité</strong> pour activer :</Text>
            <Text>• <strong>Contraste élevé</strong> — améliore la lisibilité des couleurs</Text>
            <Text>• <strong>Texte agrandi</strong> — augmente la taille du texte (80% à 150%)</Text>
            <Text>• <strong>Réduire les animations</strong> — désactive les transitions</Text>
            <Text>• <strong>Optimisé lecteur d'écran</strong> — améliore la compatibilité ARIA</Text>
          </Stack>
        ),
      },
      {
        question: "L'application est-elle compatible avec les lecteurs d'écran ?",
        answer: (
          <Stack gap={2}>
            <Text>
              Oui. Unilien utilise des attributs ARIA, des rôles sémantiques et des labels accessibles
              sur tous les éléments interactifs.
            </Text>
            <Text>
              Les changements de page sont annoncés automatiquement et les formulaires
              incluent des messages d'erreur associés aux champs.
            </Text>
          </Stack>
        ),
      },
      {
        question: "L'application fonctionne-t-elle sur mobile ?",
        answer: (
          <Text>
            Oui, Unilien est une <strong>PWA</strong> (Progressive Web App) responsive.
            Elle s'adapte à toutes les tailles d'écran et peut être installée sur votre téléphone
            depuis le navigateur pour un accès rapide.
          </Text>
        ),
      },
    ],
  },
  {
    id: 'security',
    title: 'Sécurité & données personnelles',
    icon: '🔒',
    items: [
      {
        question: 'Comment mes données sont-elles protégées ?',
        answer: (
          <Stack gap={2}>
            <Text>Unilien est conforme au <strong>RGPD</strong> et à la réglementation française sur les données de santé :</Text>
            <Text>• Toutes les communications sont chiffrées (HTTPS)</Text>
            <Text>• Les données sont stockées sur des serveurs sécurisés avec contrôle d'accès (RLS)</Text>
            <Text>• Les données de santé nécessitent un consentement explicite (article 9 RGPD)</Text>
            <Text>• Chaque accès aux données sensibles est tracé (audit trail)</Text>
          </Stack>
        ),
      },
      {
        question: 'Comment supprimer mon compte ?',
        answer: (
          <Text>
            Rendez-vous dans <strong>Paramètres &gt; Zone de danger</strong>. Vous pouvez supprimer vos données
            ou supprimer entièrement votre compte. Une double confirmation est requise pour éviter les suppressions accidentelles.
          </Text>
        ),
      },
      {
        question: 'Comment exporter mes données ?',
        answer: (
          <Text>
            Depuis <strong>Paramètres &gt; Données personnelles</strong>, vous pouvez exporter toutes vos données
            au format JSON, conformément à votre droit à la portabilité (RGPD).
          </Text>
        ),
      },
    ],
  },
]

// ── Composants utilitaires ───────────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <Box
      as="kbd"
      display="inline-block"
      px="6px"
      py="1px"
      bg="bg.page"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="4px"
      fontSize="xs"
      fontFamily="mono"
      fontWeight="600"
      color="text.default"
      lineHeight="1.6"
    >
      {children}
    </Box>
  )
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <Flex align="center" gap={3} py={1}>
      <Box minW="140px">
        {keys.split(' + ').map((k, i) => (
          <span key={i}>
            {i > 0 && <Text as="span" fontSize="xs" color="text.muted" mx={1}>+</Text>}
            <Kbd>{k.trim()}</Kbd>
          </span>
        ))}
      </Box>
      <Text fontSize="sm" color="text.muted">{desc}</Text>
    </Flex>
  )
}

function AccordionItem({ question, answer, isOpen, onToggle }: {
  question: string
  answer: React.ReactNode
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <Box borderBottomWidth="1px" borderColor="border.default">
      <Flex
        as="button"
        onClick={onToggle}
        w="100%"
        py={4}
        px={2}
        align="center"
        justify="space-between"
        cursor="pointer"
        _hover={{ bg: 'bg.page' }}
        borderRadius="6px"
        textAlign="left"
        aria-expanded={isOpen}
      >
        <Text fontWeight="600" fontSize="sm" color="text.default" flex={1} pr={4}>
          {question}
        </Text>
        <Text
          color="text.muted"
          fontSize="lg"
          transition="transform 0.2s"
          transform={isOpen ? 'rotate(45deg)' : 'none'}
          flexShrink={0}
        >
          +
        </Text>
      </Flex>
      <Collapsible.Root open={isOpen}>
        <Collapsible.Content>
          <Box px={2} pb={4} fontSize="sm" color="text.muted" lineHeight="1.7">
            {answer}
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  )
}

// ── Page principale ──────────────────────────────────────────────────────────

export default function HelpPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <DashboardLayout title="Guide d'utilisation">
      <Container maxW="800px" py={6}>
        {/* Header */}
        <Box mb={8}>
          <Text fontSize="2xl" fontWeight="800" color="text.default" mb={2}>
            Guide d'utilisation
          </Text>
          <Text color="text.muted" lineHeight="1.6">
            Tout ce qu'il faut savoir pour utiliser Unilien efficacement.
            Cliquez sur une question pour afficher la réponse.
          </Text>
        </Box>

        {/* Table des matières */}
        <Box
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="12px"
          p={5}
          mb={8}
        >
          <Text fontWeight="700" fontSize="sm" mb={3} color="text.default">
            Sommaire
          </Text>
          <Flex gap={2} flexWrap="wrap">
            {GUIDE_SECTIONS.map((section) => (
              <Link
                key={section.id}
                href={`#${section.id}`}
                fontSize="sm"
                fontWeight="500"
                color="brand.solid"
                bg="brand.subtle"
                px={3}
                py={1}
                borderRadius="full"
                textDecoration="none"
                _hover={{ bg: 'brand.100' }}
              >
                {section.icon} {section.title}
              </Link>
            ))}
          </Flex>
        </Box>

        {/* Sections */}
        <Stack gap={8}>
          {GUIDE_SECTIONS.map((section) => (
            <Box
              key={section.id}
              id={section.id}
              bg="bg.surface"
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="12px"
              overflow="hidden"
            >
              <Box px={5} pt={5} pb={3}>
                <Text fontSize="lg" fontWeight="700" color="text.default">
                  {section.icon} {section.title}
                </Text>
              </Box>
              <Box px={4}>
                {section.items.map((item, idx) => {
                  const itemId = `${section.id}-${idx}`
                  return (
                    <AccordionItem
                      key={itemId}
                      question={item.question}
                      answer={item.answer}
                      isOpen={openItems.has(itemId)}
                      onToggle={() => toggleItem(itemId)}
                    />
                  )
                })}
              </Box>
              <Box h={2} />
            </Box>
          ))}
        </Stack>

        {/* Footer help */}
        <Box
          mt={8}
          p={5}
          bg="brand.subtle"
          borderRadius="12px"
          textAlign="center"
        >
          <Text fontWeight="600" color="text.default" mb={1}>
            Besoin d'aide supplémentaire ?
          </Text>
          <Text fontSize="sm" color="text.muted">
            Contactez-nous via la page{' '}
            <Link as={RouterLink} to="/contact" color="brand.solid" fontWeight="600">
              Contact
            </Link>
            {' '}ou consultez les{' '}
            <Link as={RouterLink} to="/mentions-legales" color="brand.solid" fontWeight="600">
              mentions légales
            </Link>.
          </Text>
        </Box>
      </Container>
    </DashboardLayout>
  )
}
