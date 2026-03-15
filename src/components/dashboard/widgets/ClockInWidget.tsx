import { useState, useEffect } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'

interface ClockInWidgetProps {
  hasActiveShift?: boolean
  activeShiftLabel?: string
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function ClockInWidget({ hasActiveShift = false, activeShiftLabel }: ClockInWidgetProps) {
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!hasActiveShift) {
    return (
      <Box
        bg="linear-gradient(135deg, var(--chakra-colors-brand-500), var(--chakra-colors-brand-700, #2a3d52))"
        borderRadius="12px"
        p={5}
        color="white"
        textAlign="center"
      >
        <Text fontSize="sm" fontWeight="600" opacity={0.8} mb={1}>
          Pas d'intervention en cours
        </Text>
        <Text fontSize="3xl" fontWeight="800" lineHeight={1} mb={3} aria-live="polite">
          {time}
        </Text>
        <Box
          as={RouterLink}
          to="/suivi-des-heures"
          display="inline-flex"
          alignItems="center"
          px={4}
          py={2}
          borderRadius="6px"
          fontSize="xs"
          fontWeight="700"
          bg="white"
          color="accent.700"
          textDecoration="none"
          px="16px"
          py="7px"
          transition="opacity 0.15s"
          _hover={{ opacity: 0.9 }}
        >
          Voir mes heures
        </Box>
      </Box>
    )
  }

  return (
    <Box
      bg="linear-gradient(135deg, var(--chakra-colors-brand-500), var(--chakra-colors-brand-700, #2a3d52))"
      borderRadius="12px"
      p={5}
      color="white"
      textAlign="center"
    >
      <Text fontSize="sm" fontWeight="600" opacity={0.8} mb={1}>
        Intervention en cours
      </Text>
      <Text fontSize="3xl" fontWeight="800" lineHeight={1} mb={2} aria-live="polite">
        {time}
      </Text>
      {activeShiftLabel && (
        <Flex align="center" justify="center" gap={2} mb={3}>
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            bg="accent.400"
            css={{
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.4 },
              },
            }}
          />
          <Text fontSize="sm" fontWeight="500">
            {activeShiftLabel}
          </Text>
        </Flex>
      )}
      <Flex gap={2} justify="center" flexWrap="wrap">
        <Box
          as={RouterLink}
          to="/suivi-des-heures"
          display="inline-flex"
          alignItems="center"
          px={4}
          py={2}
          borderRadius="6px"
          fontSize="xs"
          fontWeight="700"
          bg="white"
          color="accent.700"
          textDecoration="none"
          px="16px"
          py="7px"
          transition="opacity 0.15s"
          _hover={{ opacity: 0.9 }}
        >
          Voir mes heures
        </Box>
        <Box
          as="button"
          display="inline-flex"
          alignItems="center"
          px="16px"
          py="7px"
          borderRadius="6px"
          fontSize="xs"
          fontWeight="700"
          bg="rgba(255,255,255,.18)"
          color="white"
          borderWidth="1px"
          borderColor="rgba(255,255,255,.3)"
          cursor="pointer"
          transition="background 0.15s"
          _hover={{ bg: 'rgba(255,255,255,.15)' }}
          onClick={() => {
            // TODO: implémenter la fin d'intervention
          }}
        >
          Terminer l'intervention
        </Box>
      </Flex>
    </Box>
  )
}
