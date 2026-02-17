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
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'

// Feature card component
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
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
      <Text fontSize="3xl" mb={4}>
        {icon}
      </Text>
      <Text fontSize="lg" fontWeight="bold" mb={2} color="gray.800">
        {title}
      </Text>
      <Text color="gray.600" fontSize="sm">
        {description}
      </Text>
    </Box>
  )
}

// Testimonial component
function Testimonial({
  quote,
  author,
  role,
}: {
  quote: string
  author: string
  role: string
}) {
  return (
    <Box p={6} bg="white" borderRadius="xl" boxShadow="sm">
      <Text color="gray.700" fontStyle="italic" mb={4}>
        "{quote}"
      </Text>
      <Text fontWeight="bold" color="gray.800">
        {author}
      </Text>
      <Text fontSize="sm" color="gray.500">
        {role}
      </Text>
    </Box>
  )
}

export function HomePage() {
  return (
    <Box minH="100vh">
      {/* Navigation */}
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
          <Flex h="100px" align="center" justify="space-between">
            <Image
              src="/Logo_Unilien.svg"
              alt="Unilien"
              h="40px"
              objectFit="contain"
            />
            <Flex gap={4} align="center">
              <Link asChild color="gray.600" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/contact">Contact</RouterLink>
              </Link>
              <Link asChild color="gray.600" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/login">Connexion</RouterLink>
              </Link>
              <AccessibleButton asChild colorPalette="blue" size="sm">
                <RouterLink to="/signup">S'inscrire gratuitement</RouterLink>
              </AccessibleButton>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box
        pt="180px"
        pb="80px"
        bgGradient="to-br"
        gradientFrom="brand.50"
        gradientTo="white"
      >
        <Container maxW="container.xl">
          <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={12} alignItems="center">
            <GridItem>
              <Stack gap={6}>
                <Text
                  fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
                  fontWeight="bold"
                  color="gray.900"
                  lineHeight="1.2"
                >
                  Simplifiez la gestion de vos{' '}
                  <Text as="span" color="brand.500">
                    auxiliaires de vie
                  </Text>
                </Text>
                <Text fontSize="xl" color="gray.600" maxW="500px">
                  Unilien connecte les particuliers employeurs et leurs auxiliaires
                  pour une gestion simplifiée du planning, de la paie et de la communication.
                </Text>
                <Flex gap={4} flexWrap="wrap">
                  <AccessibleButton asChild colorPalette="blue" size="lg">
                    <RouterLink to="/signup">Commencer gratuitement</RouterLink>
                  </AccessibleButton>
                  <AccessibleButton asChild variant="outline" size="lg">
                    <RouterLink to="/contact">Nous contacter</RouterLink>
                  </AccessibleButton>
                </Flex>
                <Flex gap={6} color="gray.500" fontSize="sm">
                  <Text>Gratuit pour commencer</Text>
                  <Text>Sans engagement</Text>
                  <Text>Support inclus</Text>
                </Flex>
              </Stack>
            </GridItem>
            <GridItem display={{ base: 'none', lg: 'block' }}>
              <Box
                bg="brand.100"
                borderRadius="2xl"
                p={8}
                aspectRatio={4 / 3}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="6xl">👨‍👩‍👧‍👦</Text>
              </Box>
            </GridItem>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py="80px" bg="gray.50">
        <Container maxW="container.xl">
          <Stack gap={12}>
            <Box textAlign="center">
              <Text fontSize="3xl" fontWeight="bold" color="gray.900" mb={4}>
                Tout ce dont vous avez besoin
              </Text>
              <Text fontSize="lg" color="gray.600" maxW="600px" mx="auto">
                Une plateforme complète pour gérer votre relation employeur-auxiliaire
              </Text>
            </Box>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6}>
              <FeatureCard
                icon="📅"
                title="Planning partagé"
                description="Gérez les interventions, absences et disponibilités en temps réel"
              />
              <FeatureCard
                icon="💬"
                title="Messagerie intégrée"
                description="Communiquez facilement avec votre équipe via le chat sécurisé"
              />
              <FeatureCard
                icon="📝"
                title="Cahier de liaison"
                description="Suivez les transmissions et informations importantes au quotidien"
              />
              <FeatureCard
                icon="⚖️"
                title="Conformité légale"
                description="Vérification automatique du respect du droit du travail"
              />
              <FeatureCard
                icon="📊"
                title="Export CESU/PAJEMPLOI"
                description="Générez vos déclarations mensuelles en un clic"
              />
              <FeatureCard
                icon="👥"
                title="Gestion d'équipe"
                description="Gérez plusieurs auxiliaires et leurs contrats facilement"
              />
              <FeatureCard
                icon="🔔"
                title="Notifications"
                description="Restez informé des événements importants en temps réel"
              />
              <FeatureCard
                icon="♿"
                title="Accessibilité"
                description="Interface adaptée pour tous les utilisateurs"
              />
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* For Who Section */}
      <Box py="80px">
        <Container maxW="container.xl">
          <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={12}>
            <Box p={8} bg="blue.50" borderRadius="2xl">
              <Text fontSize="2xl" fontWeight="bold" color="blue.800" mb={4}>
                Pour les particuliers employeurs
              </Text>
              <Stack gap={3}>
                <Flex align="center" gap={3}>
                  <Text color="blue.500">✓</Text>
                  <Text color="blue.700">Planifiez les interventions facilement</Text>
                </Flex>
                <Flex align="center" gap={3}>
                  <Text color="blue.500">✓</Text>
                  <Text color="blue.700">Gérez les contrats et la paie</Text>
                </Flex>
                <Flex align="center" gap={3}>
                  <Text color="blue.500">✓</Text>
                  <Text color="blue.700">Générez les déclarations CESU/PAJEMPLOI</Text>
                </Flex>
                <Flex align="center" gap={3}>
                  <Text color="blue.500">✓</Text>
                  <Text color="blue.700">Communiquez avec votre équipe</Text>
                </Flex>
              </Stack>
              <AccessibleButton asChild colorPalette="blue" mt={6}>
                <RouterLink to="/signup?role=employer">S'inscrire comme employeur</RouterLink>
              </AccessibleButton>
            </Box>

            <Box p={8} bg="green.50" borderRadius="2xl">
              <Text fontSize="2xl" fontWeight="bold" color="green.800" mb={4}>
                Pour les auxiliaires de vie
              </Text>
              <Stack gap={3}>
                <Flex align="center" gap={3}>
                  <Text color="green.500">✓</Text>
                  <Text color="green.700">Consultez votre planning en temps réel</Text>
                </Flex>
                <Flex align="center" gap={3}>
                  <Text color="green.500">✓</Text>
                  <Text color="green.700">Déclarez vos absences facilement</Text>
                </Flex>
                <Flex align="center" gap={3}>
                  <Text color="green.500">✓</Text>
                  <Text color="green.700">Communiquez avec vos employeurs</Text>
                </Flex>
                <Flex align="center" gap={3}>
                  <Text color="green.500">✓</Text>
                  <Text color="green.700">Suivez vos heures et interventions</Text>
                </Flex>
              </Stack>
              <AccessibleButton asChild colorPalette="green" mt={6}>
                <RouterLink to="/signup?role=employee">S'inscrire comme auxiliaire</RouterLink>
              </AccessibleButton>
            </Box>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials */}
      <Box py="80px" bg="gray.50">
        <Container maxW="container.xl">
          <Stack gap={12}>
            <Box textAlign="center">
              <Text fontSize="3xl" fontWeight="bold" color="gray.900" mb={4}>
                Ils nous font confiance
              </Text>
            </Box>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
              <Testimonial
                quote="Unilien a transformé ma façon de gérer les interventions. Plus de confusion sur les horaires !"
                author="Marie D."
                role="Particulier employeur"
              />
              <Testimonial
                quote="Je peux enfin voir mon planning sur mon téléphone et communiquer facilement avec mes employeurs."
                author="Sophie L."
                role="Auxiliaire de vie"
              />
              <Testimonial
                quote="Les déclarations CESU sont générées automatiquement. Un gain de temps énorme !"
                author="Pierre M."
                role="Particulier employeur"
              />
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py="80px" bg="brand.500">
        <Container maxW="container.xl">
          <Stack gap={6} align="center" textAlign="center">
            <Text fontSize="3xl" fontWeight="bold" color="white">
              Prêt à simplifier votre quotidien ?
            </Text>
            <Text fontSize="lg" color="whiteAlpha.900" maxW="500px">
              Rejoignez des milliers d'utilisateurs qui font confiance à Unilien
            </Text>
            <Flex gap={4}>
              <AccessibleButton asChild size="lg" bg="white" color="brand.500" _hover={{ bg: 'gray.100' }}>
                <RouterLink to="/signup">Créer un compte gratuit</RouterLink>
              </AccessibleButton>
              <AccessibleButton asChild size="lg" variant="outline" borderColor="white" color="white" _hover={{ bg: 'whiteAlpha.200' }}>
                <RouterLink to="/contact">Nous contacter</RouterLink>
              </AccessibleButton>
            </Flex>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box py={12} bg="gray.900">
        <Container maxW="container.xl">
          <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={8}>
            <Stack gap={4}>
              <Text fontSize="xl" fontWeight="bold" color="white">
                Unilien
              </Text>
              <Text color="gray.400" fontSize="sm">
                La plateforme qui simplifie la relation entre particuliers employeurs
                et auxiliaires de vie.
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text fontWeight="semibold" color="white">
                Produit
              </Text>
              <Link asChild color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
                <RouterLink to="/signup">S'inscrire</RouterLink>
              </Link>
              <Link asChild color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
                <RouterLink to="/login">Connexion</RouterLink>
              </Link>
            </Stack>

            <Stack gap={4}>
              <Text fontWeight="semibold" color="white">
                Support
              </Text>
              <Link asChild color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
                <RouterLink to="/contact">Contact</RouterLink>
              </Link>
            </Stack>

            <Stack gap={4}>
              <Text fontWeight="semibold" color="white">
                Légal
              </Text>
              <Link color="gray.400" fontSize="sm" _hover={{ color: 'white' }} href="#">
                Mentions légales
              </Link>
              <Link color="gray.400" fontSize="sm" _hover={{ color: 'white' }} href="#">
                Politique de confidentialité
              </Link>
              <Link color="gray.400" fontSize="sm" _hover={{ color: 'white' }} href="#">
                CGU
              </Link>
            </Stack>
          </Grid>

          <Box borderTopWidth="1px" borderColor="gray.800" mt={8} pt={8}>
            <Text textAlign="center" color="gray.500" fontSize="sm">
              © {new Date().getFullYear()} Unilien. Tous droits réservés.
            </Text>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}

export default HomePage
