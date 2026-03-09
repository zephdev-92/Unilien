import { useState, useEffect } from 'react'
import { Box, Text } from '@chakra-ui/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function LiveClock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const time = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const date = format(now, 'EEEE d MMMM yyyy', { locale: fr })

  return (
    <Box
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
      boxShadow="sm"
      textAlign="center"
      aria-label="Heure actuelle"
    >
      <Text
        fontSize="4xl"
        fontWeight="bold"
        color="gray.900"
        fontFamily="mono"
        letterSpacing="wider"
        aria-live="polite"
        aria-atomic="true"
      >
        {time}
      </Text>
      <Text fontSize="sm" color="gray.500" textTransform="capitalize" mt={1}>
        {date}
      </Text>
    </Box>
  )
}
