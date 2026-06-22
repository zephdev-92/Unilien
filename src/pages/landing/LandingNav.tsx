import { useState } from 'react'
import { Link } from 'react-router-dom'
import { track } from '@/lib/analytics/track'
import { ASSET } from './constants'
import { Menu, Close } from './icons'

const NAV_LINKS = [
  { href: '#produit', label: 'Produit' },
  { href: '#copilote', label: 'Le copilote' },
  { href: '#pour-qui', label: 'Pour qui' },
  { href: '#tarifs', label: 'Tarifs' },
  { href: '#faq', label: 'FAQ' },
]

export function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="top">
      <div className="container-wide row">
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <img src={`${ASSET}/logo-unilien.svg`} alt="Unilien" />
        </Link>
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </div>
        <div className="nav-actions">
          <Link to="/connexion" className="btn ghost sm">Se connecter</Link>
          <Link
            to="/inscription"
            className="btn green sm"
            onClick={() => track('CTA Signup Click', { location: 'nav' })}
          >
            Essai gratuit
          </Link>
          <button
            type="button"
            className="nav-burger"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <Close /> : <Menu />}
          </button>
        </div>
      </div>

      <div id="landing-mobile-menu" className="mobile-menu" data-open={open} inert={!open}>
        <div className="container-wide">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <Link to="/connexion" className="btn ghost" onClick={() => setOpen(false)}>
            Se connecter
          </Link>
          <Link
            to="/inscription"
            className="btn green"
            onClick={() => {
              track('CTA Signup Click', { location: 'nav_mobile' })
              setOpen(false)
            }}
          >
            Essai gratuit
          </Link>
        </div>
      </div>
    </nav>
  )
}
