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
      bg="bg.surface"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border.default"
      p={6}
      boxShadow="0 2px 8px rgba(78,100,120,.09)"
      display="flex"
      flexDirection="column"
      alignItems="center"
      textAlign="center"
      aria-label="Heure actuelle"
    >
      <Text
        fontSize="56px"
        fontWeight="900"
        color="text.default"
        fontFamily="heading"
        letterSpacing="-0.03em"
        lineHeight="1"
        mb={1}
        aria-live="polite"
        aria-atomic="true"
      >
        {time}
      </Text>
      <Text fontSize="sm" color="text.muted" fontWeight="500" textTransform="capitalize" w="100%" textAlign="center">
        {date}
      </Text>
    </Box>
  )
}
