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
  Button,
} from '@chakra-ui/react'
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
      bg="bg.surface"
      borderRadius="md"
      boxShadow="none"
      borderWidth="1px"
      borderColor="border.default"
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
    >
      <Flex
        w="48px"
        h="48px"
        borderRadius="12px"
        bg={iconBg || 'blue.50'}
        color={iconColor || 'blue.600'}
        align="center"
        justify="center"
        mb={4}
        fontSize="xl"
      >
        {icon}
      </Flex>
      <Text fontSize="lg" fontWeight="bold" mb={2} color="text.default">
        {title}
      </Text>
      <Text color="text.muted" fontSize="sm">
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
      <Text fontSize="sm" color="text.muted" mt={1}>
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
  icon: React.ReactNode
}) {
  return (
    <Box
      p={6}
      bg="bg.surface"
      borderRadius="md"
      boxShadow="none"
      borderWidth="1px"
      borderColor="border.default"
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
    >
      <Flex
        w="48px"
        h="48px"
        borderRadius="12px"
        bg={iconBg}
        align="center"
        justify="center"
        mb={4}
        fontSize="xl"
      >
        {icon}
      </Flex>
      <Text fontSize="md" fontWeight="bold" mb={2} color="text.default">
        {title}
      </Text>
      <Text color="text.muted" fontSize="sm">
        {description}
      </Text>
    </Box>
  )
}


function WarningTwoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        fill="none"
        stroke="#DC2626"
        strokeWidth="2"
      />
      <line x1="12" y1="9" x2="12" y2="13" stroke="#DC2626" strokeWidth="2" />
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="#DC2626" strokeWidth="2" />
    </svg>
  )
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        fill="none"
        stroke="#78684E"
        strokeWidth="2"
      />
      <line x1="16" y1="2" x2="16" y2="6" stroke="#78684E" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="#78684E" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="#78684E" strokeWidth="2" />
    </svg>
  )
}

function TimeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="#4E6478"
        strokeWidth="2"
      />
      <polyline
        points="12 6 12 12 16 14"
        fill="none"
        stroke="#4E6478"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Box borderWidth="1px" borderColor="border.default" borderRadius="md" overflow="hidden">
      <Flex
        as="button"
        w="100%"
        justify="space-between"
        align="center"
        py={3}
        px={4}
        cursor="pointer"
        bg="bg.surface"
        border="none"
        gap={4}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        _hover={{ bg: 'bg.page' }}
        transition="background 0.15s ease"
      >
        <Text fontWeight="600" textAlign="left" fontSize="md" color="text.default" flex="1">
          {question}
        </Text>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="18"
          height="18"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            transition: 'transform 0.25s ease',
            transform: isOpen ? 'rotate(45deg)' : 'none',
          }}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Flex>
      {isOpen && (
        <Box px={4} pb={3} pt={3} borderTopWidth="1px" borderColor="border.default">
          <Text color="text.muted" fontSize="sm" lineHeight="1.7">
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
      <Flex
        as="header"
        position="sticky"
        top={0}
        zIndex={100}
        bg="bg.surface"
        borderBottomWidth="1px"
        borderColor="border.default"
        h="64px"
        align="center"
        justify="space-between"
        px={8}
      >
        <Image
          src="/Logo_Unilien.svg"
          alt="Unilien"
          h="36px"
          objectFit="contain"
        />
        <Flex as="nav" gap={6} align="center" display={{ base: 'none', md: 'flex' }} aria-label="Navigation principale">
          <Link href="#fonctionnalites" color="text.muted" fontSize="sm" fontWeight="600" textDecoration="none" _hover={{ color: 'text.default' }}>
            Fonctionnalités
          </Link>
          <Link href="#conformite" color="text.muted" fontSize="sm" fontWeight="600" textDecoration="none" _hover={{ color: 'text.default' }}>
            Conformité
          </Link>
          <Link href="#tarifs" color="text.muted" fontSize="sm" fontWeight="600" textDecoration="none" _hover={{ color: 'text.default' }}>
            Tarifs
          </Link>
          <Link href="#faq" color="text.muted" fontSize="sm" fontWeight="600" textDecoration="none" _hover={{ color: 'text.default' }}>
            FAQ
          </Link>
        </Flex>
        <Flex gap={3} align="center">
          <Button
            asChild
            bg="transparent"
            color="text.secondary"
            borderWidth="1.5px"
            borderColor="border.default"
            fontFamily="heading"
            fontSize="xs"
            fontWeight="700"
            letterSpacing="0.01em"
            borderRadius="6px"
            px={4}
            py="7px"
            height="auto"
            boxShadow="none"
            _hover={{
              borderColor: 'brand.500',
              color: 'brand.500',
              bg: 'brand.subtle',
            }}
          >
            <RouterLink to="/connexion">Se connecter</RouterLink>
          </Button>
          <Button
            asChild
            bg="brand.500"
            color="white"
            fontFamily="heading"
            fontSize="xs"
            fontWeight="700"
            letterSpacing="0.01em"
            borderRadius="6px"
            px={4}
            py="7px"
            height="auto"
            boxShadow="sm"
            _hover={{
              bg: 'brand.600',
              boxShadow: 'md',
              transform: 'translateY(-1px)',
            }}
            _active={{
              transform: 'translateY(0)',
            }}
          >
            <RouterLink to="/inscription">Essai gratuit</RouterLink>
          </Button>
        </Flex>
      </Flex>

      {/* ── Hero ── */}
      <Box bg="bg.surface">
      <Grid
        templateColumns={{ base: '1fr', lg: '1fr 1fr' }}
        alignItems="center"
        gap={{ base: 6, lg: 16 }}
        minH={{ base: 'auto', lg: 'calc(100vh - 64px)' }}
        py={{ base: 10, lg: '60px' }}
        px={8}
        maxW="1200px"
        mx="auto"
      >
        <GridItem>
          <Stack gap={4}>
            <Flex
              as="span"
              align="center"
              gap={2}
              bg="accent.subtle"
              color="text.default"
              fontSize="xs"
              fontWeight="800"
              textTransform="uppercase"
              letterSpacing="0.08em"
              px={3}
              py="5px"
              borderRadius="full"
              maxW="fit-content"
              mb={0}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12" aria-hidden="true" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Pour les particuliers employeurs — conformité IDCC&nbsp;3239 automatisée
            </Flex>

            <Heading
              as="h1"
              fontFamily="heading"
              fontSize={{ base: '2xl', md: '3xl', lg: '42px' }}
              fontWeight="900"
              color="text.default"
              lineHeight="1.15"
              letterSpacing="-0.02em"
              mb={0}
            >
              Gérez vos auxiliaires en toute sérénité,{' '}
              <Text as="em" color="brand.500" fontStyle="normal">
                sans risque d&apos;erreur
              </Text>
            </Heading>

            <Text fontSize="lg" color="text.secondary" lineHeight="1.6" maxW="500px" mb={2}>
              UniLien simplifie vos plannings, sécurise vos démarches et vous protège automatiquement des erreurs administratives. Une solution pensée pour les particuliers employeurs, notamment en situation de handicap.
            </Text>

            <Flex gap={3} flexWrap="wrap" mb={4}>
              <Button
                asChild
                bg="brand.500"
                color="white"
                fontFamily="heading"
                fontSize="md"
                fontWeight="700"
                letterSpacing="0.01em"
                borderRadius="10px"
                px={8}
                py="14px"
                height="auto"
                boxShadow="sm"
                _hover={{ bg: 'brand.600', boxShadow: 'md', transform: 'translateY(-1px)' }}
                _active={{ transform: 'translateY(0)' }}
              >
                <RouterLink to="/inscription">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" />
                  </svg>
                  Essayer gratuitement 30 jours
                </RouterLink>
              </Button>
              <Button
                asChild
                variant="outline"
                borderColor="border.default"
                bg="transparent"
                color="text.secondary"
                fontFamily="heading"
                fontSize="md"
                fontWeight="700"
                letterSpacing="0.01em"
                borderRadius="10px"
                px={8}
                py="14px"
                height="auto"
                boxShadow="none"
                _hover={{ borderColor: 'brand.500', color: 'brand.500', bg: 'brand.subtle' }}
              >
                <RouterLink to="/contact">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" />
                  </svg>
                  Voir la démo
                </RouterLink>
              </Button>
            </Flex>

            <Stack gap={2}>
              {[
                'Aucune carte bancaire requise',
                'Accessible et simplifié',
                'Conforme IDCC 3239',
              ].map((text) => (
                <Flex key={text} align="center" gap={2}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#9BB23B" strokeWidth="2.5" width="15" height="15" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <Text fontSize="sm" color="text.muted" fontWeight="500">{text}</Text>
                </Flex>
              ))}
            </Stack>
          </Stack>
        </GridItem>

        <GridItem display={{ base: 'none', lg: 'block' }}>
          <Box
            bg="brand.500"
            borderRadius="xl"
            p={6}
            boxShadow="lg"
            color="white"
          >
            <Text
              fontFamily="heading"
              fontSize="sm"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="0.06em"
              mb={4}
            >
              🛡️ Bouclier Juridique — actif
            </Text>

            <Flex align="flex-start" gap={3} py={3} borderBottomWidth="1px" borderColor="rgba(255,255,255,0.12)">
              <Box w="8px" h="8px" borderRadius="full" bg="#FF6B6B" mt="5px" flexShrink={0} />
              <Box>
                <Text fontSize="sm" fontWeight="700">Repos 11h non respecté — Bloqué</Text>
                <Text fontSize="xs" mt={1}>&quot;Marie doit se reposer jusqu&apos;à 7h demain.&quot;</Text>
              </Box>
            </Flex>

            <Flex align="flex-start" gap={3} py={3} borderBottomWidth="1px" borderColor="rgba(255,255,255,0.12)">
              <Box w="8px" h="8px" borderRadius="full" bg="#FF6B6B" mt="5px" flexShrink={0} />
              <Box>
                <Text fontSize="sm" fontWeight="700">Pause 20 min oubliée — Bloqué</Text>
                <Text fontSize="xs" mt={1}>&quot;Pause obligatoire si intervention {'>'} 6h.&quot;</Text>
              </Box>
            </Flex>

            <Flex align="flex-start" gap={3} py={3} borderBottomWidth="1px" borderColor="rgba(255,255,255,0.12)">
              <Box w="8px" h="8px" borderRadius="full" bg="#86EFAC" mt="5px" flexShrink={0} />
              <Box>
                <Text fontSize="sm" fontWeight="700">Planning de la semaine — Conforme ✓</Text>
                <Text fontSize="xs" mt={1}>Toutes les règles IDCC 3239 respectées.</Text>
              </Box>
            </Flex>

            <Flex align="flex-start" gap={3} py={3} borderBottomWidth="1px" borderColor="rgba(255,255,255,0.12)">
              <Box w="8px" h="8px" borderRadius="full" bg="white" mt="5px" flexShrink={0} />
              <Box>
                <Text fontSize="sm" fontWeight="700">Majorations calculées automatiquement</Text>
                <Text fontSize="xs" mt={1}>Dimanche +30% · Nuit +25% · Férié +60%</Text>
              </Box>
            </Flex>

            <Flex align="flex-start" gap={3} py={3}>
              <Box w="8px" h="8px" borderRadius="full" bg="#86EFAC" mt="5px" flexShrink={0} />
              <Box>
                <Text fontSize="sm" fontWeight="700">−40 % de charge administrative</Text>
                <Text fontSize="xs" mt={1}>En moyenne 3h récupérées par semaine.</Text>
              </Box>
            </Flex>
          </Box>
        </GridItem>
      </Grid>
      </Box>

      {/* ── Chiffres cles ── */}
      <Box py={8} bg="bg.page" borderTopWidth="1px" borderBottomWidth="1px" borderColor="border.default">
        <Container maxW="container.lg">
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={6}>
            <StatItem value="280 000" label="Particuliers employeurs en France" />
            <StatItem value="2 000+" label="Situations à risque chaque année" />
            <StatItem value="8 000 €" label="Coût moyen d'une erreur" />
            <StatItem value="-40 %" label="De charge administrative avec UniLien" />
          </Grid>
        </Container>
      </Box>

      {/* ── Section Problemes ── */}
      <Box py="80px" bg="bg.page">
        <Container maxW="container.xl">
          <Stack gap={12}>
            <Box textAlign="center">
              <Heading fontSize="2xl" fontWeight="bold" color="text.default" mb={3}>
                Gérer vos auxiliaires, c&apos;est gérer une organisation complexe
              </Heading>
              <Text color="text.muted" maxW="420px" mx="auto" textAlign="center">
                Et pourtant, vous n&apos;avez pas à le faire seul.
              </Text>
            </Box>
            <Box maxW="1100px" mx="auto">
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
                <PainPointCard
                  iconBg="danger.subtle"
                  icon={<WarningTwoIcon width={24} height={24} />}
                  title="Je veux être sûr de bien faire"
                  description="Les règles évoluent et sont difficiles à suivre seul."
                />
                <PainPointCard
                  iconBg="warm.subtle"
                  icon={<CalendarIcon width={24} height={24} />}
                  title="Mes outils ne sont pas adaptés"
                  description="Les solutions classiques ne prennent pas en compte ma réalité."
                />
                <PainPointCard
                  iconBg="brand.subtle"
                  icon={<TimeIcon width={24} height={24} />}
                  title="Je manque de visibilité"
                  description="Organiser les plannings devient vite complexe au quotidien."
                />
              </Grid>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* ── Section Fonctionnalites ── */}
      <Box py="80px" bg="bg.surface" id="fonctionnalites">
        <Container maxW="container.xl">
          <Stack gap={10}>
            <Box textAlign="center" maxW="600px" mx="auto">
              <Heading fontSize="2xl" fontWeight="900" color="text.default" mb={3}>
                Tout ce dont vous avez besoin, réuni en un seul endroit
              </Heading>
              <Text color="text.muted" fontSize="lg">
                Une plateforme pensée pour simplifier chaque étape, de la planification à la gestion administrative.
              </Text>
            </Box>
            <Box maxW="1100px" mx="auto">
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={5}>
                <FeatureCard
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  }
                  title="Planning intelligent"
                  description="Organisez simplement vos interventions, sans erreur."
                />
                <FeatureCard
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" width="24" height="24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  }
                  iconBg="danger.subtle"
                  title="Bouclier juridique"
                  description="Sécurisez automatiquement vos plannings."
                />
                <FeatureCard
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="#9BB23B" strokeWidth="2" width="24" height="24">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  }
                  iconBg="accent.subtle"
                  title="Calcul de paie automatique"
                  description="Gagnez du temps et évitez les erreurs."
                />
                <FeatureCard
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  }
                  title="Cahier de liaison"
                  description="Gardez un lien clair avec vos intervenants."
                />
                <FeatureCard
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="#78684E" strokeWidth="2" width="24" height="24">
                      <path d="M18 8h1a4 4 0 010 8h-1" />
                      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                      <line x1="6" y1="1" x2="6" y2="4" />
                      <line x1="10" y1="1" x2="10" y2="4" />
                      <line x1="14" y1="1" x2="14" y2="4" />
                    </svg>
                  }
                  iconBg="warm.subtle"
                  title="Notifications"
                  description="Restez informé sans y penser."
                />
                <FeatureCard
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="#9BB23B" strokeWidth="2" width="24" height="24">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  }
                  iconBg="accent.subtle"
                  title="Tableaux PCH"
                  description="Suivez vos droits et votre budget facilement."
                />
              </Grid>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* ── Section Conformite ── */}
      <Box py="80px" bg="bg.page" id="conformite">
        <Container maxW="container.xl">
          <Stack gap={10}>
            <Box textAlign="center" maxW="600px" mx="auto">
              <Heading fontSize="2xl" fontWeight="900" color="text.default" mb={3}>
                Une protection automatique, sans effort
              </Heading>
              <Text color="text.muted" fontSize="lg">
                UniLien détecte et bloque les erreurs avant qu&apos;elles ne deviennent un problème.
              </Text>
            </Box>
            <Stack maxW="680px" mx="auto" w="100%" gap={3}>
              {/* Alerte danger */}
              <Flex
                align="flex-start"
                gap={3}
                py={3}
                px={4}
                bg="danger.subtle"
                borderRadius="md"
                borderLeftWidth="3px"
                borderLeftColor="danger.500"
                color="danger.500"
                role="alert"
              >
                <Box w="18px" h="18px" flexShrink={0} mt="2px">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </Box>
                <Box>
                  <Text fontWeight="700" fontSize="sm">Repos 11h non respecté — Bloqué</Text>
                  <Text fontSize="xs" mt="2px">Marie doit avoir terminé à 21h pour reprendre à 8h. Cette intervention est impossible.</Text>
                </Box>
              </Flex>
              {/* Alerte warning */}
              <Flex
                align="flex-start"
                gap={3}
                py={3}
                px={4}
                bg="warm.subtle"
                borderRadius="md"
                borderLeftWidth="3px"
                borderLeftColor="warm.600"
                color="warm.600"
                role="alert"
              >
                <Box w="18px" h="18px" flexShrink={0} mt="2px">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </Box>
                <Box>
                  <Text fontWeight="700" fontSize="sm">Pause 20 min manquante — AVERTISSEMENT</Text>
                  <Text fontSize="xs" mt="2px">Intervention de 7h sans pause. L&apos;Art. L3121-16 exige une pause si {'>'} 6h consécutives.</Text>
                </Box>
              </Flex>
              {/* Alerte success */}
              <Flex
                align="flex-start"
                gap={3}
                py={3}
                px={4}
                bg="accent.subtle"
                borderRadius="md"
                borderLeftWidth="3px"
                borderLeftColor="accent.solid"
                color="text.default"
                role="status"
              >
                <Box w="18px" h="18px" flexShrink={0} mt="2px">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </Box>
                <Box>
                  <Text fontWeight="700" fontSize="sm">Planning de la semaine — Conforme</Text>
                  <Text fontSize="xs" mt="2px">Toutes les règles IDCC 3239 sont respectées. Vous êtes protégé·e.</Text>
                </Box>
              </Flex>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* ── Temoignages ── */}
      <Box py="80px" bg="bg.surface">
        <Container maxW="container.xl">
          <Stack gap={10}>
            <Box textAlign="center">
              <Heading fontSize="2xl" fontWeight="900" color="text.default">
                Ils nous font confiance
              </Heading>
            </Box>
            <Box maxW="1100px" mx="auto">
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={5}>
                {/* Claire Fontaine */}
                <Box p={6} bg="bg.surface" borderRadius="md" borderWidth="1px" borderColor="border.default">
                  <Text color="text.secondary" fontStyle="italic" mb={4} fontSize="sm" lineHeight="1.7">
                    &quot;Avant Unilien, je passais 3h par semaine sur Excel à vérifier que mon planning était légal. Maintenant c&apos;est automatique. J&apos;ai récupéré ce temps pour ma famille.&quot;
                  </Text>
                  <Flex align="center" gap={3}>
                    <Flex
                      w="36px"
                      h="36px"
                      borderRadius="full"
                      bg="brand.500"
                      color="white"
                      align="center"
                      justify="center"
                      fontSize="13px"
                      fontWeight="800"
                      fontFamily="heading"
                      flexShrink={0}
                    >
                      CF
                    </Flex>
                    <Box>
                      <Text fontWeight="700" fontSize="sm" color="text.default">Claire Fontaine</Text>
                      <Text fontSize="xs" color="text.muted">Employeur particulier — Tétraplégie C6</Text>
                    </Box>
                  </Flex>
                </Box>
                {/* Jean-Dominique Moreau */}
                <Box p={6} bg="bg.surface" borderRadius="md" borderWidth="1px" borderColor="border.default">
                  <Text color="text.secondary" fontStyle="italic" mb={4} fontSize="sm" lineHeight="1.7">
                    &quot;Le bouclier juridique m&apos;a évité deux erreurs de planning qui auraient pu finir aux Prud&apos;hommes. L&apos;investissement est largement rentabilisé.&quot;
                  </Text>
                  <Flex align="center" gap={3}>
                    <Flex
                      w="36px"
                      h="36px"
                      borderRadius="full"
                      bg="accent.subtle"
                      color="accent.fg"
                      align="center"
                      justify="center"
                      fontSize="13px"
                      fontWeight="800"
                      fontFamily="heading"
                      flexShrink={0}
                    >
                      JD
                    </Flex>
                    <Box>
                      <Text fontWeight="700" fontSize="sm" color="text.default">Jean-Dominique Moreau</Text>
                      <Text fontSize="xs" color="text.muted">Bénéficiaire PCH — Paris 11e</Text>
                    </Box>
                  </Flex>
                </Box>
                {/* Sophie Martin */}
                <Box p={6} bg="bg.surface" borderRadius="md" borderWidth="1px" borderColor="border.default">
                  <Text color="text.secondary" fontStyle="italic" mb={4} fontSize="sm" lineHeight="1.7">
                    &quot;La commande vocale change tout. Je peux gérer mon planning depuis mon fauteuil sans avoir à manipuler une souris. C&apos;est le seul outil qui soit vraiment accessible.&quot;
                  </Text>
                  <Flex align="center" gap={3}>
                    <Flex
                      w="36px"
                      h="36px"
                      borderRadius="full"
                      bg="warm.subtle"
                      color="warm.600"
                      align="center"
                      justify="center"
                      fontSize="13px"
                      fontWeight="800"
                      fontFamily="heading"
                      flexShrink={0}
                    >
                      SM
                    </Flex>
                    <Box>
                      <Text fontWeight="700" fontSize="sm" color="text.default">Sophie Martin</Text>
                      <Text fontSize="xs" color="text.muted">Employeur particulier — Sclérose en plaques</Text>
                    </Box>
                  </Flex>
                </Box>
              </Grid>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* ── Tarifs ── */}
      <Box py="80px" bg="bg.page" id="tarifs">
        <Container maxW="container.xl">
          <Stack gap={10} align="center">

            {/* Titre section */}
            <Box textAlign="center" maxW="560px">
              <Heading fontSize="2xl" fontWeight="900" color="text.default" mb={3}>
                Essayez UniLien gratuitement pendant 30 jours
              </Heading>
              <Text color="text.muted" fontSize="lg">
                Sans carte bancaire. Sans engagement. Résiliable à tout moment.
              </Text>
            </Box>

            {/* Card unique */}
            <Box
              w="100%"
              maxW="460px"
              bg="bg.surface"
              borderRadius="2xl"
              borderWidth="2px"
              borderColor="brand.500"
              boxShadow="0 8px 40px -8px rgba(0,0,0,0.12)"
              overflow="visible"
              position="relative"
              pt={10}
              pb={8}
              px={8}
            >
              {/* Badge "30 jours offerts" */}
              <Flex
                position="absolute"
                top="-14px"
                left="50%"
                transform="translateX(-50%)"
                bg="brand.500"
                color="white"
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.06em"
                textTransform="uppercase"
                px={4}
                py="5px"
                borderRadius="full"
                whiteSpace="nowrap"
                boxShadow="sm"
              >
                30 jours offerts
              </Flex>

              {/* Nom du plan */}
              <Text
                fontSize="sm"
                fontWeight="700"
                textTransform="uppercase"
                letterSpacing="0.1em"
                color="brand.500"
                mb={2}
                textAlign="center"
              >
                Essentiel
              </Text>

              {/* Prix */}
              <Flex align="baseline" justify="center" gap={1} mb={1}>
                <Text fontFamily="heading" fontSize="4xl" fontWeight="900" color="text.default" lineHeight="1">
                  9,90 €
                </Text>
                <Text fontSize="sm" color="text.muted" fontWeight="500">
                  / mois
                </Text>
              </Flex>
              <Text fontSize="xs" color="text.muted" textAlign="center" mb={7}>
                après l&apos;essai gratuit
              </Text>

              {/* Séparateur */}
              <Box borderTopWidth="1px" borderColor="border.default" mb={6} />

              {/* Features */}
              <Stack gap={3} mb={7}>
                {[
                  'Auxiliaires illimités',
                  'Bulletins de paie PDF',
                  'Conformité IDCC 3239 automatique',
                  'Export planning (PDF, iCal)',
                  'Dashboard PCH',
                  'Cahier de liaison',
                ].map((feat) => (
                  <Flex key={feat} align="center" gap={3}>
                    <Flex
                      w="20px"
                      h="20px"
                      borderRadius="full"
                      bg="accent.subtle"
                      align="center"
                      justify="center"
                      flexShrink={0}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="#9BB23B" strokeWidth="3" width="11" height="11" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </Flex>
                    <Text fontSize="sm" color="text.default" fontWeight="500">
                      {feat}
                    </Text>
                  </Flex>
                ))}
              </Stack>

              {/* CTA */}
              <Button
                asChild
                w="100%"
                bg="brand.500"
                color="white"
                fontFamily="heading"
                fontSize="md"
                fontWeight="700"
                letterSpacing="0.01em"
                borderRadius="xl"
                py="14px"
                height="auto"
                boxShadow="sm"
                _hover={{ bg: 'brand.600', boxShadow: 'md', transform: 'translateY(-1px)' }}
                _active={{ transform: 'translateY(0)' }}
                mb={4}
              >
                <RouterLink to="/inscription">
                  Commencer gratuitement
                </RouterLink>
              </Button>

              {/* Réassurance */}
              <Text fontSize="xs" color="text.muted" textAlign="center">
                ✔ Aucune carte bancaire · ✔ Résiliable à tout moment
              </Text>
            </Box>

          </Stack>
        </Container>
      </Box>

      {/* ── FAQ ── */}
      <Box py="80px" bg="bg.surface" id="faq">
        <Container maxW="container.xl">
          <Stack gap={8}>
            <Box textAlign="center">
              <Heading fontSize="2xl" fontWeight="bold" color="text.default">
                Questions fréquentes
              </Heading>
            </Box>
            <Stack maxW="720px" w="100%" mx="auto" gap={2}>
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
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* ── CTA Banner ── */}
      <Flex direction="column" align="center" py="80px" px={8} bg="brand.500" textAlign="center">
        <Heading fontSize="3xl" fontWeight="900" color="white" mb={3}>
          Simplifiez votre quotidien dès aujourd&apos;hui
        </Heading>
        <Text fontSize="lg" color="white" mb={6}>
          UniLien vous accompagne pour gérer vos auxiliaires sereinement, en toute confiance.
        </Text>
        <Button
          asChild
          bg="accent.500"
          color="white"
          fontFamily="heading"
          fontSize="md"
          fontWeight="700"
          letterSpacing="0.01em"
          borderRadius="md"
          px={8}
          py="14px"
          height="auto"
          boxShadow="sm"
          _hover={{ bg: 'accent.600', boxShadow: 'md', transform: 'translateY(-1px)' }}
          _active={{ transform: 'translateY(0)' }}
        >
          <RouterLink to="/inscription">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Commencer gratuitement
          </RouterLink>
        </Button>
      </Flex>

      {/* ── Footer ── */}
      <Box as="footer" py={10} px={8} bg="bg.page" borderTopWidth="1px" borderColor="border.default" role="contentinfo">
        <Grid
          templateColumns={{ base: '1fr 1fr', md: '2fr 1fr 1fr 1fr' }}
          gap={8}
          maxW="1100px"
          mx="auto"
          mb={8}
        >
          <Box>
            <Text fontFamily="heading" fontSize="sm" fontWeight="700" color="text.default" mb={4}>
              Unilien
            </Text>
            <Text color="text.muted" fontSize="sm" lineHeight="1.7" maxW="260px">
              Le premier outil de gestion d&apos;auxiliaires de vie avec protection juridique automatique IDCC 3239.
            </Text>
          </Box>

          <Box>
            <Text fontFamily="heading" fontSize="sm" fontWeight="700" color="text.default" mb={4}>
              Produit
            </Text>
            <Stack gap={2}>
              <Link href="#fonctionnalites" color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                Fonctionnalités
              </Link>
              <Link href="#conformite" color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                Conformité IDCC 3239
              </Link>
              <Link href="#tarifs" color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                Tarifs
              </Link>
              <Link href="#faq" color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                FAQ
              </Link>
            </Stack>
          </Box>

          <Box>
            <Text fontFamily="heading" fontSize="sm" fontWeight="700" color="text.default" mb={4}>
              Légal
            </Text>
            <Stack gap={2}>
              <Link href="#" color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                Mentions légales
              </Link>
              <Link href="#" color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                Politique de confidentialité
              </Link>
              <Link href="#" color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                CGU
              </Link>
              <Link href="#" color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                RGPD
              </Link>
            </Stack>
          </Box>

          <Box>
            <Text fontFamily="heading" fontSize="sm" fontWeight="700" color="text.default" mb={4}>
              Support
            </Text>
            <Stack gap={2}>
              <Link asChild color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                <RouterLink to="/contact">Contact</RouterLink>
              </Link>
              <Link href="#" color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                Documentation
              </Link>
              <Link href="#" color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                Accessibilité (DSFR)
              </Link>
              <Link href="https://github.com/zephdev-92/Unilien" color="text.muted" fontSize="sm" _hover={{ color: 'text.default' }}>
                GitHub
              </Link>
            </Stack>
          </Box>
        </Grid>

        <Flex
          maxW="1100px"
          mx="auto"
          borderTopWidth="1px"
          borderColor="border.default"
          pt={5}
          justify="space-between"
          align="center"
          gap={4}
          flexDirection={{ base: 'column', md: 'row' }}
        >
          <Text fontSize="xs" color="text.muted">
            © {new Date().getFullYear()} Unilien. Tous droits réservés. Convention IDCC 3239.
          </Text>
          <Text fontSize="xs" color="text.muted">
            Fait avec ♥ pour les personnes en situation de handicap.
          </Text>
        </Flex>
      </Box>
    </Box>
  )
}

export default HomePage
