import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Box, Button, Center, Heading, Text, VStack } from '@chakra-ui/react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary global - intercepte les erreurs React non attrapées
 * et affiche un écran de secours au lieu d'un écran blanc.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary a intercepté une erreur:', error)
    logger.error('Component stack:', errorInfo.componentStack)
  }

  private handleReload = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Center minH="100vh" bg="gray.50" p={4}>
          <VStack gap={6} maxW="md" textAlign="center">
            <Box>
              <Heading size="lg" color="gray.800" mb={2}>
                Une erreur est survenue
              </Heading>
              <Text color="gray.600">
                L'application a rencontré un problème inattendu.
                Vos données sont en sécurité.
              </Text>
            </Box>

            {import.meta.env.DEV && this.state.error && (
              <Box
                w="100%"
                bg="red.50"
                border="1px solid"
                borderColor="red.200"
                borderRadius="md"
                p={4}
                textAlign="left"
              >
                <Text fontWeight="bold" color="red.700" mb={1}>
                  {this.state.error.name}: {this.state.error.message}
                </Text>
                <Text fontSize="sm" color="red.600" whiteSpace="pre-wrap">
                  {this.state.error.stack?.split('\n').slice(1, 5).join('\n')}
                </Text>
              </Box>
            )}

            <Button
              colorPalette="blue"
              size="lg"
              onClick={this.handleReload}
            >
              Retour à l'accueil
            </Button>
          </VStack>
        </Center>
      )
    }

    return this.props.children
  }
}
