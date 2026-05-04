import { useRef, useState } from 'react'
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
  IconButton,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AccessibleButton, AccessibleInput, AccessibleSelect } from '@/components/ui'
import type { SelectOptionGroup } from '@/components/ui/AccessibleSelect'
import { NavIcon } from '@/components/ui/NavIcon'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024 // 5 Mo
const ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const ALLOWED_ATTACHMENT_LABEL = 'PDF, PNG ou JPG · 5 Mo max'

const contactSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  subject: z.enum(
    [
      'general',
      'support',
      'onboarding',
      'login',
      'billing',
      'account_deletion',
      'partnership',
      'press',
      'other',
    ],
    { required_error: 'Veuillez sélectionner un sujet' }
  ),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères'),
})

type ContactFormData = z.infer<typeof contactSchema>

const subjectGroups: SelectOptionGroup[] = [
  {
    label: 'Utilisation',
    options: [
      { value: 'general', label: 'Question générale' },
      { value: 'support', label: 'Support technique' },
      { value: 'onboarding', label: 'Aide à la prise en main' },
    ],
  },
  {
    label: 'Compte',
    options: [
      { value: 'login', label: 'Problème de connexion' },
      { value: 'billing', label: 'Facturation / Abonnement' },
      { value: 'account_deletion', label: 'Suppression de compte' },
    ],
  },
  {
    label: 'Autre',
    options: [
      { value: 'partnership', label: 'Partenariat' },
      { value: 'press', label: 'Presse' },
      { value: 'other', label: 'Autre' },
    ],
  },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

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
        borderRadius="12px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Text fontSize="xl">{icon}</Text>
      </Box>
      <Box>
        <Text fontWeight="semibold" color="text.default" mb={1}>
          {title}
        </Text>
        <Text color="text.muted">{content}</Text>
      </Box>
    </Flex>
  )
}

