import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from '@/components/ui/provider'
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
    <Provider>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </Provider>
  </StrictMode>
)
