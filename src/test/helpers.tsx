/* eslint-disable react-refresh/only-export-components */
/**
 * Helpers de test partagés — wrappers de rendu et utilitaires.
 *
 * Usage :
 *   import { renderWithProviders } from '@/test/helpers'
 *   renderWithProviders(<MyComponent />)
 */

import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Wrapper avec tous les providers nécessaires pour les tests de composants.
 * Inclut : ChakraProvider, BrowserRouter, QueryClientProvider.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface TestProvidersProps {
  children: React.ReactNode
}

function TestProviders({ children }: TestProvidersProps) {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <BrowserRouter>{children}</BrowserRouter>
      </ChakraProvider>
    </QueryClientProvider>
  )
}

/**
 * Render un composant avec tous les providers (Chakra, Router, QueryClient).
 *
 * Retourne les mêmes helpers que `@testing-library/react` render().
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestProviders, ...options })
}

/**
 * Crée un résultat Supabase en succès.
 */
export function supabaseSuccess<T>(data: T) {
  return { data, error: null }
}

/**
 * Crée un résultat Supabase en erreur.
 */
export function supabaseError(message: string, code?: string) {
  return { data: null, error: { message, code } }
}
