import { Link } from 'react-router-dom'
import { ASSET } from './constants'

export function LandingFooter() {
  return (
    <footer>
      <div className="container-wide">
        <div className="foot-grid">
          <div>
            <img src={`${ASSET}/logo-unilien.svg`} alt="Unilien" loading="lazy" decoding="async" />
            <p className="foot-tag">Le premier outil de gestion d'auxiliaires de vie avec
              protection juridique automatique IDCC 3239.</p>
            <span className="foot-pill"><span className="d"></span>Tous les services opérationnels</span>
          </div>
          <div>
            <h5>Produit</h5>
            <ul>
              <li><a href="#produit">Fonctionnalités</a></li>
              <li><a href="#copilote">Le copilote</a></li>
              <li><a href="#tarifs">Tarifs</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h5>Légal</h5>
            <ul>
              <li><Link to="/mentions-legales">Mentions légales</Link></li>
              <li><Link to="/politique-confidentialite">Confidentialité</Link></li>
              <li><Link to="/conditions-utilisation">CGU</Link></li>
              <li><Link to="/politique-confidentialite">RGPD</Link></li>
            </ul>
          </div>
          <div>
            <h5>Support</h5>
            <ul>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="foot-base">
          <span>© 2026 Unilien · Convention IDCC 3239</span>
          <span>Fait avec ♥ pour les personnes en situation de handicap</span>
        </div>
      </div>
    </footer>
  )
}
