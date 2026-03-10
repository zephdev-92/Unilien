import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Container,
  Flex,
  Stack,
  Text,
  Grid,
  GridItem,
  Image,
  Link,
  Heading,
  Badge,
  Separator,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'

// ─── Sub-components ─────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode
  title: string
  description: string
  iconBg?: string
  iconColor?: string
}) {
  return (
    <Box
      p={6}
      bg="white"
      borderRadius="xl"
      boxShadow="md"
      borderWidth="1px"
      borderColor="gray.100"
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-4px)', boxShadow: 'lg' }}
    >
      <Flex
        w="48px"
        h="48px"
        borderRadius="lg"
        bg={iconBg || 'blue.50'}
        color={iconColor || 'blue.600'}
        align="center"
        justify="center"
        mb={4}
        fontSize="xl"
      >
        {icon}
      </Flex>
      <Text fontSize="lg" fontWeight="bold" mb={2} color="gray.800">
        {title}
      </Text>
      <Text color="gray.600" fontSize="sm">
        {description}
      </Text>
    </Box>
  )
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <Box textAlign="center" px={4}>
      <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" color="brand.600">
        {value}
      </Text>
      <Text fontSize="sm" color="gray.500" mt={1}>
        {label}
      </Text>
    </Box>
  )
}

function PainPointCard({
  title,
  description,
  iconBg,
  icon,
}: {
  title: string
  description: string
  iconBg: string
  icon: string
}) {
  return (
    <Box p={6} bg="white" borderRadius="xl" boxShadow="md" borderWidth="1px" borderColor="gray.100">
      <Flex
        w="48px"
        h="48px"
        borderRadius="lg"
        bg={iconBg}
        align="center"
        justify="center"
        mb={4}
        fontSize="xl"
      >
        {icon}
      </Flex>
      <Text fontSize="md" fontWeight="bold" mb={2} color="gray.800">
        {title}
      </Text>
      <Text color="gray.600" fontSize="sm">
        {description}
      </Text>
    </Box>
  )
}

function PricingCard({
  name,
  price,
  priceSuffix,
  features,
  cta,
  ctaLink,
  featured,
}: {
  name: string
  price: string
  priceSuffix: string
  features: { text: string; available: boolean }[]
  cta: string
  ctaLink: string
  featured?: boolean
}) {
  return (
    <Box
      p={8}
      bg="white"
      borderRadius="2xl"
      boxShadow={featured ? 'xl' : 'md'}
      borderWidth={featured ? '2px' : '1px'}
      borderColor={featured ? 'brand.500' : 'gray.200'}
      position="relative"
    >
      {featured && (
        <Badge
          colorPalette="blue"
          position="absolute"
          top="-12px"
          left="50%"
          transform="translateX(-50%)"
          px={3}
          py={1}
          borderRadius="full"
          fontSize="xs"
          fontWeight="bold"
        >
          Le plus populaire
        </Badge>
      )}
      <Text fontSize="xl" fontWeight="800" mb={2}>
        {name}
      </Text>
      <Flex align="baseline" mb={6}>
        <Text fontSize="4xl" fontWeight="800" color="gray.900">
          {price}
        </Text>
        <Text fontSize="sm" color="gray.500" ml={1}>
          {priceSuffix}
        </Text>
      </Flex>
      <Stack gap={3} mb={6}>
        {features.map((f) => (
          <Flex key={f.text} align="center" gap={2} opacity={f.available ? 1 : 0.4}>
            <Text color={f.available ? 'green.500' : 'gray.400'} fontSize="sm">
              {f.available ? '✓' : '✗'}
            </Text>
            <Text fontSize="sm" color={f.available ? 'gray.700' : 'gray.400'}>
              {f.text}
            </Text>
          </Flex>
        ))}
      </Stack>
      <AccessibleButton
        asChild
        colorPalette={featured ? 'blue' : 'gray'}
        variant={featured ? 'solid' : 'outline'}
        width="100%"
      >
        <RouterLink to={ctaLink}>{cta}</RouterLink>
      </AccessibleButton>
    </Box>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Box borderBottomWidth="1px" borderColor="gray.200">
      <Flex
        as="button"
        w="100%"
        py={5}
        px={2}
        justify="space-between"
        align="center"
        cursor="pointer"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        _hover={{ color: 'brand.600' }}
      >
        <Text fontWeight="600" textAlign="left" fontSize="md" color="gray.800">
          {question}
        </Text>
        <Text
          fontSize="xl"
          color="gray.400"
          ml={4}
          transition="transform 0.2s"
          transform={isOpen ? 'rotate(45deg)' : 'none'}
          flexShrink={0}
        >
          +
        </Text>
      </Flex>
      {isOpen && (
        <Box pb={5} px={2}>
          <Text color="gray.600" fontSize="sm" lineHeight="1.7">
            {answer}
          </Text>
        </Box>
      )}
    </Box>
  )
}

