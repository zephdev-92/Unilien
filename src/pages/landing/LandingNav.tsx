import { track } from '@/lib/analytics/track'
import { ASSET } from './constants'

export function LandingNav() {
  return (
    <nav className="top">
      <div className="container-wide row">
        <a className="brand" href="/">
          <img src={`${ASSET}/logo-unilien.svg`} alt="Unilien" />
        </a>
        <div className="nav-links">
          <a href="#produit">Produit</a>
          <a href="#copilote">Le copilote</a>
          <a href="#pour-qui">Pour qui</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-actions">
          <a href="/connexion" className="btn ghost sm">Se connecter</a>
          <a
            href="/inscription"
            className="btn green sm"
            onClick={() => track('CTA Signup Click', { location: 'nav' })}
          >
            Essai gratuit
          </a>
        </div>
      </div>
    </nav>
  )
}
