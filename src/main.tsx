import React, { StrictMode } from 'react'
import ReactDOM, { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from '@/components/ui/provider'
import { ErrorBoundary } from '@/components/ui'
import App from './App'
import './index.css'

if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000)
  })
}

// Appliquer les préférences d'apparence au démarrage (avant React pour éviter le flash)
try {
  const raw = localStorage.getItem('unilien-apparence')
  if (raw) {
    const { density, darkMode } = JSON.parse(raw)
    if (density === 'compact') document.documentElement.setAttribute('data-density', 'compact')
    if (darkMode) document.documentElement.classList.add('dark')
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
