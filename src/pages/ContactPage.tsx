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
  Link,
  Textarea,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AccessibleButton, AccessibleInput, AccessibleSelect } from '@/components/ui'

const contactSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  subject: z.enum(['general', 'support', 'partnership', 'press'], {
    required_error: 'Veuillez sélectionner un sujet',
  }),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères'),
})

type ContactFormData = z.infer<typeof contactSchema>

const subjectOptions = [
  { value: 'general', label: 'Question générale' },
  { value: 'support', label: 'Support technique' },
  { value: 'partnership', label: 'Partenariat' },
  { value: 'press', label: 'Presse' },
]

function ContactInfo({
  icon,
  title,
  content,
}: {
  icon: string
  title: string
  content: string
}) {
  return (
    <Flex gap={4} align="start">
      <Box
        w={12}
        h={12}
        bg="brand.100"
        borderRadius="lg"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Text fontSize="xl">{icon}</Text>
      </Box>
      <Box>
        <Text fontWeight="semibold" color="gray.800" mb={1}>
          {title}
        </Text>
        <Text color="gray.600">{content}</Text>
      </Box>
    </Flex>
  )
}

export function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    console.log('Contact form submitted:', data)
    setIsSubmitting(false)
    setIsSubmitted(true)
    reset()
  }

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
          <Flex h="64px" align="center" justify="space-between">
            <Link asChild>
              <RouterLink to="/">
                <Text fontSize="xl" fontWeight="bold" color="brand.500">
                  Unilien
                </Text>
              </RouterLink>
            </Link>
            <Flex gap={4} align="center">
              <Link asChild color="gray.600" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/">Accueil</RouterLink>
              </Link>
              <Link asChild color="gray.600" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/login">Connexion</RouterLink>
              </Link>
              <AccessibleButton asChild colorPalette="blue" size="sm">
                <RouterLink to="/signup">S'inscrire</RouterLink>
              </AccessibleButton>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Hero */}
      <Box pt="120px" pb="60px" bg="gray.50">
        <Container maxW="container.xl">
          <Stack gap={4} textAlign="center" maxW="600px" mx="auto">
            <Text fontSize="4xl" fontWeight="bold" color="gray.900">
              Contactez-nous
            </Text>
            <Text fontSize="lg" color="gray.600">
              Une question ? Une suggestion ? Notre équipe est là pour vous aider.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Contact Form & Info */}
      <Box py="60px">
        <Container maxW="container.xl">
          <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={12}>
            {/* Form */}
            <GridItem>
              <Box bg="white" p={8} borderRadius="xl" boxShadow="md">
                {isSubmitted ? (
                  <Stack gap={6} textAlign="center" py={8}>
                    <Text fontSize="4xl">✅</Text>
                    <Text fontSize="xl" fontWeight="bold" color="gray.800">
                      Message envoyé !
                    </Text>
                    <Text color="gray.600">
                      Merci pour votre message. Notre équipe vous répondra dans les plus brefs délais.
                    </Text>
                    <AccessibleButton onClick={() => setIsSubmitted(false)}>
                      Envoyer un autre message
                    </AccessibleButton>
                  </Stack>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack gap={5}>
                      <Text fontSize="xl" fontWeight="bold" color="gray.800">
                        Envoyez-nous un message
                      </Text>

                      <AccessibleInput
                        label="Votre nom"
                        placeholder="Jean Dupont"
                        error={errors.name?.message}
                        required
                        {...register('name')}
                      />

                      <AccessibleInput
                        label="Votre email"
                        type="email"
                        placeholder="jean.dupont@email.com"
                        error={errors.email?.message}
                        required
                        {...register('email')}
                      />

                      <AccessibleSelect
                        label="Sujet"
                        options={subjectOptions}
                        placeholder="Sélectionnez un sujet"
                        error={errors.subject?.message}
                        required
                        {...register('subject')}
                      />

                      <Box>
                        <Text fontWeight="medium" fontSize="md" mb={2}>
                          Votre message <Text as="span" color="red.500">*</Text>
                        </Text>
                        <Textarea
                          placeholder="Décrivez votre demande..."
                          rows={5}
                          borderWidth="2px"
                          borderColor={errors.message ? 'red.500' : 'gray.200'}
                          _hover={{ borderColor: errors.message ? 'red.500' : 'gray.300' }}
                          _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                          {...register('message')}
                        />
                        {errors.message && (
                          <Text color="red.500" fontSize="sm" mt={1}>
                            {errors.message.message}
                          </Text>
                        )}
                      </Box>

                      <AccessibleButton
                        type="submit"
                        colorPalette="blue"
                        size="lg"
                        loading={isSubmitting}
                        loadingText="Envoi en cours..."
                      >
                        Envoyer le message
                      </AccessibleButton>
                    </Stack>
                  </form>
                )}
              </Box>
            </GridItem>

            {/* Contact Info */}
            <GridItem>
              <Stack gap={8}>
                <Box>
                  <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={6}>
                    Autres moyens de nous contacter
                  </Text>
                  <Stack gap={6}>
                    <ContactInfo
                      icon="📧"
                      title="Email"
                      content="contact@unilien.fr"
                    />
                    <ContactInfo
                      icon="📞"
                      title="Téléphone"
                      content="01 23 45 67 89 (Lun-Ven, 9h-18h)"
                    />
                    <ContactInfo
                      icon="📍"
                      title="Adresse"
                      content="123 Rue de l'Innovation, 75001 Paris"
                    />
                  </Stack>
                </Box>

                {/* FAQ Shortcut */}
                <Box bg="blue.50" p={6} borderRadius="xl">
                  <Text fontWeight="bold" color="blue.800" mb={2}>
                    Questions fréquentes
                  </Text>
                  <Text color="blue.700" fontSize="sm" mb={4}>
                    Consultez notre FAQ pour trouver rapidement des réponses à vos questions.
                  </Text>
                  <Stack gap={2}>
                    <Text color="blue.600" fontSize="sm">
                      • Comment créer un compte ?
                    </Text>
                    <Text color="blue.600" fontSize="sm">
                      • Comment ajouter un auxiliaire ?
                    </Text>
                    <Text color="blue.600" fontSize="sm">
                      • Comment générer une déclaration CESU ?
                    </Text>
                  </Stack>
                </Box>

                {/* Response Time */}
                <Box bg="green.50" p={6} borderRadius="xl">
                  <Flex gap={3} align="center" mb={2}>
                    <Text fontSize="xl">⚡</Text>
                    <Text fontWeight="bold" color="green.800">
                      Réponse rapide
                    </Text>
                  </Flex>
                  <Text color="green.700" fontSize="sm">
                    Notre équipe s'engage à répondre à toutes les demandes sous 24 heures ouvrées.
                  </Text>
                </Box>
              </Stack>
            </GridItem>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box py={8} bg="gray.100" borderTopWidth="1px" borderColor="gray.200">
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <Text color="gray.600" fontSize="sm">
              © {new Date().getFullYear()} Unilien. Tous droits réservés.
            </Text>
            <Flex gap={6}>
              <Link asChild color="gray.600" fontSize="sm" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/">Accueil</RouterLink>
              </Link>
              <Link asChild color="gray.600" fontSize="sm" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/login">Connexion</RouterLink>
              </Link>
              <Link asChild color="gray.600" fontSize="sm" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/signup">S'inscrire</RouterLink>
              </Link>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </Box>
  )
}

export default ContactPage