// ─── HomePage ───────────────────────────────────────────────────────────────

export function HomePage() {
  return (
    <Box minH="100vh">
      {/* ── Navigation ── */}
      <Box
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        bg="white"
        borderBottomWidth="1px"
        borderColor="gray.200"
        zIndex={100}
      >
        <Container maxW="container.xl">
          <Flex h="72px" align="center" justify="space-between">
            <Image
              src="/Logo_Unilien.svg"
              alt="Unilien"
              h="36px"
              objectFit="contain"
            />
            <Flex gap={6} align="center" display={{ base: 'none', md: 'flex' }}>
              <Link href="#fonctionnalites" color="gray.600" fontSize="sm" _hover={{ color: 'brand.600' }}>
                Fonctionnalites
              </Link>
              <Link href="#conformite" color="gray.600" fontSize="sm" _hover={{ color: 'brand.600' }}>
                Conformite
              </Link>
              <Link href="#tarifs" color="gray.600" fontSize="sm" _hover={{ color: 'brand.600' }}>
                Tarifs
              </Link>
              <Link href="#faq" color="gray.600" fontSize="sm" _hover={{ color: 'brand.600' }}>
                FAQ
              </Link>
            </Flex>
            <Flex gap={3} align="center">
              <Link asChild color="gray.600" fontSize="sm" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/connexion">Connexion</RouterLink>
              </Link>
              <AccessibleButton asChild colorPalette="blue" size="sm">
                <RouterLink to="/inscription">Essai gratuit</RouterLink>
              </AccessibleButton>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* ── Hero ── */}
      <Box
        pt={{ base: '120px', md: '140px' }}
        pb={{ base: '60px', md: '80px' }}
        bgGradient="to-br"
        gradientFrom="brand.50"
        gradientTo="white"
      >
        <Container maxW="container.xl">
          <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={12} alignItems="center">
            <GridItem>
              <Stack gap={6}>
                <Flex align="center" gap={2}>
                  <Text fontSize="xs" color="brand.600" fontWeight="600">
                    ✓ Pour les particuliers employeurs · Conformite IDCC 3239 automatique
                  </Text>
                </Flex>

                <Heading
                  fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }}
                  fontWeight="800"
                  color="gray.900"
                  lineHeight="1.2"
                >
                  Un planning illegal peut vous couter{' '}
                  <Text as="em" color="red.600" fontStyle="normal">
                    8 000 euros
                  </Text>{' '}
                  aux Prud'hommes.
                </Heading>

                <Text fontSize="lg" color="gray.600" maxW="520px">
                  Unilien bloque automatiquement les plannings non conformes avant qu'il soit trop tard.
                  Le premier outil pense pour les employeurs de vie a domicile.
                </Text>

                <Flex gap={4} flexWrap="wrap">
                  <AccessibleButton asChild colorPalette="blue" size="lg">
                    <RouterLink to="/inscription">Essayer gratuitement 14 jours</RouterLink>
                  </AccessibleButton>
                  <AccessibleButton asChild variant="outline" size="lg">
                    <RouterLink to="/contact">Voir la demo</RouterLink>
                  </AccessibleButton>
                </Flex>

                {/* Reassurance */}
                <Stack gap={2}>
                  <Flex align="center" gap={2}>
                    <Text color="green.500" fontSize="sm">✓</Text>
                    <Text fontSize="sm" color="gray.500">Aucune carte bancaire requise</Text>
                  </Flex>
                  <Flex align="center" gap={2}>
                    <Text color="green.500" fontSize="sm">✓</Text>
                    <Text fontSize="sm" color="gray.500">100% accessible — WCAG AAA, commande vocale</Text>
                  </Flex>
                  <Flex align="center" gap={2}>
                    <Text color="green.500" fontSize="sm">✓</Text>
                    <Text fontSize="sm" color="gray.500">Valide par juriste specialise IDCC 3239</Text>
                  </Flex>
                </Stack>
              </Stack>
            </GridItem>

            {/* Mockup produit — bouclier juridique */}
            <GridItem display={{ base: 'none', lg: 'block' }}>
              <Box
                bg="gray.50"
                borderRadius="2xl"
                p={6}
                borderWidth="1px"
                borderColor="gray.200"
                boxShadow="lg"
              >
                <Text fontWeight="700" fontSize="md" mb={4}>
                  Bouclier Juridique — actif
                </Text>
                <Stack gap={3}>
                  <Flex align="start" gap={3} p={3} bg="red.50" borderRadius="lg">
                    <Box w="8px" h="8px" borderRadius="full" bg="red.500" mt={1.5} flexShrink={0} />
                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="red.700">Repos 11h non respecte — BLOQUE</Text>
                      <Text fontSize="xs" color="red.600">"Marie doit se reposer jusqu'a 7h demain."</Text>
                    </Box>
                  </Flex>
                  <Flex align="start" gap={3} p={3} bg="red.50" borderRadius="lg">
                    <Box w="8px" h="8px" borderRadius="full" bg="red.500" mt={1.5} flexShrink={0} />
                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="red.700">Pause 20 min oubliee — BLOQUE</Text>
                      <Text fontSize="xs" color="red.600">"Pause obligatoire si intervention {'>'} 6h."</Text>
                    </Box>
                  </Flex>
                  <Flex align="start" gap={3} p={3} bg="green.50" borderRadius="lg">
                    <Box w="8px" h="8px" borderRadius="full" bg="green.500" mt={1.5} flexShrink={0} />
                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="green.700">Planning de la semaine — Conforme</Text>
                      <Text fontSize="xs" color="green.600">Toutes les regles IDCC 3239 respectees.</Text>
                    </Box>
                  </Flex>
                  <Flex align="start" gap={3} p={3} bg="gray.100" borderRadius="lg">
                    <Box w="8px" h="8px" borderRadius="full" bg="blue.400" mt={1.5} flexShrink={0} />
                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="gray.700">Majorations calculees automatiquement</Text>
                      <Text fontSize="xs" color="gray.500">Dimanche +30% · Nuit +25% · Ferie +60%</Text>
                    </Box>
                  </Flex>
                </Stack>
              </Box>
            </GridItem>
          </Grid>
        </Container>
      </Box>

      {/* ── Chiffres cles ── */}
      <Box py={8} bg="white" borderBottomWidth="1px" borderColor="gray.100">
        <Container maxW="container.lg">
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={6}>
            <StatItem value="280 000" label="Beneficiaires PCH en France" />
            <StatItem value="2 000+" label="Condamnations Prud'hommes / an" />
            <StatItem value="8 000 euros" label="Indemnites moyennes" />
            <StatItem value="-40 %" label="De temps administratif" />
          </Grid>
        </Container>
      </Box>

      {/* ── Section Problemes ── */}
      <Box py="80px" bg="gray.50">
        <Container maxW="container.lg">
          <Stack gap={12}>
            <Box textAlign="center">
              <Heading fontSize="2xl" fontWeight="bold" color="gray.900" mb={3}>
                Gerer vos auxiliaires, c'est gerer une PME 24h/24
              </Heading>
              <Text color="gray.600">
                Vous n'etes pas seul face a cette charge.
              </Text>
            </Box>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
              <PainPointCard
                icon="⚠️"
                iconBg="red.50"
                title="J'ai peur de faire une erreur couteuse"
                description="Le droit du travail evolue. Une regle oubliee peut se transformer en litige a 8 000 euros d'indemnites."
              />
              <PainPointCard
                icon="📋"
                iconBg="orange.50"
                title="Excel est inutilisable avec ma pathologie"
                description="Les outils generiques ne sont pas adaptes a la gestion depuis un fauteuil roulant ou avec des troubles moteurs."
              />
              <PainPointCard
                icon="⏰"
                iconBg="blue.50"
                title="Je ne sais jamais si mon planning est legal"
                description="Les 11h de repos, la pause de 20 min, les 10h max par jour... Impossible de tout memoriser."
              />
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* ── Section Fonctionnalites ── */}
      <Box py="80px" id="fonctionnalites">
        <Container maxW="container.xl">
          <Stack gap={12}>
            <Box textAlign="center">
              <Heading fontSize="2xl" fontWeight="bold" color="gray.900" mb={3}>
                Tout ce dont vous avez besoin
              </Heading>
              <Text color="gray.600" maxW="600px" mx="auto">
                Concu pour les employeurs particuliers, de la planification a la declaration.
              </Text>
            </Box>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
              <FeatureCard
                icon="📅"
                title="Planning intelligent"
                description="Vues semaine et mois, interventions 24h, presence responsable. Glisser-deposer prevu."
              />
              <FeatureCard
                icon="🛡️"
                iconBg="red.50"
                iconColor="red.600"
                title="Bouclier IDCC 3239"
                description="Blocage automatique des infractions : repos, pauses, amplitude, heures supplementaires."
              />
              <FeatureCard
                icon="💰"
                iconBg="green.50"
                iconColor="green.600"
                title="Calcul de paie automatique"
                description="Majorations conformes, cotisations salariales et patronales, exoneration SS, taux PAS."
              />
              <FeatureCard
                icon="💬"
                title="Cahier de liaison"
                description="Messagerie temps reel, rapports d'intervention, pieces jointes, indicateurs de frappe."
              />
              <FeatureCard
                icon="🔔"
                iconBg="orange.50"
                iconColor="orange.600"
                title="Notifications multi-canal"
                description="Push, in-app, email. Rappels d'intervention, alertes conformite."
              />
              <FeatureCard
                icon="📊"
                iconBg="green.50"
                iconColor="green.600"
                title="Tableaux de bord PCH"
                description="Enveloppe PCH mensuelle, reste a charge, previsions, export CESU en un clic."
              />
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* ── Section Conformite ── */}
      <Box py="80px" bg="gray.50" id="conformite">
        <Container maxW="container.md">
          <Stack gap={10}>
            <Box textAlign="center">
              <Heading fontSize="2xl" fontWeight="bold" color="gray.900" mb={3}>
                Ce n'est pas juste un agenda. C'est un bouclier juridique.
              </Heading>
              <Text color="gray.600">
                Unilien detecte et bloque en temps reel les infractions a la Convention IDCC 3239.
              </Text>
            </Box>
            <Stack gap={3}>
              {/* Alerte danger */}
              <Flex align="start" gap={3} p={4} bg="red.50" borderRadius="lg" borderLeftWidth="4px" borderLeftColor="red.500">
                <Text fontSize="lg" mt={-0.5}>🛡️</Text>
                <Box>
                  <Text fontWeight="700" fontSize="sm" color="red.700">Repos 11h non respecte — BLOQUE</Text>
                  <Text fontSize="xs" color="red.600">Marie doit avoir termine a 21h pour reprendre a 8h. Cette intervention est impossible.</Text>
                </Box>
              </Flex>
              {/* Alerte warning */}
              <Flex align="start" gap={3} p={4} bg="orange.50" borderRadius="lg" borderLeftWidth="4px" borderLeftColor="orange.500">
                <Text fontSize="lg" mt={-0.5}>⚠️</Text>
                <Box>
                  <Text fontWeight="700" fontSize="sm" color="orange.700">Pause 20 min manquante — AVERTISSEMENT</Text>
                  <Text fontSize="xs" color="orange.600">Intervention de 7h sans pause. L'Art. L3121-16 exige une pause si {'>'} 6h consecutives.</Text>
                </Box>
              </Flex>
              {/* Alerte success */}
              <Flex align="start" gap={3} p={4} bg="green.50" borderRadius="lg" borderLeftWidth="4px" borderLeftColor="green.500">
                <Text fontSize="lg" mt={-0.5}>✓</Text>
                <Box>
                  <Text fontWeight="700" fontSize="sm" color="green.700">Planning de la semaine — Conforme</Text>
                  <Text fontSize="xs" color="green.600">Toutes les regles IDCC 3239 sont respectees. Vous etes protege.</Text>
                </Box>
              </Flex>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* ── Temoignages ── */}
      <Box py="80px">
        <Container maxW="container.xl">
          <Stack gap={12}>
            <Box textAlign="center">
              <Heading fontSize="2xl" fontWeight="bold" color="gray.900">
                Ils nous font confiance
              </Heading>
            </Box>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
              <Box p={6} bg="white" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.100">
                <Text color="gray.700" fontStyle="italic" mb={4} fontSize="sm" lineHeight="1.7">
                  "Avant Unilien, je passais 3h par semaine sur Excel a verifier que mon planning etait legal. Maintenant c'est automatique."
                </Text>
                <Flex align="center" gap={3}>
                  <Flex w="40px" h="40px" borderRadius="full" bg="blue.100" color="blue.700" align="center" justify="center" fontSize="sm" fontWeight="bold">
                    CF
                  </Flex>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.800">Claire Fontaine</Text>
                    <Text fontSize="xs" color="gray.500">Employeur particulier</Text>
                  </Box>
                </Flex>
              </Box>
              <Box p={6} bg="white" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.100">
                <Text color="gray.700" fontStyle="italic" mb={4} fontSize="sm" lineHeight="1.7">
                  "Le bouclier juridique m'a evite deux erreurs de planning qui auraient pu finir aux Prud'hommes."
                </Text>
                <Flex align="center" gap={3}>
                  <Flex w="40px" h="40px" borderRadius="full" bg="green.100" color="green.700" align="center" justify="center" fontSize="sm" fontWeight="bold">
                    JM
                  </Flex>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.800">Jean-Dominique Moreau</Text>
                    <Text fontSize="xs" color="gray.500">Beneficiaire PCH</Text>
                  </Box>
                </Flex>
              </Box>
              <Box p={6} bg="white" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.100">
                <Text color="gray.700" fontStyle="italic" mb={4} fontSize="sm" lineHeight="1.7">
                  "La commande vocale change tout. Je peux gerer mon planning depuis mon fauteuil sans manipuler une souris."
                </Text>
                <Flex align="center" gap={3}>
                  <Flex w="40px" h="40px" borderRadius="full" bg="orange.100" color="orange.700" align="center" justify="center" fontSize="sm" fontWeight="bold">
                    SM
                  </Flex>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.800">Sophie Martin</Text>
                    <Text fontSize="xs" color="gray.500">Employeur particulier</Text>
                  </Box>
                </Flex>
              </Box>
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* ── Tarifs ── */}
      <Box py="80px" bg="gray.50" id="tarifs">
        <Container maxW="container.lg">
          <Stack gap={12}>
            <Box textAlign="center">
              <Heading fontSize="2xl" fontWeight="bold" color="gray.900" mb={3}>
                Tarifs simples, sans surprise
              </Heading>
              <Text color="gray.600">
                Commencez gratuitement. Evoluez quand votre equipe grandit.
              </Text>
            </Box>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6} alignItems="start">
              <PricingCard
                name="Gratuit"
                price="0"
                priceSuffix="euros/mois"
                features={[
                  { text: '1 employe', available: true },
                  { text: 'Planning semaine', available: true },
                  { text: 'Verifications IDCC 3239', available: true },
                  { text: 'Pointage horaire', available: true },
                  { text: 'Bulletins de paie', available: false },
                  { text: 'Dashboard PCH', available: false },
                ]}
                cta="Demarrer gratuitement"
                ctaLink="/inscription"
              />
              <PricingCard
                name="Essentiel"
                price="9,90"
                priceSuffix="euros/mois"
                featured
                features={[
                  { text: '3 employes', available: true },
                  { text: 'Bulletins de paie PDF', available: true },
                  { text: 'Conformite IDCC 3239', available: true },
                  { text: 'Export planning (PDF, Excel, iCal)', available: true },
                  { text: 'Dashboard PCH', available: true },
                  { text: 'Cahier de liaison', available: true },
                ]}
                cta="Essayer 14 jours gratuits"
                ctaLink="/inscription"
              />
              <PricingCard
                name="Pro"
                price="24,90"
                priceSuffix="euros/mois"
                features={[
                  { text: 'Employes illimites', available: true },
                  { text: "Tout l'Essentiel", available: true },
                  { text: 'Exports avances', available: true },
                  { text: 'Multi-comptes', available: true },
                  { text: 'Notifications push + email', available: true },
                  { text: 'Support prioritaire', available: true },
                ]}
                cta="Choisir Pro"
                ctaLink="/inscription"
              />
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* ── FAQ ── */}
      <Box py="80px" id="faq">
        <Container maxW="container.md">
          <Stack gap={8}>
            <Box textAlign="center">
              <Heading fontSize="2xl" fontWeight="bold" color="gray.900">
                Questions frequentes
              </Heading>
            </Box>
            <Box>
              <FaqItem
                question="Qu'est-ce que la Convention IDCC 3239 ?"
                answer="La Convention Collective Nationale des particuliers employeurs et de l'emploi a domicile (IDCC 3239) definit les regles du droit du travail applicables aux auxiliaires de vie employes directement par des particuliers. Elle couvre les temps de travail, repos, majorations, conges et modes de paiement (CESU notamment)."
              />
              <FaqItem
                question="Comment fonctionne le bouclier juridique ?"
                answer="Chaque fois que vous creez ou modifiez une intervention, Unilien verifie en temps reel une douzaine de regles IDCC 3239 : respect du repos de 11h entre deux interventions, pause de 20 min si duree > 6h, amplitude maximale de 12h, repos hebdomadaire de 35h, etc. Si une regle est violee, le planning est bloque avec un message d'explication et la reference legale."
              />
              <FaqItem
                question="L'application est-elle vraiment accessible ?"
                answer="Oui. Unilien vise le niveau WCAG AAA : navigation clavier complete, compatibilite lecteurs d'ecran (NVDA, VoiceOver), commande vocale integree, mode contraste eleve, taille de texte ajustable, reduction de mouvement. Elle est concue par et pour des personnes en situation de handicap."
              />
              <FaqItem
                question="Puis-je importer mes donnees depuis Excel ?"
                answer="L'import Excel est en cours de developpement (roadmap Q2 2026). En attendant, vos donnees sont exportables en CSV, JSON et PDF a tout moment depuis la section Parametres."
              />
              <FaqItem
                question="Mes donnees sont-elles securisees ?"
                answer="Vos donnees sont hebergees en Europe sur Supabase (PostgreSQL), protegees par des politiques RLS (Row Level Security), chiffrees en transit (TLS) et au repos. Unilien ne vend ni ne partage vos donnees. Vous pouvez les exporter ou les supprimer a tout moment."
              />
              <FaqItem
                question="Comment fonctionne la PCH dans Unilien ?"
                answer="Le widget PCH affiche votre enveloppe mensuelle (heures allouees x tarif 2026), le cout reel employeur, le reste a charge et l'economie realisee grace a l'exoneration patronale SS. Les tarifs sont mis a jour annuellement."
              />
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* ── CTA Banner ── */}
      <Box py="60px" bg="brand.500">
        <Container maxW="container.md">
          <Stack gap={4} align="center" textAlign="center">
            <Heading fontSize="2xl" fontWeight="bold" color="white">
              Protegez-vous des aujourd'hui.
            </Heading>
            <Text color="whiteAlpha.900">
              14 jours d'essai gratuit. Aucune carte bancaire requise.
            </Text>
            <AccessibleButton asChild size="lg" bg="white" color="brand.600" _hover={{ bg: 'gray.100' }}>
              <RouterLink to="/inscription">Commencer gratuitement</RouterLink>
            </AccessibleButton>
          </Stack>
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box py={12} bg="gray.900">
        <Container maxW="container.xl">
          <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={8}>
            <Stack gap={4}>
              <Text fontSize="lg" fontWeight="bold" color="white">
                Unilien
              </Text>
              <Text color="gray.400" fontSize="sm" lineHeight="1.7">
                Le premier outil de gestion d'auxiliaires de vie avec protection juridique automatique IDCC 3239.
              </Text>
            </Stack>

            <Stack gap={3}>
              <Text fontWeight="semibold" color="white" fontSize="sm">
                Produit
              </Text>
              <Link href="#fonctionnalites" color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
                Fonctionnalites
              </Link>
              <Link href="#conformite" color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
                Conformite IDCC 3239
              </Link>
              <Link href="#tarifs" color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
                Tarifs
              </Link>
              <Link href="#faq" color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
                FAQ
              </Link>
            </Stack>

            <Stack gap={3}>
              <Text fontWeight="semibold" color="white" fontSize="sm">
                Legal
              </Text>
              <Link color="gray.400" fontSize="sm" _hover={{ color: 'white' }} href="#">
                Mentions legales
              </Link>
              <Link color="gray.400" fontSize="sm" _hover={{ color: 'white' }} href="#">
                Politique de confidentialite
              </Link>
              <Link color="gray.400" fontSize="sm" _hover={{ color: 'white' }} href="#">
                CGU
              </Link>
              <Link color="gray.400" fontSize="sm" _hover={{ color: 'white' }} href="#">
                RGPD
              </Link>
            </Stack>

            <Stack gap={3}>
              <Text fontWeight="semibold" color="white" fontSize="sm">
                Support
              </Text>
              <Link asChild color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
                <RouterLink to="/contact">Contact</RouterLink>
              </Link>
              <Link color="gray.400" fontSize="sm" _hover={{ color: 'white' }} href="#">
                Documentation
              </Link>
              <Link color="gray.400" fontSize="sm" _hover={{ color: 'white' }} href="#">
                Accessibilite
              </Link>
            </Stack>
          </Grid>

          <Separator borderColor="gray.800" my={8} />

          <Stack gap={1} textAlign="center">
            <Text color="gray.500" fontSize="sm">
              © {new Date().getFullYear()} Unilien. Tous droits reserves. Convention IDCC 3239.
            </Text>
            <Text color="gray.600" fontSize="xs">
              Fait avec amour pour les personnes en situation de handicap.
            </Text>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}

export default HomePage
