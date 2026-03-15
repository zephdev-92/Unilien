/**
 * Wrapper modal aligné sur le prototype CSS (style.css section 29).
 * Utilisé par toutes les modales planning pour un style cohérent.
 */
import { Dialog, Portal, Box, Flex } from '@chakra-ui/react'

// Icône × (proto: stroke-width 2.5, 18×18)
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

interface PlanningModalProps {
  isOpen: boolean
  onClose: () => void
  title: React.ReactNode
  /** Élément optionnel à droite du titre (badge, compliance, etc.) */
  titleRight?: React.ReactNode
  /** Sous-titre sous le titre */
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  /** true = max-width 620px (modal-lg), false = 520px */
  large?: boolean
}

export function PlanningModal({
  isOpen,
  onClose,
  title,
  titleRight,
  subtitle,
  children,
  footer,
  large = false,
}: PlanningModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop
          bg="rgba(0,0,0,0.45)"
        />
        <Dialog.Positioner>
          <Dialog.Content
            bg="bg.surface"
            borderRadius="20px"
            boxShadow="lg"
            maxW={large ? '620px' : '520px'}
            w="95vw"
            maxH="90vh"
            display="flex"
            flexDirection="column"
            animation="scaleIn 0.2s ease both"
          >
            {/* Header — proto: sp-5 sp-6 sp-4 = 20px 24px 16px */}
            <Dialog.Header
              px={6} pt={5} pb={4}
              borderBottomWidth="1px"
              borderColor="border.default"
              flexShrink={0}
            >
              <Box>
                <Flex align="center" gap={3}>
                  <Dialog.Title
                    fontFamily="heading"
                    fontSize="18px"
                    fontWeight="800"
                  >
                    {title}
                  </Dialog.Title>
                  {titleRight}
                </Flex>
                {subtitle}
              </Box>
              {/* Close button — proto: 32×32, r=10px, muted color */}
              <Dialog.CloseTrigger
                position="absolute"
                top={4}
                right={4}
              >
                <Flex
                  as="button"
                  align="center"
                  justify="center"
                  w="32px"
                  h="32px"
                  borderRadius="10px"
                  border="none"
                  bg="transparent"
                  color="text.muted"
                  cursor="pointer"
                  _hover={{ bg: 'bg.page', color: 'text.default' }}
                  aria-label="Fermer"
                >
                  <CloseIcon />
                </Flex>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            {/* Body — proto: sp-6 = 24px, overflow-y auto, flex:1 */}
            <Dialog.Body p={6} overflowY="auto" flex="1">
              {children}
            </Dialog.Body>

            {/* Footer — proto: sp-4 sp-6 = 16px 24px, justify-end */}
            {footer && (
              <Dialog.Footer
                px={6} py={4}
                borderTopWidth="1px"
                borderColor="border.default"
                flexShrink={0}
              >
                {footer}
              </Dialog.Footer>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
