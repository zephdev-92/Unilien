import { Check } from './icons'
import { ASSET } from './constants'

export function LandingPersonas() {
  return (
    <section id="pour-qui">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow">Pour qui</span>
          <h2 className="sec-title">Conçu avec celles &amp; ceux<br />qui <em>l'utilisent.</em></h2>
        </div>

        <div className="split">
          <div className="s-text">
            <span className="tag">Personne en situation de handicap</span>
            <h3>Vous pilotez votre propre équipe.</h3>
            <p>La PCH vous donne le droit d'employer directement. Unilien rend
              ce droit simple à exercer : interface accessible, récap d'heures automatique,
              repères clairs. Vous gardez la main, on vous accompagne.</p>
            <ul>
              <li><Check size={20} sw={2.4} /> Accessible : lecteurs d'écran, gros caractères, contraste élevé</li>
              <li><Check size={20} sw={2.4} /> Plusieurs auxiliaires gérés tout aussi facilement</li>
              <li><Check size={20} sw={2.4} /> Suivi PCH au clair, export en un clic vers la MDPH</li>
            </ul>
            <a href="#tarifs" className="btn light">Découvrir cet usage</a>
          </div>
          <div className="s-media">
            <img src={`${ASSET}/friends-park.jpg`} alt="" loading="lazy" decoding="async" />
            <div className="badge"><strong>Jean-Dominique, 36 ans</strong><span>Bénéficiaire PCH, Paris 11ᵉ</span></div>
          </div>
        </div>

        <div className="split flip">
          <div className="s-text">
            <span className="tag">Famille aidante</span>
            <h3>Vous accompagnez un proche.</h3>
            <p>Jeune ou âgé : vous jonglez entre les plannings et les
              démarches. Unilien réunit tout pour
              vous laisser ce qui compte vraiment : le temps auprès d'eux.</p>
            <ul>
              <li><Check size={20} sw={2.4} /> Tout est partagé entre frères et sœurs</li>
              <li><Check size={20} sw={2.4} /> Cahier de liaison consultable à distance</li>
              <li><Check size={20} sw={2.4} /> Vous êtes prévenu en temps réel pour rester serein</li>
            </ul>
            <a href="#tarifs" className="btn light">Découvrir cet usage</a>
          </div>
          <div className="s-media">
            <img src={`${ASSET}/delivery-handoff.jpg`} alt="" loading="lazy" decoding="async" />
            <div className="badge"><strong>Sébastien B., 35 ans</strong><span>Accompagne sa femme, Paris</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