export function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const validateAttachment = (file: File): string | null => {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return `Format non supporté (${ALLOWED_ATTACHMENT_LABEL})`
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return `Le fichier dépasse 5 Mo (${formatFileSize(file.size)})`
    }
    return null
  }

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      setAttachment(null)
      setAttachmentError(null)
      return
    }

    const error = validateAttachment(file)
    if (error) {
      setAttachment(null)
      setAttachmentError(error)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setAttachment(file)
    setAttachmentError(null)
  }

  const handleRemoveAttachment = () => {
    setAttachment(null)
    setAttachmentError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    logger.debug('Contact form submitted:', {
      ...data,
      attachment: attachment
        ? { name: attachment.name, size: attachment.size, type: attachment.type }
        : null,
    })
    setIsSubmitting(false)
    setIsSubmitted(true)
    reset()
    setAttachment(null)
    setAttachmentError(null)
  }

  const { user } = useAuth()
  const isAuthenticated = !!user

  const formAndInfoContent = (
    <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={12}>
      {/* Form */}
      <GridItem>
        <Box bg="bg.surface" p={8} borderRadius="xl" boxShadow="0 4px 16px rgba(78,100,120,.12)">
          {isSubmitted ? (
            <Stack gap={6} textAlign="center" py={8}>
              <Text fontSize="4xl">✅</Text>
              <Text fontSize="xl" fontWeight="bold" color="text.default">
                Message envoyé !
              </Text>
              <Text color="text.muted">
                Merci pour votre message. Notre équipe vous répondra dans les plus brefs délais.
              </Text>
              <AccessibleButton onClick={() => setIsSubmitted(false)}>
                Envoyer un autre message
              </AccessibleButton>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack gap={5}>
                <Text fontSize="xl" fontWeight="bold" color="text.default">
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
                  groups={subjectGroups}
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

                <Box>
                  <Text fontWeight="medium" fontSize="md" mb={2}>
                    Pièce jointe{' '}
                    <Text as="span" color="text.muted" fontWeight="normal" fontSize="sm">
                      (facultatif)
                    </Text>
                  </Text>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    onChange={handleAttachmentChange}
                    style={{ display: 'none' }}
                    aria-label="Pièce jointe"
                  />
                  {attachment ? (
                    <Flex
                      align="center"
                      gap={3}
                      p={3}
                      borderWidth="1.5px"
                      borderColor="border.default"
                      borderRadius="10px"
                      bg="bg.page"
                    >
                      <Box color="brand.500">
                        <NavIcon name="paperclip" size={18} />
                      </Box>
                      <Box flex={1} minW={0}>
                        <Text fontSize="sm" fontWeight="medium" truncate>
                          {attachment.name}
                        </Text>
                        <Text fontSize="xs" color="text.muted">
                          {formatFileSize(attachment.size)}
                        </Text>
                      </Box>
                      <IconButton
                        aria-label="Retirer la pièce jointe"
                        size="sm"
                        variant="ghost"
                        onClick={handleRemoveAttachment}
                      >
                        <NavIcon name="close" size={16} />
                      </IconButton>
                    </Flex>
                  ) : (
                    <AccessibleButton
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => fileInputRef.current?.click()}
                      width="full"
                    >
                      <Box as="span" display="inline-flex" mr={2}>
                        <NavIcon name="paperclip" size={16} />
                      </Box>
                      Ajouter un fichier
                    </AccessibleButton>
                  )}
                  <Text fontSize="xs" color="text.muted" mt={2}>
                    {ALLOWED_ATTACHMENT_LABEL}
                  </Text>
                  {attachmentError && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {attachmentError}
                    </Text>
                  )}
                </Box>

                <AccessibleButton
                  type="submit"
                  colorPalette="brand"
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
            <Text fontSize="xl" fontWeight="bold" color="text.default" mb={6}>
              Autres moyens de nous contacter
            </Text>
            <Stack gap={6}>
              <ContactInfo
                icon="📧"
                title="Email"
                content="contact@unilien.app"
              />
            </Stack>
          </Box>

          {/* FAQ Shortcut */}
          <Box bg="brand.subtle" p={6} borderRadius="xl">
            <Text fontWeight="bold" color="brand.700" mb={2}>
              Questions fréquentes
            </Text>
            <Text color="brand.700" fontSize="sm" mb={4}>
              Consultez notre FAQ pour trouver rapidement des réponses à vos questions.
            </Text>
            <Stack gap={2}>
              <Text color="brand.600" fontSize="sm">
                • Comment créer un compte ?
              </Text>
              <Text color="brand.600" fontSize="sm">
                • Comment ajouter un auxiliaire ?
              </Text>
              <Text color="brand.600" fontSize="sm">
                • Comment générer une déclaration CESU ?
              </Text>
            </Stack>
          </Box>

          {/* Response Time */}
          <Box bg="accent.subtle" p={6} borderRadius="xl">
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
  )

  // Mode authentifié : intégré dans DashboardLayout
  if (isAuthenticated) {
    return (
      <DashboardLayout title="Contact">
        <Box maxW="container.xl" mx="auto" px={{ base: 4, md: 6 }} py={8}>
          {formAndInfoContent}
        </Box>
      </DashboardLayout>
    )
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
        bg="bg.surface"
        borderBottomWidth="1px"
        borderColor="border.default"
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
              <Link asChild color="text.muted" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/">Accueil</RouterLink>
              </Link>
              <Link asChild color="text.muted" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/connexion">Connexion</RouterLink>
              </Link>
              <AccessibleButton asChild colorPalette="brand" size="sm">
                <RouterLink to="/inscription">S'inscrire</RouterLink>
              </AccessibleButton>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Hero */}
      <Box pt="120px" pb="60px" bg="bg.page">
        <Container maxW="container.xl">
          <Stack gap={4} textAlign="center" maxW="600px" mx="auto">
            <Text fontSize="4xl" fontWeight="bold" color="text.default">
              Contactez-nous
            </Text>
            <Text fontSize="lg" color="text.muted">
              Une question ? Une suggestion ? Notre équipe est là pour vous aider.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Contact Form & Info */}
      <Box py="60px">
        <Container maxW="container.xl">{formAndInfoContent}</Container>
      </Box>

      {/* Footer */}
      <Box py={8} bg="bg.surface.hover" borderTopWidth="1px" borderColor="border.default">
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <Text color="text.muted" fontSize="sm">
              © {new Date().getFullYear()} Unilien. Tous droits réservés.
            </Text>
            <Flex gap={6}>
              <Link asChild color="text.muted" fontSize="sm" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/">Accueil</RouterLink>
              </Link>
              <Link asChild color="text.muted" fontSize="sm" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/connexion">Connexion</RouterLink>
              </Link>
              <Link asChild color="text.muted" fontSize="sm" _hover={{ color: 'brand.500' }}>
                <RouterLink to="/inscription">S'inscrire</RouterLink>
              </Link>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </Box>
  )
}

export default ContactPage
