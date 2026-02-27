import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Accueil',
  '/connexion': 'Connexion',
  '/inscription': 'Inscription',
  '/mot-de-passe-oublie': 'Mot de passe oublié',
  '/reinitialisation': 'Réinitialisation du mot de passe',
  '/tableau-de-bord': 'Tableau de bord',
  '/planning': 'Planning',
  '/equipe': 'Mon équipe',
  '/cahier-de-liaison': 'Cahier de liaison',
  '/messagerie': 'Messagerie',
  '/parametres': 'Paramètres',
  '/pointage': 'Pointage',
  '/conformite': 'Conformité',
  '/documents': 'Documents',
  '/contact': 'Contact',
}

/**
 * Annonce les changements de route aux lecteurs d'écran et met à jour document.title.
 *
 * WCAG :
 * - 2.4.2 Page Titled (AA) — document.title unique par page
 * - 4.1.3 Status Messages (AA) — annonce via aria-live sans déplacement de focus
 *
 * À placer une seule fois à la racine de l'application, à l'intérieur de <BrowserRouter>.
 */
export function RouteAnnouncer() {
  const location = useLocation()
  const announceRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    const pageLabel = ROUTE_LABELS[location.pathname] ?? 'Page inconnue'

    // Mettre à jour le titre du document — WCAG 2.4.2
    document.title = `${pageLabel} — Unilien`

    // Ne pas annoncer la navigation initiale (la page est déjà lue par le SR)
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Vider puis remplir la région live pour forcer la ré-annonce — WCAG 4.1.3
    const timer = setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = ''
        // Force reflow pour réinitialiser la région live
        void announceRef.current.offsetHeight
        announceRef.current.textContent = `Navigation vers ${pageLabel}`
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <div
      ref={announceRef}
      aria-live="assertive"
      aria-atomic="true"
      data-testid="route-announcer"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    />
  )
}
