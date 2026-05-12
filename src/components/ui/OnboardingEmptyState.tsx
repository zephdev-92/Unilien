import type { ReactNode } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'

export interface OnboardingEmptyStateProps {
  /** Contenu SVG de l'icône (paths). viewBox 0 0 24 24 attendu. */
  icon: ReactNode
  title: string
  description: string
  /** CTAs optionnels (boutons, liens). Rendus dans une Flex centrée. */
  actions?: ReactNode
}

/**
 * Empty state harmonisé pour les listes vides à l'onboarding.
 * Aligné sur le pattern des dashboards (employer/employee).
 */
export function OnboardingEmptyState({
  icon,
  title,
  description,
  actions,
}: OnboardingEmptyStateProps) {
  return (
    <Box
      bg="bg.surface"
      borderWidth="1.5px"
      borderColor="border.default"
      borderRadius="14px"
      boxShadow="sm"
      textAlign="center"
      py={14}
      px={8}
    >
      <Flex
        align="center"
        justify="center"
        w="64px"
        h="64px"
        mx="auto"
        mb={5}
        bg="bg.muted"
        borderRadius="16px"
        color="text.muted"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="32"
          height="32"
          aria-hidden="true"
        >
          {icon}
        </svg>
      </Flex>

      <Text
        as="div"
        fontWeight="700"
        fontSize="lg"
        color="text.default"
        mb={2}
        textAlign="center"
        w="full"
      >
        {title}
      </Text>
      <Text
        as="div"
        fontSize="sm"
        color="text.muted"
        maxW="420px"
        mx="auto"
        mb={actions ? 7 : 0}
        lineHeight="1.6"
        textAlign="center"
      >
        {description}
      </Text>

      {actions && (
        <Flex gap={3} justify="center" flexWrap="wrap">
          {actions}
        </Flex>
      )}
    </Box>
  )
}
