import { useState } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Checkbox,
} from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'

interface HealthDataConsentModalProps {
  isOpen: boolean
  onClose: () => void
  onConsent: () => Promise<boolean>
}

export function HealthDataConsentModal({ isOpen, onClose, onConsent }: HealthDataConsentModalProps) {
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!accepted) return
    setLoading(true)
    const success = await onConsent()
    setLoading(false)
    if (success) {
      onClose()
    }
  }

  const handleClose = () => {
    setAccepted(false)
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="bg.surface"
            borderRadius="16px"
            maxW="520px"
            w="90vw"
            mx="auto"
            boxShadow="xl"
          >
            <Dialog.Header p={6} borderBottomWidth="1px" borderColor="border.default">
              <Dialog.Title fontSize="lg" fontWeight={700} color="brand.500">
                Consentement — Données de santé
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer">
                  ✕
                </AccessibleButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body p={6}>
              <Stack gap={4}>
                <Box
                  p={4}
                  bg="orange.50"
                  borderRadius="10px"
                  borderWidth="1px"
                  borderColor="orange.200"
                >
                  <Text fontSize="sm" fontWeight="600" color="orange.800" mb={2}>
                    Article 9 du RGPD — Données sensibles
                  </Text>
                  <Text fontSize="sm" color="orange.700" lineHeight="1.6">
                    Les informations que vous vous apprêtez à saisir (type de handicap,
                    besoins spécifiques, prestations PCH) sont des <strong>données de santé</strong> protégées
                    par le Règlement Général sur la Protection des Données.
                  </Text>
                </Box>

                <Stack gap={2}>
                  <Text fontSize="sm" fontWeight="600" color="text.default">
                    En donnant votre consentement, vous acceptez que :
                  </Text>
                  <Stack gap={1} pl={2}>
                    <Text fontSize="sm" color="text.secondary" lineHeight="1.6">
                      • Vos données de santé soient stockées de manière sécurisée sur nos serveurs
                    </Text>
                    <Text fontSize="sm" color="text.secondary" lineHeight="1.6">
                      • Seuls vous et vos aidants autorisés puissent y accéder
                    </Text>
                    <Text fontSize="sm" color="text.secondary" lineHeight="1.6">
                      • Ces données ne soient jamais partagées avec des tiers
                    </Text>
                    <Text fontSize="sm" color="text.secondary" lineHeight="1.6">
                      • Les connexions soient chiffrées (HTTPS/TLS)
                    </Text>
                  </Stack>
                </Stack>

                <Box
                  p={3}
                  bg="bg.page"
                  borderRadius="8px"
                  borderWidth="1px"
                  borderColor="border.default"
                >
                  <Text fontSize="xs" color="text.muted" lineHeight="1.6">
                    Note : notre hébergeur (Supabase) n'est pas certifié Hébergeur de Données
                    de Santé (HDS). En consentant, vous reconnaissez cette limitation. Vous pouvez
                    retirer votre consentement à tout moment depuis les paramètres de votre compte.
                  </Text>
                </Box>

                <Flex align="start" gap={3} pt={2}>
                  <Checkbox.Root
                    checked={accepted}
                    onCheckedChange={(details) => setAccepted(!!details.checked)}
                  >
                    <Checkbox.HiddenInput aria-label="Accepter le consentement" />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Root>
                  <Text
                    fontSize="sm"
                    fontWeight="500"
                    color="text.default"
                    cursor="pointer"
                    onClick={() => setAccepted(!accepted)}
                    lineHeight="1.5"
                  >
                    Je consens au traitement de mes données de santé conformément
                    à l'article 9 du RGPD
                  </Text>
                </Flex>
              </Stack>
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px" borderColor="border.default">
              <Flex gap={3} justify="flex-end" w="full">
                <AccessibleButton variant="outline" onClick={handleClose}>
                  Annuler
                </AccessibleButton>
                <AccessibleButton
                  colorPalette="brand"
                  disabled={!accepted}
                  loading={loading}
                  loadingText="Enregistrement..."
                  onClick={handleConfirm}
                >
                  Confirmer mon consentement
                </AccessibleButton>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
