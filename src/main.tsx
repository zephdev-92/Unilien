import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'
import { system } from './styles/theme'
import { ErrorBoundary } from '@/components/ui'
import App from './App'
import './index.css'

// Appliquer la densité sauvegardée au démarrage
try {
  const raw = localStorage.getItem('unilien-apparence')
  if (raw) {
    const { density } = JSON.parse(raw)
    if (density === 'compact') document.documentElement.setAttribute('data-density', 'compact')
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>
)
